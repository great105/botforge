"""
MAX messenger bot client — duck-typed replacement for aiogram.Bot.
Block handlers call bot.send_message(...) / bot.send_photo(...) etc.
MaxBotClient translates these to MAX API calls at platform-api.max.ru.
"""

from dataclasses import dataclass
from typing import Any

import httpx

MAX_API_BASE = "https://platform-api.max.ru"


@dataclass
class MaxUser:
    """Mimics aiogram User for get_me() compatibility."""
    user_id: int
    name: str
    username: str | None = None
    is_bot: bool = True


class MaxBotClient:
    """
    Duck-typed replacement for aiogram.Bot.
    Implements the same methods block handlers use.
    """

    def __init__(self, token: str):
        self.token = token
        self.platform = "max"
        self._headers = {"Authorization": token, "Content-Type": "application/json"}

    async def get_me(self) -> MaxUser:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{MAX_API_BASE}/me", headers=self._headers)
            resp.raise_for_status()
            data = resp.json()
            return MaxUser(
                user_id=data.get("user_id", 0),
                name=data.get("name", ""),
                username=data.get("username"),
            )

    async def send_message(self, chat_id: Any, text: str, *,
                           reply_markup=None, parse_mode: str | None = None, **kwargs) -> dict:
        body: dict = {"chat_id": chat_id, "text": text}
        if parse_mode and parse_mode.upper() == "HTML":
            body["format"] = "html"
        if reply_markup is not None:
            attach = self._convert_markup(reply_markup)
            if attach:
                body["attachments"] = [attach]

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{MAX_API_BASE}/messages", headers=self._headers, json=body)
            resp.raise_for_status()
            return resp.json()

    # --- Media methods (all map to POST /messages with attachments) ---

    async def send_photo(self, chat_id, photo, *, caption=None, parse_mode=None, **kw):
        await self._send_media(chat_id, "image", photo, caption, parse_mode)

    async def send_video(self, chat_id, video, *, caption=None, parse_mode=None, **kw):
        await self._send_media(chat_id, "video", video, caption, parse_mode)

    async def send_document(self, chat_id, document, *, caption=None, parse_mode=None, **kw):
        await self._send_media(chat_id, "file", document, caption, parse_mode)

    async def send_audio(self, chat_id, audio, *, caption=None, parse_mode=None, **kw):
        await self._send_media(chat_id, "audio", audio, caption, parse_mode)

    async def send_voice(self, chat_id, voice, *, caption=None, parse_mode=None, **kw):
        await self._send_media(chat_id, "audio", voice, caption, parse_mode)

    async def send_sticker(self, chat_id, sticker, **kw):
        await self._send_media(chat_id, "image", sticker, None, None)

    async def send_animation(self, chat_id, animation, *, caption=None, parse_mode=None, **kw):
        await self._send_media(chat_id, "video", animation, caption, parse_mode)

    async def _send_media(self, chat_id, media_type: str, url: str,
                          caption: str | None, parse_mode: str | None):
        body: dict = {"chat_id": chat_id, "text": caption or ""}
        if parse_mode and parse_mode.upper() == "HTML":
            body["format"] = "html"
        body["attachments"] = [{"type": media_type, "payload": {"url": str(url)}}]

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{MAX_API_BASE}/messages", headers=self._headers, json=body)
            resp.raise_for_status()

    # --- Callbacks ---

    async def answer_callback_query(self, callback_id: str, **kwargs):
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{MAX_API_BASE}/answers",
                headers=self._headers,
                json={"callback_id": callback_id},
            )
            resp.raise_for_status()

    # --- Telegram-only stubs ---

    async def answer_pre_checkout_query(self, *args, **kwargs):
        raise NotImplementedError("Оплата не поддерживается в MAX")

    async def send_invoice(self, *args, **kwargs):
        raise NotImplementedError("Оплата не поддерживается в MAX")

    async def get_chat_member(self, *args, **kwargs):
        raise NotImplementedError("Проверка подписки не поддерживается в MAX")

    # --- Webhook management ---

    async def set_webhook(self, url: str, update_types: list[str] | None = None):
        types = update_types or ["message_created", "message_callback", "bot_started"]
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{MAX_API_BASE}/subscriptions",
                headers=self._headers,
                json={"url": url, "update_types": types},
            )
            resp.raise_for_status()

    async def delete_webhook(self):
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.delete(
                f"{MAX_API_BASE}/subscriptions",
                headers=self._headers,
            )
            # 404 is ok — no subscription exists
            if resp.status_code != 404:
                resp.raise_for_status()

    # --- Markup conversion ---

    @staticmethod
    def _convert_markup(reply_markup) -> dict | None:
        """Convert aiogram InlineKeyboardMarkup to MAX inline_keyboard attachment."""
        # aiogram InlineKeyboardMarkup object
        if hasattr(reply_markup, 'inline_keyboard'):
            buttons = []
            for row in reply_markup.inline_keyboard:
                max_row = []
                for btn in row:
                    if getattr(btn, 'url', None):
                        max_row.append({"type": "link", "text": btn.text, "url": btn.url})
                    else:
                        max_row.append({
                            "type": "callback",
                            "text": btn.text,
                            "payload": getattr(btn, 'callback_data', '') or btn.text,
                        })
                buttons.append(max_row)
            return {"type": "inline_keyboard", "payload": {"buttons": buttons}}
        # Already a dict (MAX format)
        if isinstance(reply_markup, dict):
            return reply_markup
        return None


def normalize_max_update(data: dict) -> dict:
    """Convert MAX webhook payload to Telegram-like update_data dict.
    This lets all block handlers work unchanged."""

    update_type = data.get("update_type")

    if update_type == "message_created":
        msg = data.get("message", {})
        sender = msg.get("sender", {})
        recipient = msg.get("recipient", {})
        body = msg.get("body", {})
        return {
            "message": {
                "chat": {"id": recipient.get("chat_id")},
                "from": {"id": sender.get("user_id")},
                "text": body.get("text", ""),
            }
        }

    if update_type == "bot_started":
        return {
            "message": {
                "chat": {"id": data.get("chat_id")},
                "from": {"id": data.get("user", {}).get("user_id")},
                "text": "/start",
            }
        }

    if update_type == "message_callback":
        cb = data.get("callback", {})
        user = cb.get("user", {})
        msg = cb.get("message", {})
        recipient = msg.get("recipient", {})
        return {
            "callback_query": {
                "id": cb.get("callback_id", ""),
                "from": {"id": user.get("user_id")},
                "message": {"chat": {"id": recipient.get("chat_id")}},
                "data": cb.get("payload", ""),
            }
        }

    return data
