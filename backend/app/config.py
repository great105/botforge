from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "BotForge"
    DEBUG: bool = False
    BASE_URL: str = "https://botforge.ru"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://botforge:botforge@localhost:5432/botforge"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth (JWT)
    SECRET_KEY: str = "change-me-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120  # 2 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Encryption for bot tokens
    ENCRYPTION_KEY: str = "change-me-32-byte-key-for-aes256"  # 32 bytes for AES-256

    # Telegram webhook verification
    WEBHOOK_SECRET: str = "botforge-webhook-secret"

    # SMTP (Email verification)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@сделаембот.рф"
    SMTP_USE_TLS: bool = True

    # YooKassa
    YOOKASSA_SHOP_ID: str = ""
    YOOKASSA_SECRET_KEY: str = ""
    YOOKASSA_RETURN_URL: str = "https://xn--80acheb8ajrts.xn--p1ai/payment/success"

    # Telegram Login Widget
    TELEGRAM_BOT_TOKEN_LOGIN: str = ""  # Bot token for widget hash verification
    TELEGRAM_BOT_USERNAME: str = ""  # Without @

    # AI Agent (OpenRouter)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "xiaomi/mimo-v2-pro"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    # Legacy — kept for backward compat
    ANTHROPIC_API_KEY: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

# Block startup with insecure defaults in production
if not settings.DEBUG:
    _insecure = [
        ("SECRET_KEY", "change-me"),
        ("ENCRYPTION_KEY", "change-me"),
    ]
    for name, marker in _insecure:
        if marker in getattr(settings, name, ""):
            raise RuntimeError(f"{name} contains default value. Set it in .env!")
