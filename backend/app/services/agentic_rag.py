import json
import logging
from typing import AsyncGenerator

import anthropic
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.rag import rag_service

logger = logging.getLogger(__name__)


TOOLS = [
    {
        "name": "search_knowledge",
        "description": "ナレッジベースからクエリに関連する情報を検索します。質問に回答するために必ず最初に使ってください。検索語を工夫して複数回呼ぶことで精度が上がります。",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "検索クエリ。ユーザーの質問をそのまま使うのではなく、検索に最適化した語句を使ってください。",
                },
                "top_k": {
                    "type": "integer",
                    "description": "取得する件数（デフォルト: 5）",
                    "default": 5,
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_document_detail",
        "description": "ドキュメントの全文を取得します。検索結果のチャンクだけでは情報が不十分な場合に使います。",
        "input_schema": {
            "type": "object",
            "properties": {
                "document_id": {
                    "type": "string",
                    "description": "ドキュメントID",
                },
            },
            "required": ["document_id"],
        },
    },
    {
        "name": "list_documents",
        "description": "利用可能なドキュメントの一覧を取得します。どのような情報源があるか把握したい場合に使います。",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "cite_sources",
        "description": "回答に使用した出典を登録します。回答を生成する直前に必ず呼んでください。回答で参照するドキュメントとその該当箇所を正確に記録します。",
        "input_schema": {
            "type": "object",
            "properties": {
                "citations": {
                    "type": "array",
                    "description": "引用元のリスト",
                    "items": {
                        "type": "object",
                        "properties": {
                            "document_id": {
                                "type": "string",
                                "description": "ドキュメントID（search_knowledgeの結果から取得）",
                            },
                            "filename": {
                                "type": "string",
                                "description": "ドキュメント名",
                            },
                            "section": {
                                "type": "string",
                                "description": "参照した章・条項（例: 第20条、第3章）",
                            },
                            "excerpt": {
                                "type": "string",
                                "description": "回答の根拠となった箇所の要約または引用（100文字程度）",
                            },
                        },
                        "required": ["document_id", "filename", "excerpt"],
                    },
                },
            },
            "required": ["citations"],
        },
    },
    {
        "name": "suggest_followups",
        "description": "ユーザーが次に聞きそうな関連質問を提案します。回答を生成した後に必ず呼んでください。回答内容に関連する具体的で有用な質問を2〜3個提案します。",
        "input_schema": {
            "type": "object",
            "properties": {
                "questions": {
                    "type": "array",
                    "description": "提案する質問のリスト（2〜3個）",
                    "items": {"type": "string"},
                },
            },
            "required": ["questions"],
        },
    },
]

SYSTEM_PROMPT = """あなたは社内FAQアシスタントです。社員からの質問に対して、ツールを使ってナレッジベースを検索し、正確に回答してください。

【行動手順】
1. まず search_knowledge で質問に関連する情報を検索する
2. 検索結果が不十分な場合は、別の切り口で再検索するか、get_document_detail でドキュメント全文を確認する
3. 十分な情報が集まったら、cite_sources と suggest_followups を同時に呼んでから回答を生成する

【回答のルール】
1. 検索で得た情報のみに基づいて回答する。推測や一般知識で補わない
2. 情報が見つからない場合は「この情報は登録されているドキュメントに含まれていません。事務局にお問い合わせください。」と回答する
3. 簡潔で分かりやすい日本語で回答する
4. 必要に応じて箇条書きや番号付きリストを使用する

【出典の明示 ※必須】
- 回答する前に必ず cite_sources ツールを呼んで、参照したドキュメントと該当箇所を登録する
- 回答文中でも出典を自然に言及する
  - 良い例:「**就業規則（第20条）** によると、年次有給休暇は入社6ヶ月経過後に10日付与されます。」
  - 良い例:「**出張旅費規程** では、日帰り出張の日当は管理職3,000円、一般社員2,000円と定められています。」
- 複数のドキュメントを参照した場合はそれぞれの出典を明記する
- 回答の末尾に「詳しくは **○○** をご確認ください。」のように案内を添えると親切

【重要：個人への適用判断について】
- 制度の説明は行うが、「あなたは取得できます」のように個人への適用を断定しない
- 適用条件（入社年数、雇用形態など）がある場合は必ず明記する
- 個人が条件を満たすか判断するために必要な情報が不足している場合は、ユーザーに確認を求める
  例:「入社されてどれくらいですか？」「雇用形態を教えていただけますか？」
- 最終的な適用判断は人事部・総務部への確認を促す

【会話の継続性】
- 過去の会話履歴を考慮して、文脈に沿った回答をする
- 代名詞（それ、これ、その制度など）が何を指すか、会話履歴から判断する"""


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def _content_to_dict(content_blocks) -> list[dict]:
    """Anthropic SDK ContentBlock objects to serializable dicts."""
    result = []
    for block in content_blocks:
        if block.type == "text":
            result.append({"type": "text", "text": block.text})
        elif block.type == "tool_use":
            result.append({
                "type": "tool_use",
                "id": block.id,
                "name": block.name,
                "input": block.input,
            })
    return result


