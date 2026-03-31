import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.bot import Bot


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=True)  # nullable for Telegram-only users
    plan: Mapped[str] = mapped_column(String(20), default="free")

    # Email verification
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    verification_code: Mapped[str | None] = mapped_column(String(6), nullable=True)
    code_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Telegram OAuth
    telegram_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True, index=True)

    bots: Mapped[list["Bot"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
