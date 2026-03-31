"""
Knowledge base API — file upload, list, delete for bot RAG.
"""

import uuid

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from app.deps import CurrentUser, DbSession
from app.services import bot_service
from app.services.rag import process_file, list_files, delete_file_chunks, search_chunks

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {"pdf", "docx", "doc", "xlsx", "xls", "txt", "md", "csv", "tsv", "xml", "json", "html"}


class FileResponse(BaseModel):
    file_id: str
    filename: str
    chunks: int
    created_at: str | None = None


class SearchRequest(BaseModel):
    query: str
    api_key: str
    embedding_model: str = "openai/text-embedding-3-small"
    top_k: int = 5


class SearchResult(BaseModel):
    filename: str
    text: str


@router.post("/{bot_id}/knowledge/upload")
async def upload_knowledge_file(
    bot_id: uuid.UUID,
    session: DbSession,
    user: CurrentUser,
    file: UploadFile = File(...),
    api_key: str = Form(...),
    embedding_model: str = Form(default="openai/text-embedding-3-small"),
):
    """Upload a file to the bot's knowledge base."""
    bot = await bot_service.get_bot(session, bot_id, user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Файл не выбран")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Формат .{ext} не поддерживается. Разрешены: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой (макс. 10 МБ)")

    result = await process_file(
        db=session,
        bot_id=str(bot_id),
        filename=file.filename,
        file_data=data,
        api_key=api_key,
        embedding_model=embedding_model,
    )

    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])

    return result


@router.get("/{bot_id}/knowledge/files", response_model=list[FileResponse])
async def list_knowledge_files(
    bot_id: uuid.UUID,
    session: DbSession,
    user: CurrentUser,
):
    """List all files in the bot's knowledge base."""
    bot = await bot_service.get_bot(session, bot_id, user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")

    files = await list_files(session, str(bot_id))
    return files


@router.delete("/{bot_id}/knowledge/files/{file_id}")
async def delete_knowledge_file(
    bot_id: uuid.UUID,
    file_id: str,
    session: DbSession,
    user: CurrentUser,
):
    """Delete a file from the knowledge base."""
    bot = await bot_service.get_bot(session, bot_id, user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")

    await delete_file_chunks(session, str(bot_id), file_id)
    return {"status": "deleted"}


@router.post("/{bot_id}/knowledge/search", response_model=list[SearchResult])
async def search_knowledge(
    bot_id: uuid.UUID,
    body: SearchRequest,
    session: DbSession,
    user: CurrentUser,
):
    """Search the knowledge base (for testing)."""
    bot = await bot_service.get_bot(session, bot_id, user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")

    results = await search_chunks(
        db=session,
        bot_id=str(bot_id),
        query=body.query,
        api_key=body.api_key,
        top_k=body.top_k,
        embedding_model=body.embedding_model,
    )
    return results
