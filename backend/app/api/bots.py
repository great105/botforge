import json
import uuid
from pathlib import Path

from aiogram import Bot
from aiogram.client.default import DefaultBotProperties
from aiogram.types import FSInputFile
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from app.config import settings

# Self-signed cert for webhook (Telegram requires HTTPS)
WEBHOOK_CERT_PATH = Path("/opt/botforge/webhook.pem")
from app.deps import CurrentUser, DbSession
from app.engine.runtime import remove_bot_from_cache
from app.services import bot_service
from app.services.limits import check_can_start_bot
from app.services.token_crypto import decrypt_token, encrypt_token, hash_token

router = APIRouter()


class CreateBotRequest(BaseModel):
    name: str
    token: str | None = None
    platform: str = "telegram"  # telegram | max


class UpdateBotRequest(BaseModel):
    name: str | None = None
    token: str | None = None


class BotResponse(BaseModel):
    id: str
    name: str
    platform: str
    bot_username: str | None
    status: str
    error_message: str | None
    subscribers_count: int
    has_token: bool
    created_at: str


class StartBotResponse(BaseModel):
    status: str
    username: str | None


@router.get("", response_model=list[BotResponse])
async def list_bots(session: DbSession, user: CurrentUser):
    bots = await bot_service.get_user_bots(session, user.id)
    return [
        BotResponse(
            id=str(b.id),
            name=b.name,
            bot_username=b.bot_username,
            status=b.status,
            error_message=b.error_message,
            subscribers_count=b.subscribers_count,
            platform=b.platform or "telegram",
            has_token=b.token_encrypted is not None,
            created_at=b.created_at.isoformat(),
        )
        for b in bots
    ]


@router.post("", response_model=BotResponse, status_code=status.HTTP_201_CREATED)
async def create_bot(body: CreateBotRequest, session: DbSession, user: CurrentUser):
    encrypted = None
    token_h = None

    platform = body.platform if body.platform in ("telegram", "max") else "telegram"

    if body.token and body.token.strip():
        token = body.token.strip()
        if platform == "telegram" and ":" not in token:
            raise HTTPException(status_code=400, detail="Неверный формат токена Telegram бота")
        token_h = hash_token(token)
        existing = await bot_service.get_bot_by_hash(session, token_h)
        if existing:
            raise HTTPException(status_code=409, detail="Этот бот уже добавлен")
        encrypted = encrypt_token(token)

    bot = await bot_service.create_bot(
        session=session,
        user_id=user.id,
        name=body.name,
        token_encrypted=encrypted,
        token_hash=token_h,
        platform=platform,
    )

    # Create default schema with unified message nodes
    default_schema = {
        "version": 2,
        "nodes": [
            {
                "id": "node_1",
                "type": "message",
                "position": {"x": 250, "y": 50},
                "data": {
                    "label": "Старт",
                    "text": "Привет! Добро пожаловать!",
                    "triggers": ["command:/start"],
                    "parse_mode": "HTML",
                },
            },
        ],
        "edges": [],
        "viewport": {"x": 0, "y": 0, "zoom": 1},
    }
    await bot_service.save_schema(session, bot.id, default_schema)

    return BotResponse(
        id=str(bot.id),
        name=bot.name,
        platform=bot.platform or "telegram",
        bot_username=bot.bot_username,
        status=bot.status,
        error_message=bot.error_message,
        subscribers_count=bot.subscribers_count,
        has_token=bot.token_encrypted is not None,
        created_at=bot.created_at.isoformat(),
    )


@router.patch("/{bot_id}", response_model=BotResponse)
async def update_bot(bot_id: uuid.UUID, body: UpdateBotRequest, session: DbSession, user: CurrentUser):
    bot_record = await bot_service.get_bot(session, bot_id, user.id)
    if not bot_record:
        raise HTTPException(status_code=404, detail="Бот не найден")

    if bot_record.status == "running":
        raise HTTPException(status_code=400, detail="Остановите бота перед изменением настроек")

    if body.name is not None:
        bot_record.name = body.name

    if body.token is not None:
        if ":" not in body.token:
            raise HTTPException(status_code=400, detail="Неверный формат токена бота")
        new_hash = hash_token(body.token)
        existing = await bot_service.get_bot_by_hash(session, new_hash)
        if existing and existing.id != bot_record.id:
            raise HTTPException(status_code=409, detail="Этот токен уже используется другим ботом")
        bot_record.token_encrypted = encrypt_token(body.token)
        bot_record.token_hash = new_hash
        bot_record.bot_username = None

    await session.commit()
    await session.refresh(bot_record)

    return BotResponse(
        id=str(bot_record.id),
        name=bot_record.name,
        platform=bot_record.platform or "telegram",
        bot_username=bot_record.bot_username,
        status=bot_record.status,
        error_message=bot_record.error_message,
        subscribers_count=bot_record.subscribers_count,
        has_token=bot_record.token_encrypted is not None,
        created_at=bot_record.created_at.isoformat(),
    )


