import json

import redis.asyncio as aioredis


class SubscriberState:
    """
    Manages subscriber state in Redis.
    Key pattern: bot:{token_hash}:user:{user_id}:state
    """

    STATE_TTL = 86400  # 24 hours
    SCHEMA_TTL = 3600  # 1 hour

    def __init__(self, redis: aioredis.Redis, token_hash: str):
        self.redis = redis
        self.token_hash = token_hash

    def _state_key(self, user_id: int) -> str:
        return f"bot:{self.token_hash}:user:{user_id}:state"

    def _schema_key(self) -> str:
        return f"bot:{self.token_hash}:schema"

    async def get_state(self, user_id: int) -> dict | None:
        raw = await self.redis.get(self._state_key(user_id))
        if raw is None:
            return None
        return json.loads(raw)

    async def set_state(self, user_id: int, state: dict):
        await self.redis.setex(
            self._state_key(user_id),
            self.STATE_TTL,
            json.dumps(state, ensure_ascii=False),
        )

    async def clear_state(self, user_id: int):
        await self.redis.delete(self._state_key(user_id))

    async def get_cached_schema(self) -> dict | None:
        raw = await self.redis.get(self._schema_key())
        if raw is None:
            return None
        return json.loads(raw)

    async def cache_schema(self, schema: dict):
        await self.redis.setex(
            self._schema_key(),
            self.SCHEMA_TTL,
            json.dumps(schema, ensure_ascii=False),
        )

    async def invalidate_schema_cache(self):
        await self.redis.delete(self._schema_key())
