import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import redis.asyncio as aioredis
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.db.session import async_session

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    logger.info("BotForge started")
    yield
    # Shutdown
    await app.state.redis.close()
    logger.info("BotForge stopped")


app = FastAPI(
    title=settings.APP_NAME,
    description="BotForge — визуальный конструктор Telegram-ботов. Public API: /api/v1/",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", settings.BASE_URL],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)


# ─── Health check ───────────────────────────────────────────
@app.get("/health")
async def health_check(request: Request):
    checks = {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

    # Check Redis
    try:
        await request.app.state.redis.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"
        checks["status"] = "degraded"

    # Check PostgreSQL
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
        checks["status"] = "degraded"

    return checks


# Register routers
from app.api.router import api_router  # noqa: E402

app.include_router(api_router)
