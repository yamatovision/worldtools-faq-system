import asyncio
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

# Rate limiter (IP-based)
limiter = Limiter(key_func=get_remote_address)

# Request metrics (in-memory counters)
_request_metrics = {"total": 0, "errors_5xx": 0, "errors_4xx": 0, "latency_sum": 0.0}
from app.core.database import engine, Base
from app.api import chat, documents, stats, auth, admin, admin_chat
from app.services.sftp_poller import polling_loop
import app.models.organization  # noqa: F401
import app.models.document  # noqa: F401
import app.models.graph  # noqa: F401

logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

# Create HNSW index on embedding column for fast vector search
try:
    from sqlalchemy import text as sa_text
    with engine.connect() as conn:
        conn.execute(sa_text(
            "CREATE INDEX IF NOT EXISTS ix_chunks_embedding_hnsw "
            "ON document_chunks USING hnsw (embedding vector_cosine_ops) "
            "WITH (m = 16, ef_construction = 64)"
        ))
        conn.commit()
    logger.info("pgvector HNSW index ensured on document_chunks.embedding")
except Exception as e:
    logger.warning("Could not create HNSW index: %s", e)


@asynccontextmanager
async def lifespan(application: FastAPI):
    task = asyncio.create_task(polling_loop())
    yield
    task.cancel()


app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    lifespan=lifespan,
)
app.state.limiter = limiter


# Rate limit exceeded handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    logger.warning("Rate limit exceeded: %s %s from %s", request.method, request.url.path, get_remote_address(request))
    return JSONResponse(status_code=429, content={"detail": "リクエスト回数の制限を超えました。しばらく待ってから再度お試しください。"})


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s %s - %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "内部サーバーエラーが発生しました"})


# Security headers + metrics middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.monotonic()
        response = await call_next(request)
        elapsed = time.monotonic() - start
        # Metrics collection
        _request_metrics["total"] += 1
        _request_metrics["latency_sum"] += elapsed
        if response.status_code >= 500:
            _request_metrics["errors_5xx"] += 1
        elif response.status_code >= 400:
            _request_metrics["errors_4xx"] += 1
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


app.add_middleware(SecurityHeadersMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(stats.router)
app.include_router(admin.router)
app.include_router(admin_chat.router)


@app.get("/api/health")
async def health_check():
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        db.execute(sa_text("SELECT 1"))
        db.commit()
        return {"status": "ok", "version": settings.api_version}
    except Exception as e:
        logger.error("Health check failed: %s", e)
        db.rollback()
        return JSONResponse(status_code=503, content={"status": "unhealthy", "detail": "DB接続エラー"})
    finally:
        db.close()


@app.get("/api/metrics", include_in_schema=False)
async def metrics():
    """Prometheus形式のメトリクスエンドポイント"""
    from sqlalchemy import func as sa_func
    from app.core.database import SessionLocal
    from app.models.document import Document, DocumentChunk, ChatHistory, User

    db = SessionLocal()
    try:
        doc_count = db.query(sa_func.count(Document.id)).scalar() or 0
        chunk_count = db.query(sa_func.count(DocumentChunk.id)).scalar() or 0
        chat_count = db.query(sa_func.count(ChatHistory.id)).scalar() or 0
        user_count = db.query(sa_func.count(User.id)).scalar() or 0
        good_feedback = db.query(sa_func.count(ChatHistory.id)).filter(
            ChatHistory.feedback == "good"
        ).scalar() or 0
        bad_feedback = db.query(sa_func.count(ChatHistory.id)).filter(
            ChatHistory.feedback == "bad"
        ).scalar() or 0

        pool = engine.pool
        avg_latency = _request_metrics["latency_sum"] / _request_metrics["total"] if _request_metrics["total"] > 0 else 0
        lines = [
            "# HELP faq_documents_total Total number of documents",
            "# TYPE faq_documents_total gauge",
            f"faq_documents_total {doc_count}",
            "# HELP faq_chunks_total Total number of document chunks",
            "# TYPE faq_chunks_total gauge",
            f"faq_chunks_total {chunk_count}",
            "# HELP faq_chats_total Total number of chat interactions",
            "# TYPE faq_chats_total counter",
            f"faq_chats_total {chat_count}",
            "# HELP faq_users_total Total number of registered users",
            "# TYPE faq_users_total gauge",
            f"faq_users_total {user_count}",
            "# HELP faq_feedback_total Total feedback by type",
            "# TYPE faq_feedback_total counter",
            f'faq_feedback_total{{type="good"}} {good_feedback}',
            f'faq_feedback_total{{type="bad"}} {bad_feedback}',
            "# HELP faq_db_pool_size Database connection pool size",
            "# TYPE faq_db_pool_size gauge",
            f"faq_db_pool_size {pool.size()}",
            "# HELP faq_db_pool_checked_out Database connections currently in use",
            "# TYPE faq_db_pool_checked_out gauge",
            f"faq_db_pool_checked_out {pool.checkedout()}",
            "# HELP faq_http_requests_total Total HTTP requests",
            "# TYPE faq_http_requests_total counter",
            f"faq_http_requests_total {_request_metrics['total']}",
            "# HELP faq_http_errors_total HTTP errors by class",
            "# TYPE faq_http_errors_total counter",
            f'faq_http_errors_total{{class="4xx"}} {_request_metrics["errors_4xx"]}',
            f'faq_http_errors_total{{class="5xx"}} {_request_metrics["errors_5xx"]}',
            "# HELP faq_http_latency_avg_seconds Average request latency",
            "# TYPE faq_http_latency_avg_seconds gauge",
            f"faq_http_latency_avg_seconds {avg_latency:.4f}",
        ]
        return PlainTextResponse("\n".join(lines) + "\n", media_type="text/plain; version=0.0.4; charset=utf-8")
    finally:
        db.close()
