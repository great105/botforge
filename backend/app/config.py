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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Encryption for bot tokens
    ENCRYPTION_KEY: str = "change-me-32-byte-key-for-aes256"  # 32 bytes for AES-256

    # Telegram webhook verification
    WEBHOOK_SECRET: str = "botforge-webhook-secret"

    # Anthropic
    ANTHROPIC_API_KEY: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
