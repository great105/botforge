import json
import logging

from openai import AsyncOpenAI

from app.agent.prompts.system import SYSTEM_PROMPT
from app.agent.safety import SafetyGuard
from app.agent.tools._registry import TOOL_REGISTRY

# Ensure all tools are registered
import app.agent.tools  # noqa: F401

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 25


class AgentExecutor:
    """
    Multi-turn tool-calling loop via OpenAI-compatible API (OpenRouter).
    LLM calls tools iteratively until it produces a text response.
    """

    def __init__(self, client: AsyncOpenAI, model: str, schema: dict):
        self.client = client
        self.model = model
        self.schema = schema
        self.messages: list[dict] = []
        self.safety = SafetyGuard()

    async def run(self, user_prompt: str, on_event=None) -> dict:
        """
        Run the agent. on_event is an async callback for SSE streaming.
        Events: tool_start, tool_done, schema_update, done
        """
        self.messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        tools_for_llm = [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters,
                },
            }
            for t in TOOL_REGISTRY.values()
        ]

        for iteration in range(MAX_ITERATIONS):
            # 1. Call LLM
            response = await self.client.chat.completions.create(
                model=self.model,
                max_tokens=4096,
                messages=self.messages,
                tools=tools_for_llm,
            )

            choice = response.choices[0]
            message = choice.message

            # 2. If LLM responded with text (no tool calls) — end of loop
            if choice.finish_reason == "stop" or not message.tool_calls:
                text = message.content or ""
                if on_event:
                    await on_event({"type": "done", "text": text})
                return {"text": text, "schema": self.schema}

            # 3. Process tool calls
            # Add assistant message to history first
            self.messages.append({
                "role": "assistant",
                "content": message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in message.tool_calls
                ],
            })

            for tool_call in message.tool_calls:
                tool_name = tool_call.function.name
                try:
                    tool_input = json.loads(tool_call.function.arguments)
                except json.JSONDecodeError:
                    tool_input = {}

                # Safety check
                safety_error = self.safety.check_before_call(tool_name, tool_input)
                if safety_error:
                    self.messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps({"error": safety_error}),
                    })
                    continue

                # Check tool exists
                if tool_name not in TOOL_REGISTRY:
                    self.messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps({"error": f"Инструмент {tool_name} не найден"}),
                    })
                    continue

                # SSE: tool start
                if on_event:
                    await on_event({
                        "type": "tool_start",
                        "tool": tool_name,
                        "args": tool_input,
                        "iteration": iteration + 1,
                    })

                # Execute tool
                try:
                    handler = TOOL_REGISTRY[tool_name].handler
                    result = await handler(schema=self.schema, **tool_input)
                    self.safety.log_call(tool_name, tool_input, success=True)
                except Exception as e:
                    logger.exception(f"Tool {tool_name} failed")
                    result = {"error": str(e)}
                    self.safety.log_call(tool_name, tool_input, success=False)

                # SSE: tool done + schema update
                if on_event:
                    await on_event({"type": "tool_done", "tool": tool_name, "result": result})
                    if TOOL_REGISTRY[tool_name].is_write:
                        await on_event({"type": "schema_update", "schema": self.schema})

                self.messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result, ensure_ascii=False),
                })

        # Exceeded max iterations
        if on_event:
            await on_event({"type": "done", "text": "Схема построена (достигнут лимит итераций)."})
        return {"text": "Схема построена (достигнут лимит итераций).", "schema": self.schema}
