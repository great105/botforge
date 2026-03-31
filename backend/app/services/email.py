"""
Email verification service — sends 6-digit codes via SMTP.
Falls back to logging in dev mode (when SMTP_HOST is empty).
"""

import asyncio
import logging
import secrets
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


def generate_verification_code() -> str:
    """Generate a cryptographically random 6-digit code."""
    return f"{secrets.randbelow(1000000):06d}"


async def send_verification_email(to_email: str, code: str) -> bool:
    """Send verification code via SMTP. Returns True on success."""
    if not settings.SMTP_HOST:
        logger.warning(f"SMTP not configured. Code for {to_email}: {code}")
        return True  # dev mode

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"BotForge — код подтверждения: {code}"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email

    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1f2937; margin-bottom: 8px;">BotForge</h2>
        <p style="color: #4b5563; margin-bottom: 16px;">Ваш код подтверждения:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px;
                    padding: 20px; background: #f3f4f6; border-radius: 12px;
                    text-align: center; color: #111827;">
            {code}
        </div>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 16px;">
            Код действителен 10 минут. Если вы не запрашивали код — проигнорируйте это письмо.
        </p>
    </div>
    """
    msg.attach(MIMEText(html, "html"))

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _send_smtp, msg)
        return True
    except Exception:
        logger.exception(f"Failed to send email to {to_email}")
        return False


def _send_smtp(msg: MIMEMultipart):
    """Blocking SMTP send — runs in thread pool."""
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
