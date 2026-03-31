import logging

from fastapi import APIRouter, HTTPException, Request

from app.config import settings
from app.db.session import async_session
from app.engine.runtime import handle_update

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/webhook/{token_hash}")
async def telegram_webhook(token_hash: str, request: Request):
    """Single endpoint for all bots. Routing by token_hash."""
    # Verify Telegram secret token
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if secret != settings.WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret token")

    try:
        data = await request.json()
        redis = request.app.state.redis

        async with async_session() as session:
            await handle_update(
                token_hash=token_hash,
                update_data=data,
                redis=redis,
                db_session=session,
            )
    except Exception:
        logger.exception("Webhook error for hash %s", token_hash[:8])

    # Always return 200 — otherwise Telegram retries endlessly
    return {"ok": True}


@router.post("/webhook/max/{token_hash}")
async def max_webhook(token_hash: str, request: Request):
    """Webhook endpoint for MAX messenger bots."""
    try:
        data = await request.json()
        redis = request.app.state.redis

        async with async_session() as session:
            await handle_update(
                token_hash=token_hash,
                update_data=data,
                redis=redis,
                db_session=session,
            )
    except Exception:
        logger.exception("MAX webhook error for hash %s", token_hash[:8])

    return {"ok": True}
