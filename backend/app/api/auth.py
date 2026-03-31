import hashlib
import hmac
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import select

from app.config import settings
from app.deps import CurrentUser, DbSession
from app.models.user import User
from app.services.email import generate_verification_code, send_verification_email

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


# ─── Request / Response models ──────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str


class ResendCodeRequest(BaseModel):
    email: EmailStr


class TelegramAuthRequest(BaseModel):
    id: int
    first_name: str = ""
    last_name: str = ""
    username: str = ""
    photo_url: str = ""
    auth_date: int
    hash: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str = ""
    token_type: str = "bearer"


class RegisterResponse(BaseModel):
    requires_verification: bool = True
    email: str


class UserResponse(BaseModel):
    id: str
    email: str
    plan: str
    email_verified: bool
    telegram_id: int | None = None
    created_at: datetime


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_token_pair(user_id: str) -> dict:
    return {
        "access_token": create_access_token(user_id),
        "refresh_token": create_refresh_token(user_id),
    }


# ─── Registration (email + password) ─────────────────────

@router.post("/register", response_model=RegisterResponse)
async def register(body: RegisterRequest, session: DbSession):
    result = await session.execute(select(User).where(User.email == body.email))
    existing = result.scalar_one_or_none()

    if existing and existing.email_verified:
        raise HTTPException(status_code=409, detail="Email уже зарегистрирован")

    code = generate_verification_code()
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)

    if existing and not existing.email_verified:
        # Re-send code for unverified user
        existing.password_hash = pwd_context.hash(body.password[:72])
        existing.verification_code = code
        existing.code_expires_at = expires
        await session.commit()
    else:
        user = User(
            email=body.email,
            password_hash=pwd_context.hash(body.password[:72]),
            email_verified=False,
            verification_code=code,
            code_expires_at=expires,
        )
        session.add(user)
        await session.commit()

    await send_verification_email(body.email, code)
    return RegisterResponse(email=body.email)


# ─── Email verification ──────────────────────────────────

@router.post("/verify-code", response_model=TokenResponse)
async def verify_code(body: VerifyCodeRequest, session: DbSession):
    result = await session.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email уже подтверждён")
    if user.verification_code != body.code:
        raise HTTPException(status_code=400, detail="Неверный код")
    if user.code_expires_at and user.code_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Код истёк. Запросите новый.")

    user.email_verified = True
    user.verification_code = None
    user.code_expires_at = None
    await session.commit()

    tokens = create_token_pair(str(user.id))
    return TokenResponse(**tokens)


@router.post("/resend-code")
async def resend_code(body: ResendCodeRequest, session: DbSession):
    result = await session.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email уже подтверждён")

    # Rate limit: 60 sec between resends
    if user.code_expires_at:
        # code_expires_at is set to now()+10min, so code was sent at code_expires_at - 10min
        code_sent_at = user.code_expires_at - timedelta(minutes=10)
        elapsed = (datetime.now(timezone.utc) - code_sent_at).total_seconds()
        if elapsed < 60:
            wait = int(60 - elapsed)
            raise HTTPException(status_code=429, detail=f"Подождите {wait} сек.")

    code = generate_verification_code()
    user.verification_code = code
    user.code_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    await session.commit()

    await send_verification_email(body.email, code)
    return {"detail": "Код отправлен повторно"}


# ─── Login (email + password) ────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, session: DbSession):
    result = await session.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not pwd_context.verify(body.password[:72], user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    if not user.email_verified:
        # Auto-resend code
        code = generate_verification_code()
        user.verification_code = code
        user.code_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        await session.commit()
        await send_verification_email(body.email, code)
        raise HTTPException(status_code=403, detail="Email не подтверждён. Код отправлен повторно.")

    tokens = create_token_pair(str(user.id))
    return TokenResponse(**tokens)


# ─── Telegram OAuth ──────────────────────────────────────

@router.post("/telegram", response_model=TokenResponse)
async def telegram_auth(body: TelegramAuthRequest, session: DbSession):
    bot_token = settings.TELEGRAM_BOT_TOKEN_LOGIN
    if not bot_token:
        raise HTTPException(status_code=501, detail="Telegram Login не настроен")

    # Verify hash
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    check_data = {k: v for k, v in body.model_dump().items() if k != "hash" and v not in ("", 0)}
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(check_data.items()))
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if computed_hash != body.hash:
        raise HTTPException(status_code=401, detail="Неверная подпись Telegram")

    # Check freshness (5 min)
    from time import time
    if time() - body.auth_date > 300:
        raise HTTPException(status_code=401, detail="Данные авторизации устарели")

    # Find or create user
    result = await session.execute(select(User).where(User.telegram_id == body.id))
    user = result.scalar_one_or_none()

    if not user:
        display = body.username or body.first_name or str(body.id)
        user = User(
            email=f"tg_{body.id}@telegram.local",
            password_hash=None,
            telegram_id=body.id,
            email_verified=True,
            plan="free",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    tokens = create_token_pair(str(user.id))
    return TokenResponse(**tokens)


# ─── Refresh token ──────────────────────────────────────

class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, session: DbSession):
    try:
        payload = jwt.decode(body.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Невалидный refresh token")
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token истёк или невалиден")

    result = await session.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")

    tokens = create_token_pair(str(user.id))
    return TokenResponse(**tokens)


# ─── Current user info ───────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_me(user: CurrentUser):
    return UserResponse(
        id=str(user.id),
        email=user.email,
        plan=user.plan,
        email_verified=user.email_verified,
        telegram_id=user.telegram_id,
        created_at=user.created_at,
    )
