from app.engine.blocks.base import BaseBlockHandler, BlockResult

OPERATORS = {
    "equals": lambda a, b: str(a) == str(b),
    "not_equals": lambda a, b: str(a) != str(b),
    "contains": lambda a, b: str(b) in str(a),
    "greater_than": lambda a, b: float(a) > float(b),
    "less_than": lambda a, b: float(a) < float(b),
    "is_set": lambda a, b: a is not None and a != "",
    "is_not_set": lambda a, b: a is None or a == "",
}


class ConditionBlockHandler(BaseBlockHandler):
    """Evaluate a condition and branch to true/false output."""

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        variable_name = node["data"].get("variable", "")
        operator = node["data"].get("operator", "equals")
        expected_value = node["data"].get("value", "")

        actual_value = variables.get(variable_name)
        op_func = OPERATORS.get(operator, OPERATORS["equals"])

        try:
            result = op_func(actual_value, expected_value)
        except (ValueError, TypeError):
            result = False

        handle = "handle_yes" if result else "handle_no"
        return BlockResult(next_handle=handle, variables=variables)
