import uuid

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.deps import CurrentUser, DbSession
from app.services import bot_service

router = APIRouter()


class SchemaResponse(BaseModel):
    id: str
    version: int
    schema_json: dict
    is_active: bool


class SaveSchemaRequest(BaseModel):
    schema_json: dict


class ValidateResponse(BaseModel):
    valid: bool
    errors: list[str]
    warnings: list[str]


@router.get("/{bot_id}/schema", response_model=SchemaResponse)
async def get_schema(bot_id: uuid.UUID, session: DbSession, user: CurrentUser):
    bot = await bot_service.get_bot(session, bot_id, user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")

    schema = await bot_service.get_active_schema(session, bot_id)
    if not schema:
        # Return empty schema
        return SchemaResponse(
            id="",
            version=0,
            schema_json={"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}},
            is_active=True,
        )

    return SchemaResponse(
        id=str(schema.id),
        version=schema.version,
        schema_json=schema.schema_json,
        is_active=schema.is_active,
    )


@router.put("/{bot_id}/schema", response_model=SchemaResponse)
async def save_schema(
    bot_id: uuid.UUID,
    body: SaveSchemaRequest,
    session: DbSession,
    user: CurrentUser,
    request: Request,
):
    bot = await bot_service.get_bot(session, bot_id, user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")

    schema = await bot_service.save_schema(session, bot_id, body.schema_json)

    # Invalidate Redis schema cache if bot is running
    if bot.status == "running":
        redis = request.app.state.redis
        from app.engine.state import SubscriberState
        storage = SubscriberState(redis, bot.token_hash)
        await storage.invalidate_schema_cache()
        await storage.cache_schema(body.schema_json)

    return SchemaResponse(
        id=str(schema.id),
        version=schema.version,
        schema_json=schema.schema_json,
        is_active=schema.is_active,
    )


@router.post("/{bot_id}/schema/validate", response_model=ValidateResponse)
async def validate_schema(bot_id: uuid.UUID, session: DbSession, user: CurrentUser):
    bot = await bot_service.get_bot(session, bot_id, user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")

    schema_record = await bot_service.get_active_schema(session, bot_id)
    if not schema_record:
        return ValidateResponse(valid=False, errors=["Схема не найдена"], warnings=[])

    schema = schema_record.schema_json
    errors = []
    warnings = []
    node_ids = {n["id"] for n in schema.get("nodes", [])}

    # Check 1: start node exists
    starts = [n for n in schema.get("nodes", []) if n["type"] == "start"]
    if not starts:
        errors.append("Нет стартового блока. Добавьте блок типа 'start'.")

    # Check 2: dangling edges
    for edge in schema.get("edges", []):
        if edge["source"] not in node_ids:
            errors.append(f"Ребро {edge['id']}: источник {edge['source']} не существует")
        if edge["target"] not in node_ids:
            errors.append(f"Ребро {edge['id']}: цель {edge['target']} не существует")

    # Check 3: reachability (BFS)
    if starts:
        reachable = set()
        queue = [s["id"] for s in starts]
        while queue:
            current = queue.pop(0)
            if current in reachable:
                continue
            reachable.add(current)
            for edge in schema.get("edges", []):
                if edge["source"] == current and edge["target"] not in reachable:
                    queue.append(edge["target"])
        unreachable = node_ids - reachable
        if unreachable:
            warnings.append(f"Недостижимые блоки: {unreachable}")

    # Check 4: condition nodes without both outputs
    for node in schema.get("nodes", []):
        if node["type"] == "condition":
            handles = {e.get("sourceHandle") for e in schema.get("edges", []) if e["source"] == node["id"]}
            if "handle_yes" not in handles:
                warnings.append(f"Условие '{node['data'].get('label', '')}': нет выхода 'Да'")
            if "handle_no" not in handles:
                warnings.append(f"Условие '{node['data'].get('label', '')}': нет выхода 'Нет'")

    return ValidateResponse(valid=len(errors) == 0, errors=errors, warnings=warnings)
