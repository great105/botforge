from app.agent.tools._registry import tool


@tool(
    name="auto_layout",
    description="Автоматически расположить блоки (выровнять в дерево сверху вниз)",
    parameters={"type": "object", "properties": {}},
    is_write=True,
)
async def auto_layout(schema: dict) -> dict:
    """Dagre-like layout: BFS from start, levels by 180px."""
    starts = [n["id"] for n in schema["nodes"] if n["type"] == "start"]
    if not starts:
        return {"error": "Нет стартового блока для layout"}

    levels: dict[str, int] = {}
    queue = [(s, 0) for s in starts]
    while queue:
        node_id, level = queue.pop(0)
        if node_id in levels:
            continue
        levels[node_id] = level
        for edge in schema["edges"]:
            if edge["source"] == node_id:
                queue.append((edge["target"], level + 1))

    # Assign unvisited nodes to the last level + 1
    max_level = max(levels.values(), default=0)
    for node in schema["nodes"]:
        if node["id"] not in levels:
            max_level += 1
            levels[node["id"]] = max_level

    # Group by levels
    by_level: dict[int, list[str]] = {}
    for node_id, level in levels.items():
        by_level.setdefault(level, []).append(node_id)

    # Assign positions
    for level, node_ids in by_level.items():
        for i, node_id in enumerate(node_ids):
            for node in schema["nodes"]:
                if node["id"] == node_id:
                    node["position"] = {
                        "x": i * 280 + 100,
                        "y": level * 180 + 50,
                    }

    return {"status": "layout_applied", "levels": len(by_level)}
