import hashlib
import uuid
from datetime import datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, APIKeyHeader
from jose import JWTError, jwt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_session
from app.models.user import User
from app.models.api_key import ApiKey

security = HTTPBearer()
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_session)]


async def get_current_user(
    session: DbSession,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await session.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_api_key_user(
    session: DbSession,
    api_key: str | None = Security(api_key_header),
) -> User:
    """Authenticate via X-API-Key header. For public API."""
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API ключ не предоставлен. Передайте заголовок X-API-Key.",
        )

    key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    result = await session.execute(
        select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.is_active.is_(True))
    )
    key_record = result.scalar_one_or_none()

    if key_record is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или отозванный API ключ.",
        )

    # Update last_used_at
    await session.execute(
        update(ApiKey).where(ApiKey.id == key_record.id).values(last_used_at=datetime.utcnow())
    )
    await session.commit()

    # Load user
    result = await session.execute(select(User).where(User.id == key_record.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")

    return user


ApiKeyUser = Annotated[User, Depends(get_api_key_user)]
