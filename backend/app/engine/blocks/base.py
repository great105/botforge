from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class BlockResult:
    next_handle: str | None = None
    variables: dict = field(default_factory=dict)
    wait_input: bool = False


class BaseBlockHandler(ABC):
    """Abstract handler for a bot schema block."""

    @abstractmethod
    async def execute(
        self,
        node: dict,
        bot,  # aiogram.Bot or preview mock
        chat_id: int,
        update_data: dict,
        variables: dict,
    ) -> BlockResult:
        raise NotImplementedError

    @staticmethod
    def interpolate(text: str, variables: dict) -> str:
        """Replace {var} placeholders with variable values."""
        for key, value in variables.items():
            text = text.replace(f"{{{key}}}", str(value))
        return text
