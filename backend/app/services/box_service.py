import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone

from box_sdk_gen import BoxClient, BoxJWTAuth, JWTConfig
from box_sdk_gen.schemas.file_full import FileFull
from box_sdk_gen.schemas.folder_mini import FolderMini
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document import Document, DocumentChunk
from app.services.document_processor import document_processor
from app.services.rag import rag_service

logger = logging.getLogger(__name__)


@dataclass
class BoxCredentials:
    client_id: str = ""
    client_secret: str = ""
    enterprise_id: str = ""
    jwt_key_id: str = ""
    private_key: str = ""
    private_key_passphrase: str = ""


class BoxService:
    def __init__(self, credentials: BoxCredentials | None = None):
        self._client: BoxClient | None = None
        self._credentials = credentials

    @property
    def _creds(self) -> BoxCredentials:
        if self._credentials:
            return self._credentials
        return BoxCredentials(
            client_id=settings.box_client_id,
            client_secret=settings.box_client_secret,
            enterprise_id=settings.box_enterprise_id,
            jwt_key_id=settings.box_jwt_key_id,
            private_key=settings.box_private_key,
            private_key_passphrase=settings.box_private_key_passphrase,
        )

    @property
    def is_configured(self) -> bool:
        c = self._creds
        return bool(c.client_id and c.enterprise_id)

    def _get_client(self) -> BoxClient:
        if self._client is None:
            c = self._creds
            jwt_config = JWTConfig(
                client_id=c.client_id,
                client_secret=c.client_secret,
                jwt_key_id=c.jwt_key_id,
                private_key=c.private_key.replace("\\n", "\n"),
                private_key_passphrase=c.private_key_passphrase,
                enterprise_id=c.enterprise_id,
            )
            auth = BoxJWTAuth(config=jwt_config)
            self._client = BoxClient(auth=auth)
        return self._client

    def list_folders(self, parent_id: str = "0") -> list[dict]:
        client = self._get_client()
        items = client.folders.get_folder_items(
            parent_id,
            fields=["id", "name", "type", "item_collection"],
            limit=1000,
        )
        folders = []
        for entry in items.entries or []:
            if isinstance(entry, FolderMini):
                folders.append({
                    "id": entry.id,
                    "name": entry.name,
                    "type": "folder",
                })
        return folders

    def list_files(self, folder_id: str) -> list[dict]:
        client = self._get_client()
        items = client.folders.get_folder_items(
            folder_id,
            fields=["id", "name", "size", "modified_at", "type"],
            limit=1000,
        )
        files = []
        for entry in items.entries or []:
            if isinstance(entry, FileFull):
                name = entry.name or ""
                ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
                files.append({
                    "id": entry.id,
                    "name": name,
                    "size": entry.size or 0,
                    "modified_at": str(entry.modified_at) if entry.modified_at else "",
                    "file_type": ext,
                })
        return files

    def download_file(self, file_id: str) -> tuple[bytes, str]:
        client = self._get_client()
        file_info = client.files.get_file_by_id(file_id, fields=["name"])
        filename = file_info.name or f"file_{file_id}"
        stream = client.downloads.download_file(file_id)
        content = stream.read()
        stream.close()
        return content, filename

    def sync_file(
        self,
        db: Session,
        file_id: str,
        is_public: bool = True,
        department_ids: list[str] | None = None,
        organization_id: str | None = None,
    ) -> Document:
        content, filename = self.download_file(file_id)

        file_type = document_processor.get_file_type(filename)
        text = document_processor.extract_text(filename, content)
        if not text.strip():
            raise ValueError(f"テキストを抽出できませんでした: {filename}")

        # 既存ドキュメントの検索（box_file_idで重複排除）
        existing = db.query(Document).filter(Document.box_file_id == file_id).first()
        if existing:
            # 旧チャンク削除
            db.query(DocumentChunk).filter(DocumentChunk.document_id == existing.id).delete()
            document = existing
            document.filename = filename
            document.file_type = file_type
            document.is_public = is_public
        else:
            document = Document(
                filename=filename,
                file_type=file_type,
                is_public=is_public,
                box_file_id=file_id,
                organization_id=organization_id,
            )
            db.add(document)
            db.flush()

        # 部門割当
        if department_ids:
            from app.models.document import Department
            departments = db.query(Department).filter(Department.id.in_(department_ids)).all()
            document.departments = departments
        else:
            document.departments = []

        # 元ファイルをディスクに保存
        if organization_id:
            uploads_base = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
            upload_dir = os.path.join(uploads_base, organization_id)
            os.makedirs(upload_dir, exist_ok=True)
            ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else file_type
            save_path = os.path.join(upload_dir, f"{document.id}.{ext}")
            with open(save_path, "wb") as f:
                f.write(content)
            document.file_path = save_path

        # チャンク分割 + エンベディング
        chunks = rag_service.chunk_text(text)
        embeddings = rag_service.get_embeddings(chunks)

        for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
            db.add(DocumentChunk(
                document_id=document.id,
                content=chunk_text,
                embedding=embedding,
                chunk_index=i,
                organization_id=organization_id,
            ))

        document.box_sync_status = "synced"
        document.box_synced_at = datetime.now(timezone.utc)
        db.commit()

        return document

    def get_file_info(self, file_id: str) -> dict:
        """BOXファイルのメタ情報を取得"""
        client = self._get_client()
        info = client.files.get_file_by_id(file_id, fields=["name", "modified_at", "size"])
        return {
            "id": info.id,
            "name": info.name,
            "modified_at": info.modified_at.isoformat() if info.modified_at else None,
            "size": info.size,
        }


def get_box_service_for_org(db: Session, org_id: str) -> BoxService:
    """DB設定 → .env.local フォールバックでBoxServiceを構築"""
    from app.models.document import SystemSettings

    sys_settings = db.query(SystemSettings).filter(
        SystemSettings.organization_id == org_id
    ).first()

    if sys_settings and sys_settings.box_client_id and sys_settings.box_enterprise_id:
        creds = BoxCredentials(
            client_id=sys_settings.box_client_id,
            client_secret=sys_settings.box_client_secret or "",
            enterprise_id=sys_settings.box_enterprise_id,
            jwt_key_id=sys_settings.box_jwt_key_id or "",
            private_key=sys_settings.box_private_key or "",
            private_key_passphrase=sys_settings.box_private_key_passphrase or "",
        )
        return BoxService(credentials=creds)

    # .env.local フォールバック
    return BoxService()


# グローバルシングルトン（後方互換）
box_service = BoxService()
