from fastapi import APIRouter

from app.api import auth, bots, schemas, webhook, ai

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/api/auth", tags=["auth"])
api_router.include_router(bots.router, prefix="/api/bots", tags=["bots"])
api_router.include_router(schemas.router, prefix="/api/bots", tags=["schemas"])
api_router.include_router(ai.router, prefix="/api/ai", tags=["ai"])
api_router.include_router(webhook.router, tags=["webhook"])
