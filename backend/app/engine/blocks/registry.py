from app.engine.blocks.base import BaseBlockHandler
from app.engine.blocks.buttons import ButtonsBlockHandler
from app.engine.blocks.condition import ConditionBlockHandler
from app.engine.blocks.delay import DelayBlockHandler
from app.engine.blocks.gpt import GptBlockHandler
from app.engine.blocks.input import InputBlockHandler
from app.engine.blocks.payment import PaymentBlockHandler
from app.engine.blocks.text import TextBlockHandler
from app.engine.blocks.variable import VariableBlockHandler
from app.engine.blocks.webhook import WebhookBlockHandler


class BlockRegistry:
    """Registry of block type handlers."""

    def __init__(self):
        self._handlers: dict[str, BaseBlockHandler] = {
            "start": TextBlockHandler(),       # start acts like text (sends greeting)
            "text": TextBlockHandler(),
            "buttons": ButtonsBlockHandler(),
            "condition": ConditionBlockHandler(),
            "input": InputBlockHandler(),
            "delay": DelayBlockHandler(),
            "payment": PaymentBlockHandler(),
            "gpt": GptBlockHandler(),
            "webhook": WebhookBlockHandler(),
            "variable": VariableBlockHandler(),
        }

    def get(self, block_type: str) -> BaseBlockHandler | None:
        return self._handlers.get(block_type)

    def register(self, block_type: str, handler: BaseBlockHandler):
        self._handlers[block_type] = handler
