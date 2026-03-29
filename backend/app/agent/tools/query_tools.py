from app.agent.tools._registry import tool


@tool(
    name="get_current_schema",
    description="Получить текущую схему бота (все блоки и связи)",
    parameters={"type": "object", "properties": {}},
    is_write=False,
)
async def get_current_schema(schema: dict) -> dict:
    return {
        "nodes_count": len(schema["nodes"]),
        "edges_count": len(schema["edges"]),
        "nodes": [
            {"id": n["id"], "type": n["type"], "label": n["data"].get("label")}
            for n in schema["nodes"]
        ],
        "edges": [
            {"source": e["source"], "target": e["target"], "handle": e.get("sourceHandle")}
            for e in schema["edges"]
        ],
    }


@tool(
    name="validate_schema",
    description="Валидировать схему: проверить связность, наличие старта, отсутствие висящих нод",
    parameters={"type": "object", "properties": {}},
    is_write=False,
)
async def validate_schema(schema: dict) -> dict:
    errors = []
    warnings = []
    node_ids = {n["id"] for n in schema["nodes"]}

    # Check 1: start node
    starts = [n for n in schema["nodes"] if n["type"] == "start"]
    if not starts:
        errors.append("Нет стартового блока. Добавьте блок типа 'start'.")

    # Check 2: dangling edges
    for edge in schema["edges"]:
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
            for edge in schema["edges"]:
                if edge["source"] == current and edge["target"] not in reachable:
                    queue.append(edge["target"])
        unreachable = node_ids - reachable
        if unreachable:
            warnings.append(f"Недостижимые блоки: {unreachable}. Соедините их или удалите.")

    # Check 4: condition without both outputs
    for node in schema["nodes"]:
        if node["type"] == "condition":
            handles = {
                e.get("sourceHandle")
                for e in schema["edges"]
                if e["source"] == node["id"]
            }
            if "handle_yes" not in handles:
                warnings.append(f"Условие '{node['data'].get('label')}': нет выхода 'Да'")
            if "handle_no" not in handles:
                warnings.append(f"Условие '{node['data'].get('label')}': нет выхода 'Нет'")

    return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}
