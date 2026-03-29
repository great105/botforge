from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from app.engine.blocks.base import BaseBlockHandler, BlockResult


class ButtonsBlockHandler(BaseBlockHandler):
    """Send inline keyboard buttons and wait for callback."""

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        # If callback from button press — determine which button was pressed
        callback = update_data.get("callback_query")
        if callback:
            handle = callback.get("data", "")
            return BlockResult(next_handle=handle, variables=variables, wait_input=False)

        # Otherwise — send buttons and wait
        buttons_data = node["data"].get("buttons", [])
        layout = node["data"].get("layout", "vertical")

        if layout == "vertical":
            keyboard_rows = [
                [InlineKeyboardButton(text=b["text"], callback_data=b["output_handle"])]
                for b in buttons_data
            ]
        else:
            keyboard_rows = [
                [
                    InlineKeyboardButton(text=b["text"], callback_data=b["output_handle"])
                    for b in buttons_data
                ]
            ]

        keyboard = InlineKeyboardMarkup(inline_keyboard=keyboard_rows)
        text = self.interpolate(node["data"].get("text", "Выберите:"), variables)
        parse_mode = node["data"].get("parse_mode", "HTML")

        await bot.send_message(chat_id=chat_id, text=text, reply_markup=keyboard, parse_mode=parse_mode)

        return BlockResult(variables=variables, wait_input=True)
