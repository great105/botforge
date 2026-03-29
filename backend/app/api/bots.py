import json
import uuid

from aiogram import Bot
from aiogram.client.default import DefaultBotProperties
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from app.config import settings
from app.deps import CurrentUser, DbSession
from app.engine.runtime import remove_bot_from_cache
from app.services import bot_service
from app.services.limits import check_can_start_bot
from app.services.token_crypto import decrypt_token, encrypt_token, hash_token

router = APIRouter()


class CreateBotRequest(BaseModel):
    name: str
    token: str


class BotResponse(BaseModel):
    id: str
    name: str
    bot_username: str | None
    status: str
    error_message: str | None
    subscribers_count: int
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
            created_at=b.created_at.isoformat(),
        )
        for b in bots
    ]


@router.post("", response_model=BotResponse, status_code=status.HTTP_201_CREATED)
async def create_bot(body: CreateBotRequest, session: DbSession, user: CurrentUser):
    # Validate token format
    if ":" not in body.token:
        raise HTTPException(status_code=400, detail="Неверный формат токена бота")

    # Check duplicate token
    token_h = hash_token(body.token)
    existing = await bot_service.get_bot_by_hash(session, token_h)
    if existing:
        raise HTTPException(status_code=409, detail="Этот бот уже добавлен")

    # Encrypt and save
    encrypted = encrypt_token(body.token)
    bot = await bot_service.create_bot(
        session=session,
        user_id=user.id,
        name=body.name,
        token_encrypted=encrypted,
        token_hash=token_h,
    )

    # Create default empty schema
    default_schema = {
        "nodes": [
            {
                "id": "node_1",
                "type": "start",
                "position": {"x": 250, "y": 50},
                "data": {"label": "Старт", "triggers": ["command:/start"]},
            },
            {
                "id": "node_2",
                "type": "text",
                "position": {"x": 250, "y": 200},
                "data": {"label": "Приветствие", "text": "Привет! Бот работает.", "parse_mode": "HTML"},
            },
        ],
        "edges": [
            {"id": "e_node_1_node_2", "source": "node_1", "target": "node_2"},
        ],
        "viewport": {"x": 0, "y": 0, "zoom": 1},
    }
    await bot_service.save_schema(session, bot.id, default_schema)

    return BotResponse(
        id=str(bot.id),
        name=bot.name,
        bot_username=bot.bot_username,
        status=bot.status,
        error_message=bot.error_message,
        subscribers_count=bot.subscribers_count,
        created_at=bot.created_at.isoformat(),
    )


@router.post("/{bot_id}/start", response_model=StartBotResponse)
async def start_bot(bot_id: uuid.UUID, session: DbSession, user: CurrentUser, request: Request):
    bot_record = await bot_service.get_bot(session, bot_id, user.id)
    if not bot_record:
        raise HTTPException(status_code=404, detail="Бот не найден")

    # Check plan limits
    running_count = await bot_service.count_running_bots(session, user.id)
    await check_can_start_bot(user, running_count)

    # Decrypt token and validate via Telegram API
    token = decrypt_token(bot_record.token_encrypted)
    try:
        async with Bot(token=token, default=DefaultBotProperties(parse_mode="HTML")) as tmp_bot:
            me = await tmp_bot.get_me()
    except Exception as e:
        await bot_service.update_bot_status(session, bot_id, status="error", error_message=str(e))
        raise HTTPException(status_code=400, detail=f"Ошибка валидации токена: {e}")

    # Set webhook in Telegram
    token_h = bot_record.token_hash
    webhook_url = f"{settings.BASE_URL}/webhook/{token_h}"
    try:
        async with Bot(token=token, default=DefaultBotProperties(parse_mode="HTML")) as tmp_bot:
            await tmp_bot.set_webhook(
                url=webhook_url,
                secret_token=settings.WEBHOOK_SECRET,
                allowed_updates=["message", "callback_query", "pre_checkout_query"],
            )
    except Exception as e:
        await bot_service.update_bot_status(session, bot_id, status="error", error_message=str(e))
        raise HTTPException(status_code=500, detail=f"Ошибка установки webhook: {e}")

    # Cache bot data in Redis
    redis = request.app.state.redis
    await redis.setex(
        f"bot:{token_h}",
        86400,
        json.dumps({
            "bot_id": str(bot_record.id),
            "token_encrypted": bot_record.token_encrypted.hex(),
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

    token = decrypt_token(bot_record.token_encrypted)

    # Delete webhook
    try:
        async with Bot(token=token, default=DefaultBotProperties(parse_mode="HTML")) as tmp_bot:
            await tmp_bot.delete_webhook()
    except Exception:
        pass  # bot might be invalid, still clean up

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
    if bot_record.status == "running":
        token = decrypt_token(bot_record.token_encrypted)
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
