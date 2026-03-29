from app.engine.blocks.base import BaseBlockHandler, BlockResult


class VariableBlockHandler(BaseBlockHandler):
    """Set or modify a variable."""

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        action = node["data"].get("action", "set")  # set | increment | decrement | append | delete
        variable_name = node["data"].get("variable", "")
        value = node["data"].get("value", "")

        if not variable_name:
            return BlockResult(next_handle=None, variables=variables)

        value = self.interpolate(str(value), variables) if isinstance(value, str) else value

        if action == "set":
            variables[variable_name] = value
        elif action == "increment":
            current = variables.get(variable_name, 0)
            try:
                variables[variable_name] = float(current) + float(value or 1)
            except (ValueError, TypeError):
                variables[variable_name] = 1
        elif action == "decrement":
            current = variables.get(variable_name, 0)
            try:
                variables[variable_name] = float(current) - float(value or 1)
            except (ValueError, TypeError):
                variables[variable_name] = 0
        elif action == "append":
            current = variables.get(variable_name, [])
            if not isinstance(current, list):
                current = [current]
            current.append(value)
            variables[variable_name] = current
        elif action == "delete":
            variables.pop(variable_name, None)

        return BlockResult(next_handle=None, variables=variables)
