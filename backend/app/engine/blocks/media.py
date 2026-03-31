import logging

from app.engine.blocks.base import BaseBlockHandler, BlockResult

logger = logging.getLogger(__name__)


class MediaBlockHandler(BaseBlockHandler):
    """Send media content: photo, video, document, sticker, voice, audio, animation."""

    SEND_METHODS = {
        "photo": "send_photo",
        "video": "send_video",
        "document": "send_document",
        "sticker": "send_sticker",
        "voice": "send_voice",
        "audio": "send_audio",
        "animation": "send_animation",
    }

    # Which parameter name to use for each media type
    MEDIA_PARAM = {
        "photo": "photo",
        "video": "video",
        "document": "document",
        "sticker": "sticker",
        "voice": "voice",
        "audio": "audio",
        "animation": "animation",
    }

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        data = node.get("data", {})
        media_type = data.get("media_type", "photo")
        url = self.interpolate(data.get("url", ""), variables)
        caption = self.interpolate(data.get("caption", ""), variables)
        parse_mode = data.get("parse_mode", "HTML")

        if not url:
            logger.warning("Media node %s: empty URL", node.get("id"))
            return BlockResult(variables=variables)

        method_name = self.SEND_METHODS.get(media_type, "send_photo")
        param_name = self.MEDIA_PARAM.get(media_type, "photo")

        try:
            send_method = getattr(bot, method_name)
            kwargs = {
                "chat_id": chat_id,
                param_name: url,
            }
            # Stickers don't support caption
            if media_type != "sticker" and caption:
                kwargs["caption"] = caption
                kwargs["parse_mode"] = parse_mode

            await send_method(**kwargs)
        except Exception as e:
            logger.error("Media send failed for node %s: %s", node.get("id"), e)
            variables["media_error"] = str(e)

        return BlockResult(variables=variables)
