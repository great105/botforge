class SafetyGuard:
    """
    Protection against loops and abuse.
    Inspired by GRACE belief log from AgiWork.
    """

    def __init__(self):
        self.call_log: list[dict] = []
        self.consecutive_errors: int = 0

    def check_before_call(self, tool_name: str, args: dict) -> str | None:
        """Returns None if OK, or error text."""
        # 1. Per-tool call limit
        same_tool_count = sum(1 for c in self.call_log if c["tool"] == tool_name)
        if same_tool_count >= 10:
            return f"Инструмент {tool_name} вызван {same_tool_count} раз. Лимит исчерпан."

        # 2. Duplicate call detection (same args 3 times in a row)
        last_3 = [c for c in self.call_log[-3:] if c["tool"] == tool_name]
        if len(last_3) >= 2 and all(c["args"] == args for c in last_3):
            return f"Обнаружен цикл: {tool_name} с теми же аргументами. Пересмотри подход."

        # 3. Too many consecutive errors
        if self.consecutive_errors >= 5:
            return "5 ошибок подряд. Вызови get_current_schema() и пересмотри подход."

        return None

    def log_call(self, tool_name: str, args: dict, success: bool):
        self.call_log.append({"tool": tool_name, "args": args, "success": success})
        if success:
            self.consecutive_errors = 0
        else:
            self.consecutive_errors += 1
