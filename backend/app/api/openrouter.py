"""
OpenRouter proxy endpoints — avoid CORS issues for frontend.
Validates API keys, lists models with caching.
"""

import time
import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.deps import CurrentUser

router = APIRouter()

OPENROUTER_BASE = "https://openrouter.ai/api/v1"

# Simple in-memory cache for models list (refreshes every hour)
_models_cache: dict = {"data": None, "ts": 0}
CACHE_TTL = 3600  # 1 hour


class ValidateKeyRequest(BaseModel):
    api_key: str


class ValidateKeyResponse(BaseModel):
    valid: bool
    label: str | None = None
    usage: float | None = None
    limit: float | None = None
    limit_remaining: float | None = None
    is_free_tier: bool | None = None


class ModelInfo(BaseModel):
    id: str
    name: str
    context_length: int
    price_prompt: float  # per 1M tokens
    price_completion: float  # per 1M tokens
    supports_tools: bool
    supports_vision: bool
    max_completion: int | None = None


@router.post("/validate-key", response_model=ValidateKeyResponse)
async def validate_openrouter_key(body: ValidateKeyRequest, user: CurrentUser):
    """Check if an OpenRouter API key is valid and return usage info."""
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(
                f"{OPENROUTER_BASE}/key",
                headers={"Authorization": f"Bearer {body.api_key}"},
            )
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Не удалось подключиться к OpenRouter")

    if resp.status_code == 401:
        return ValidateKeyResponse(valid=False)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"OpenRouter вернул {resp.status_code}")

    data = resp.json().get("data", {})
    return ValidateKeyResponse(
        valid=True,
        label=data.get("label"),
        usage=data.get("usage"),
        limit=data.get("limit"),
        limit_remaining=data.get("limit_remaining"),
        is_free_tier=data.get("is_free_tier"),
    )


@router.get("/models", response_model=list[ModelInfo])
async def list_openrouter_models(
    user: CurrentUser,
    search: str = Query(default="", description="Filter by name or id"),
):
    """List available OpenRouter models (cached 1h). Optional search filter."""
    now = time.time()

    # Refresh cache if stale
    if _models_cache["data"] is None or now - _models_cache["ts"] > CACHE_TTL:
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                resp = await client.get(f"{OPENROUTER_BASE}/models")
            except httpx.RequestError:
                raise HTTPException(status_code=502, detail="Не удалось загрузить модели")

            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"OpenRouter: {resp.status_code}")

            raw_models = resp.json().get("data", [])

            # Parse into our format
            parsed = []
            for m in raw_models:
                pricing = m.get("pricing", {})
                prompt_price = float(pricing.get("prompt", "0") or "0")
                completion_price = float(pricing.get("completion", "0") or "0")
                supported = m.get("supported_parameters", [])
                arch = m.get("architecture", {})
                input_mod = arch.get("input_modalities", [])
                top = m.get("top_provider", {})

                parsed.append(ModelInfo(
                    id=m["id"],
                    name=m.get("name", m["id"]),
                    context_length=m.get("context_length", 0),
                    price_prompt=prompt_price * 1_000_000,  # per 1M tokens
                    price_completion=completion_price * 1_000_000,
                    supports_tools="tools" in supported,
                    supports_vision="image" in input_mod,
                    max_completion=top.get("max_completion_tokens"),
                ))

            # Sort: popular/cheap first
            parsed.sort(key=lambda x: (not x.supports_tools, x.price_prompt))
            _models_cache["data"] = parsed
            _models_cache["ts"] = now

    models = _models_cache["data"]

    # Apply search filter
    if search.strip():
        q = search.lower()
        models = [m for m in models if q in m.id.lower() or q in m.name.lower()]

    return models[:100]  # limit results
