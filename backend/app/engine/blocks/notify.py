import logging

from app.engine.blocks.base import BaseBlockHandler, BlockResult

log = logging.getLogger(__name__)


class NotifyBlockHandler(BaseBlockHandler):
    """Send a message to a specific chat_id (e.g. admin notification).

    The chat_id can be a literal number or a {variable} reference.
    Text supports variable interpolation.
    """

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        data = node["data"]
        raw_chat_id = self.interpolate(str(data.get("chat_id", "")), variables).strip()
        text = self.interpolate(data.get("text", ""), variables)
        parse_mode = data.get("parse_mode", "HTML")

        if not raw_chat_id:
            log.warning("Notify block %s: empty chat_id, skipping", node["id"])
            return BlockResult(next_handle=None, variables=variables)

        if not text.strip():
            text = "\u200b"

        try:
            target_id = int(raw_chat_id)
        except ValueError:
            log.warning("Notify block %s: invalid chat_id '%s'", node["id"], raw_chat_id)
            return BlockResult(next_handle=None, variables=variables)

        try:
            await bot.send_message(chat_id=target_id, text=text, parse_mode=parse_mode)
        except Exception:
            log.exception("Notify block %s: failed to send to %s", node["id"], target_id)

        return BlockResult(next_handle=None, variables=variables)
