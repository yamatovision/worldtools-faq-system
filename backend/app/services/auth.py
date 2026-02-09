"""認証サービス"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document import User


# JWT設定
SECRET_KEY = settings.jwt_secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """パスワードを検証"""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    """パスワードをハッシュ化"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """アクセストークンを生成"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """トークンをデコード"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """ユーザーを認証（パスワードログイン）"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not user.password_hash:
        return None  # SSO専用ユーザーはパスワードログイン不可
    if not verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return None
    return user


def get_or_create_sso_user(
    db: Session,
    email: str,
    name: str,
    organization_id: str,
    sso_provider: str,
    sso_id: str,
) -> Optional[User]:
    """SSO認証ユーザーを検索（事前登録済みユーザーのみ許可）"""
    user = db.query(User).filter(
        User.email == email,
        User.organization_id == organization_id,
    ).first()
    if not user:
        return None

    user.sso_provider = sso_provider
    user.sso_id = sso_id
    if not user.name or user.name == email.split("@")[0]:
        user.name = name
    db.commit()
    db.refresh(user)
    return user


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """IDでユーザーを取得"""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """メールでユーザーを取得"""
    return db.query(User).filter(User.email == email).first()


def create_user(
    db: Session,
    email: str,
    password: str,
    name: str,
    organization_id: str,
    department_id: Optional[str] = None,
    role: str = "user"
) -> User:
    """ユーザーを作成"""
    user = User(
        organization_id=organization_id,
        email=email,
        password_hash=get_password_hash(password),
        name=name,
        department_id=department_id,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
