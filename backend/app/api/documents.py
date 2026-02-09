import logging
import os
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.auth import get_current_user_optional, get_current_admin, get_current_org_id, get_current_org_id_optional
from app.services.rag import rag_service
from app.services.document_processor import document_processor
from app.services.box_service import box_service, get_box_service_for_org
from app.models.document import Document, DocumentChunk, Department, User

UPLOADS_BASE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])


class DocumentPermissionUpdate(BaseModel):
    is_public: bool
    department_ids: List[str] = []


class BoxSyncRequest(BaseModel):
    file_ids: List[str]
    is_public: bool = True
    department_ids: List[str] = []



@router.get("")
async def list_documents(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    org_id: Optional[str] = Depends(get_current_org_id_optional)
):
    """ドキュメント一覧（部門別アクセス制御付き）"""
    # チャンク数をサブクエリで取得（N+1回避）
    chunk_count_sq = (
        db.query(DocumentChunk.document_id, func.count(DocumentChunk.id).label("chunk_count"))
        .group_by(DocumentChunk.document_id)
        .subquery()
    )

    query = (
        db.query(Document, chunk_count_sq.c.chunk_count)
        .outerjoin(chunk_count_sq, Document.id == chunk_count_sq.c.document_id)
        .options(joinedload(Document.departments))
    )

    # org_idフィルタ（マルチテナント対応）
    if org_id:
        query = query.filter(Document.organization_id == org_id)

    # 一般ユーザーの場合は公開ドキュメントと自部門のドキュメントのみ
    if current_user and current_user.role != "admin":
        if current_user.department_id:
            query = query.filter(
                (Document.is_public == True) |
                (Document.departments.any(Department.id == current_user.department_id))
            )
        else:
            query = query.filter(Document.is_public == True)

    rows = query.order_by(Document.created_at.desc()).all()

    # joinedloadで重複が生じる場合があるため、一意化
    seen = set()
    result = []
    for doc, chunk_count in rows:
        if doc.id in seen:
            continue
        seen.add(doc.id)
        result.append({
            "id": doc.id,
            "filename": doc.filename,
            "file_type": doc.file_type,
            "is_public": doc.is_public,
            "category": doc.category,
            "department_ids": [d.id for d in doc.departments],
            "department_names": [d.name for d in doc.departments],
            "created_at": doc.created_at.isoformat(),
            "chunk_count": chunk_count or 0,
            "has_original_file": bool(doc.file_path),
            "box_file_id": doc.box_file_id,
            "box_sync_status": doc.box_sync_status,
            "box_synced_at": doc.box_synced_at.isoformat() if doc.box_synced_at else None,
        })

    return result


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    is_public: bool = True,
    category: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """ドキュメントアップロード（管理者のみ）"""
    # ファイルタイプの検証
    try:
        file_type = document_processor.get_file_type(file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # ファイル内容を読み込み
    content = await file.read()

    # テキスト抽出
    try:
        text = document_processor.extract_text(file.filename, content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"ファイルの読み込みに失敗しました: {str(e)}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="ドキュメントからテキストを抽出できませんでした")

    # ドキュメントを作成（organization_id追加）
    document = Document(
        filename=file.filename,
        file_type=file_type,
        is_public=is_public,
        category=category,
        organization_id=current_user.organization_id,
    )
    db.add(document)
    db.flush()

    # 元ファイルをディスクに保存
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else file_type
    upload_dir = os.path.join(UPLOADS_BASE_DIR, current_user.organization_id)
    os.makedirs(upload_dir, exist_ok=True)
    save_path = os.path.join(upload_dir, f"{document.id}.{ext}")
    with open(save_path, "wb") as f:
        f.write(content)
    document.file_path = save_path

    # チャンク分割
    chunks = rag_service.chunk_text(text)

    # エンベディング生成
    embeddings = rag_service.get_embeddings(chunks)

    # チャンクを保存（organization_id追加）
    for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
        chunk = DocumentChunk(
            document_id=document.id,
            content=chunk_text,
            embedding=embedding,
            chunk_index=i,
            organization_id=current_user.organization_id,
        )
        db.add(chunk)

    db.commit()

    return {
        "id": document.id,
        "filename": document.filename,
        "file_type": document.file_type,
        "is_public": document.is_public,
        "chunk_count": len(chunks),
    }


@router.get("/{document_id}")
async def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    org_id: Optional[str] = Depends(get_current_org_id_optional)
):
    """ドキュメント詳細（部門別アクセス制御付き）"""
    query = db.query(Document).filter(Document.id == document_id)

    # org_idフィルタ（マルチテナント対応）
    if org_id:
        query = query.filter(Document.organization_id == org_id)

    document = query.first()
    if not document:
        raise HTTPException(status_code=404, detail="ドキュメントが見つかりません")

    # アクセス権チェック
    if current_user and current_user.role != "admin":
        has_access = document.is_public
        if not has_access and current_user.department_id:
            has_access = any(d.id == current_user.department_id for d in document.departments)
        if not has_access:
            raise HTTPException(status_code=403, detail="このドキュメントへのアクセス権がありません")

    return {
        "id": document.id,
        "filename": document.filename,
        "file_type": document.file_type,
        "is_public": document.is_public,
        "category": document.category,
        "department_ids": [d.id for d in document.departments],
        "department_names": [d.name for d in document.departments],
        "created_at": document.created_at.isoformat(),
        "has_original_file": bool(document.file_path),
        "chunks": [
            {
                "index": chunk.chunk_index,
                "content": chunk.content,
            }
            for chunk in sorted(document.chunks, key=lambda c: c.chunk_index)
        ],
    }


@router.put("/{document_id}/permissions")
async def update_document_permissions(
    document_id: str,
    request: DocumentPermissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """ドキュメントの権限を更新（管理者のみ）"""
    query = db.query(Document).filter(Document.id == document_id)

    # org_idフィルタ（マルチテナント対応）
    query = query.filter(Document.organization_id == current_user.organization_id)

    document = query.first()
    if not document:
        raise HTTPException(status_code=404, detail="ドキュメントが見つかりません")

    # 公開設定を更新
    document.is_public = request.is_public

    # 部門を更新
    if request.department_ids:
        departments = db.query(Department).filter(Department.id.in_(request.department_ids)).all()
        document.departments = departments
    else:
        document.departments = []

    db.commit()

    return {
        "id": document.id,
        "is_public": document.is_public,
        "department_ids": [d.id for d in document.departments],
    }


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """ドキュメント削除（管理者のみ）"""
    query = db.query(Document).filter(Document.id == document_id)

    # org_idフィルタ（マルチテナント対応）
    query = query.filter(Document.organization_id == current_user.organization_id)

    document = query.first()
    if not document:
        raise HTTPException(status_code=404, detail="ドキュメントが見つかりません")

    # 元ファイルをディスクから削除
    if document.file_path:
        try:
            os.unlink(document.file_path)
        except OSError:
            logger.warning(f"元ファイルの削除に失敗: {document.file_path}")

    db.delete(document)
    db.commit()

    return {"success": True}


MEDIA_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "doc": "application/msword",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xls": "application/vnd.ms-excel",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "ppt": "application/vnd.ms-powerpoint",
    "key": "application/x-iwork-keynote-sffkey",
    "txt": "text/plain",
    "md": "text/markdown",
    "csv": "text/csv",
    "json": "application/json",
    "html": "text/html",
}


@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    org_id: Optional[str] = Depends(get_current_org_id_optional),
):
    """元ファイルのダウンロード（認証済みユーザー）"""
    query = db.query(Document).filter(Document.id == document_id)
    if org_id:
        query = query.filter(Document.organization_id == org_id)
    document = query.first()
    if not document:
        raise HTTPException(status_code=404, detail="ドキュメントが見つかりません")

    # アクセス権チェック
    if current_user and current_user.role != "admin":
        has_access = document.is_public
        if not has_access and current_user.department_id:
            has_access = any(d.id == current_user.department_id for d in document.departments)
        if not has_access:
            raise HTTPException(status_code=403, detail="このドキュメントへのアクセス権がありません")

    if not document.file_path:
        raise HTTPException(status_code=404, detail="元ファイルが保存されていません")

    if not os.path.isfile(document.file_path):
        raise HTTPException(status_code=404, detail="元ファイルが見つかりません")

    # パストラバーサル防止
    real_path = os.path.realpath(document.file_path)
    if not real_path.startswith(os.path.realpath(UPLOADS_BASE_DIR)):
        raise HTTPException(status_code=400, detail="不正なファイルパスです")

    media_type = MEDIA_TYPES.get(document.file_type, "application/octet-stream")
    return FileResponse(
        real_path,
        media_type=media_type,
        filename=document.filename,
    )


