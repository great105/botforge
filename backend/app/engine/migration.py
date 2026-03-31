"""Schema migration: upgrade old v1 schemas (separate text/buttons/input/start nodes)
to v2 (unified message nodes)."""

CURRENT_VERSION = 2


def migrate_schema(schema: dict) -> dict:
    """Upgrade schema to latest version. Idempotent."""
    version = schema.get("version", 1)
    if version < 2:
        schema = _migrate_v1_to_v2(schema)
    return schema


def _migrate_v1_to_v2(schema: dict) -> dict:
    """Convert start/text/buttons/input nodes to unified message nodes."""
    new_nodes = []
    for node in schema.get("nodes", []):
        if node["type"] in ("start", "text", "buttons", "input"):
            new_node = {**node, "type": "message"}
            data = {**node["data"]}

            # Normalize input node: move top-level variable/validation into input object
            if node["type"] == "input":
                data["input"] = {
                    "variable": data.pop("variable", "user_input"),
                    "validation": data.pop("validation", None),
                }

            # Normalize button_layout (old field name: layout)
            if "layout" in data and "button_layout" not in data:
                data["button_layout"] = data.pop("layout")

            new_node["data"] = data
            new_nodes.append(new_node)
        else:
            new_nodes.append(node)

    return {
        **schema,
        "version": CURRENT_VERSION,
        "nodes": new_nodes,
    }
