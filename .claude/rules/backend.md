---
paths:
  - "backend/**/*.py"
---

# Backend Rules

## Imports
- Абсолютные от `app.`: `from app.models.user import User`
- Внутри пакета — относительные допустимы: `from ._registry import tool`
- Порядок: stdlib → third-party → app (isort-совместимо)

## API Endpoints
- Pydantic модели для request/response (не dict)
- `Depends(get_current_user)` через `CurrentUser` alias
- `DbSession` = `Annotated[AsyncSession, Depends(get_session)]`
- HTTP ошибки: HTTPException с русскоязычным `detail`

## Models
- UUID primary key через `UUIDMixin`
- Timestamps через `TimestampMixin`
- Relationships: `TYPE_CHECKING` + string forward refs

## Engine (движок ботов)
- Блоки: наследуют `BaseBlockHandler`, метод `execute()` → `BlockResult`
- `GraphInterpreter`: рекурсивная обработка цепочек, `MAX_CHAIN_DEPTH=50`
- Состояние подписчиков: Redis `bot:{token_hash}:user:{user_id}:state`

## AI Agent
- `@tool` decorator для регистрации инструментов
- `AgentExecutor.run()`: multi-turn loop, `MAX_ITERATIONS=25`
- `SafetyGuard`: anti-loop, max 10 calls/tool, duplicate detection
- SSE через `sse-starlette` + `asyncio.Queue`
