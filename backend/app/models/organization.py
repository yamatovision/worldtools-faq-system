import uuid

from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.document import utc_now


class Organization(Base):
    """テナント（組織）"""
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    plan = Column(String(20), default="trial")  # trial / paid / enterprise
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    users = relationship("User", back_populates="organization")
    departments = relationship("Department", back_populates="organization")
    documents = relationship("Document", back_populates="organization")
    chat_histories = relationship("ChatHistory", back_populates="organization")
    system_settings = relationship("SystemSettings", back_populates="organization", uselist=False)
