"""
Public Builder API — программное создание и управление ботами.

Аутентификация: заголовок X-API-Key
Базовый путь: /api/v1/

Пример:
    curl -H "X-API-Key: bf_..." https://botforge.ru/api/v1/bots
"""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.deps import ApiKeyUser, DbSession
from app.services import bot_service
from app.services.token_crypto import encrypt_token, hash_token

router = APIRouter()


# ============================================================
# Pydantic schemas
# ============================================================

class NodeData(BaseModel):
    """Node data — depends on node type."""
    label: str = "Блок"
    # All other fields are optional and type-dependent
    model_config = {"extra": "allow"}


class NodeCreate(BaseModel):
    type: str = Field(..., description="Тип блока: message, condition, delay, payment, gpt, webhook, variable, media, random, check_sub, note")
    data: dict[str, Any] = Field(default_factory=dict)
    position: dict[str, float] | None = Field(None, description="Position {x, y}. Auto-calculated if omitted.")


class NodeUpdate(BaseModel):
    data: dict[str, Any] = Field(..., description="Fields to merge into node data")


class EdgeCreate(BaseModel):
    source_id: str
    target_id: str
    source_handle: str | None = None


class BotCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    token: str = Field(..., description="Telegram Bot Token from @BotFather")


class BotSchemaFull(BaseModel):
    """Full schema replacement."""
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    viewport: dict[str, Any] = Field(default_factory=lambda: {"x": 0, "y": 0, "zoom": 1})


class AiGenerateRequest(BaseModel):
    prompt: str = Field(..., description="Описание бота на естественном языке")


# ============================================================
# Helpers
# ============================================================

VALID_NODE_TYPES = {
    "message", "condition", "delay", "payment", "gpt", "webhook",
    "variable", "media", "random", "check_sub", "note",
}


