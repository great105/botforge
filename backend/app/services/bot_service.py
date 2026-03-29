import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bot import Bot
from app.models.schema import BotSchema


async def get_user_bots(session: AsyncSession, user_id: uuid.UUID) -> list[Bot]:
    result = await session.execute(
        select(Bot).where(Bot.user_id == user_id).order_by(Bot.created_at.desc())
    )
    return list(result.scalars().all())


async def get_bot(session: AsyncSession, bot_id: uuid.UUID, user_id: uuid.UUID) -> Bot | None:
    result = await session.execute(
        select(Bot).where(Bot.id == bot_id, Bot.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def get_bot_by_hash(session: AsyncSession, token_hash: str) -> Bot | None:
    result = await session.execute(
        select(Bot).where(Bot.token_hash == token_hash)
    )
    return result.scalar_one_or_none()


async def create_bot(
    session: AsyncSession,
    user_id: uuid.UUID,
    name: str,
    token_encrypted: bytes,
    token_hash: str,
) -> Bot:
    bot = Bot(
        user_id=user_id,
        name=name,
        token_encrypted=token_encrypted,
        token_hash=token_hash,
    )
    session.add(bot)
    await session.commit()
    await session.refresh(bot)
    return bot


async def update_bot_status(
    session: AsyncSession,
    bot_id: uuid.UUID,
    status: str,
    username: str | None = None,
    error_message: str | None = None,
):
    values = {"status": status}
    if username is not None:
        values["bot_username"] = username
    if error_message is not None:
        values["error_message"] = error_message
    elif status != "error":
        values["error_message"] = None

    await session.execute(update(Bot).where(Bot.id == bot_id).values(**values))
    await session.commit()


async def delete_bot(session: AsyncSession, bot: Bot):
    await session.delete(bot)
    await session.commit()


# --- Schema operations ---


async def get_active_schema(session: AsyncSession, bot_id: uuid.UUID) -> BotSchema | None:
    result = await session.execute(
        select(BotSchema)
        .where(BotSchema.bot_id == bot_id, BotSchema.is_active.is_(True))
        .order_by(BotSchema.version.desc())
    )
    return result.scalar_one_or_none()


async def save_schema(
    session: AsyncSession, bot_id: uuid.UUID, schema_json: dict
) -> BotSchema:
    # Deactivate previous active schemas
    await session.execute(
        update(BotSchema)
        .where(BotSchema.bot_id == bot_id, BotSchema.is_active.is_(True))
        .values(is_active=False)
    )

    # Get next version number
    result = await session.execute(
        select(BotSchema.version)
        .where(BotSchema.bot_id == bot_id)
        .order_by(BotSchema.version.desc())
        .limit(1)
    )
    last_version = result.scalar_one_or_none() or 0

    schema = BotSchema(
        bot_id=bot_id,
        version=last_version + 1,
        schema_json=schema_json,
        is_active=True,
    )
    session.add(schema)
    await session.commit()
    await session.refresh(schema)
    return schema


async def count_running_bots(session: AsyncSession, user_id: uuid.UUID) -> int:
    result = await session.execute(
        select(Bot).where(Bot.user_id == user_id, Bot.status == "running")
    )
    return len(result.scalars().all())
