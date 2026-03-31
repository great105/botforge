import httpx

from app.engine.blocks.base import BaseBlockHandler, BlockResult

OPENROUTER_BASE = "https://openrouter.ai/api/v1"


class GptBlockHandler(BaseBlockHandler):
    """Send user message to OpenRouter API and return AI response."""

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
        model = node["data"].get("model", "openai/gpt-4o-mini")
        system_prompt = node["data"].get("system_prompt", "Ты полезный ассистент.")
        system_prompt = self.interpolate(system_prompt, variables)
        max_tokens = int(node["data"].get("max_tokens", 1000))

        if not api_key:
            await bot.send_message(chat_id=chat_id, text="AI-блок: API-ключ не настроен. Добавьте ключ OpenRouter в настройках блока.")
            return BlockResult(next_handle=None, variables=variables)

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    f"{OPENROUTER_BASE}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "HTTP-Referer": "https://xn--80acheb8ajrts.xn--p1ai",
                        "X-OpenRouter-Title": "BotForge",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                        "max_tokens": max_tokens,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                reply = data["choices"][0]["message"]["content"]

                # Track token usage
                usage = data.get("usage", {})
                variables["_gpt_prompt_tokens"] = usage.get("prompt_tokens", 0)
                variables["_gpt_completion_tokens"] = usage.get("completion_tokens", 0)
                variables["_gpt_total_tokens"] = usage.get("total_tokens", 0)

        except httpx.HTTPStatusError as e:
            error_body = e.response.text[:200] if e.response else str(e)
            reply = f"Ошибка AI ({e.response.status_code}): {error_body}"
        except Exception as e:
            reply = f"Ошибка AI: {e}"

        variables["gpt_response"] = reply
        await bot.send_message(chat_id=chat_id, text=reply, parse_mode="HTML")

        # Conversational mode — wait for next user input
        if node["data"].get("conversational", False):
            return BlockResult(variables=variables, wait_input=True)

        return BlockResult(next_handle=None, variables=variables)
