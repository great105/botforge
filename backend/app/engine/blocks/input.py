from app.engine.blocks.base import BaseBlockHandler, BlockResult


class InputBlockHandler(BaseBlockHandler):
    """Ask user for input and save to a variable."""

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        variable_name = node["data"].get("variable", "user_input")

        # If we already have user input — save it and proceed
        message = update_data.get("message")
        if message and message.get("text"):
            variables[variable_name] = message["text"]

            # Optional: validation
            validation = node["data"].get("validation")
            if validation == "email" and "@" not in message["text"]:
                await bot.send_message(
                    chat_id=chat_id,
                    text="Пожалуйста, введите корректный email.",
                )
                return BlockResult(variables=variables, wait_input=True)

            if validation == "phone" and not any(c.isdigit() for c in message["text"]):
                await bot.send_message(
                    chat_id=chat_id,
                    text="Пожалуйста, введите корректный номер телефона.",
                )
                return BlockResult(variables=variables, wait_input=True)

            return BlockResult(next_handle=None, variables=variables, wait_input=False)

        # Otherwise — send prompt and wait for input
        prompt_text = node["data"].get("text", "Введите значение:")
        prompt_text = self.interpolate(prompt_text, variables)
        await bot.send_message(chat_id=chat_id, text=prompt_text)

        return BlockResult(variables=variables, wait_input=True)
