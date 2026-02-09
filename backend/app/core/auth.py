"""認証依存関係"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import User
from app.models.organization import Organization
from app.services.auth import decode_token, get_user_by_id


security = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """現在のユーザーを取得（オプション）"""
    if not credentials:
        return None

    payload = decode_token(credentials.credentials)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    user = get_user_by_id(db, user_id)
    if not user or not user.is_active:
        return None

    return user


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """現在のユーザーを取得（必須）"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証が必要です",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なトークンです",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なトークンです",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザーが見つかりません",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="アカウントが無効です",
        )

    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """管理者権限を確認"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理者権限が必要です",
        )
    return current_user


def get_current_org_id(current_user: User = Depends(get_current_user)) -> str:
    """現在のユーザーのorganization_idを取得"""
    return current_user.organization_id


def get_current_org_id_optional(
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> Optional[str]:
    """現在のユーザーのorganization_idを取得（オプション）"""
    if current_user:
        return current_user.organization_id
    return None


def check_trial_status(org: Organization) -> None:
    """トライアルの期限チェック。期限切れの場合は403を返す"""
    if org.plan == "trial" and org.trial_ends_at:
        if datetime.now(timezone.utc) > org.trial_ends_at:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="トライアル期限が切れました。プランのアップグレードについてはお問い合わせください。",
            )
