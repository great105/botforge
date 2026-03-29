import asyncio

from app.engine.blocks.base import BaseBlockHandler, BlockResult


class DelayBlockHandler(BaseBlockHandler):
    """Wait for a specified delay before proceeding."""

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        delay_seconds = node["data"].get("delay_seconds", 1)
        max_delay = 300  # 5 minutes max to avoid blocking

        delay_seconds = min(int(delay_seconds), max_delay)
        if delay_seconds > 0:
            await asyncio.sleep(delay_seconds)

        return BlockResult(next_handle=None, variables=variables)
