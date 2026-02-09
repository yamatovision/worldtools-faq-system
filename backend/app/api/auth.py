"""認証API"""
import secrets
from datetime import timedelta
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

limiter = Limiter(key_func=get_remote_address)

from app.core.database import get_db
from app.core.auth import get_current_user, check_trial_status
from app.models.document import User, SystemSettings
from app.models.organization import Organization
from app.services.auth import (
    authenticate_user,
    create_access_token,
    get_user_by_email,
    get_or_create_sso_user,
    ACCESS_TOKEN_EXPIRE_HOURS,
)
from app.services.organization_service import create_organization_with_admin


router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict
    organization: dict


class SignupRequest(BaseModel):
    company_name: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    department_id: str | None
    department_name: str | None
    role: str
    organization_id: str
    organization_name: str | None


def _build_org_dict(org: Organization) -> dict:
    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "plan": org.plan,
        "trialEndsAt": org.trial_ends_at.isoformat() if org.trial_ends_at else None,
        "isActive": org.is_active,
    }


def _build_user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "departmentId": user.department_id,
        "departmentName": user.department.name if user.department else None,
        "role": user.role,
        "organizationId": user.organization_id,
        "organizationName": user.organization.name if user.organization else None,
    }


@router.post("/login", response_model=LoginResponse)
@limiter.limit("100/minute")
async def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    """ログイン"""
    user = authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # トライアル期限チェック
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    if org:
        check_trial_status(org)

    access_token = create_access_token(
        data={
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "org_id": user.organization_id,
        },
        expires_delta=timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )

    return LoginResponse(
        access_token=access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        user=_build_user_dict(user),
        organization=_build_org_dict(org) if org else {},
    )


@router.post("/signup", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def signup(request: Request, body: SignupRequest, db: Session = Depends(get_db)):
    """セルフサービス登録"""
    # メールアドレスの重複チェック（グローバルユニーク）
    if get_user_by_email(db, body.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このメールアドレスは既に使用されています",
        )

    # バリデーション
    if len(body.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="パスワードは8文字以上である必要があります",
        )
    if not body.company_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="企業名を入力してください",
        )

    # Organization + User + Settings一括作成
    org, user = create_organization_with_admin(
        db=db,
        company_name=body.company_name.strip(),
        email=body.email,
        password=body.password,
    )

    # JWT発行
    access_token = create_access_token(
        data={
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "org_id": org.id,
        },
        expires_delta=timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )

    return LoginResponse(
        access_token=access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        user=_build_user_dict(user),
        organization=_build_org_dict(org),
    )


@router.post("/logout")
async def logout():
    """ログアウト（クライアント側でトークンを破棄）"""
    return {"message": "ログアウトしました"}


# ==================== Okta SSO ====================

# state保持用（インメモリ、再起動でクリア）
_okta_states: dict[str, str] = {}

DEFAULT_ORG_ID = "88e53d2c-327f-4886-9b2a-c4adca6d84b3"


class OktaCallbackRequest(BaseModel):
    code: str
    state: str


@router.get("/okta/authorize")
async def okta_authorize(
    db: Session = Depends(get_db),
    org_id: str = DEFAULT_ORG_ID,
):
    """Okta認可URLを構築して返却"""
    ss = db.query(SystemSettings).filter(
        SystemSettings.organization_id == org_id
    ).first()
    if not ss or not ss.okta_domain or not ss.okta_client_id:
        raise HTTPException(status_code=400, detail="Okta SSOが設定されていません")

    state = secrets.token_urlsafe(32)
    _okta_states[state] = org_id

    params = urlencode({
        "client_id": ss.okta_client_id,
        "response_type": "code",
        "scope": "openid profile email",
        "redirect_uri": f"{_get_frontend_origin()}/login",
        "state": state,
    })
    authorize_url = f"https://{ss.okta_domain}/oauth2/default/v1/authorize?{params}"
    return {"authorize_url": authorize_url}


@router.post("/okta/callback", response_model=LoginResponse)
async def okta_callback(
    request: OktaCallbackRequest,
    db: Session = Depends(get_db),
):
    """OktaコールバックでJWT発行"""
    org_id = _okta_states.pop(request.state, None)
    if not org_id:
        raise HTTPException(status_code=400, detail="不正なstateパラメータです")

    ss = db.query(SystemSettings).filter(
        SystemSettings.organization_id == org_id
    ).first()
    if not ss or not ss.okta_domain or not ss.okta_client_id or not ss.okta_client_secret:
        raise HTTPException(status_code=400, detail="Okta設定が不完全です")

    # code → token 交換
    token_url = f"https://{ss.okta_domain}/oauth2/default/v1/token"
    async with httpx.AsyncClient() as client:
        resp = await client.post(token_url, data={
            "grant_type": "authorization_code",
            "code": request.code,
            "redirect_uri": f"{_get_frontend_origin()}/login",
            "client_id": ss.okta_client_id,
            "client_secret": ss.okta_client_secret,
        })
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Oktaトークン交換に失敗しました")

    token_data = resp.json()

    # userinfo取得
    userinfo_url = f"https://{ss.okta_domain}/oauth2/default/v1/userinfo"
    async with httpx.AsyncClient() as client:
        resp = await client.get(userinfo_url, headers={
            "Authorization": f"Bearer {token_data['access_token']}"
        })
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Oktaユーザー情報の取得に失敗しました")

    userinfo = resp.json()
    email = userinfo.get("email", "")
    name = userinfo.get("name", email.split("@")[0])
    sso_id = userinfo.get("sub", "")

    if not email:
        raise HTTPException(status_code=400, detail="Oktaからメールアドレスを取得できませんでした")

    # 事前登録済みユーザーのみ許可
    user = get_or_create_sso_user(
        db=db,
        email=email,
        name=name,
        organization_id=org_id,
        sso_provider="okta",
        sso_id=sso_id,
    )
    if not user:
        raise HTTPException(
            status_code=403,
            detail=f"ユーザー({email})は事前登録されていません。管理者にユーザー登録を依頼してください。",
        )

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if org:
        check_trial_status(org)

    access_token = create_access_token(
        data={
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "org_id": user.organization_id,
        },
        expires_delta=timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )

    return LoginResponse(
        access_token=access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        user=_build_user_dict(user),
        organization=_build_org_dict(org) if org else {},
    )


def _get_frontend_origin() -> str:
    from app.core.config import settings as app_settings
    return app_settings.frontend_origin


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """現在のユーザー情報を取得"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        department_id=current_user.department_id,
        department_name=current_user.department.name if current_user.department else None,
        role=current_user.role,
        organization_id=current_user.organization_id,
        organization_name=current_user.organization.name if current_user.organization else None,
    )
