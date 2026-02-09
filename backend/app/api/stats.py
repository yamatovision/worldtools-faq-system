import json
from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, extract, func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_admin, get_current_org_id
from app.models.document import ChatHistory, Department, Document, DocumentChunk, User, document_department

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _period_stats(db: Session, org_id: str, since: datetime, until: datetime | None = None) -> dict:
    """指定期間の基本統計を1クエリで計算"""
    filters = [
        ChatHistory.organization_id == org_id,
        ChatHistory.created_at >= since,
    ]
    if until:
        filters.append(ChatHistory.created_at < until)
    row = db.query(
        func.count(ChatHistory.id).label("total"),
        func.sum(case((ChatHistory.feedback == "good", 1), else_=0)).label("good"),
        func.sum(case((ChatHistory.feedback == "bad", 1), else_=0)).label("bad"),
        func.sum(case((ChatHistory.is_no_answer == "1", 1), else_=0)).label("no_answer"),
    ).filter(*filters).one()
    total = row.total or 0
    good = int(row.good or 0)
    bad = int(row.bad or 0)
    no_answer = int(row.no_answer or 0)
    return {
        "total": total,
        "good": good,
        "bad": bad,
        "no_answer": no_answer,
        "feedback_count": good + bad,
    }


@router.get("/chat-history")
async def get_chat_history(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    feedback: str = Query(default=None),  # "good", "bad", "none"
    no_answer_only: bool = Query(default=False),
    days: int = Query(default=None, ge=1, le=365),
    filter_mode: str = Query(default=None),  # "evaluated"
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    org_id: str = Depends(get_current_org_id)
):
    """チャット履歴一覧を取得"""
    query = db.query(ChatHistory).filter(
        ChatHistory.organization_id == org_id
    ).order_by(ChatHistory.created_at.desc())

    if days:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(ChatHistory.created_at >= since)

    if filter_mode == "evaluated":
        query = query.filter(or_(ChatHistory.feedback.isnot(None), ChatHistory.is_no_answer == "1"))

    if feedback == "good":
        query = query.filter(ChatHistory.feedback == "good")
    elif feedback == "bad":
        query = query.filter(ChatHistory.feedback == "bad")
    elif feedback == "none":
        query = query.filter(ChatHistory.feedback.is_(None))

    if no_answer_only:
        query = query.filter(ChatHistory.is_no_answer == "1")

    total = query.count()
    chats = query.offset(offset).limit(limit).all()

    def _parse_trace(chat):
        """agentic_traceからreferencesを復元"""
        references = []
        if chat.referenced_doc_ids:
            try:
                doc_ids = json.loads(chat.referenced_doc_ids)
                if chat.agentic_trace:
                    trace = json.loads(chat.agentic_trace)
                    for step in trace:
                        if step.get("tool") == "cite_sources":
                            input_data = step.get("input", {})
                            if isinstance(input_data, str):
                                try:
                                    input_data = json.loads(input_data)
                                except (json.JSONDecodeError, TypeError):
                                    input_data = {}
                            if not isinstance(input_data, dict):
                                input_data = {}
                            citations = input_data.get("citations", [])
                            for c in citations:
                                if not isinstance(c, dict):
                                    continue
                                references.append({
                                    "id": c.get("document_id", ""),
                                    "title": c.get("filename", ""),
                                    "section": c.get("section", ""),
                                    "excerpt": c.get("excerpt", ""),
                                })
                            break
                if not references:
                    for doc_id in doc_ids:
                        references.append({"id": doc_id, "title": "", "section": "", "excerpt": ""})
            except (ValueError, TypeError):
                pass
        return references

    return {
        "total": total,
        "items": [
            {
                "id": chat.id,
                "question": chat.question,
                "answer": chat.answer[:200] + "..." if len(chat.answer) > 200 else chat.answer,
                "full_answer": chat.answer,
                "is_no_answer": chat.is_no_answer == "1",
                "feedback": chat.feedback,
                "references": _parse_trace(chat),
                "created_at": chat.created_at.isoformat() if chat.created_at else None,
            }
            for chat in chats
        ]
    }


