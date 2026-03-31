"""
Payment & subscription API endpoints.
"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models.subscription import Subscription, Payment
from app.services import bot_service
from app.services.yookassa import PLANS, create_payment, is_yookassa_ip

router = APIRouter()


# ─── Request / Response models ──────────────────────

class CreatePaymentRequest(BaseModel):
    bot_id: str
    plan: str  # month | 3month | year


class PaymentResponse(BaseModel):
    payment_id: str
    confirmation_url: str


class PlanInfo(BaseModel):
    id: str
    price_rub: int
    days: int
    label: str
    price_per_bot: int  # monthly equivalent


class SubscriptionInfo(BaseModel):
    id: str
    bot_id: str
    bot_name: str
    status: str
    plan: str
    expires_at: str
    days_left: int


# ─── Pricing ────────────────────────────────────────

@router.get("/pricing", response_model=list[PlanInfo])
async def get_pricing():
    """Get available tariff plans."""
    return [
        PlanInfo(
            id=plan_id,
            price_rub=plan["price_rub"],
            days=plan["days"],
            label=plan["label"],
            price_per_bot=plan["price_rub"] * 30 // plan["days"],
        )
        for plan_id, plan in PLANS.items()
    ]


# ─── Create payment ────────────────────────────────

@router.post("/create", response_model=PaymentResponse)
async def create_bot_payment(
    body: CreatePaymentRequest,
    session: DbSession,
    user: CurrentUser,
):
    """Create YooKassa payment for bot subscription."""
    if body.plan not in PLANS:
        raise HTTPException(status_code=400, detail="Неизвестный тариф")

    bot = await bot_service.get_bot(session, uuid.UUID(body.bot_id), user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")

    plan = PLANS[body.plan]

    try:
        result = await create_payment(
            amount_rub=plan["price_rub"],
            description=f"BotForge: {bot.name} — {plan['label']}",
            user_id=str(user.id),
            bot_id=body.bot_id,
            plan=body.plan,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ошибка создания платежа: {e}")

    # Save payment record
    payment = Payment(
        user_id=user.id,
        bot_id=bot.id,
        yookassa_id=result["id"],
        amount_rub=plan["price_rub"] * 100,  # kopecks
        plan=body.plan,
        days=plan["days"],
        status="pending",
    )
    session.add(payment)
    await session.commit()

    return PaymentResponse(
        payment_id=result["id"],
        confirmation_url=result["confirmation_url"],
    )


# ─── YooKassa webhook ──────────────────────────────

@router.post("/webhook")
async def yookassa_webhook(request: Request):
    """Handle YooKassa payment confirmation webhook."""
    # IP check (optional but recommended)
    client_ip = request.headers.get("X-Real-IP", request.client.host if request.client else "")
    if not is_yookassa_ip(client_ip) and client_ip not in ("127.0.0.1", "::1"):
        # Log but don't reject — some setups proxy differently
        pass

    body = await request.json()
    event_type = body.get("event")

    if event_type != "payment.succeeded":
        return {"ok": True}

    payment_obj = body.get("object", {})
    yookassa_id = payment_obj.get("id")
    metadata = payment_obj.get("metadata", {})
    user_id = metadata.get("user_id")
    bot_id = metadata.get("bot_id")
    plan = metadata.get("plan", "month")

    if not yookassa_id or not user_id or not bot_id:
        return {"ok": True}

    # Process in DB
    from app.db.session import async_session
    async with async_session() as session:
        # Find payment record
        result = await session.execute(
            select(Payment).where(Payment.yookassa_id == yookassa_id)
        )
        payment = result.scalar_one_or_none()

        if not payment:
            return {"ok": True}  # Unknown payment

        if payment.status == "completed":
            return {"ok": True}  # Already processed (idempotency)

        # Mark as completed
        payment.status = "completed"

        # Create or extend subscription
        result = await session.execute(
            select(Subscription).where(Subscription.bot_id == uuid.UUID(bot_id))
        )
        sub = result.scalar_one_or_none()
        days = PLANS.get(plan, {}).get("days", 30)
        now = datetime.now(timezone.utc)

        if sub:
            # Extend: from max(expires_at, now)
            base = max(sub.expires_at, now) if sub.expires_at else now
            sub.expires_at = base + timedelta(days=days)
            sub.status = "active"
            sub.plan = plan
        else:
            sub = Subscription(
                user_id=uuid.UUID(user_id),
                bot_id=uuid.UUID(bot_id),
                status="active",
                plan=plan,
                expires_at=now + timedelta(days=days),
            )
            session.add(sub)

        await session.commit()

    return {"ok": True}


# ─── My subscriptions ──────────────────────────────

@router.get("/subscriptions", response_model=list[SubscriptionInfo])
async def my_subscriptions(session: DbSession, user: CurrentUser):
    """Get user's active subscriptions."""
    result = await session.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    )
    subs = result.scalars().all()
    now = datetime.now(timezone.utc)

    items = []
    for sub in subs:
        # Get bot name
        bot = await bot_service.get_bot(session, sub.bot_id, user.id)
        bot_name = bot.name if bot else "Удалён"
        days_left = max(0, (sub.expires_at - now).days) if sub.expires_at else 0

        # Auto-expire
        if sub.status == "active" and days_left <= 0:
            sub.status = "expired"
            await session.commit()

        items.append(SubscriptionInfo(
            id=str(sub.id),
            bot_id=str(sub.bot_id),
            bot_name=bot_name,
            status=sub.status,
            plan=sub.plan,
            expires_at=sub.expires_at.isoformat() if sub.expires_at else "",
            days_left=days_left,
        ))

    return items
