from dataclasses import dataclass
from typing import Callable

@dataclass
class AgentTool:
    name: str
    description: str
    parameters: dict  # JSON Schema
    handler: Callable
    is_write: bool = False


TOOL_REGISTRY: dict[str, AgentTool] = {}


def tool(
    name: str,
    description: str,
    parameters: dict,
    is_write: bool = False,
):
    """Decorator to register an agent tool."""
    def decorator(func: Callable) -> Callable:
        TOOL_REGISTRY[name] = AgentTool(
            name=name,
            description=description,
            parameters=parameters,
            handler=func,
            is_write=is_write,
        )
        return func
    return decorator
