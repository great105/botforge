import logging

from aiogram.enums import ChatMemberStatus

from app.engine.blocks.base import BaseBlockHandler, BlockResult

logger = logging.getLogger(__name__)


class CheckSubBlockHandler(BaseBlockHandler):
    """Check if user is subscribed to a Telegram channel."""

    SUBSCRIBED_STATUSES = {
        ChatMemberStatus.CREATOR,
        ChatMemberStatus.ADMINISTRATOR,
        ChatMemberStatus.MEMBER,
    }

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        data = node.get("data", {})
        channel_id = self.interpolate(data.get("channel_id", ""), variables)
        fail_text = self.interpolate(
            data.get("fail_text", "Подпишитесь на канал, чтобы продолжить!"),
            variables,
        )

        if not channel_id:
            logger.warning("CheckSub node %s: empty channel_id", node.get("id"))
            return BlockResult(next_handle="not_subscribed", variables=variables)

        try:
            # Get user_id from update_data or chat_id (in private chats they're the same)
            user_id = update_data.get("from", {}).get("id", chat_id)
            member = await bot.get_chat_member(chat_id=channel_id, user_id=user_id)

            if member.status in self.SUBSCRIBED_STATUSES:
                variables["is_subscribed"] = "true"
                return BlockResult(next_handle="subscribed", variables=variables)
        except Exception as e:
            logger.error("CheckSub failed for node %s: %s", node.get("id"), e)
            variables["check_sub_error"] = str(e)

        # Not subscribed — send fail message
        variables["is_subscribed"] = "false"
        if fail_text:
            try:
                await bot.send_message(chat_id=chat_id, text=fail_text, parse_mode="HTML")
            except Exception:
                pass

        return BlockResult(next_handle="not_subscribed", variables=variables)
