"""
BotRuntime — manages running bot instances and routes updates.
Supports both Telegram (aiogram) and MAX (MaxBotClient) platforms.
"""

import json
import logging

import redis.asyncio as aioredis
from aiogram import Bot
from aiogram.client.default import DefaultBotProperties

from app.engine.interpreter import GraphInterpreter
from app.engine.max_client import MaxBotClient, normalize_max_update
from app.engine.migration import migrate_schema
from app.engine.state import SubscriberState
from app.services.token_crypto import decrypt_token

logger = logging.getLogger(__name__)

# In-memory cache of Bot instances (token_hash → Bot or MaxBotClient)
_bot_cache: dict[str, Bot | MaxBotClient] = {}


async def get_or_create_bot(
    token_hash: str,
    redis: aioredis.Redis,
    db_session=None,
) -> Bot | MaxBotClient | None:
    """Get Bot instance from cache or create from Redis/DB."""
    if token_hash in _bot_cache:
        return _bot_cache[token_hash]

    # Try Redis cache first
    raw = await redis.get(f"bot:{token_hash}")
    if raw:
        data = json.loads(raw)
        token_encrypted = bytes.fromhex(data["token_encrypted"])
        platform = data.get("platform", "telegram")
    elif db_session:
        from app.services.bot_service import get_bot_by_hash
        bot_record = await get_bot_by_hash(db_session, token_hash)
        if not bot_record or bot_record.status != "running":
            return None
        token_encrypted = bot_record.token_encrypted
        platform = getattr(bot_record, "platform", "telegram")
    else:
        return None

    token = decrypt_token(token_encrypted)

    if platform == "max":
        bot = MaxBotClient(token=token)
    else:
        bot = Bot(token=token, default=DefaultBotProperties(parse_mode="HTML"))

    _bot_cache[token_hash] = bot
    return bot


async def get_platform(token_hash: str, redis: aioredis.Redis) -> str:
    """Get platform for a bot from Redis cache."""
    raw = await redis.get(f"bot:{token_hash}")
    if raw:
        data = json.loads(raw)
        return data.get("platform", "telegram")
    return "telegram"


def remove_bot_from_cache(token_hash: str):
    """Remove Bot instance from cache (on stop)."""
    _bot_cache.pop(token_hash, None)


async def get_schema_for_bot(
    token_hash: str,
    redis: aioredis.Redis,
    db_session=None,
) -> dict | None:
    """Get bot schema from Redis cache or DB."""
    storage = SubscriberState(redis, token_hash)
    schema = await storage.get_cached_schema()
    if schema:
        return schema

    if db_session:
        raw = await redis.get(f"bot:{token_hash}")
        if raw:
            data = json.loads(raw)
            bot_id = data.get("bot_id")
            if bot_id:
                from app.services.bot_service import get_active_schema
                import uuid
                schema_record = await get_active_schema(db_session, uuid.UUID(bot_id))
                if schema_record:
                    schema = schema_record.schema_json
                    await storage.cache_schema(schema)
                    return schema

    return None


async def handle_update(
    token_hash: str,
    update_data: dict,
    redis: aioredis.Redis,
    db_session=None,
):
    """Main entry point: route an incoming update to the right bot."""
    # Detect platform and normalize update format
    platform = await get_platform(token_hash, redis)
    if platform == "max":
        update_data = normalize_max_update(update_data)

    bot = await get_or_create_bot(token_hash, redis, db_session)
    if not bot:
        logger.warning(f"Bot not found for hash: {token_hash}")
        return

    schema = await get_schema_for_bot(token_hash, redis, db_session)
    if not schema:
        logger.warning(f"Schema not found for hash: {token_hash}")
        return

    schema = migrate_schema(schema)

    chat_id, user_id = _extract_ids(update_data)
    if not chat_id:
        return

    storage = SubscriberState(redis, token_hash)
    interpreter = GraphInterpreter(schema=schema, bot=bot, storage=storage)
    await interpreter.process_update(chat_id=chat_id, user_id=user_id, update_data=update_data)

    await redis.expire(f"bot:{token_hash}", 86400)


def _extract_ids(update_data: dict) -> tuple[int | None, int | None]:
    """Extract chat_id and user_id from normalized update dict."""
    # Message (works for both Telegram and normalized MAX)
    message = update_data.get("message") or update_data.get("edited_message")
    if message:
        chat = message.get("chat", {})
        user = message.get("from", {})
        return chat.get("id"), user.get("id")

    # Callback query
    callback = update_data.get("callback_query")
    if callback:
        msg = callback.get("message", {})
        chat = msg.get("chat", {})
        user = callback.get("from", {})
        return chat.get("id"), user.get("id")

    return None, None
