"""BOXファイル変更検知ポーリング"""
import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.document import Document, SystemSettings
from app.models.organization import Organization
from app.services.box_service import get_box_service_for_org

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 30 * 60  # 30分


def poll_org_changes(db: Session, org_id: str) -> dict:
    """指定orgのBOX連携ドキュメントの変更を検知し outdated マーク"""
    svc = get_box_service_for_org(db, org_id)
    if not svc.is_configured:
        return {"checked": 0, "outdated": 0, "errors": 0}

    docs = db.query(Document).filter(
        Document.organization_id == org_id,
        Document.box_file_id.isnot(None),
        Document.box_sync_status.in_(["synced", "outdated"]),
    ).all()

    checked = 0
    outdated = 0
    errors = 0

    for doc in docs:
        try:
            info = svc.get_file_info(doc.box_file_id)
            checked += 1

            box_modified = info.get("modified_at")
            if not box_modified or not doc.box_synced_at:
                continue

            # ISO文字列 → datetime比較
            if isinstance(box_modified, str):
                box_dt = datetime.fromisoformat(box_modified.replace("Z", "+00:00"))
            else:
                box_dt = box_modified

            synced_at = doc.box_synced_at
            if synced_at.tzinfo is None:
                synced_at = synced_at.replace(tzinfo=timezone.utc)

            if box_dt > synced_at:
                doc.box_sync_status = "outdated"
                outdated += 1
        except Exception as e:
            logger.warning(f"Poll error for doc {doc.id} (box_file_id={doc.box_file_id}): {e}")
            errors += 1

    if outdated > 0:
        db.commit()

    return {"checked": checked, "outdated": outdated, "errors": errors}


async def polling_loop() -> None:
    """全orgを巡回してBOX変更検知を行うバックグラウンドループ"""
    from app.core.database import SessionLocal

    logger.info("BOX poll loop started (interval=%ds)", POLL_INTERVAL_SECONDS)
    while True:
        await asyncio.sleep(POLL_INTERVAL_SECONDS)
        db = SessionLocal()
        try:
            # poll_enabled な org のみ対象
            rows = db.query(SystemSettings.organization_id).filter(
                SystemSettings.box_poll_enabled == True,
                SystemSettings.box_client_id != "",
                SystemSettings.box_enterprise_id != "",
            ).all()

            for (org_id,) in rows:
                try:
                    result = poll_org_changes(db, org_id)
                    if result["outdated"] > 0:
                        logger.info("Poll org=%s: %s", org_id, result)
                except Exception as e:
                    logger.error("Poll failed for org=%s: %s", org_id, e)
        except Exception as e:
            logger.error("Poll loop error: %s", e)
        finally:
            db.close()
