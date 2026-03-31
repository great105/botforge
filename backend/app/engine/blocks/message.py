from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from app.engine.blocks.base import BaseBlockHandler, BlockResult


class MessageBlockHandler(BaseBlockHandler):
    """Unified handler for 'message' nodes (replaces text, buttons, input, start).

    Behavior depends on which optional fields are present in node data:
    - buttons  -> send inline keyboard, wait for callback
    - input    -> send prompt, wait for text input
    - neither  -> send text and proceed immediately

    Button features:
    - URL buttons (type='url') render as link buttons (no callback)
    - button_answer_variable: saves pressed button text to a variable
    - Default output: if pressed button's handle has no edge, falls through to 'default' handle
    """

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        data = node["data"]
        has_buttons = bool(data.get("buttons"))
        # Support both new format (input: {variable, validation}) and legacy (variable: str)
        input_cfg = data.get("input")
        if input_cfg is None and data.get("variable"):
            input_cfg = {"variable": data["variable"], "validation": data.get("validation")}
        has_input = input_cfg is not None

        # --- Handle returning button press ---
        if has_buttons:
            callback = update_data.get("callback_query")
            if callback:
                handle = callback.get("data", "")
                # Save button text to variable if configured
                answer_var = data.get("button_answer_variable")
                if answer_var:
                    # Find button text by output_handle
                    for btn in data["buttons"]:
                        if btn.get("output_handle") == handle:
                            variables[answer_var] = btn["text"]
                            break
                return BlockResult(next_handle=handle, variables=variables, wait_input=False)

        # --- Handle returning text input ---
        if has_input and not has_buttons:
            message = update_data.get("message")
            if message and message.get("text"):
                var_name = input_cfg.get("variable", "user_input")
                user_text = message["text"]
                variables[var_name] = user_text

                validation = input_cfg.get("validation")
                if validation == "email" and "@" not in user_text:
                    await bot.send_message(
                        chat_id=chat_id,
                        text="Пожалуйста, введите корректный email.",
                    )
                    return BlockResult(variables=variables, wait_input=True)
                if validation == "phone" and not any(c.isdigit() for c in user_text):
                    await bot.send_message(
                        chat_id=chat_id,
                        text="Пожалуйста, введите корректный номер телефона.",
                    )
                    return BlockResult(variables=variables, wait_input=True)

                return BlockResult(next_handle=None, variables=variables, wait_input=False)

        # --- Send the message (first visit) ---
        text = self.interpolate(data.get("text") or data.get("label") or "", variables)
        if not text.strip():
            text = "\u200b"  # zero-width space fallback to avoid empty message error
        parse_mode = data.get("parse_mode", "HTML")

        if has_buttons:
            buttons_data = data["buttons"]
            layout = data.get("button_layout") or data.get("layout", "vertical")
            keyboard = self._build_keyboard(buttons_data, layout)
            await bot.send_message(
                chat_id=chat_id, text=text, reply_markup=keyboard, parse_mode=parse_mode,
            )
            return BlockResult(variables=variables, wait_input=True)

        await bot.send_message(chat_id=chat_id, text=text, parse_mode=parse_mode)

        if has_input:
            return BlockResult(variables=variables, wait_input=True)

        return BlockResult(next_handle=None, variables=variables, wait_input=False)

    @staticmethod
    def _build_keyboard(buttons_data: list[dict], layout: str) -> InlineKeyboardMarkup:
        buttons = []
        for b in buttons_data:
            if b.get("type") == "url" and b.get("url"):
                buttons.append(InlineKeyboardButton(text=b["text"], url=b["url"]))
            else:
                buttons.append(InlineKeyboardButton(text=b["text"], callback_data=b["output_handle"]))

        if layout == "horizontal":
            rows = [buttons]
        else:
            rows = [[btn] for btn in buttons]
        return InlineKeyboardMarkup(inline_keyboard=rows)