@router.post("/{bot_id}/start", response_model=StartBotResponse)
async def start_bot(bot_id: uuid.UUID, session: DbSession, user: CurrentUser, request: Request):
    bot_record = await bot_service.get_bot(session, bot_id, user.id)
    if not bot_record:
        raise HTTPException(status_code=404, detail="Бот не найден")

    if not bot_record.token_encrypted:
        raise HTTPException(status_code=400, detail="Добавьте токен бота в настройках перед запуском")

    # Check subscription
    from app.models.subscription import Subscription
    from datetime import datetime, timezone as tz
    sub_result = await session.execute(
        select(Subscription).where(Subscription.bot_id == bot_id, Subscription.status == "active")
    )
    sub = sub_result.scalar_one_or_none()
    if not sub or (sub.expires_at and sub.expires_at < datetime.now(tz.utc)):
        raise HTTPException(status_code=402, detail="Для запуска бота нужна подписка. Оформите тариф в разделе «Тарифы».")

    # Check plan limits
    running_count = await bot_service.count_running_bots(session, user.id)
    await check_can_start_bot(user, running_count)

    token = decrypt_token(bot_record.token_encrypted)
    token_h = bot_record.token_hash
    platform = bot_record.platform or "telegram"

    if platform == "max":
        # --- MAX platform ---
        from app.engine.max_client import MaxBotClient
        max_client = MaxBotClient(token=token)
        try:
            me = await max_client.get_me()
        except Exception as e:
            await bot_service.update_bot_status(session, bot_id, status="error", error_message=str(e))
            raise HTTPException(status_code=400, detail=f"Ошибка валидации токена MAX: {e}")

        webhook_url = f"{settings.BASE_URL}/webhook/max/{token_h}"
        try:
            await max_client.set_webhook(webhook_url)
        except Exception as e:
            await bot_service.update_bot_status(session, bot_id, status="error", error_message=str(e))
            raise HTTPException(status_code=500, detail=f"Ошибка установки webhook MAX: {e}")
    else:
        # --- Telegram platform ---
        try:
            async with Bot(token=token, default=DefaultBotProperties(parse_mode="HTML")) as tmp_bot:
                me = await tmp_bot.get_me()
        except Exception as e:
            await bot_service.update_bot_status(session, bot_id, status="error", error_message=str(e))
            raise HTTPException(status_code=400, detail=f"Ошибка валидации токена: {e}")

        webhook_url = f"{settings.BASE_URL}/webhook/{token_h}"
        try:
            async with Bot(token=token, default=DefaultBotProperties(parse_mode="HTML")) as tmp_bot:
                certificate = FSInputFile(str(WEBHOOK_CERT_PATH)) if WEBHOOK_CERT_PATH.exists() else None
                await tmp_bot.set_webhook(
                    url=webhook_url,
                    secret_token=settings.WEBHOOK_SECRET,
                    allowed_updates=["message", "callback_query", "pre_checkout_query"],
                    certificate=certificate,
                )
        except Exception as e:
            await bot_service.update_bot_status(session, bot_id, status="error", error_message=str(e))
            raise HTTPException(status_code=500, detail=f"Ошибка установки webhook: {e}")

    # Cache bot data in Redis (with platform)
    redis = request.app.state.redis
    await redis.setex(
        f"bot:{token_h}",
        86400,
        json.dumps({
            "bot_id": str(bot_record.id),
            "token_encrypted": bot_record.token_encrypted.hex(),
            "platform": platform,
        }),
    )

    # Cache schema too
    schema_record = await bot_service.get_active_schema(session, bot_id)
    if schema_record:
        await redis.setex(
            f"bot:{token_h}:schema",
            3600,
            json.dumps(schema_record.schema_json, ensure_ascii=False),
        )

    await bot_service.update_bot_status(session, bot_id, status="running", username=me.username)

    return StartBotResponse(status="running", username=me.username)


@router.post("/{bot_id}/stop")
async def stop_bot(bot_id: uuid.UUID, session: DbSession, user: CurrentUser, request: Request):
    bot_record = await bot_service.get_bot(session, bot_id, user.id)
    if not bot_record:
        raise HTTPException(status_code=404, detail="Бот не найден")

    if not bot_record.token_encrypted:
        raise HTTPException(status_code=400, detail="Токен не задан")

    token = decrypt_token(bot_record.token_encrypted)
    platform = bot_record.platform or "telegram"

    # Delete webhook
    if platform == "max":
        from app.engine.max_client import MaxBotClient
        try:
            await MaxBotClient(token=token).delete_webhook()
        except Exception:
            pass
    else:
        try:
            async with Bot(token=token, default=DefaultBotProperties(parse_mode="HTML")) as tmp_bot:
                await tmp_bot.delete_webhook()
        except Exception:
            pass

    # Clean up caches
    redis = request.app.state.redis
    token_h = bot_record.token_hash
    await redis.delete(f"bot:{token_h}")
    await redis.delete(f"bot:{token_h}:schema")
    remove_bot_from_cache(token_h)

    await bot_service.update_bot_status(session, bot_id, status="stopped")
    return {"status": "stopped"}


@router.delete("/{bot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bot(bot_id: uuid.UUID, session: DbSession, user: CurrentUser, request: Request):
    bot_record = await bot_service.get_bot(session, bot_id, user.id)
    if not bot_record:
        raise HTTPException(status_code=404, detail="Бот не найден")

    # Stop if running
    if bot_record.status == "running" and bot_record.token_encrypted:
        token = decrypt_token(bot_record.token_encrypted)
        platform = bot_record.platform or "telegram"
        if platform == "max":
            from app.engine.max_client import MaxBotClient
            try:
                await MaxBotClient(token=token).delete_webhook()
            except Exception:
                pass
        else:
            try:
                async with Bot(token=token, default=DefaultBotProperties(parse_mode="HTML")) as tmp_bot:
                    await tmp_bot.delete_webhook()
            except Exception:
                pass

        redis = request.app.state.redis
        token_h = bot_record.token_hash
        await redis.delete(f"bot:{token_h}")
        await redis.delete(f"bot:{token_h}:schema")
        remove_bot_from_cache(token_h)

    await bot_service.delete_bot(session, bot_record)