# ==============================
# BOX連携エンドポイント
# ==============================


@router.get("/box/configured")
async def box_configured(
    db: Session = Depends(get_db),
    org_id: Optional[str] = Depends(get_current_org_id_optional),
):
    """BOX連携が設定済みかどうかを返す"""
    svc = get_box_service_for_org(db, org_id) if org_id else box_service
    return {"configured": svc.is_configured}


@router.get("/box/folders")
async def box_list_folders(
    parent_id: str = "0",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """BOXフォルダ一覧（管理者のみ）"""
    svc = get_box_service_for_org(db, current_user.organization_id)
    if not svc.is_configured:
        raise HTTPException(status_code=400, detail="BOX連携が設定されていません")
    try:
        return svc.list_folders(parent_id)
    except Exception as e:
        logger.error(f"BOX list_folders error: {e}")
        raise HTTPException(status_code=502, detail=f"BOXとの通信に失敗しました: {str(e)}")


@router.get("/box/files/{folder_id}")
async def box_list_files(
    folder_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """BOXフォルダ内ファイル一覧（管理者のみ）+ 同期状態付き"""
    svc = get_box_service_for_org(db, current_user.organization_id)
    if not svc.is_configured:
        raise HTTPException(status_code=400, detail="BOX連携が設定されていません")
    try:
        files = svc.list_files(folder_id)
    except Exception as e:
        logger.error(f"BOX list_files error: {e}")
        raise HTTPException(status_code=502, detail=f"BOXとの通信に失敗しました: {str(e)}")

    # DB上の同期状態を照合
    box_file_ids = [f["id"] for f in files]
    synced_docs = db.query(Document.box_file_id, Document.box_sync_status).filter(
        Document.box_file_id.in_(box_file_ids),
        Document.organization_id == current_user.organization_id,
    ).all()
    sync_map = {d.box_file_id: d.box_sync_status for d in synced_docs}

    for f in files:
        f["sync_status"] = sync_map.get(f["id"])

    return files


@router.post("/box/sync")
async def box_sync_files(
    request: BoxSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """BOXファイル同期実行（管理者のみ）"""
    svc = get_box_service_for_org(db, current_user.organization_id)
    if not svc.is_configured:
        raise HTTPException(status_code=400, detail="BOX連携が設定されていません")

    results = []
    for file_id in request.file_ids:
        try:
            doc = svc.sync_file(
                db=db,
                file_id=file_id,
                is_public=request.is_public,
                department_ids=request.department_ids or None,
                organization_id=current_user.organization_id,
            )
            results.append({"file_id": file_id, "document_id": doc.id, "status": "synced"})
        except Exception as e:
            logger.error(f"BOX sync error for {file_id}: {e}")
            results.append({"file_id": file_id, "document_id": None, "status": "error", "detail": str(e)})

    return {"results": results}

