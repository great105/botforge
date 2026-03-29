import json
import logging

from anthropic import AsyncAnthropic

from app.agent.prompts.system import SYSTEM_PROMPT
from app.agent.safety import SafetyGuard
from app.agent.tools._registry import TOOL_REGISTRY

# Ensure all tools are registered
import app.agent.tools  # noqa: F401

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 25


class AgentExecutor:
    """
    Multi-turn tool-calling loop.
    LLM calls tools iteratively until it produces a text response.
    """

    def __init__(self, anthropic_client: AsyncAnthropic, schema: dict):
        self.client = anthropic_client
        self.schema = schema
        self.messages: list[dict] = []
        self.safety = SafetyGuard()

    async def run(self, user_prompt: str, on_event=None) -> dict:
        """
        Run the agent. on_event is an async callback for SSE streaming.
        Events: tool_start, tool_done, schema_update, done
        """
        self.messages = [{"role": "user", "content": user_prompt}]

        tools_for_llm = [
            {
                "name": t.name,
                "description": t.description,
                "input_schema": t.parameters,
            }
            for t in TOOL_REGISTRY.values()
        ]

        for iteration in range(MAX_ITERATIONS):
            # 1. Call LLM
            response = await self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=self.messages,
                tools=tools_for_llm,
            )

            # 2. If LLM responded with text — end of loop
            if response.stop_reason == "end_turn":
                text = "".join(
                    b.text for b in response.content if b.type == "text"
                )
                if on_event:
                    await on_event({"type": "done", "text": text})
                return {"text": text, "schema": self.schema}

            # 3. Process tool_use blocks
            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue

                tool_name = block.name
                tool_input = block.input

                # Safety check
                safety_error = self.safety.check_before_call(tool_name, tool_input)
                if safety_error:
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps({"error": safety_error}),
                    })
                    continue

                # Check tool exists
                if tool_name not in TOOL_REGISTRY:
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
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

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result, ensure_ascii=False),
                })

            # 4. Add assistant response + tool results to history
            self.messages.append({
                "role": "assistant",
                "content": [
                    {"type": b.type, **({"text": b.text} if b.type == "text" else {"id": b.id, "name": b.name, "input": b.input})}
                    for b in response.content
                ],
            })
            self.messages.append({"role": "user", "content": tool_results})

        # Exceeded max iterations
        if on_event:
            await on_event({"type": "done", "text": "Схема построена (достигнут лимит итераций)."})
        return {"text": "Схема построена (достигнут лимит итераций).", "schema": self.schema}
