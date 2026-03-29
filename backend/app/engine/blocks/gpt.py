import httpx

from app.engine.blocks.base import BaseBlockHandler, BlockResult


class GptBlockHandler(BaseBlockHandler):
    """Send user message to OpenAI-compatible API and return response."""

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        message = update_data.get("message", {})
        user_text = message.get("text", "")

        if not user_text:
            prompt = node["data"].get("prompt", "Ответь пользователю.")
            prompt = self.interpolate(prompt, variables)
        else:
            variables["last_user_message"] = user_text
            prompt = user_text

        api_key = node["data"].get("api_key", "")
        model = node["data"].get("model", "gpt-4o-mini")
        system_prompt = node["data"].get("system_prompt", "Ты полезный ассистент.")
        system_prompt = self.interpolate(system_prompt, variables)
        base_url = node["data"].get("base_url", "https://api.openai.com/v1")

        if not api_key:
            await bot.send_message(chat_id=chat_id, text="GPT-блок: API-ключ не настроен.")
            return BlockResult(next_handle=None, variables=variables)

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                        "max_tokens": int(node["data"].get("max_tokens", 500)),
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                reply = data["choices"][0]["message"]["content"]
        except Exception as e:
            reply = f"Ошибка GPT: {e}"

        variables["gpt_response"] = reply
        await bot.send_message(chat_id=chat_id, text=reply, parse_mode="HTML")

        # If this is a conversational GPT node, wait for next user input
        if node["data"].get("conversational", False):
            return BlockResult(variables=variables, wait_input=True)

        return BlockResult(next_handle=None, variables=variables)
