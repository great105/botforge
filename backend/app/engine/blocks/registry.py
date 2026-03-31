from app.engine.blocks.base import BaseBlockHandler
from app.engine.blocks.check_sub import CheckSubBlockHandler
from app.engine.blocks.condition import ConditionBlockHandler
from app.engine.blocks.delay import DelayBlockHandler
from app.engine.blocks.gpt import GptBlockHandler
from app.engine.blocks.knowledge import KnowledgeBlockHandler
from app.engine.blocks.media import MediaBlockHandler
from app.engine.blocks.message import MessageBlockHandler
from app.engine.blocks.notify import NotifyBlockHandler
from app.engine.blocks.payment import PaymentBlockHandler
from app.engine.blocks.random_block import RandomBlockHandler
from app.engine.blocks.variable import VariableBlockHandler
from app.engine.blocks.webhook import WebhookBlockHandler


class BlockRegistry:
    """Registry of block type handlers."""

    def __init__(self):
        _msg = MessageBlockHandler()
        self._handlers: dict[str, BaseBlockHandler] = {
            # Unified message node
            "message": _msg,
            # Legacy types -> same handler (backward compat)
            "start": _msg,
            "text": _msg,
            "buttons": _msg,
            "input": _msg,
            # Separate node types
            "condition": ConditionBlockHandler(),
            "delay": DelayBlockHandler(),
            "payment": PaymentBlockHandler(),
            "gpt": GptBlockHandler(),
            "webhook": WebhookBlockHandler(),
            "variable": VariableBlockHandler(),
            # New node types
            "media": MediaBlockHandler(),
            "random": RandomBlockHandler(),
            "check_sub": CheckSubBlockHandler(),
            "notify": NotifyBlockHandler(),
            "knowledge": KnowledgeBlockHandler(),
            # note — not executed at runtime (canvas-only annotation)
        }

    def get(self, block_type: str) -> BaseBlockHandler | None:
        return self._handlers.get(block_type)

    def register(self, block_type: str, handler: BaseBlockHandler):
        self._handlers[block_type] = handler
