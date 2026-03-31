from fastapi import APIRouter

from app.api import auth, bots, schemas, webhook, ai, api_keys, public, openrouter, knowledge, payments

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/api/auth", tags=["auth"])
api_router.include_router(bots.router, prefix="/api/bots", tags=["bots"])
api_router.include_router(schemas.router, prefix="/api/bots", tags=["schemas"])
api_router.include_router(ai.router, prefix="/api/ai", tags=["ai"])
api_router.include_router(api_keys.router, prefix="/api/keys", tags=["api-keys"])
api_router.include_router(public.router, prefix="/api/v1", tags=["public-api"])
api_router.include_router(openrouter.router, prefix="/api/openrouter", tags=["openrouter"])
api_router.include_router(knowledge.router, prefix="/api/bots", tags=["knowledge"])
api_router.include_router(payments.router, prefix="/api/payments", tags=["payments"])
api_router.include_router(webhook.router, tags=["webhook"])