@router.get("/admin/dashboard")
async def get_admin_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    org_id: str = Depends(get_current_org_id)
):
    """統合ダッシュボード"""
    now = datetime.now(timezone.utc)

    # ── 週次比較（今週 vs 先週）──
    this_week_start = now - timedelta(days=7)
    last_week_start = now - timedelta(days=14)

    this_week = _period_stats(db, org_id, this_week_start)

    # アクティブユーザー数（今週 vs 先週）
    tw_active_users = db.query(func.count(func.distinct(ChatHistory.user_id))).filter(
        ChatHistory.organization_id == org_id,
        ChatHistory.created_at >= this_week_start,
    ).scalar() or 0

    lw_active_users = db.query(func.count(func.distinct(ChatHistory.user_id))).filter(
        ChatHistory.organization_id == org_id,
        ChatHistory.created_at >= last_week_start,
        ChatHistory.created_at < this_week_start,
    ).scalar() or 0

    last_week = _period_stats(db, org_id, last_week_start, this_week_start)

    def _rate(numerator: int, denominator: int) -> float:
        return round(numerator / denominator * 100, 1) if denominator > 0 else 0

    weekly_comparison = {
        "thisWeek": {
            "questions": this_week["total"],
            "activeUsers": tw_active_users,
            "noAnswerRate": _rate(this_week["no_answer"], this_week["total"]),
            "satisfactionRate": _rate(this_week["good"], this_week["feedback_count"]),
            "feedbackCount": this_week["feedback_count"],
        },
        "lastWeek": {
            "questions": last_week["total"],
            "activeUsers": lw_active_users,
            "noAnswerRate": _rate(last_week["no_answer"], last_week["total"]),
            "satisfactionRate": _rate(last_week["good"], last_week["feedback_count"]),
            "feedbackCount": last_week["feedback_count"],
        },
    }

    # ── KPI: 14日分の日別データ（スパークライン用）──
    sparkline_since = now - timedelta(days=14)
    date_col = func.date(ChatHistory.created_at)
    daily_rows = db.query(
        date_col.label("date"),
        func.count(ChatHistory.id).label("total"),
        func.sum(case((ChatHistory.feedback == "good", 1), else_=0)).label("good"),
        func.sum(case((ChatHistory.feedback == "bad", 1), else_=0)).label("bad"),
        func.sum(case((ChatHistory.is_no_answer == "1", 1), else_=0)).label("no_answer"),
    ).filter(
        ChatHistory.created_at >= sparkline_since,
        ChatHistory.organization_id == org_id
    ).group_by(date_col).order_by(date_col).all()

    sparkline_data = [
        {
            "date": str(row.date),
            "total": row.total,
            "good": int(row.good or 0),
            "bad": int(row.bad or 0),
            "noAnswer": int(row.no_answer or 0),
        }
        for row in daily_rows
    ]

    # ── ヒートマップ（曜日×時間帯、直近30日）──
    heatmap_since = now - timedelta(days=30)
    heatmap_rows = db.query(
        extract("dow", ChatHistory.created_at).label("dow"),
        extract("hour", ChatHistory.created_at).label("hour"),
        func.count(ChatHistory.id).label("cnt"),
    ).filter(
        ChatHistory.created_at >= heatmap_since,
        ChatHistory.organization_id == org_id
    ).group_by("dow", "hour").all()

    heatmap = [[0] * 24 for _ in range(7)]
    for row in heatmap_rows:
        dow = int(row.dow)  # 0=Sun, 1=Mon, ...
        hour = int(row.hour)
        heatmap[dow][hour] = row.cnt

    # ── TOP5引用ドキュメント（直近30日）──
    ref_rows = db.query(ChatHistory.referenced_doc_ids).filter(
        ChatHistory.created_at >= heatmap_since,
        ChatHistory.organization_id == org_id,
        ChatHistory.referenced_doc_ids.isnot(None),
    ).all()

    doc_counter: Counter = Counter()
    for row in ref_rows:
        try:
            ids = json.loads(row.referenced_doc_ids)
            for doc_id in ids:
                if doc_id:
                    doc_counter[doc_id] += 1
        except (json.JSONDecodeError, TypeError):
            pass

    top_doc_ids = [doc_id for doc_id, _ in doc_counter.most_common(5)]
    top_docs = []
    if top_doc_ids:
        docs = db.query(Document.id, Document.filename).filter(
            Document.id.in_(top_doc_ids)
        ).all()
        doc_name_map = {d.id: d.filename for d in docs}
        for doc_id, count in doc_counter.most_common(5):
            top_docs.append({
                "id": doc_id,
                "filename": doc_name_map.get(doc_id, "不明"),
                "referenceCount": count,
            })

    # ── データ基盤情報 ──
    doc_count = db.query(func.count(Document.id)).filter(
        Document.organization_id == org_id
    ).scalar() or 0

    chunk_count = db.query(func.count(DocumentChunk.id)).filter(
        DocumentChunk.organization_id == org_id
    ).scalar() or 0

    box_synced_count = db.query(func.count(Document.id)).filter(
        Document.organization_id == org_id,
        Document.box_file_id.isnot(None)
    ).scalar() or 0

    last_box_sync = db.query(func.max(Document.box_synced_at)).filter(
        Document.organization_id == org_id,
        Document.box_file_id.isnot(None)
    ).scalar()

    # 部門別カバレッジ
    dept_coverage = db.query(
        Department.name.label("department_name"),
        func.count(func.distinct(document_department.c.document_id)).label("document_count")
    ).join(
        document_department, Department.id == document_department.c.department_id
    ).join(
        Document, Document.id == document_department.c.document_id
    ).filter(
        Document.organization_id == org_id
    ).group_by(Department.id, Department.name).all()

    public_count = db.query(func.count(Document.id)).filter(
        Document.organization_id == org_id,
        Document.is_public == True
    ).scalar() or 0

    coverage_list = [
        {"departmentName": row.department_name, "documentCount": row.document_count}
        for row in dept_coverage
    ]
    if public_count > 0:
        coverage_list.insert(0, {"departmentName": "全社公開", "documentCount": public_count})

    # 最近のドキュメント（5件）- チャンク数はサブクエリで取得（N+1回避）
    recent_chunk_sq = (
        db.query(
            DocumentChunk.document_id,
            func.count(DocumentChunk.id).label("chunk_count"),
        )
        .group_by(DocumentChunk.document_id)
        .subquery()
    )
    recent_rows = (
        db.query(Document, recent_chunk_sq.c.chunk_count)
        .outerjoin(recent_chunk_sq, Document.id == recent_chunk_sq.c.document_id)
        .filter(Document.organization_id == org_id)
        .order_by(Document.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "weeklyComparison": weekly_comparison,
        "sparklineData": sparkline_data,
        "heatmap": heatmap,
        "topReferencedDocs": top_docs,
        "infrastructure": {
            "documentCount": doc_count,
            "chunkCount": chunk_count,
            "embeddingModel": "text-embedding-3-small",
            "boxSync": {
                "configured": box_synced_count > 0,
                "lastSyncAt": last_box_sync.isoformat() if last_box_sync else None,
                "syncedFileCount": box_synced_count,
            },
            "dataCoverage": coverage_list,
        },
        "recentDocuments": [
            {
                "filename": doc.filename,
                "source": "box" if doc.box_file_id else "manual",
                "createdAt": doc.created_at.isoformat() if doc.created_at else None,
                "chunkCount": chunk_count or 0,
            }
            for doc, chunk_count in recent_rows
        ],
    }
