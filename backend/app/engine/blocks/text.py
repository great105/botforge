from app.engine.blocks.base import BaseBlockHandler, BlockResult


class TextBlockHandler(BaseBlockHandler):
    """Send a text message and proceed to next block."""

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        text = node["data"].get("text", "")
        text = self.interpolate(text, variables)
        parse_mode = node["data"].get("parse_mode", "HTML")

        await bot.send_message(chat_id=chat_id, text=text, parse_mode=parse_mode)

        return BlockResult(next_handle=None, variables=variables)
