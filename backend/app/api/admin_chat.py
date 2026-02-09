import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_admin, get_current_org_id
from app.models.document import User
from app.services.admin_agent import AdminAgent

router = APIRouter(prefix="/api/admin/agent", tags=["admin-agent"])


class ChatMessage(BaseModel):
    role: str
    content: str


class AdminChatRequest(BaseModel):
    message: str
    conversation_history: list[ChatMessage] = []


@router.post("/chat")
async def admin_agent_chat(
    request: AdminChatRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    org_id: str = Depends(get_current_org_id),
):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="メッセージを入力してください")

    history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history[-20:]]
    agent = AdminAgent(db, org_id)

    async def generate():
        async for event in agent.run(message, history):
            yield event

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/download/{filename}")
async def download_document(
    filename: str,
    _: User = Depends(get_current_admin),
):
    generated_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "generated_docs",
    )
    filepath = os.path.join(generated_dir, filename)

    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")

    # パストラバーサル防止
    if os.path.realpath(filepath) != os.path.join(os.path.realpath(generated_dir), filename):
        raise HTTPException(status_code=400, detail="不正なファイル名です")

    return FileResponse(
        filepath,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename,
    )
