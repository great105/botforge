from fastapi import APIRouter, HTTPException, Request

from app.config import settings
from app.db.session import async_session
from app.engine.runtime import handle_update

router = APIRouter()


@router.post("/webhook/{token_hash}")
async def telegram_webhook(token_hash: str, request: Request):
    """Single endpoint for all bots. Routing by token_hash."""
    # Verify Telegram secret token
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if secret != settings.WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret token")

    data = await request.json()
    redis = request.app.state.redis

    async with async_session() as session:
        await handle_update(
            token_hash=token_hash,
            update_data=data,
            redis=redis,
            db_session=session,
        )

    return {"ok": True}
