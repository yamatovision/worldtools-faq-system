import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_optional
from app.services.agentic_rag import AgenticRAG
from app.models.document import ChatHistory, User

router = APIRouter(prefix="/api", tags=["chat"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    question: str
    conversation_history: list[ChatMessage] = []  # 直近10件まで


class FeedbackRequest(BaseModel):
    chat_id: str
    feedback: str  # "good" or "bad"


@router.post("/chat")
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="質問を入力してください")

    user_department_id = None
    if current_user and current_user.role != "admin":
        user_department_id = current_user.department_id

    org_id = current_user.organization_id if current_user else None
    history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history[-10:]]

    agent = AgenticRAG(db, org_id, user_department_id)

    async def generate():
        full_answer = ""
        references = []
        avg_similarity = 0.0
        agentic_trace = []

        async for event in agent.run(question, history):
            yield event
            # Parse event to collect final data
            if event.startswith("data: "):
                try:
                    data = json.loads(event[6:].strip())
                    if "token" in data:
                        full_answer += data["token"]
                    if data.get("done"):
                        references = data.get("references", [])
                        avg_similarity = data.get("avg_similarity", 0.0)
                        agentic_trace = data.get("agentic_trace", [])
                except json.JSONDecodeError:
                    pass

        # 回答失敗判定
        no_answer_phrases = [
            "情報は登録されているドキュメントに含まれていません",
            "ドキュメントに含まれていません",
            "情報がありません",
            "見つかりません",
        ]
        is_no_answer = "1" if any(phrase in full_answer for phrase in no_answer_phrases) else "0"

        chat_history = ChatHistory(
            user_id=current_user.id if current_user else None,
            organization_id=org_id,
            question=question,
            answer=full_answer,
            referenced_doc_ids=json.dumps([r["id"] for r in references]),
            avg_similarity=str(round(avg_similarity, 3)),
            is_no_answer=is_no_answer,
            agentic_trace=json.dumps(agentic_trace, ensure_ascii=False) if agentic_trace else None,
        )
        db.add(chat_history)
        db.commit()

        # done イベントに chat_id を付与して再送
        yield f"data: {json.dumps({'chat_id': chat_history.id}, ensure_ascii=False)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/chat/suggestions")
async def chat_suggestions(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """ドキュメントベースのサジェスト質問を返す"""
    org_id = current_user.organization_id if current_user else None

    # ドキュメント名からサジェスト生成
    doc_sql = text("""
        SELECT filename, MAX(updated_at) as latest
        FROM documents
        WHERE organization_id = :org_id
        GROUP BY filename
        ORDER BY latest DESC LIMIT 20
    """)
    rows = db.execute(doc_sql, {"org_id": org_id}).fetchall()
    filenames = [r.filename for r in rows]

    # ファイル名→質問のマッピング
    keyword_map = {
        "就業規則": "有給休暇の取得条件を教えてください",
        "出張": "出張旅費の精算方法は？",
        "経費": "経費精算の申請手順を教えてください",
        "給与": "給与の支払日はいつですか？",
        "育児": "育児休業の取得条件は？",
        "退職": "退職手続きの流れを教えてください",
        "通勤": "通勤手当の支給条件は？",
        "福利厚生": "利用できる福利厚生制度は？",
        "安全": "労働安全衛生のルールを教えてください",
        "服務": "服務規程の概要を教えてください",
    }

    suggestions = []
    for filename in filenames:
        for keyword, question in keyword_map.items():
            if keyword in filename and question not in suggestions:
                suggestions.append(question)
        if len(suggestions) >= 4:
            break

    # 足りない場合はよくある質問で補完
    defaults = [
        "社内規定について質問があります",
        "申請手続きの方法を教えてください",
        "福利厚生の制度を教えてください",
    ]
    for d in defaults:
        if len(suggestions) >= 4:
            break
        if d not in suggestions:
            suggestions.append(d)

    return {"suggestions": suggestions[:4]}


@router.post("/feedback")
async def feedback(request: FeedbackRequest, db: Session = Depends(get_db)):
    chat = db.query(ChatHistory).filter(ChatHistory.id == request.chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="チャット履歴が見つかりません")

    if request.feedback not in ["good", "bad"]:
        raise HTTPException(status_code=400, detail="フィードバックは 'good' または 'bad' である必要があります")

    chat.feedback = request.feedback
    db.commit()

    return {"success": True}
