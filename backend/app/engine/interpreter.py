from app.engine.blocks.registry import BlockRegistry
from app.engine.state import SubscriberState

MAX_CHAIN_DEPTH = 50  # prevent infinite loops in graph traversal


class GraphInterpreter:
    """
    Core engine. Receives an update from a subscriber,
    determines current node in the graph, executes it,
    and transitions to the next node.
    """

    def __init__(self, schema: dict, bot, storage: SubscriberState):
        self.nodes = {n["id"]: n for n in schema.get("nodes", [])}
        self.edges = schema.get("edges", [])
        self.bot = bot
        self.storage = storage
        self.block_registry = BlockRegistry()

    async def process_update(
        self,
        chat_id: int,
        user_id: int,
        update_data: dict,
        _depth: int = 0,
    ):
        if _depth >= MAX_CHAIN_DEPTH:
            return

        # 1. Get subscriber state from Redis
        state = await self.storage.get_state(user_id)

        if state is None:
            # New user — find start node
            current_node = self._find_start_node(update_data)
            variables = {}
        else:
            current_node = self.nodes.get(state.get("current_node"))
            variables = state.get("variables", {})

        if not current_node:
            return

        # 2. Execute current block
        handler = self.block_registry.get(current_node["type"])
        if handler is None:
            return

        result = await handler.execute(
            node=current_node,
            bot=self.bot,
            chat_id=chat_id,
            update_data=update_data,
            variables=variables,
        )

        # 3. If block waits for input — save state and return
        if result.wait_input:
            await self.storage.set_state(user_id, {
                "current_node": current_node["id"],
                "variables": result.variables,
            })
            return

        # 4. Find next node via edges
        next_node = self._resolve_next_node(current_node["id"], result.next_handle)

        if next_node:
            await self.storage.set_state(user_id, {
                "current_node": next_node["id"],
                "variables": result.variables,
            })
            # Recursively execute next block in chain (text → text → buttons)
            await self.process_update(chat_id, user_id, update_data={}, _depth=_depth + 1)
        else:
            # End of chain — clear state
            await self.storage.clear_state(user_id)

    def _resolve_next_node(self, source_id: str, handle: str | None) -> dict | None:
        """Find next node via graph edges."""
        for edge in self.edges:
            if edge["source"] == source_id:
                if handle is None or edge.get("sourceHandle") == handle:
                    return self.nodes.get(edge["target"])
        return None

    def _find_start_node(self, update_data: dict) -> dict | None:
        """Find a start node that matches the incoming update."""
        for node in self.nodes.values():
            if node["type"] == "start":
                triggers = node["data"].get("triggers", [])
                if self._matches_trigger(triggers, update_data):
                    return node
        # Fallback: any start node
        for node in self.nodes.values():
            if node["type"] == "start":
                return node
        return None

    @staticmethod
    def _matches_trigger(triggers: list[str], update_data: dict) -> bool:
        """Check if update matches any trigger."""
        if not triggers:
            return True

        message = update_data.get("message", {})
        text = message.get("text", "")

        for trigger in triggers:
            if trigger.startswith("command:"):
                cmd = trigger.split(":", 1)[1]
                if text == cmd or text.startswith(cmd + " ") or text.startswith(cmd + "@"):
                    return True
            elif trigger.startswith("text:"):
                pattern = trigger.split(":", 1)[1]
                if pattern.lower() in text.lower():
                    return True
            elif trigger == text:
                return True

        return False