async def _get_bot_and_schema(session, bot_id: str, user_id: uuid.UUID):
    bot = await bot_service.get_bot(session, uuid.UUID(bot_id), user_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")
    schema_record = await bot_service.get_active_schema(session, bot.id)
    if not schema_record:
        raise HTTPException(status_code=404, detail="Схема не найдена")
    return bot, schema_record


def _auto_position(schema_json: dict, after_node_id: str | None = None) -> dict:
    """Calculate position for a new node."""
    nodes = schema_json.get("nodes", [])
    if after_node_id:
        ref = next((n for n in nodes if n["id"] == after_node_id), None)
        if ref:
            return {"x": ref["position"]["x"], "y": ref["position"]["y"] + 150}
    return {"x": 250, "y": len(nodes) * 150 + 50}


# ============================================================
# Bot CRUD
# ============================================================

@router.get("/bots", summary="Список ботов")
async def list_bots(session: DbSession, user: ApiKeyUser):
    bots = await bot_service.get_user_bots(session, user.id)
    return [
        {
            "id": str(b.id),
            "name": b.name,
            "status": b.status,
            "bot_username": b.bot_username,
            "subscribers_count": b.subscribers_count,
            "created_at": b.created_at.isoformat(),
        }
        for b in bots
    ]


@router.post("/bots", summary="Создать бота", status_code=201)
async def create_bot(body: BotCreate, session: DbSession, user: ApiKeyUser):
    token = body.token.strip()
    if ":" not in token:
        raise HTTPException(status_code=400, detail="Неверный формат токена")

    token_encrypted = encrypt_token(token)
    token_hash = hash_token(token)

    # Check duplicate
    existing = await bot_service.get_bot_by_hash(session, token_hash)
    if existing:
        raise HTTPException(status_code=409, detail="Бот с таким токеном уже существует")

    bot = await bot_service.create_bot(
        session, user.id, body.name, token_encrypted, token_hash
    )

    # Create default schema with start node
    default_schema = {
        "nodes": [
            {
                "id": "node_1",
                "type": "message",
                "position": {"x": 250, "y": 50},
                "data": {
                    "label": "Старт",
                    "text": "Привет! Добро пожаловать!",
                    "triggers": ["command:/start"],
                },
            }
        ],
        "edges": [],
        "viewport": {"x": 0, "y": 0, "zoom": 1},
    }
    await bot_service.save_schema(session, bot.id, default_schema)

    return {
        "id": str(bot.id),
        "name": bot.name,
        "status": bot.status,
        "message": "Бот создан. Добавьте блоки через API и запустите.",
    }


@router.get("/bots/{bot_id}", summary="Получить бота с текущей схемой")
async def get_bot(bot_id: str, session: DbSession, user: ApiKeyUser):
    bot, schema_record = await _get_bot_and_schema(session, bot_id, user.id)
    return {
        "id": str(bot.id),
        "name": bot.name,
        "status": bot.status,
        "bot_username": bot.bot_username,
        "schema": schema_record.schema_json,
    }


@router.delete("/bots/{bot_id}", summary="Удалить бота")
async def delete_bot(bot_id: str, session: DbSession, user: ApiKeyUser):
    bot = await bot_service.get_bot(session, uuid.UUID(bot_id), user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")
    await bot_service.delete_bot(session, bot)
    return {"status": "deleted"}


# ============================================================
# Schema — full replace
# ============================================================

@router.put("/bots/{bot_id}/schema", summary="Заменить всю схему")
async def replace_schema(
    bot_id: str,
    body: BotSchemaFull,
    session: DbSession,
    user: ApiKeyUser,
):
    bot = await bot_service.get_bot(session, uuid.UUID(bot_id), user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")
    schema_json = {"nodes": body.nodes, "edges": body.edges, "viewport": body.viewport}
    record = await bot_service.save_schema(session, bot.id, schema_json)
    return {"version": record.version, "nodes_count": len(body.nodes), "edges_count": len(body.edges)}


# ============================================================
# Nodes CRUD
# ============================================================

@router.post("/bots/{bot_id}/nodes", summary="Добавить блок", status_code=201)
async def add_node(
    bot_id: str,
    body: NodeCreate,
    session: DbSession,
    user: ApiKeyUser,
):
    if body.type not in VALID_NODE_TYPES:
        raise HTTPException(status_code=400, detail=f"Неизвестный тип блока: {body.type}. Доступные: {sorted(VALID_NODE_TYPES)}")

    bot, schema_record = await _get_bot_and_schema(session, bot_id, user.id)
    schema = schema_record.schema_json

    node_id = f"node_{len(schema.get('nodes', [])) + 1}_{uuid.uuid4().hex[:6]}"
    position = body.position or _auto_position(schema)

    data = {"label": body.data.get("label", body.type.capitalize()), **body.data}
    node = {"id": node_id, "type": body.type, "position": position, "data": data}
    schema.setdefault("nodes", []).append(node)

    await bot_service.save_schema(session, bot.id, schema)
    return {"node_id": node_id, "position": position, "status": "created"}


@router.patch("/bots/{bot_id}/nodes/{node_id}", summary="Обновить блок")
async def update_node(
    bot_id: str,
    node_id: str,
    body: NodeUpdate,
    session: DbSession,
    user: ApiKeyUser,
):
    bot, schema_record = await _get_bot_and_schema(session, bot_id, user.id)
    schema = schema_record.schema_json

    for node in schema.get("nodes", []):
        if node["id"] == node_id:
            node["data"].update(body.data)
            await bot_service.save_schema(session, bot.id, schema)
            return {"node_id": node_id, "status": "updated", "data": node["data"]}

    raise HTTPException(status_code=404, detail=f"Блок {node_id} не найден")


@router.delete("/bots/{bot_id}/nodes/{node_id}", summary="Удалить блок")
async def delete_node(
    bot_id: str,
    node_id: str,
    session: DbSession,
    user: ApiKeyUser,
):
    bot, schema_record = await _get_bot_and_schema(session, bot_id, user.id)
    schema = schema_record.schema_json

    before = len(schema.get("nodes", []))
    schema["nodes"] = [n for n in schema.get("nodes", []) if n["id"] != node_id]
    if len(schema["nodes"]) == before:
        raise HTTPException(status_code=404, detail=f"Блок {node_id} не найден")

    # Remove connected edges
    removed_edges = [
        e["id"] for e in schema.get("edges", [])
        if e["source"] == node_id or e["target"] == node_id
    ]
    schema["edges"] = [
        e for e in schema.get("edges", [])
        if e["source"] != node_id and e["target"] != node_id
    ]

    await bot_service.save_schema(session, bot.id, schema)
    return {"status": "deleted", "removed_edges": removed_edges}


# ============================================================
# Edges CRUD
# ============================================================

@router.post("/bots/{bot_id}/edges", summary="Соединить блоки", status_code=201)
async def add_edge(
    bot_id: str,
    body: EdgeCreate,
    session: DbSession,
    user: ApiKeyUser,
):
    bot, schema_record = await _get_bot_and_schema(session, bot_id, user.id)
    schema = schema_record.schema_json

    node_ids = {n["id"] for n in schema.get("nodes", [])}
    if body.source_id not in node_ids:
        raise HTTPException(status_code=400, detail=f"Источник {body.source_id} не найден")
    if body.target_id not in node_ids:
        raise HTTPException(status_code=400, detail=f"Цель {body.target_id} не найдена")
    if body.source_id == body.target_id:
        raise HTTPException(status_code=400, detail="Нельзя соединить блок с самим собой")

    edge_id = f"e_{body.source_id}_{body.target_id}"
    edge: dict[str, Any] = {"id": edge_id, "source": body.source_id, "target": body.target_id}
    if body.source_handle:
        edge["sourceHandle"] = body.source_handle
        edge_id += f"_{body.source_handle}"
        edge["id"] = edge_id

    # Check duplicate
    existing_ids = {e["id"] for e in schema.get("edges", [])}
    if edge_id in existing_ids:
        raise HTTPException(status_code=409, detail="Такая связь уже существует")

    schema.setdefault("edges", []).append(edge)
    await bot_service.save_schema(session, bot.id, schema)
    return {"edge_id": edge_id, "status": "connected"}


@router.delete("/bots/{bot_id}/edges/{edge_id}", summary="Удалить связь")
async def delete_edge(
    bot_id: str,
    edge_id: str,
    session: DbSession,
    user: ApiKeyUser,
):
    bot, schema_record = await _get_bot_and_schema(session, bot_id, user.id)
    schema = schema_record.schema_json

    before = len(schema.get("edges", []))
    schema["edges"] = [e for e in schema.get("edges", []) if e["id"] != edge_id]
    if len(schema["edges"]) == before:
        raise HTTPException(status_code=404, detail=f"Связь {edge_id} не найдена")

    await bot_service.save_schema(session, bot.id, schema)
    return {"status": "deleted"}


# ============================================================
# Schema operations
# ============================================================

@router.post("/bots/{bot_id}/validate", summary="Валидировать схему")
async def validate_schema(bot_id: str, session: DbSession, user: ApiKeyUser):
    bot, schema_record = await _get_bot_and_schema(session, bot_id, user.id)
    schema = schema_record.schema_json

    errors = []
    warnings = []
    nodes = schema.get("nodes", [])
    edges = schema.get("edges", [])
    node_ids = {n["id"] for n in nodes}

    # Check start
    starts = [n for n in nodes if n.get("type") == "message" and n.get("data", {}).get("triggers")]
    if not starts:
        starts = [n for n in nodes if n.get("type") == "start"]
    if not starts:
        errors.append("Нет стартового блока (message с triggers)")

    # Dangling edges
    for e in edges:
        if e["source"] not in node_ids:
            errors.append(f"Связь {e['id']}: источник {e['source']} не существует")
        if e["target"] not in node_ids:
            errors.append(f"Связь {e['id']}: цель {e['target']} не существует")

    # Reachability
    if starts:
        reachable = set()
        queue = [s["id"] for s in starts]
        while queue:
            cur = queue.pop(0)
            if cur in reachable:
                continue
            reachable.add(cur)
            for e in edges:
                if e["source"] == cur and e["target"] not in reachable:
                    queue.append(e["target"])
        unreachable = [n for n in nodes if n["id"] not in reachable and n.get("type") != "note"]
        if unreachable:
            warnings.append(f"Недостижимые блоки: {[n.get('data', {}).get('label', n['id']) for n in unreachable]}")

    # Condition/CheckSub outputs
    for n in nodes:
        if n.get("type") == "condition":
            handles = {e.get("sourceHandle") for e in edges if e["source"] == n["id"]}
            if "handle_yes" not in handles:
                warnings.append(f"Условие '{n.get('data', {}).get('label')}': нет выхода 'Да'")
            if "handle_no" not in handles:
                warnings.append(f"Условие '{n.get('data', {}).get('label')}': нет выхода 'Нет'")
        if n.get("type") == "check_sub":
            handles = {e.get("sourceHandle") for e in edges if e["source"] == n["id"]}
            if "subscribed" not in handles:
                warnings.append(f"Подписка '{n.get('data', {}).get('label')}': нет выхода 'Подписан'")
            if "not_subscribed" not in handles:
                warnings.append(f"Подписка '{n.get('data', {}).get('label')}': нет выхода 'Не подписан'")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "stats": {
            "nodes": len(nodes),
            "edges": len(edges),
            "start_nodes": len(starts),
        },
    }


@router.post("/bots/{bot_id}/auto-layout", summary="Автоматическая раскладка")
async def auto_layout(bot_id: str, session: DbSession, user: ApiKeyUser):
    bot, schema_record = await _get_bot_and_schema(session, bot_id, user.id)
    schema = schema_record.schema_json

    nodes = schema.get("nodes", [])
    edges = schema.get("edges", [])

    # Find start nodes
    starts = [
        n["id"] for n in nodes
        if n.get("type") == "start" or (n.get("type") == "message" and n.get("data", {}).get("triggers"))
    ]
    if not starts:
        return {"error": "Нет стартового блока для layout"}

    # BFS levels
    levels: dict[str, int] = {}
    queue = [(s, 0) for s in starts]
    while queue:
        nid, level = queue.pop(0)
        if nid in levels:
            continue
        levels[nid] = level
        for e in edges:
            if e["source"] == nid:
                queue.append((e["target"], level + 1))

    # Group by level
    by_level: dict[int, list[str]] = {}
    for nid, level in levels.items():
        by_level.setdefault(level, []).append(nid)

    # Apply positions
    for level, nids in by_level.items():
        for i, nid in enumerate(nids):
            for node in nodes:
                if node["id"] == nid:
                    node["position"] = {"x": i * 300 + 100, "y": level * 180 + 50}

    # Position unleveled nodes (notes, disconnected)
    max_y = max((n.get("position", {}).get("y", 0) for n in nodes), default=50)
    for node in nodes:
        if node["id"] not in levels:
            max_y += 150
            node["position"] = {"x": 600, "y": max_y}

    await bot_service.save_schema(session, bot.id, schema)
    return {"status": "layout_applied", "levels": len(by_level)}


# ============================================================
# AI Generate (non-streaming, synchronous for API clients)
# ============================================================

@router.post("/bots/{bot_id}/ai-generate", summary="AI: сгенерировать схему по описанию")
async def ai_generate(
    bot_id: str,
    body: AiGenerateRequest,
    session: DbSession,
    user: ApiKeyUser,
):
    """
    AI-агент пошагово строит схему бота по текстовому описанию.
    Возвращает готовую схему (не стриминг).
    """
    try:
        from openai import AsyncOpenAI
        from app.agent.executor import AgentExecutor
        from app.config import settings as cfg
    except ImportError:
        raise HTTPException(status_code=501, detail="AI-генерация недоступна (openai не установлен)")

    api_key = cfg.OPENROUTER_API_KEY or cfg.ANTHROPIC_API_KEY
    if not api_key:
        raise HTTPException(status_code=501, detail="OPENROUTER_API_KEY не настроен")

    bot, schema_record = await _get_bot_and_schema(session, bot_id, user.id)
    schema = schema_record.schema_json

    client = AsyncOpenAI(api_key=api_key, base_url=cfg.OPENROUTER_BASE_URL)
    executor = AgentExecutor(client=client, model=cfg.OPENROUTER_MODEL, schema=schema)
    result = await executor.run(user_prompt=body.prompt)

    # Save generated schema
    await bot_service.save_schema(session, bot.id, result["schema"])

    return {
        "text": result.get("text", ""),
        "schema": result["schema"],
        "stats": {
            "nodes": len(result["schema"].get("nodes", [])),
            "edges": len(result["schema"].get("edges", [])),
        },
    }


# ============================================================
# Bot lifecycle
# ============================================================

@router.post("/bots/{bot_id}/start", summary="Запустить бота")
async def start_bot(bot_id: str, session: DbSession, user: ApiKeyUser):
    """Запускает бота: валидирует токен, устанавливает webhook."""
    from aiogram import Bot as AiogramBot
    from aiogram.client.default import DefaultBotProperties
    from app.config import settings as cfg
    from app.services.token_crypto import decrypt_token
    import aioredis

    bot = await bot_service.get_bot(session, uuid.UUID(bot_id), user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")
    if bot.status == "running":
        raise HTTPException(status_code=400, detail="Бот уже запущен")

    token = decrypt_token(bot.token_encrypted)

    # Validate token with Telegram
    try:
        tg_bot = AiogramBot(token=token, default=DefaultBotProperties(parse_mode="HTML"))
        me = await tg_bot.get_me()
        await tg_bot.session.close()
    except Exception as e:
        await bot_service.update_bot_status(session, bot.id, "error", error_message=str(e))
        raise HTTPException(status_code=400, detail=f"Токен невалиден: {e}")

    # Set webhook
    webhook_url = f"{cfg.BASE_URL}/webhook/{bot.token_hash}"
    try:
        tg_bot = AiogramBot(token=token, default=DefaultBotProperties(parse_mode="HTML"))
        await tg_bot.set_webhook(
            url=webhook_url,
            secret_token=cfg.WEBHOOK_SECRET,
            allowed_updates=["message", "callback_query"],
        )
        await tg_bot.session.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Не удалось установить webhook: {e}")

    await bot_service.update_bot_status(session, bot.id, "running", username=me.username)

    return {
        "status": "running",
        "username": me.username,
        "webhook_url": webhook_url,
    }


@router.post("/bots/{bot_id}/stop", summary="Остановить бота")
async def stop_bot(bot_id: str, session: DbSession, user: ApiKeyUser):
    """Останавливает бота: удаляет webhook."""
    from aiogram import Bot as AiogramBot
    from aiogram.client.default import DefaultBotProperties
    from app.services.token_crypto import decrypt_token

    bot = await bot_service.get_bot(session, uuid.UUID(bot_id), user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")
    if bot.status == "stopped":
        raise HTTPException(status_code=400, detail="Бот уже остановлен")

    token = decrypt_token(bot.token_encrypted)
    try:
        tg_bot = AiogramBot(token=token, default=DefaultBotProperties(parse_mode="HTML"))
        await tg_bot.delete_webhook()
        await tg_bot.session.close()
    except Exception:
        pass

    await bot_service.update_bot_status(session, bot.id, "stopped")
    return {"status": "stopped"}