class AgenticRAG:
    def __init__(self, db: Session, organization_id: str | None, user_department_id: str | None):
        self.db = db
        self.organization_id = organization_id
        self.user_department_id = user_department_id
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self._citations: list[dict] = []
        self._all_similarities: list[float] = []
        self._trace: list[dict] = []
        self._followups: list[str] = []

    def _execute_tool(self, name: str, input_data: dict) -> str:
        if name == "search_knowledge":
            return self._tool_search_knowledge(
                input_data["query"], input_data.get("top_k", 5)
            )
        elif name == "get_document_detail":
            return self._tool_get_document_detail(input_data["document_id"])
        elif name == "list_documents":
            return self._tool_list_documents()
        elif name == "cite_sources":
            return self._tool_cite_sources(input_data["citations"])
        elif name == "suggest_followups":
            return self._tool_suggest_followups(input_data["questions"])
        return json.dumps({"error": f"Unknown tool: {name}"})

    def _tool_search_knowledge(self, query: str, top_k: int = 5) -> str:
        chunks = rag_service.search_similar_chunks(
            self.db, query, top_k=top_k,
            user_department_id=self.user_department_id,
            organization_id=self.organization_id,
        )
        for chunk in chunks:
            sim = chunk.get("similarity")
            if sim is not None:
                self._all_similarities.append(sim)
        if not chunks:
            return json.dumps({"results": [], "message": "該当する情報が見つかりませんでした。"}, ensure_ascii=False)
        results = [
            {
                "document_id": c["document_id"],
                "filename": c["filename"],
                "content": c["content"],
                "similarity": round(c["similarity"], 3) if c["similarity"] is not None else 0,
            }
            for c in chunks
        ]
        return json.dumps({"results": results}, ensure_ascii=False)

    def _tool_get_document_detail(self, document_id: str) -> str:
        sql = text("""
            SELECT dc.content, dc.chunk_index, d.filename
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE dc.document_id = :document_id
              AND dc.organization_id = :organization_id
            ORDER BY dc.chunk_index
        """)
        rows = self.db.execute(sql, {
            "document_id": document_id,
            "organization_id": self.organization_id,
        }).fetchall()
        if not rows:
            return json.dumps({"error": "ドキュメントが見つかりません。"}, ensure_ascii=False)
        filename = rows[0].filename
        full_text = "\n\n".join(row.content for row in rows)
        return json.dumps({
            "filename": filename,
            "content": full_text,
            "chunk_count": len(rows),
        }, ensure_ascii=False)

    def _tool_list_documents(self) -> str:
        sql = text("""
            SELECT d.id, d.filename, d.category, d.updated_at
            FROM documents d
            WHERE d.organization_id = :organization_id
            ORDER BY d.updated_at DESC
            LIMIT 50
        """)
        rows = self.db.execute(sql, {
            "organization_id": self.organization_id,
        }).fetchall()
        docs = [
            {
                "id": row.id,
                "filename": row.filename,
                "category": row.category or "",
                "updated_at": row.updated_at.isoformat() if row.updated_at else "",
            }
            for row in rows
        ]
        return json.dumps({"documents": docs}, ensure_ascii=False)

    def _tool_cite_sources(self, citations) -> str:
        # streaming SDK may return nested objects as-is or with slight differences
        parsed = []
        for c in citations:
            if isinstance(c, dict):
                parsed.append(c)
            elif isinstance(c, str):
                try:
                    obj = json.loads(c)
                    if isinstance(obj, dict):
                        parsed.append(obj)
                except json.JSONDecodeError:
                    pass
        self._citations = parsed
        return json.dumps({"status": "ok", "registered": len(parsed)}, ensure_ascii=False)

    def _tool_suggest_followups(self, questions: list[str]) -> str:
        self._followups = questions[:3]
        return json.dumps({"status": "ok", "count": len(self._followups)}, ensure_ascii=False)

    def _build_messages(self, question: str, conversation_history: list[dict]) -> list[dict]:
        messages = []
        for msg in conversation_history[-10:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })
        messages.append({"role": "user", "content": question})
        return messages

    def _build_references(self) -> tuple[list[dict], float]:
        references = []
        for c in self._citations:
            references.append({
                "id": c.get("document_id", ""),
                "title": c.get("filename", ""),
                "section": c.get("section", ""),
                "excerpt": c.get("excerpt", ""),
            })
        avg_sim = sum(self._all_similarities) / len(self._all_similarities) if self._all_similarities else 0.0
        return references, avg_sim

    async def run(self, question: str, conversation_history: list[dict]) -> AsyncGenerator[str, None]:
        messages = self._build_messages(question, conversation_history)
        max_iterations = 10

        system_with_cache = [
            {"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}},
        ]
        tools_with_cache = TOOLS[:-1] + [{**TOOLS[-1], "cache_control": {"type": "ephemeral"}}]

        try:
            for i in range(max_iterations):
                async with self.client.messages.stream(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4096,
                    temperature=0.3,
                    system=system_with_cache,
                    tools=tools_with_cache,
                    messages=messages,
                ) as stream:
                    async for event in stream:
                        if event.type == "text":
                            yield _sse({"token": event.text})

                    response = await stream.get_final_message()

                if response.stop_reason != "tool_use":
                    break

                assistant_content = response.content
                tool_results = []

                for block in assistant_content:
                    if block.type != "tool_use":
                        continue

                    tool_name = block.name
                    tool_input = block.input

                    self._trace.append({
                        "iteration": i,
                        "tool": tool_name,
                        "input": tool_input,
                    })

                    # cite_sources/suggest_followups はUI上ではステップ表示しない
                    hidden_tools = {"cite_sources", "suggest_followups"}
                    if tool_name not in hidden_tools:
                        yield _sse({"step": {
                            "tool": tool_name,
                            "status": "running",
                            "input": tool_input,
                        }})

                    result = self._execute_tool(tool_name, tool_input)

                    summary = self._summarize_result(tool_name, result)
                    self._trace[-1]["summary"] = summary

                    if tool_name not in hidden_tools:
                        yield _sse({"step": {
                            "tool": tool_name,
                            "status": "done",
                            "summary": summary,
                        }})

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })

                messages.append({"role": "assistant", "content": _content_to_dict(assistant_content)})
                messages.append({"role": "user", "content": tool_results})
            else:
                yield _sse({"token": "情報の検索に時間がかかっています。取得できた情報に基づいて回答します。"})

            references, avg_similarity = self._build_references()
            yield _sse({
                "done": True,
                "references": references,
                "avg_similarity": round(avg_similarity, 3),
                "followups": self._followups,
                "agentic_trace": self._trace,
            })
        except (anthropic.APIError, anthropic.APIConnectionError) as e:
            logger.error("Anthropic API error: %s", e)
            yield _sse({"token": "AIサービスとの通信中にエラーが発生しました。しばらくしてから再度お試しください。"})
            yield _sse({"done": True, "references": [], "avg_similarity": 0, "followups": [], "agentic_trace": self._trace})

    @staticmethod
    def _summarize_result(tool_name: str, result_json: str) -> str:
        try:
            data = json.loads(result_json)
        except json.JSONDecodeError:
            return "結果を取得"

        if tool_name == "search_knowledge":
            results = data.get("results", [])
            if not results:
                return "該当する情報なし"
            return f"{len(results)}件の関連情報を取得"
        elif tool_name == "get_document_detail":
            if "error" in data:
                return "ドキュメントが見つかりません"
            filename = data.get("filename", "")
            return f"「{filename}」の全文を取得"
        elif tool_name == "list_documents":
            docs = data.get("documents", [])
            return f"{len(docs)}件のドキュメント一覧を取得"
        elif tool_name == "cite_sources":
            count = data.get("registered", 0)
            return f"{count}件の出典を登録"
        elif tool_name == "suggest_followups":
            count = data.get("count", 0)
            return f"{count}件のフォローアップ質問を提案"
        return "結果を取得"
