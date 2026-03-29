# BotForge — Конструктор Telegram-ботов

## Язык
Всегда отвечай на русском. Код, коммиты, комментарии в коде — на английском. UI-тексты — на русском.

## Архитектура
Полное описание: @ARCHITECTURE.md

**Стек:** React 18 + @xyflow/react v12 + Zustand + Tailwind | FastAPI + aiogram 3 + Pydantic v2 | PostgreSQL 16 + Redis 7

**Ключевой принцип:** один Dispatcher на все боты, роутинг по SHA-256 хэшу токена, `feed_webhook_update()` вместо aiohttp.

## Команды

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate  # или venv\Scripts\activate на Windows
pip install -r requirements.txt
PYTHONPATH=. alembic upgrade head
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # dev-сервер на :5173
npm run build    # production в dist/
```

### Deploy (сервер 109.73.205.2)
```bash
# Подключение через paramiko (SSH), sshpass отсутствует
cd /opt/botforge && git pull
cd backend && source venv/bin/activate && pip install -r requirements.txt
find . -name __pycache__ -exec rm -rf {} +
systemctl restart botforge-backend
# Frontend: cd frontend && npm install && npm run build
# Nginx: systemctl reload nginx
```

### Миграции
```bash
cd backend
PYTHONPATH=. alembic revision --autogenerate -m "описание"
PYTHONPATH=. alembic upgrade head
```

## Code Style

### Python (backend/)
- Python 3.12+, type hints на все публичные функции
- async/await — нативный async FastAPI, никогда sync блокирующий I/O
- Pydantic v2 для валидации (BaseModel, Field)
- SQLAlchemy 2.0 async стиль (select(), не query())
- ВАЖНО: `PYTHONPATH=.` при запуске — все импорты от `app.`

### TypeScript (frontend/)
- Strict mode, но `npm run build` = только `vite build` (без tsc -b)
- `memo()` на КАЖДОЙ кастомной ноде React Flow — обязательно
- Zustand stores — нет Redux, нет Context для стейта
- Paths alias: `@/` → `./src/`
- Tailwind utility classes, минимум кастомного CSS

## Безопасность
- Токены ботов: AES-256-GCM в БД, SHA-256 хэш для URL, НИКОГДА в логах
- JWT для auth, bcrypt для паролей (bcrypt<4.2 — совместимость с passlib)
- Telegram webhook: проверка `X-Telegram-Bot-Api-Secret-Token`
- `.env` — НИКОГДА в git

## Известные ограничения
- Сервер 1 GB RAM — 1 uvicorn worker, не Docker
- passlib требует bcrypt<4.2 (bcrypt 5.0 ломает хэширование)
- `schema_json` в Pydantic моделях даёт UserWarning (shadow BaseModel) — безвредно
