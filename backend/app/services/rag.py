import logging
from typing import AsyncGenerator

from langchain_anthropic import ChatAnthropic
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger(__name__)
from app.models.document import Document, DocumentChunk


class RAGService:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(
            model=settings.openai_embedding_model,
            openai_api_key=settings.openai_api_key,
        )
        self.llm = ChatAnthropic(
            model="claude-sonnet-4-20250514",
            anthropic_api_key=settings.anthropic_api_key,
            temperature=0.3,
            streaming=True,
            max_tokens=4096,
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            separators=["\n## ", "\n### ", "\n\n", "\n", "。", "、", " ", ""],
        )

    def chunk_text(self, text: str) -> list[str]:
        return self.text_splitter.split_text(text)

    def get_embedding(self, text: str) -> list[float]:
        return self.embeddings.embed_query(text)

    def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        return self.embeddings.embed_documents(texts)

    def search_similar_chunks(
        self, db: Session, query: str, top_k: int = None, user_department_id: str = None,
        organization_id: str = None
    ) -> list[tuple[DocumentChunk, float]]:
        """
        類似チャンクを検索
        user_department_id: ユーザーの部門ID（Noneの場合は全ドキュメント対象、管理者用）
        organization_id: テナントID（マルチテナント分離用）
        """
        if top_k is None:
            top_k = settings.retrieval_top_k

        query_embedding = self.get_embedding(query)
        embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"

        # 新しさボーナス: 180日半減期で最大0.03加算（同等の類似度なら新しい文書を優先）
        recency_expr = """
                           0.03 * EXP(-EXTRACT(EPOCH FROM (NOW() - COALESCE(d.updated_at, d.created_at))) / (86400.0 * 180))"""

        # 部門別アクセス制御を含むクエリ
        if user_department_id:
            if organization_id:
                sql = text(f"""
                    SELECT dc.id, dc.document_id, dc.content, dc.chunk_index,
                           d.filename, d.file_type,
                           (1 - (dc.embedding <=> cast(:query_embedding as vector)))
                           +{recency_expr}
                           as similarity
                    FROM document_chunks dc
                    JOIN documents d ON dc.document_id = d.id
                    LEFT JOIN document_department dd ON d.id = dd.document_id
                    WHERE (d.is_public = true OR dd.department_id = :department_id)
                       AND dc.organization_id = :organization_id
                    GROUP BY dc.id, dc.document_id, dc.content, dc.chunk_index,
                             d.filename, d.file_type, dc.embedding, d.updated_at, d.created_at
                    ORDER BY similarity DESC
                    LIMIT :top_k
                """)
                result = db.execute(sql, {
                    "query_embedding": embedding_str,
                    "top_k": top_k,
                    "department_id": user_department_id,
                    "organization_id": organization_id,
                })
            else:
                sql = text(f"""
                    SELECT dc.id, dc.document_id, dc.content, dc.chunk_index,
                           d.filename, d.file_type,
                           (1 - (dc.embedding <=> cast(:query_embedding as vector)))
                           +{recency_expr}
                           as similarity
                    FROM document_chunks dc
                    JOIN documents d ON dc.document_id = d.id
                    LEFT JOIN document_department dd ON d.id = dd.document_id
                    WHERE d.is_public = true
                       OR dd.department_id = :department_id
                    GROUP BY dc.id, dc.document_id, dc.content, dc.chunk_index,
                             d.filename, d.file_type, dc.embedding, d.updated_at, d.created_at
                    ORDER BY similarity DESC
                    LIMIT :top_k
                """)
                result = db.execute(sql, {
                    "query_embedding": embedding_str,
                    "top_k": top_k,
                    "department_id": user_department_id,
                })
        else:
            if organization_id:
                sql = text(f"""
                    SELECT dc.id, dc.document_id, dc.content, dc.chunk_index,
                           d.filename, d.file_type,
                           (1 - (dc.embedding <=> cast(:query_embedding as vector)))
                           +{recency_expr}
                           as similarity
                    FROM document_chunks dc
                    JOIN documents d ON dc.document_id = d.id
                    WHERE dc.organization_id = :organization_id
                    ORDER BY similarity DESC
                    LIMIT :top_k
                """)
                result = db.execute(sql, {
                    "query_embedding": embedding_str,
                    "top_k": top_k,
                    "organization_id": organization_id,
                })
            else:
                sql = text(f"""
                    SELECT dc.id, dc.document_id, dc.content, dc.chunk_index,
                           d.filename, d.file_type,
                           (1 - (dc.embedding <=> cast(:query_embedding as vector)))
                           +{recency_expr}
                           as similarity
                    FROM document_chunks dc
                    JOIN documents d ON dc.document_id = d.id
                    ORDER BY similarity DESC
                    LIMIT :top_k
                """)
                result = db.execute(sql, {
                    "query_embedding": embedding_str,
                    "top_k": top_k,
                })

        return [
            {
                "chunk_id": row.id,
                "document_id": row.document_id,
                "content": row.content,
                "chunk_index": row.chunk_index,
                "filename": row.filename,
                "file_type": row.file_type,
                "similarity": row.similarity,
            }
            for row in result
        ]

    async def generate_answer(
        self, question: str, context_chunks: list[dict], conversation_history: list[dict] = None
    ) -> AsyncGenerator[str, None]:
        if conversation_history is None:
            conversation_history = []

        context = "\n\n".join([
            f"【{chunk['filename']}】\n{chunk['content']}"
            for chunk in context_chunks
        ])

        history_text = ""
        if conversation_history:
            history_text = "\n".join([
                f"{'ユーザー' if msg['role'] == 'user' else 'アシスタント'}: {msg['content']}"
                for msg in conversation_history
            ])

        system_prompt = """あなたは社内FAQアシスタントです。
社員からの質問に対して、提供されたドキュメントに基づいて正確に回答してください。

【回答のルール】
1. 提供されたドキュメントに基づいて回答する
2. ドキュメントに情報がない場合は「この情報は登録されているドキュメントに含まれていません。事務局にお問い合わせください。」と回答する
3. 簡潔で分かりやすい日本語で回答する
4. 必要に応じて箇条書きや番号付きリストを使用する

【重要：個人への適用判断について】
- 制度の説明は行うが、「あなたは取得できます」のように個人への適用を断定しない
- 適用条件（入社年数、雇用形態など）がある場合は必ず明記する
- 個人が条件を満たすか判断するために必要な情報が不足している場合は、ユーザーに確認を求める
  例：「入社されてどれくらいですか？」「雇用形態を教えていただけますか？」
- 最終的な適用判断は人事部への確認を促す

【会話の継続性】
- 過去の会話履歴を考慮して、文脈に沿った回答をする
- 代名詞（それ、これ、その制度など）が何を指すか、会話履歴から判断する"""

        if history_text:
            system_prompt += f"\n\n【これまでの会話】\n{history_text}"

        system_prompt += f"\n\n【参照ドキュメント】\n{context}"

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{question}"),
        ])

        chain = prompt | self.llm

        async for chunk in chain.astream({
            "question": question,
        }):
            if chunk.content:
                yield chunk.content


rag_service = RAGService()
