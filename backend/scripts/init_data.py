"""初期データ作成スクリプト"""
import sys
sys.path.insert(0, '/Users/tatsuya/Desktop/巴商会様/backend')

from app.core.database import SessionLocal, engine, Base
from app.models.document import User, Department, SystemSettings
from app.services.auth import get_password_hash

# テーブルを作成
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # 部門を作成
    departments_data = [
        {"name": "営業部", "description": "営業活動を担当"},
        {"name": "人事部", "description": "人事・労務を担当"},
        {"name": "経理部", "description": "経理・財務を担当"},
        {"name": "総務部", "description": "総務・庶務を担当"},
        {"name": "事務局", "description": "システム管理"},
    ]

    departments = {}
    for dept_data in departments_data:
        existing = db.query(Department).filter(Department.name == dept_data["name"]).first()
        if not existing:
            dept = Department(**dept_data)
            db.add(dept)
            db.flush()
            departments[dept_data["name"]] = dept
            print(f"✅ 部門作成: {dept_data['name']}")
        else:
            departments[dept_data["name"]] = existing
            print(f"⏭️  部門存在: {dept_data['name']}")

    # ユーザーを作成
    users_data = [
        {
            "email": "admin@example.com",
            "password": "admin123",
            "name": "鈴木 花子",
            "department": "事務局",
            "role": "admin",
        },
        {
            "email": "demo@example.com",
            "password": "demo123",
            "name": "山田 太郎",
            "department": "営業部",
            "role": "user",
        },
        {
            "email": "tanaka@example.com",
            "password": "tanaka123",
            "name": "田中 一郎",
            "department": "人事部",
            "role": "user",
        },
    ]

    for user_data in users_data:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing:
            dept = departments.get(user_data["department"])
            user = User(
                email=user_data["email"],
                password_hash=get_password_hash(user_data["password"]),
                name=user_data["name"],
                department_id=dept.id if dept else None,
                role=user_data["role"],
            )
            db.add(user)
            print(f"✅ ユーザー作成: {user_data['email']} ({user_data['role']})")
        else:
            print(f"⏭️  ユーザー存在: {user_data['email']}")

    # システム設定を作成
    existing_settings = db.query(SystemSettings).first()
    if not existing_settings:
        settings = SystemSettings(
            company_name="巴商会",
        )
        db.add(settings)
        print("✅ システム設定作成")
    else:
        print("⏭️  システム設定存在")

    db.commit()
    print("\n🎉 初期データ作成完了!")

except Exception as e:
    print(f"❌ エラー: {e}")
    db.rollback()
finally:
    db.close()
