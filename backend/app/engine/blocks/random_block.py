import random
import logging

from app.engine.blocks.base import BaseBlockHandler, BlockResult

logger = logging.getLogger(__name__)


class RandomBlockHandler(BaseBlockHandler):
    """A/B testing: randomly choose one of the branches based on weights."""

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        data = node.get("data", {})
        branches = data.get("branches", [])

        if not branches:
            logger.warning("Random node %s: no branches defined", node.get("id"))
            return BlockResult(variables=variables)

        # Weighted random selection
        weights = [max(1, b.get("weight", 1)) for b in branches]
        chosen = random.choices(branches, weights=weights, k=1)[0]

        handle = chosen.get("output_handle")
        label = chosen.get("label", "unknown")

        # Save which branch was chosen for analytics / conditions
        variables["random_branch"] = label
        variables["random_handle"] = handle

        logger.debug(
            "Random node %s: chose branch '%s' (handle=%s)",
            node.get("id"),
            label,
            handle,
        )

        return BlockResult(next_handle=handle, variables=variables)
