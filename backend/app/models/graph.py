import uuid

from sqlalchemy import Column, String, Text, DateTime, Float, ForeignKey, Table, Integer, Index
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.core.database import Base
from app.models.document import utc_now


# 中間テーブル: エンティティと部門の多対多関係
graph_entity_department = Table(
    "graph_entity_department",
    Base.metadata,
    Column("entity_id", String(36), ForeignKey("graph_entities.id", ondelete="CASCADE"), primary_key=True),
    Column("department_id", String(36), ForeignKey("departments.id", ondelete="CASCADE"), primary_key=True),
)


class GraphEntity(Base):
    """ナレッジグラフのエンティティ（人名・部門名・制度名・プロジェクト名等）"""
    __tablename__ = "graph_entities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)  # person, department, policy, project
    description = Column(Text, default="")
    embedding = Column(Vector(1536))
    properties = Column(Text, default="{}")  # JSON: 追加属性
    ref_count = Column(Integer, default=1)  # 参照カウント（ドキュメント数）
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    departments = relationship("Department", secondary=graph_entity_department)
    outgoing_relations = relationship(
        "GraphRelation", foreign_keys="GraphRelation.source_id",
        back_populates="source", cascade="all, delete-orphan"
    )
    incoming_relations = relationship(
        "GraphRelation", foreign_keys="GraphRelation.target_id",
        back_populates="target", cascade="all, delete-orphan"
    )


class GraphRelation(Base):
    """エンティティ間のリレーション"""
    __tablename__ = "graph_relations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    source_id = Column(String(36), ForeignKey("graph_entities.id", ondelete="CASCADE"), nullable=False, index=True)
    target_id = Column(String(36), ForeignKey("graph_entities.id", ondelete="CASCADE"), nullable=False, index=True)
    relation_type = Column(String(100), nullable=False, index=True)  # belongs_to, manages, related_to
    weight = Column(Float, default=1.0)
    source_document_id = Column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    source = relationship("GraphEntity", foreign_keys=[source_id], back_populates="outgoing_relations")
    target = relationship("GraphEntity", foreign_keys=[target_id], back_populates="incoming_relations")
