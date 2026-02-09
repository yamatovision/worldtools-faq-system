"""さくらクラウド SFTP連携サービス

BoxServiceと同じインターフェースで、SFTPサーバーからファイルを取得する。
設定画面の「さくらクラウド連携」に対応。

DB設定マッピング（BOXフィールドを流用）:
  box_enterprise_id  → SFTPホスト名
  box_client_id      → SFTPユーザー名
  box_client_secret   → SFTPパスワード
  box_jwt_key_id     → SFTPポート番号
  box_private_key    → SSH秘密鍵
  box_private_key_passphrase → 秘密鍵パスフレーズ
  box_watched_folder_id → 監視ディレクトリパス
"""

import io
import logging
import os
import socket
import stat
from dataclasses import dataclass
from datetime import datetime, timezone

import paramiko
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document import Document, DocumentChunk
from app.services.document_processor import document_processor
from app.services.rag import rag_service

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {
    "pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt",
    "csv", "txt", "md", "json", "html", "htm", "key",
}


@dataclass
class SFTPCredentials:
    hostname: str = ""
    username: str = ""
    password: str = ""
    port: int = 22
    private_key: str = ""
    private_key_passphrase: str = ""


class SFTPService:
    def __init__(self, credentials: SFTPCredentials | None = None):
        self._credentials = credentials

    @property
    def _creds(self) -> SFTPCredentials:
        if self._credentials:
            return self._credentials
        return SFTPCredentials(
            hostname=settings.box_enterprise_id,
            username=settings.box_client_id,
            password=settings.box_client_secret,
            port=int(settings.box_jwt_key_id) if settings.box_jwt_key_id else 22,
            private_key=settings.box_private_key,
            private_key_passphrase=settings.box_private_key_passphrase,
        )

    @property
    def is_configured(self) -> bool:
        c = self._creds
        if not (c.hostname and c.username):
            return False
        # ホスト名が数字のみ(旧BOX Enterprise ID)の場合はSFTP未設定と判定
        if c.hostname.isdigit():
            return False
        return True

    def _connect(self) -> paramiko.SFTPClient:
        c = self._creds
        sock = socket.create_connection((c.hostname, c.port), timeout=5)
        transport = paramiko.Transport(sock)

        if c.private_key:
            key_str = c.private_key.replace("\\n", "\n")
            key_file = io.StringIO(key_str)
            passphrase = c.private_key_passphrase or None
            try:
                pkey = paramiko.RSAKey.from_private_key(key_file, password=passphrase)
            except paramiko.SSHException:
                key_file.seek(0)
                pkey = paramiko.Ed25519Key.from_private_key(key_file, password=passphrase)
            transport.connect(username=c.username, pkey=pkey)
        else:
            transport.connect(username=c.username, password=c.password)

        return paramiko.SFTPClient.from_transport(transport)

    def test_connection(self) -> dict:
        sftp = self._connect()
        try:
            cwd = sftp.normalize(".")
            items = sftp.listdir(cwd)
            return {"success": True, "cwd": cwd, "items": len(items)}
        finally:
            sftp.close()

    def list_folders(self, parent_path: str = "/") -> list[dict]:
        sftp = self._connect()
        try:
            folders = []
            for entry in sftp.listdir_attr(parent_path):
                if stat.S_ISDIR(entry.st_mode or 0):
                    full_path = f"{parent_path.rstrip('/')}/{entry.filename}"
                    folders.append({
                        "id": full_path,
                        "name": entry.filename,
                        "type": "folder",
                    })
            return folders
        finally:
            sftp.close()

    def list_files(self, folder_path: str) -> list[dict]:
        sftp = self._connect()
        try:
            files = []
            for entry in sftp.listdir_attr(folder_path):
                if not stat.S_ISREG(entry.st_mode or 0):
                    continue
                name = entry.filename
                ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
                if ext not in SUPPORTED_EXTENSIONS:
                    continue
                full_path = f"{folder_path.rstrip('/')}/{name}"
                modified_at = ""
                if entry.st_mtime:
                    modified_at = datetime.fromtimestamp(
                        entry.st_mtime, tz=timezone.utc
                    ).isoformat()
                files.append({
                    "id": full_path,
                    "name": name,
                    "size": entry.st_size or 0,
                    "modified_at": modified_at,
                    "file_type": ext,
                })
            return files
        finally:
            sftp.close()

    def download_file(self, file_path: str) -> tuple[bytes, str]:
        sftp = self._connect()
        try:
            buf = io.BytesIO()
            sftp.getfo(file_path, buf)
            buf.seek(0)
            filename = os.path.basename(file_path)
            return buf.read(), filename
        finally:
            sftp.close()

    def get_file_info(self, file_path: str) -> dict:
        sftp = self._connect()
        try:
            st = sftp.stat(file_path)
            modified_at = None
            if st.st_mtime:
                modified_at = datetime.fromtimestamp(
                    st.st_mtime, tz=timezone.utc
                ).isoformat()
            return {
                "id": file_path,
                "name": os.path.basename(file_path),
                "modified_at": modified_at,
                "size": st.st_size or 0,
            }
        finally:
            sftp.close()

    def sync_file(
        self,
        db: Session,
        file_path: str,
        is_public: bool = True,
        department_ids: list[str] | None = None,
        organization_id: str | None = None,
    ) -> Document:
        content, filename = self.download_file(file_path)

        file_type = document_processor.get_file_type(filename)
        text = document_processor.extract_text(filename, content)
        if not text.strip():
            raise ValueError(f"テキストを抽出できませんでした: {filename}")

        # 既存ドキュメントの検索（box_file_idにファイルパスを格納）
        existing = db.query(Document).filter(
            Document.box_file_id == file_path
        ).first()
        if existing:
            db.query(DocumentChunk).filter(
                DocumentChunk.document_id == existing.id
            ).delete()
            document = existing
            document.filename = filename
            document.file_type = file_type
            document.is_public = is_public
        else:
            document = Document(
                filename=filename,
                file_type=file_type,
                is_public=is_public,
                box_file_id=file_path,
                organization_id=organization_id,
            )
            db.add(document)
            db.flush()

        # 部門割当
        if department_ids:
            from app.models.document import Department
            departments = db.query(Department).filter(
                Department.id.in_(department_ids)
            ).all()
            document.departments = departments
        else:
            document.departments = []

        # 元ファイルをディスクに保存
        if organization_id:
            uploads_base = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "uploads",
            )
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


def get_sftp_service_for_org(db: Session, org_id: str) -> SFTPService:
    """DB設定からSFTPServiceを構築"""
    from app.models.document import SystemSettings

    sys_settings = db.query(SystemSettings).filter(
        SystemSettings.organization_id == org_id
    ).first()

    if sys_settings and sys_settings.box_client_id and sys_settings.box_enterprise_id:
        port = 22
        if sys_settings.box_jwt_key_id:
            try:
                port = int(sys_settings.box_jwt_key_id)
            except ValueError:
                port = 22
        creds = SFTPCredentials(
            hostname=sys_settings.box_enterprise_id,
            username=sys_settings.box_client_id,
            password=sys_settings.box_client_secret or "",
            port=port,
            private_key=sys_settings.box_private_key or "",
            private_key_passphrase=sys_settings.box_private_key_passphrase or "",
        )
        return SFTPService(credentials=creds)

    return SFTPService()
