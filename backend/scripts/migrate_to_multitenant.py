"""既存データをマルチテナント構造に移行するスクリプト

実行方法: cd backend && python -m scripts.migrate_to_multitenant
"""
import os
import sys
import uuid
from datetime import datetime, timezone

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# .envを読み込み（backend/.envまたはプロジェクトルート/.env）
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
DEFAULT_ORG_ID = str(uuid.uuid4())
DEFAULT_ORG_SLUG = "tomoe-shokai"


def migrate():
    with engine.begin() as conn:
        # 1. organizationsテーブルが存在しない場合のみ作成
        result = conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'organizations')"
        ))
        if not result.scalar():
            conn.execute(text("""
                CREATE TABLE organizations (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(200) NOT NULL,
                    slug VARCHAR(100) UNIQUE NOT NULL,
                    plan VARCHAR(20) DEFAULT 'trial',
                    trial_ends_at TIMESTAMPTZ,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            print("Created organizations table")

        # 2. デフォルトOrganization作成（存在しない場合）
        existing = conn.execute(text(
            "SELECT id FROM organizations WHERE slug = :slug"
        ), {"slug": DEFAULT_ORG_SLUG}).first()

        if existing:
            org_id = existing.id
            print(f"Default organization already exists: {org_id}")
        else:
            org_id = DEFAULT_ORG_ID
            conn.execute(text("""
                INSERT INTO organizations (id, name, slug, plan, is_active, created_at, updated_at)
                VALUES (:id, :name, :slug, 'enterprise', TRUE, :now, :now)
            """), {
                "id": org_id,
                "name": "巴商会",
                "slug": DEFAULT_ORG_SLUG,
                "now": datetime.now(timezone.utc),
            })
            print(f"Created default organization: {org_id}")

        # 3. 各テーブルにorganization_idカラムを追加（存在しない場合）
        tables_to_update = [
            "users", "departments", "documents", "document_chunks",
            "chat_history", "system_settings", "graph_entities", "graph_relations",
        ]

        for table in tables_to_update:
            # カラム存在チェック
            col_exists = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = :table AND column_name = 'organization_id'
                )
            """), {"table": table}).scalar()

            if not col_exists:
                conn.execute(text(f"""
                    ALTER TABLE {table}
                    ADD COLUMN organization_id VARCHAR(36)
                    REFERENCES organizations(id)
                """))
                print(f"Added organization_id to {table}")

                # 既存データにデフォルトorg_idを設定
                conn.execute(text(f"""
                    UPDATE {table} SET organization_id = :org_id
                    WHERE organization_id IS NULL
                """), {"org_id": org_id})
                print(f"Updated existing {table} records with default org_id")

                # NOT NULL制約を追加
                conn.execute(text(f"""
                    ALTER TABLE {table}
                    ALTER COLUMN organization_id SET NOT NULL
                """))

                # インデックス追加
                conn.execute(text(f"""
                    CREATE INDEX IF NOT EXISTS ix_{table}_org_id
                    ON {table} (organization_id)
                """))
                print(f"Added NOT NULL constraint and index to {table}.organization_id")

        # 4. 複合ユニーク制約（users: org_id + email）
        conn.execute(text("""
            DROP INDEX IF EXISTS ix_users_org_email
        """))
        # 既存のemail uniqueインデックスを削除
        conn.execute(text("""
            ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key
        """))
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS ix_users_org_email
            ON users (organization_id, email)
        """))
        print("Created composite unique index: users(organization_id, email)")

        # 5. 複合ユニーク制約（departments: org_id + name）
        conn.execute(text("""
            DROP INDEX IF EXISTS ix_departments_org_name
        """))
        conn.execute(text("""
            ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_key
        """))
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS ix_departments_org_name
            ON departments (organization_id, name)
        """))
        print("Created composite unique index: departments(organization_id, name)")

        # 6. system_settings: organization_id unique制約
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS ix_system_settings_org_id
            ON system_settings (organization_id)
        """))
        print("Created unique index: system_settings(organization_id)")

        # 7. その他の複合インデックス
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_documents_org_created
            ON documents (organization_id, created_at)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_chat_org_user
            ON chat_history (organization_id, user_id)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_chunks_org_doc
            ON document_chunks (organization_id, document_id)
        """))
        print("Created composite indexes")

    print("\nMigration completed successfully!")
    print(f"Default Organization ID: {org_id}")


if __name__ == "__main__":
    migrate()
