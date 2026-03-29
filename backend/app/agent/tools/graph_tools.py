from app.agent.tools._registry import tool


@tool(
    name="add_node",
    description="Добавить блок на холст конструктора бота",
    parameters={
        "type": "object",
        "properties": {
            "type": {
                "type": "string",
                "enum": ["start", "text", "buttons", "condition", "input",
                         "delay", "payment", "gpt", "webhook", "variable"],
                "description": "Тип блока",
            },
            "data": {
                "type": "object",
                "description": "Настройки блока (зависят от типа)",
            },
            "position_after": {
                "type": "string",
                "description": "ID ноды, после которой расположить новую (авто-layout)",
            },
        },
        "required": ["type", "data"],
    },
    is_write=True,
)
async def add_node(
    schema: dict, type: str, data: dict, position_after: str | None = None
) -> dict:
    node_id = f"node_{len(schema['nodes']) + 1}"

    if position_after and position_after in {n["id"] for n in schema["nodes"]}:
        ref = next(n for n in schema["nodes"] if n["id"] == position_after)
        position = {"x": ref["position"]["x"], "y": ref["position"]["y"] + 150}
    else:
        position = {"x": 250, "y": len(schema["nodes"]) * 150 + 50}

    node = {
        "id": node_id,
        "type": type,
        "position": position,
        "data": {"label": data.get("label", type.capitalize()), **data},
    }
    schema["nodes"].append(node)
    return {"node_id": node_id, "position": position, "status": "created"}


@tool(
    name="connect_nodes",
    description="Соединить два блока линией (создать ребро в графе)",
    parameters={
        "type": "object",
        "properties": {
            "source_id": {"type": "string", "description": "ID блока-источника"},
            "target_id": {"type": "string", "description": "ID блока-цели"},
            "source_handle": {
                "type": "string",
                "description": "ID выхода (для кнопок/условий). None = основной выход",
            },
        },
        "required": ["source_id", "target_id"],
    },
    is_write=True,
)
async def connect_nodes(
    schema: dict, source_id: str, target_id: str, source_handle: str | None = None
) -> dict:
    node_ids = {n["id"] for n in schema["nodes"]}
    if source_id not in node_ids:
        return {"error": f"Нода {source_id} не найдена. Существующие: {sorted(node_ids)}"}
    if target_id not in node_ids:
        return {"error": f"Нода {target_id} не найдена. Существующие: {sorted(node_ids)}"}

    edge_id = f"e_{source_id}_{target_id}"
    if source_handle:
        edge_id += f"_{source_handle}"

    edge = {"id": edge_id, "source": source_id, "target": target_id}
    if source_handle:
        edge["sourceHandle"] = source_handle

    schema["edges"].append(edge)
    return {"edge_id": edge_id, "status": "connected"}


@tool(
    name="update_node",
    description="Обновить настройки существующего блока",
    parameters={
        "type": "object",
        "properties": {
            "node_id": {"type": "string", "description": "ID блока"},
            "data": {"type": "object", "description": "Новые настройки (merge с текущими)"},
        },
        "required": ["node_id", "data"],
    },
    is_write=True,
)
async def update_node(schema: dict, node_id: str, data: dict) -> dict:
    for node in schema["nodes"]:
        if node["id"] == node_id:
            node["data"].update(data)
            return {"node_id": node_id, "status": "updated", "data": node["data"]}
    return {"error": f"Нода {node_id} не найдена"}


@tool(
    name="delete_node",
    description="Удалить блок и все его связи",
    parameters={
        "type": "object",
        "properties": {
            "node_id": {"type": "string", "description": "ID блока для удаления"},
        },
        "required": ["node_id"],
    },
    is_write=True,
)
async def delete_node(schema: dict, node_id: str) -> dict:
    schema["nodes"] = [n for n in schema["nodes"] if n["id"] != node_id]
    removed_edges = [
        e["id"]
        for e in schema["edges"]
        if e["source"] == node_id or e["target"] == node_id
    ]
    schema["edges"] = [
        e for e in schema["edges"]
        if e["source"] != node_id and e["target"] != node_id
    ]
    return {"status": "deleted", "removed_edges": removed_edges}
