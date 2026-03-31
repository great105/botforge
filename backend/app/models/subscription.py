import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Subscription(UUIDMixin, TimestampMixin, Base):
    """Active subscription: one running bot = one subscription."""
    __tablename__ = "subscriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    bot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)  # active | expired | cancelled
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    plan: Mapped[str] = mapped_column(String(20), default="month")  # month | 3month | year
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=False)


class Payment(UUIDMixin, TimestampMixin, Base):
    """Payment record from YooKassa."""
    __tablename__ = "payments"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    bot_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bots.id", ondelete="SET NULL"), nullable=True
    )
    yookassa_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    amount_rub: Mapped[int] = mapped_column(Integer, nullable=False)  # in kopecks (99000 = 990 rub)
    plan: Mapped[str] = mapped_column(String(20), nullable=False)
    days: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | completed | failed
