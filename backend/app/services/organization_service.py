"""Organization サービス: サインアップ時のOrg+User+Settings一括作成"""
import re
import unicodedata
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.models.document import User, SystemSettings
from app.services.auth import get_password_hash


def _generate_slug(name: str) -> str:
    """企業名からURL-safe slugを生成"""
    # 全角→半角変換
    normalized = unicodedata.normalize("NFKC", name).lower()
    # 英数字とハイフン以外を除去
    slug = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    if not slug:
        slug = "org"
    return slug


def _ensure_unique_slug(db: Session, base_slug: str) -> str:
    """ユニークなslugを生成"""
    slug = base_slug
    counter = 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


def create_organization_with_admin(
    db: Session,
    company_name: str,
    email: str,
    password: str,
) -> tuple[Organization, User]:
    """Organization + 管理者User + デフォルトSystemSettingsを一括作成"""
    base_slug = _generate_slug(company_name)
    slug = _ensure_unique_slug(db, base_slug)

    # Organization作成
    org = Organization(
        name=company_name,
        slug=slug,
        plan="trial",
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14),
        is_active=True,
    )
    db.add(org)
    db.flush()

    # 管理者User作成
    user = User(
        organization_id=org.id,
        email=email,
        password_hash=get_password_hash(password),
        name=email.split("@")[0],  # メールアドレスの@前をデフォルト名に
        role="admin",
    )
    db.add(user)
    db.flush()

    # デフォルトSystemSettings作成
    settings = SystemSettings(
        organization_id=org.id,
        company_name=company_name,
    )
    db.add(settings)

    db.commit()
    db.refresh(org)
    db.refresh(user)

    return org, user
