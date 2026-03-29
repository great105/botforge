import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.schema import BotSchema
    from app.models.user import User


class Bot(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "bots"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    token_encrypted: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    bot_username: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="stopped")  # stopped | running | error | sleeping
    error_message: Mapped[str | None] = mapped_column(Text)
    subscribers_count: Mapped[int] = mapped_column(Integer, default=0)

    owner: Mapped["User"] = relationship(back_populates="bots")
    schemas: Mapped[list["BotSchema"]] = relationship(back_populates="bot", cascade="all, delete-orphan")
