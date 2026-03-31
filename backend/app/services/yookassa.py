"""
YooKassa payment service — create payments, process webhooks.
Adapted from VPN project's yookassa_service.py.
"""

import logging
import uuid

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

YOOKASSA_API = "https://api.yookassa.ru/v3"

# Tariff plans
PLANS = {
    "month": {"price_rub": 990, "days": 30, "label": "1 месяц"},
    "3month": {"price_rub": 2370, "days": 90, "label": "3 месяца (790₽/бот)"},
    "year": {"price_rub": 7080, "days": 365, "label": "1 год (590₽/бот)"},
}

# YooKassa whitelisted IPs
YOOKASSA_IPS = [
    "185.71.76.", "185.71.77.", "77.75.153.", "77.75.154.", "77.75.156.",
]


def is_yookassa_ip(ip: str) -> bool:
    """Check if IP belongs to YooKassa network."""
    return any(ip.startswith(prefix) for prefix in YOOKASSA_IPS)


async def create_payment(
    amount_rub: int,
    description: str,
    user_id: str,
    bot_id: str,
    plan: str,
) -> dict:
    """Create a YooKassa payment. Returns {id, confirmation_url}."""
    if not settings.YOOKASSA_SHOP_ID or not settings.YOOKASSA_SECRET_KEY:
        raise ValueError("YooKassa не настроена")

    idempotence_key = str(uuid.uuid4())

    payload = {
        "amount": {
            "value": f"{amount_rub}.00",
            "currency": "RUB",
        },
        "confirmation": {
            "type": "redirect",
            "return_url": settings.YOOKASSA_RETURN_URL,
        },
        "capture": True,
        "description": description,
        "metadata": {
            "user_id": user_id,
            "bot_id": bot_id,
            "plan": plan,
        },
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{YOOKASSA_API}/payments",
            json=payload,
            auth=(settings.YOOKASSA_SHOP_ID, settings.YOOKASSA_SECRET_KEY),
            headers={"Idempotence-Key": idempotence_key},
        )
        resp.raise_for_status()
        data = resp.json()

    return {
        "id": data["id"],
        "confirmation_url": data["confirmation"]["confirmation_url"],
        "status": data["status"],
    }
