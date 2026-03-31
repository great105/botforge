import asyncio
import json

from openai import AsyncOpenAI
from fastapi import APIRouter, Request
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.config import settings
from app.deps import CurrentUser, DbSession
from app.agent.executor import AgentExecutor

router = APIRouter()


def _make_client() -> AsyncOpenAI:
    """Create OpenAI-compatible client for OpenRouter."""
    return AsyncOpenAI(
        api_key=settings.OPENROUTER_API_KEY or settings.ANTHROPIC_API_KEY,
        base_url=settings.OPENROUTER_BASE_URL,
    )


class GenerateRequest(BaseModel):
    prompt: str
    bot_id: str | None = None
    existing_schema: dict | None = None


class ChatRequest(BaseModel):
    prompt: str
    schema_json: dict


@router.post("/generate-stream")
async def generate_schema_stream(
    body: GenerateRequest,
    user: CurrentUser,
    session: DbSession,
    request: Request,
):
    """SSE endpoint: agent builds schema step by step."""
    schema = body.existing_schema or {
        "nodes": [],
        "edges": [],
        "viewport": {"x": 0, "y": 0, "zoom": 1},
    }

    client = _make_client()
    executor = AgentExecutor(client=client, model=settings.OPENROUTER_MODEL, schema=schema)

    async def event_generator():
        event_queue: asyncio.Queue = asyncio.Queue()

        async def on_event(event: dict):
            await event_queue.put(event)

        # Run agent in background task
        async def run_agent():
            try:
                await executor.run(user_prompt=body.prompt, on_event=on_event)
            except Exception as e:
                await event_queue.put({"type": "error", "text": str(e)})
            finally:
                await event_queue.put(None)  # sentinel

        task = asyncio.create_task(run_agent())

        try:
            while True:
                event = await event_queue.get()
                if event is None:
                    break

                yield {
                    "event": event["type"],
                    "data": json.dumps(event, ensure_ascii=False),
                }

                if event["type"] == "done":
                    # Send final complete event
                    yield {
                        "event": "complete",
                        "data": json.dumps({"schema": executor.schema}, ensure_ascii=False),
                    }
                    break

                if event["type"] == "error":
                    break
        finally:
            if not task.done():
                task.cancel()

    return EventSourceResponse(event_generator())


@router.post("/modify-stream")
async def modify_schema_stream(
    body: GenerateRequest,
    user: CurrentUser,
    session: DbSession,
    request: Request,
):
    """SSE endpoint: agent modifies existing schema."""
    if not body.existing_schema:
        return {"error": "existing_schema is required for modify mode"}

    client = _make_client()
    executor = AgentExecutor(client=client, model=settings.OPENROUTER_MODEL, schema=body.existing_schema)

    prompt = f"У меня уже есть схема бота. Вот что нужно изменить: {body.prompt}"

    async def event_generator():
        event_queue: asyncio.Queue = asyncio.Queue()

        async def on_event(event: dict):
            await event_queue.put(event)

        async def run_agent():
            try:
                await executor.run(user_prompt=prompt, on_event=on_event)
            except Exception as e:
                await event_queue.put({"type": "error", "text": str(e)})
            finally:
                await event_queue.put(None)

        task = asyncio.create_task(run_agent())

        try:
            while True:
                event = await event_queue.get()
                if event is None:
                    break
                yield {
                    "event": event["type"],
                    "data": json.dumps(event, ensure_ascii=False),
                }
                if event["type"] in ("done", "error"):
                    if event["type"] == "done":
                        yield {
                            "event": "complete",
                            "data": json.dumps({"schema": executor.schema}, ensure_ascii=False),
                        }
                    break
        finally:
            if not task.done():
                task.cancel()

    return EventSourceResponse(event_generator())


@router.post("/chat")
async def chat_with_agent(body: ChatRequest, user: CurrentUser):
    """Non-streaming: chat with agent about current schema."""
    client = _make_client()
    executor = AgentExecutor(client=client, model=settings.OPENROUTER_MODEL, schema=body.schema_json)

    result = await executor.run(user_prompt=body.prompt)
    return {"text": result["text"], "schema": result["schema"]}
