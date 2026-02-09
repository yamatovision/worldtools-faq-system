import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, Boolean, Table, Index
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


# 中間テーブル: ドキュメントと部門の多対多関係
document_department = Table(
    "document_department",
    Base.metadata,
    Column("document_id", String(36), ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
    Column("department_id", String(36), ForeignKey("departments.id", ondelete="CASCADE"), primary_key=True),
)


class Department(Base):
    """部門"""
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    __table_args__ = (
        Index("ix_departments_org_name", "organization_id", "name", unique=True),
    )

    organization = relationship("Organization", back_populates="departments")
    users = relationship("User", back_populates="department")
    documents = relationship("Document", secondary=document_department, back_populates="departments")


class User(Base):
    """ユーザー"""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    sso_provider = Column(String(50), nullable=True)   # "okta" 等
    sso_id = Column(String(255), nullable=True)         # SSO側ユニークID
    name = Column(String(100), nullable=False)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    role = Column(String(20), nullable=False, default="user")  # user, admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    __table_args__ = (
        Index("ix_users_org_email", "organization_id", "email", unique=True),
    )

    organization = relationship("Organization", back_populates="users")
    department = relationship("Department", back_populates="users")
    chat_histories = relationship("ChatHistory", back_populates="user")


class SystemSettings(Base):
    """システム設定（テナント毎1行）"""
    __tablename__ = "system_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, unique=True)
    company_name = Column(String(100), default="")

    # Okta SSO
    okta_domain = Column(String(255), default="")
    okta_client_id = Column(String(100), default="")
    okta_client_secret = Column(String(200), default="")

    # BOX連携
    box_client_id = Column(String(100), default="")
    box_client_secret = Column(String(200), default="")
    box_enterprise_id = Column(String(50), default="")
    box_jwt_key_id = Column(String(50), default="")
    box_private_key = Column(Text, default="")
    box_private_key_passphrase = Column(String(200), default="")
    box_watched_folder_id = Column(String(50), default="")
    box_poll_enabled = Column(Boolean, default=False)

    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    organization = relationship("Organization", back_populates="system_settings")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(10), nullable=False)  # pdf, docx, txt
    is_public = Column(Boolean, default=True)  # 全社公開フラグ
    category = Column(String(50), default="")  # カテゴリ
    graph_build_status = Column(String(20), default="pending")  # pending, building, completed, failed
    file_path = Column(String(500), nullable=True)  # 元ファイルの保存パス
    box_file_id = Column(String(50), nullable=True, index=True)
    box_sync_status = Column(String(20), nullable=True)  # synced / outdated / error
    box_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    __table_args__ = (
        Index("ix_documents_org_created", "organization_id", "created_at"),
    )

    organization = relationship("Organization", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    departments = relationship("Department", secondary=document_department, back_populates="documents")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1536))  # text-embedding-3-small
    chunk_index = Column(Integer, nullable=False)

    __table_args__ = (
        Index("ix_chunks_org_doc", "organization_id", "document_id"),
    )

    document = relationship("Document", back_populates="chunks")


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    referenced_doc_ids = Column(Text)  # JSON array of document IDs
    avg_similarity = Column(String(10))  # Average similarity score (0.0-1.0)
    is_no_answer = Column(String(1), default="0")  # "1" if AI couldn't answer
    feedback = Column(String(10))  # good, bad, null
    admin_memo = Column(Text)  # 管理者メモ
    agentic_trace = Column(Text)  # JSON: Agenticフローの実行トレース
    created_at = Column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        Index("ix_chat_org_user", "organization_id", "user_id"),
    )

    organization = relationship("Organization", back_populates="chat_histories")
    user = relationship("User", back_populates="chat_histories")
