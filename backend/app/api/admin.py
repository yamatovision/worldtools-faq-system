"""管理者API"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.auth import get_current_admin, get_current_org_id
from app.models.document import User, Department, SystemSettings, ChatHistory, Document, document_department
from app.models.organization import Organization
from app.services.auth import get_password_hash, get_user_by_email


router = APIRouter(prefix="/api/admin", tags=["admin"])


# ==================== ユーザー管理 ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    department_id: Optional[str] = None
    role: str = "user"


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    department_id: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    department_id: Optional[str]
    department_name: Optional[str]
    role: str
    is_active: bool


@router.get("/users")
async def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    org_id: str = Depends(get_current_org_id)
):
    """ユーザー一覧（利用統計付き）"""
    users = db.query(User).options(joinedload(User.department)).filter(User.organization_id == org_id).order_by(User.created_at.desc()).all()

    # ユーザーごとの質問数・最終利用日を一括取得
    usage_rows = db.query(
        ChatHistory.user_id,
        func.count(ChatHistory.id).label("question_count"),
        func.max(ChatHistory.created_at).label("last_used_at"),
    ).filter(
        ChatHistory.organization_id == org_id,
    ).group_by(ChatHistory.user_id).all()

    usage_map = {
        row.user_id: {"questionCount": row.question_count, "lastUsedAt": row.last_used_at}
        for row in usage_rows
    }

    return [
        {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "departmentId": user.department_id,
            "departmentName": user.department.name if user.department else None,
            "role": user.role,
            "isActive": user.is_active,
            "createdAt": user.created_at.isoformat() if user.created_at else None,
            "questionCount": usage_map.get(user.id, {}).get("questionCount", 0),
            "lastUsedAt": usage_map.get(user.id, {}).get("lastUsedAt").isoformat()
            if usage_map.get(user.id, {}).get("lastUsedAt") else None,
        }
        for user in users
    ]


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    request: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    org_id: str = Depends(get_current_org_id)
):
    """ユーザー作成"""
    if get_user_by_email(db, request.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このメールアドレスは既に使用されています"
        )

    user = User(
        email=request.email,
        password_hash=get_password_hash(request.password),
        name=request.name,
        department_id=request.department_id,
        role=request.role,
        organization_id=org_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "departmentId": user.department_id,
        "role": user.role,
    }


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    request: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    org_id: str = Depends(get_current_org_id)
):
    """ユーザー更新"""
    user = db.query(User).filter(User.id == user_id, User.organization_id == org_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    if request.email is not None:
        existing = get_user_by_email(db, request.email)
        if existing and existing.id != user_id:
            raise HTTPException(status_code=400, detail="このメールアドレスは既に使用されています")
        user.email = request.email
    if request.name is not None:
        user.name = request.name
    if request.department_id is not None:
        user.department_id = request.department_id
    if request.role is not None:
        user.role = request.role
    if request.is_active is not None:
        user.is_active = request.is_active
    if request.password is not None:
        user.password_hash = get_password_hash(request.password)

    db.commit()
    return {"success": True}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
    org_id: str = Depends(get_current_org_id)
):
    """ユーザー削除"""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="自分自身は削除できません")

    user = db.query(User).filter(User.id == user_id, User.organization_id == org_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    db.delete(user)
    db.commit()
    return {"success": True}


# ==================== 部門管理 ====================

class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


@router.get("/departments")
async def list_departments(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    org_id: str = Depends(get_current_org_id)
):
    """部門一覧"""
    user_count = (
        db.query(User.department_id, func.count(User.id).label("cnt"))
        .filter(User.organization_id == org_id)
        .group_by(User.department_id)
        .subquery()
    )
    doc_count = (
        select(document_department.c.department_id, func.count().label("cnt"))
        .group_by(document_department.c.department_id)
        .subquery()
    )
    departments = (
        db.query(Department, func.coalesce(user_count.c.cnt, 0), func.coalesce(doc_count.c.cnt, 0))
        .outerjoin(user_count, Department.id == user_count.c.department_id)
        .outerjoin(doc_count, Department.id == doc_count.c.department_id)
        .filter(Department.organization_id == org_id)
        .order_by(Department.name)
        .all()
    )
    return [
        {
            "id": dept.id,
            "name": dept.name,
            "description": dept.description,
            "userCount": u_count,
            "documentCount": d_count,
        }
        for dept, u_count, d_count in departments
    ]


@router.post("/departments", status_code=status.HTTP_201_CREATED)
async def create_department(
    request: DepartmentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    org_id: str = Depends(get_current_org_id)
):
    """部門作成"""
    existing = db.query(Department).filter(Department.name == request.name, Department.organization_id == org_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="この部門名は既に使用されています")

    dept = Department(name=request.name, description=request.description, organization_id=org_id)
    db.add(dept)
    db.commit()
    db.refresh(dept)

    return {"id": dept.id, "name": dept.name}


@router.put("/departments/{dept_id}")
async def update_department(
    dept_id: str,
    request: DepartmentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    org_id: str = Depends(get_current_org_id)
):
    """部門更新"""
    dept = db.query(Department).filter(Department.id == dept_id, Department.organization_id == org_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="部門が見つかりません")

    if request.name is not None:
        existing = db.query(Department).filter(Department.name == request.name, Department.id != dept_id, Department.organization_id == org_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="この部門名は既に使用されています")
        dept.name = request.name
    if request.description is not None:
        dept.description = request.description

    db.commit()
    return {"success": True}


@router.delete("/departments/{dept_id}")
async def delete_department(
    dept_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    org_id: str = Depends(get_current_org_id)
):
    """部門削除"""
    dept = db.query(Department).filter(Department.id == dept_id, Department.organization_id == org_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="部門が見つかりません")

    if dept.users:
        raise HTTPException(status_code=400, detail="この部門にはユーザーが所属しています")

    db.delete(dept)
    db.commit()
    return {"success": True}


# ==================== システム設定 ====================

class SettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    # Okta SSO
    okta_domain: Optional[str] = None
    okta_client_id: Optional[str] = None
    okta_client_secret: Optional[str] = None
    # BOX連携
    box_client_id: Optional[str] = None
    box_client_secret: Optional[str] = None
    box_enterprise_id: Optional[str] = None
    box_jwt_key_id: Optional[str] = None
    box_private_key: Optional[str] = None
    box_private_key_passphrase: Optional[str] = None
    box_watched_folder_id: Optional[str] = None
    box_poll_enabled: Optional[bool] = None


def get_or_create_settings(db: Session, org_id: str) -> SystemSettings:
    """設定を取得または作成"""
    settings = db.query(SystemSettings).filter(SystemSettings.organization_id == org_id).first()
    if not settings:
        settings = SystemSettings(organization_id=org_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("/settings")
async def get_settings(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    org_id: str = Depends(get_current_org_id)
):
    """システム設定取得"""
    s = get_or_create_settings(db, org_id)

    def mask(val: str | None) -> str:
        return "****" if val else ""

    return {
        "companyName": s.company_name,
        # Okta SSO（秘密情報はマスク）
        "oktaDomain": s.okta_domain or "",
        "oktaClientId": s.okta_client_id or "",
        "oktaClientSecret": mask(s.okta_client_secret),
        # BOX（秘密情報はマスク）
        "boxClientId": s.box_client_id or "",
        "boxClientSecret": mask(s.box_client_secret),
        "boxEnterpriseId": s.box_enterprise_id or "",
        "boxJwtKeyId": s.box_jwt_key_id or "",
        "boxPrivateKey": mask(s.box_private_key),
        "boxPrivateKeyPassphrase": mask(s.box_private_key_passphrase),
        "boxWatchedFolderId": s.box_watched_folder_id or "",
        "boxPollEnabled": s.box_poll_enabled or False,
    }


@router.put("/settings")
async def update_settings(
    request: SettingsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    org_id: str = Depends(get_current_org_id)
):
    """システム設定更新"""
    s = get_or_create_settings(db, org_id)

    if request.company_name is not None:
        s.company_name = request.company_name

    def set_if_real(attr: str, val: str | None) -> None:
        if val is not None and val != "****":
            setattr(s, attr, val)

    # Okta SSO（"****" はスキップ）
    set_if_real("okta_domain", request.okta_domain)
    set_if_real("okta_client_id", request.okta_client_id)
    set_if_real("okta_client_secret", request.okta_client_secret)

    # BOX連携（"****" はスキップ）

    set_if_real("box_client_id", request.box_client_id)
    set_if_real("box_client_secret", request.box_client_secret)
    set_if_real("box_enterprise_id", request.box_enterprise_id)
    set_if_real("box_jwt_key_id", request.box_jwt_key_id)
    set_if_real("box_private_key", request.box_private_key)
    set_if_real("box_private_key_passphrase", request.box_private_key_passphrase)
    set_if_real("box_watched_folder_id", request.box_watched_folder_id)
    if request.box_poll_enabled is not None:
        s.box_poll_enabled = request.box_poll_enabled

    db.commit()
    return {"success": True}


# ==================== BOX接続テスト・ポーリング ====================


@router.post("/settings/box/test")
async def box_test_connection(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    org_id: str = Depends(get_current_org_id),
):
    """BOX接続テスト"""
    from app.services.box_service import get_box_service_for_org

    svc = get_box_service_for_org(db, org_id)
    if not svc.is_configured:
        raise HTTPException(status_code=400, detail="BOX認証情報が設定されていません")
    try:
        folders = svc.list_folders("0")
        return {"success": True, "message": f"接続成功（ルートフォルダ: {len(folders)}件）"}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"BOX接続失敗: {str(e)}")


@router.post("/settings/box/poll-now")
async def box_poll_now(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    org_id: str = Depends(get_current_org_id),
):
    """即時ポーリング実行"""
    from app.services.box_poller import poll_org_changes

    result = poll_org_changes(db, org_id)
    return result


# ==================== 回答品質管理 ====================

class MemoUpdate(BaseModel):
    memo: str


@router.put("/answers/{chat_id}/memo")
async def update_answer_memo(
    chat_id: str,
    request: MemoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    org_id: str = Depends(get_current_org_id)
):
    """回答に管理者メモを追加"""
    chat = db.query(ChatHistory).filter(ChatHistory.id == chat_id, ChatHistory.organization_id == org_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="回答が見つかりません")

    chat.admin_memo = request.memo
    db.commit()
    return {"success": True}
