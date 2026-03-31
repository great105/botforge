"""
Knowledge block handler — searches vector DB and responds with context-aware AI answer.
"""

import httpx
import logging

from app.engine.blocks.base import BaseBlockHandler, BlockResult
from app.services.rag import search_chunks, OPENROUTER_BASE

logger = logging.getLogger(__name__)


class KnowledgeBlockHandler(BaseBlockHandler):
    """
    RAG block: receives user message → searches knowledge base →
    calls LLM with relevant context → sends answer.
    """

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        message = update_data.get("message", {})
        user_text = message.get("text", "")

        if not user_text:
            return BlockResult(next_handle=None, variables=variables, wait_input=True)

        api_key = node["data"].get("api_key", "")
        model = node["data"].get("model", "openai/gpt-4o-mini")
        embedding_model = node["data"].get("embedding_model", "openai/text-embedding-3-small")
        system_prompt = node["data"].get("system_prompt", "Ты помощник. Отвечай на вопросы, используя предоставленный контекст.")
        system_prompt = self.interpolate(system_prompt, variables)
        max_tokens = int(node["data"].get("max_tokens", 1000))
        bot_id = node["data"].get("_bot_id", "")

        if not api_key:
            await bot.send_message(chat_id=chat_id, text="База знаний: API-ключ не настроен.")
            return BlockResult(next_handle=None, variables=variables)

        variables["last_user_message"] = user_text

        # 1. Search knowledge base
        context_chunks = []
        if bot_id:
            try:
                # Import here to avoid circular dependency
                from app.db.session import async_session
                async with async_session() as db:
                    context_chunks = await search_chunks(
                        db=db,
                        bot_id=bot_id,
                        query=user_text,
                        api_key=api_key,
                        top_k=5,
                        embedding_model=embedding_model,
                    )
            except Exception as e:
                logger.error(f"Knowledge search failed: {e}")

        # 2. Build context
        if context_chunks:
            context_parts = []
            for ch in context_chunks:
                context_parts.append(f"[{ch['filename']}]\n{ch['text']}")
            context = "\n\n---\n\n".join(context_parts)
            user_message = f"Контекст из базы знаний:\n\n{context}\n\n---\n\nВопрос пользователя: {user_text}"
        else:
            user_message = user_text

        # 3. Call LLM
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
                            {"role": "user", "content": user_message},
                        ],
                        "max_tokens": max_tokens,
                        "temperature": 0.3,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                reply = data["choices"][0]["message"]["content"]

                usage = data.get("usage", {})
                variables["_rag_tokens"] = usage.get("total_tokens", 0)
                variables["_rag_chunks_found"] = len(context_chunks)
        except Exception as e:
            reply = f"Ошибка AI: {e}"

        variables["rag_response"] = reply
        await bot.send_message(chat_id=chat_id, text=reply, parse_mode="HTML")

        # Conversational mode — keep waiting for input
        if node["data"].get("conversational", True):
            return BlockResult(variables=variables, wait_input=True)

        return BlockResult(next_handle=None, variables=variables)
