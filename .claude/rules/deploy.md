---
paths:
  - "docker-compose.yml"
  - "nginx/**"
  - "backend/Dockerfile"
  - "frontend/Dockerfile"
---

# Deploy Rules

## Production Server
- IP: 109.73.205.2, Ubuntu 24.04, 1 vCPU, 1 GB RAM + 2 GB swap
- Нативный деплой (НЕ Docker) — RAM не хватит
- SSH через `paramiko` (Python) — `sshpass` отсутствует на Windows

## Процесс деплоя
1. `git push` на GitHub (great105/botforge)
2. SSH → `cd /opt/botforge && git pull`
3. Backend: `source venv/bin/activate && pip install -r requirements.txt`
4. ОБЯЗАТЕЛЬНО: `find . -name __pycache__ -exec rm -rf {} +` перед рестартом
5. `systemctl restart botforge-backend` + ждать ~10 сек (медленный сервер)
6. Frontend: `npm install && npm run build` (результат в dist/, Nginx раздаёт статику)
7. Nginx: `systemctl reload nginx` (если менялся конфиг)

## Сервисы на сервере
- `botforge-backend.service` — uvicorn, 1 worker, порт 8000
- PostgreSQL 16 — локально, user `botforge`, DB `botforge`
- Redis 7 — локально, порт 6379
- Nginx — reverse proxy (/api/ → :8000, / → статика dist/)

## ВАЖНО
- `.env` только на сервере (`/opt/botforge/backend/.env`), НЕ в git
- После pip install/изменений — ВСЕГДА чистить __pycache__
- uvicorn стартует ~10 сек на 1 GB RAM — не паниковать при 502
