"""API Key management endpoints (authenticated via JWT)."""

import hashlib
import secrets
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models.api_key import ApiKey

router = APIRouter()


class CreateKeyRequest(BaseModel):
    name: str


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    prefix: str
    created_at: str
    last_used_at: str | None


class CreateKeyResponse(ApiKeyResponse):
    key: str  # Full key — shown only once!


@router.post("/", response_model=CreateKeyResponse)
async def create_api_key(
    body: CreateKeyRequest,
    session: DbSession,
    user: CurrentUser,
):
    """Создать новый API ключ. Ключ показывается только один раз!"""
    # Limit: max 5 keys per user
    result = await session.execute(
        select(ApiKey).where(ApiKey.user_id == user.id, ApiKey.is_active.is_(True))
    )
    existing = result.scalars().all()
    if len(existing) >= 5:
        raise HTTPException(status_code=400, detail="Максимум 5 активных API ключей")

    # Generate key: bf_<32 random hex chars>
    raw_key = f"bf_{secrets.token_hex(24)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    prefix = raw_key[:11]  # "bf_xxxxxxx"

    api_key = ApiKey(
        user_id=user.id,
        key_hash=key_hash,
        name=body.name,
        prefix=prefix,
    )
    session.add(api_key)
    await session.commit()
    await session.refresh(api_key)

    return CreateKeyResponse(
        id=str(api_key.id),
        name=api_key.name,
        prefix=api_key.prefix,
        key=raw_key,  # shown only once!
        created_at=api_key.created_at.isoformat(),
        last_used_at=None,
    )


@router.get("/", response_model=list[ApiKeyResponse])
async def list_api_keys(
    session: DbSession,
    user: CurrentUser,
):
    """Список API ключей пользователя."""
    result = await session.execute(
        select(ApiKey)
        .where(ApiKey.user_id == user.id, ApiKey.is_active.is_(True))
        .order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()

    return [
        ApiKeyResponse(
            id=str(k.id),
            name=k.name,
            prefix=k.prefix,
            created_at=k.created_at.isoformat(),
            last_used_at=k.last_used_at.isoformat() if k.last_used_at else None,
        )
        for k in keys
    ]


@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: str,
    session: DbSession,
    user: CurrentUser,
):
    """Отозвать (деактивировать) API ключ."""
    result = await session.execute(
        select(ApiKey).where(
            ApiKey.id == uuid.UUID(key_id),
            ApiKey.user_id == user.id,
        )
    )
    api_key = result.scalar_one_or_none()
    if api_key is None:
        raise HTTPException(status_code=404, detail="API ключ не найден")

    api_key.is_active = False
    await session.commit()
    return {"status": "revoked"}
