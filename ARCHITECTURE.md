# BotForge — Архитектура платформы

> Визуальный конструктор Telegram-ботов с хостингом (SaaS)

---

## 1. Общая схема системы

```
┌──────────────────────────────────────────────────────────────────────┐
│                         КЛИЕНТ (Browser)                              │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────┐  │
│  │  React Flow  │  │  TG-эмулятор │  │ AI-чат   │  │  Панель    │  │
│  │  (редактор)  │  │  (превью)    │  │ (агент)  │  │ управления │  │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘  └─────┬──────┘  │
│         │                 │               │               │          │
│         └─────────────────┴───────────────┴───────────────┘          │
│                           │                                          │
│                    Zustand (стейт)                                   │
└───────────────────────────┼──────────────────────────────────────────┘
                            │ REST API + WebSocket + SSE
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      NGINX (reverse proxy)                            │
│            SSL termination, rate limiting, /webhook/*                  │
└──────────┬──────────────────────────────────────────┬────────────────┘
           │                                          │
           ▼                                          ▼
┌──────────────────────────┐           ┌─────────────────────────┐
│     FastAPI (main)       │           │  Telegram Servers        │
│                          │           │  POST /webhook/{hash}    │
│  • REST API              │◄──────────│  (входящие updates)      │
│  • WebSocket (превью)    │           └─────────────────────────┘
│  • SSE (AI-стриминг)     │
│  • Webhook receiver      │           ┌─────────────────────────┐
│                          │──────────►│  Claude API (Anthropic)  │
│  ┌─────────────────────┐ │           │  tool-calling для агента │
│  │ AI Agent Executor   │ │           └─────────────────────────┘
│  │ (tool-calling loop) │ │
│  │ ┌─────────────────┐ │ │
│  │ │ @tool registry  │ │ │
│  │ │ • add_node      │ │ │
│  │ │ • connect_nodes │ │ │
│  │ │ • validate      │ │ │
│  │ │ • auto_layout   │ │ │
│  │ │ • template      │ │ │
│  │ └─────────────────┘ │ │
│  └─────────────────────┘ │
└──────┬───────────────────┘
       │
       ├──► PostgreSQL (данные)
       ├──► Redis (FSM + кэш)
       └──► aiogram 3 Dispatcher (движок ботов)
```

---

## 2. Стек технологий (с обоснованием)

### Фронтенд

| Технология | Версия | Зачем |
|---|---|---|
| **React 18+** | ^18.3 | Основа UI, concurrent features |
| **@xyflow/react (React Flow)** | ^12.x | Node-based редактор. Из коробки: drag-drop, Безье-кривые, зум/пан, мини-карта, сериализация через `toObject()`. Альтернативы (joint.js, rete.js) проигрывают по экосистеме и DX |
| **Zustand** | ^5.x | Стейт-менеджер. Легче Redux, нативная интеграция с React Flow через `useStore` — критично для перформанса на больших графах |
| **Tailwind CSS** | ^4.x | Утилитарный CSS |
| **shadcn/ui** | latest | UI-компоненты, тёмная тема |
| **TypeScript** | ^5.x | Типизация |

### Бэкенд

| Технология | Версия | Зачем |
|---|---|---|
| **FastAPI** | ^0.115+ | REST + WebSocket + DI + Pydantic v2. Async нативно. `BackgroundTasks` для отложенных операций |
| **aiogram 3** | ^3.25 | Telegram Bot API framework. Ключевое: `Dispatcher.feed_webhook_update(bot, update)` для интеграции с FastAPI (не aiohttp). `RedisStorage` для FSM |
| **Pydantic v2** | ^2.x | Валидация JSON-схем блоков, модели API |
| **SQLAlchemy 2.0** | ^2.x | Async ORM, `asyncpg` драйвер |
| **Alembic** | latest | Миграции БД |
| **uvicorn** | latest | ASGI-сервер, `--workers N` для масштабирования |

### Инфраструктура

| Технология | Зачем |
|---|---|
| **PostgreSQL 16** | Основная БД. `jsonb` для хранения схем ботов |
| **Redis 7** | FSM-стейт подписчиков, кэш схем, pub/sub для live-превью |
| **Docker Compose** | Оркестрация на старте |
| **Nginx** | Reverse proxy, SSL, rate limiting |

---

## 3. Структура проекта

```
botforge/
├── frontend/                    # React-приложение
│   ├── src/
│   │   ├── app/                 # Точка входа, роутинг
│   │   ├── components/
│   │   │   ├── editor/          # Визуальный редактор
│   │   │   │   ├── nodes/       # Кастомные ноды React Flow
│   │   │   │   │   ├── StartNode.tsx
│   │   │   │   │   ├── TextNode.tsx
│   │   │   │   │   ├── ButtonsNode.tsx
│   │   │   │   │   ├── ConditionNode.tsx
│   │   │   │   │   ├── InputNode.tsx
│   │   │   │   │   ├── DelayNode.tsx
│   │   │   │   │   ├── PaymentNode.tsx
│   │   │   │   │   ├── GptNode.tsx
│   │   │   │   │   ├── WebhookNode.tsx
│   │   │   │   │   ├── VariableNode.tsx
│   │   │   │   │   └── index.ts # nodeTypes registry
│   │   │   │   ├── edges/       # Кастомные рёбра
│   │   │   │   │   └── BotEdge.tsx
│   │   │   │   ├── panels/      # Боковые панели
│   │   │   │   │   ├── BlockPalette.tsx    # Палитра блоков (слева)
│   │   │   │   │   └── PropertiesPanel.tsx # Настройки блока (справа)
│   │   │   │   └── Canvas.tsx   # Главный компонент React Flow
│   │   │   ├── emulator/        # TG-эмулятор (превью)
│   │   │   │   ├── PhoneFrame.tsx
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   └── EmulatorEngine.ts
│   │   │   ├── dashboard/       # Управление ботами
│   │   │   │   ├── BotList.tsx
│   │   │   │   ├── BotSettings.tsx
│   │   │   │   └── TokenInput.tsx
│   │   │   └── shared/          # Общие компоненты
│   │   ├── stores/              # Zustand stores
│   │   │   ├── editorStore.ts   # Ноды, рёбра, выбранный блок
│   │   │   ├── botStore.ts      # Список ботов, статусы
│   │   │   └── authStore.ts     # Авторизация
│   │   ├── api/                 # API-клиент
│   │   │   └── client.ts
│   │   ├── types/               # TypeScript-типы
│   │   │   ├── nodes.ts         # Типы нод
│   │   │   └── schema.ts        # Схема бота (JSON-граф)
│   │   └── lib/                 # Утилиты
│   │       ├── export.ts        # Экспорт в aiogram 3 код
│   │       └── validation.ts    # Валидация графа
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                     # FastAPI-приложение
│   ├── app/
│   │   ├── main.py              # FastAPI app, lifespan, CORS
│   │   ├── config.py            # Pydantic Settings
│   │   ├── api/
│   │   │   ├── router.py        # Подключение всех роутеров
│   │   │   ├── auth.py          # Регистрация / логин
│   │   │   ├── bots.py          # CRUD ботов, запуск/остановка
│   │   │   ├── schemas.py       # CRUD схем (JSON-граф)
│   │   │   ├── webhook.py       # Приём вебхуков от Telegram
│   │   │   └── ai.py            # AI-генератор схем (Claude API)
│   │   ├── models/              # SQLAlchemy модели
│   │   │   ├── user.py
│   │   │   ├── bot.py
│   │   │   ├── schema.py
│   │   │   └── subscriber.py
│   │   ├── agent/               # AI-агент (tool-calling)
│   │   │   ├── executor.py      # AgentExecutor — multi-turn loop
│   │   │   ├── tools/
│   │   │   │   ├── _registry.py # @tool декоратор + TOOL_REGISTRY
│   │   │   │   ├── graph_tools.py   # add_node, connect_nodes, update/delete
│   │   │   │   ├── query_tools.py   # get_current_schema, validate_schema
│   │   │   │   ├── layout_tools.py  # auto_layout
│   │   │   │   └── template_tools.py# apply_template
│   │   │   ├── prompts/
│   │   │   │   ├── system.py    # Системный промпт с примерами
│   │   │   │   └── examples.py  # Few-shot примеры
│   │   │   └── safety.py       # Anti-loop, GRACE-лог, лимиты
│   │   ├── engine/              # Движок исполнения ботов
│   │   │   ├── runtime.py       # BotRuntime — менеджер запущенных ботов
│   │   │   ├── interpreter.py   # GraphInterpreter — шагает по JSON-графу
│   │   │   ├── blocks/          # Обработчики каждого типа блока
│   │   │   │   ├── base.py      # BaseBlockHandler (ABC)
│   │   │   │   ├── text.py
│   │   │   │   ├── buttons.py
│   │   │   │   ├── condition.py
│   │   │   │   ├── input.py
│   │   │   │   ├── delay.py
│   │   │   │   ├── payment.py
│   │   │   │   ├── gpt.py
│   │   │   │   ├── webhook.py
│   │   │   │   ├── variable.py
│   │   │   │   └── registry.py  # Реестр обработчиков
│   │   │   └── state.py         # Управление состоянием подписчика
│   │   ├── db/
│   │   │   ├── session.py       # async sessionmaker
│   │   │   └── migrations/      # Alembic
│   │   ├── services/
│   │   │   ├── bot_service.py   # Бизнес-логика ботов
│   │   │   ├── token_crypto.py  # Шифрование/хэширование токенов
│   │   │   └── limits.py        # Проверка лимитов тарифа
│   │   └── deps.py              # FastAPI dependencies
│   ├── requirements.txt
│   ├── alembic.ini
│   └── Dockerfile
│
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
└── ARCHITECTURE.md              # ← этот файл
```

---

## 4. Модели данных (PostgreSQL)

### 4.1 users

```sql
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    plan        VARCHAR(20) DEFAULT 'free',  -- free | starter | pro
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 bots

```sql
CREATE TABLE bots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    token_encrypted BYTEA NOT NULL,           -- AES-256 зашифрованный токен
    token_hash      VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 хэш для роутинга вебхуков
    bot_username    VARCHAR(100),              -- из getMe
    status          VARCHAR(20) DEFAULT 'stopped', -- stopped | running | error
    error_message   TEXT,
    subscribers_count INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_bots_token_hash ON bots(token_hash);
CREATE INDEX idx_bots_user_id ON bots(user_id);
```

### 4.3 bot_schemas

```sql
CREATE TABLE bot_schemas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id      UUID REFERENCES bots(id) ON DELETE CASCADE,
    version     INTEGER DEFAULT 1,
    schema_json JSONB NOT NULL,   -- полный граф: {nodes: [...], edges: [...], viewport: {...}}
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_schemas_bot_id ON bot_schemas(bot_id);
```

### 4.4 Формат `schema_json` (JSONB)

Это то, что возвращает `reactFlowInstance.toObject()` + наши данные в `data`:

```jsonc
{
  "nodes": [
    {
      "id": "node_1",
      "type": "start",           // тип блока
      "position": {"x": 100, "y": 50},
      "data": {
        "label": "Старт",
        "triggers": ["command:/start"]
      }
    },
    {
      "id": "node_2",
      "type": "text",
      "position": {"x": 100, "y": 200},
      "data": {
        "label": "Приветствие",
        "text": "Привет! Добро пожаловать в бот.",
        "parse_mode": "HTML"
      }
    },
    {
      "id": "node_3",
      "type": "buttons",
      "position": {"x": 100, "y": 350},
      "data": {
        "label": "Меню",
        "text": "Выберите действие:",
        "buttons": [
          {"text": "Каталог", "output_handle": "btn_catalog"},
          {"text": "Контакты", "output_handle": "btn_contacts"}
        ],
        "layout": "vertical"
      }
    },
    {
      "id": "node_4",
      "type": "condition",
      "position": {"x": 100, "y": 500},
      "data": {
        "label": "Проверка подписки",
        "variable": "is_subscribed",
        "operator": "equals",
        "value": "true",
        "output_true": "handle_yes",
        "output_false": "handle_no"
      }
    }
  ],
  "edges": [
    {"id": "e1-2", "source": "node_1", "target": "node_2"},
    {"id": "e2-3", "source": "node_2", "target": "node_3"},
    {"id": "e3-4", "source": "node_3", "target": "node_4", "sourceHandle": "btn_catalog"}
  ],
  "viewport": {"x": 0, "y": 0, "zoom": 1}
}
```

---

## 5. Движок исполнения ботов (ЯДРО)

### 5.1 Как приходят updates от Telegram

```
Telegram → POST https://botforge.ru/webhook/{token_hash}
                                               │
                                               ▼
                                   ┌──────────────────────┐
                                   │  FastAPI: webhook.py  │
                                   │                       │
                                   │  1. token_hash → ищем │
                                   │     бота в Redis/DB   │
                                   │  2. Расшифровываем    │
                                   │     токен             │
                                   │  3. Создаём Bot()     │
                                   │  4. dp.feed_webhook_  │
                                   │     update(bot, data) │
                                   └──────────┬───────────┘
                                              │
                                              ▼
                                   ┌──────────────────────┐
                                   │  aiogram Dispatcher   │
                                   │                       │
                                   │  Router → handler →   │
                                   │  GraphInterpreter     │
                                   └──────────────────────┘
```

### 5.2 webhook.py — приём вебхуков через FastAPI

```python
from fastapi import APIRouter, Request, HTTPException
from aiogram import Bot, Dispatcher
from aiogram.types import Update
from aiogram.client.default import DefaultBotProperties

router = APIRouter()

# Глобальный Dispatcher — один на всё приложение
# Инициализируется в lifespan FastAPI
dp: Dispatcher = None
bot_registry: dict[str, Bot] = {}  # token_hash → Bot instance (кэш)


@router.post("/webhook/{token_hash}")
async def telegram_webhook(token_hash: str, request: Request):
    """Единый эндпоинт для всех ботов. Роутинг по token_hash."""

    # 1. Находим бота
    bot = await get_or_create_bot(token_hash)
    if not bot:
        raise HTTPException(status_code=404)

    # 2. Парсим update
    data = await request.json()

    # 3. Скармливаем диспетчеру
    # feed_webhook_update сам парсит dict → Update если нужно
    # Таймаут 55 сек (Telegram ждёт 60, нужен запас)
    await dp.feed_webhook_update(bot=bot, update=data)

    return {"ok": True}


async def get_or_create_bot(token_hash: str) -> Bot | None:
    """Ищет Bot-инстанс в кэше или создаёт из БД."""
    if token_hash in bot_registry:
        return bot_registry[token_hash]

    # Ищем в Redis-кэше, потом в PostgreSQL
    bot_data = await redis.get(f"bot:{token_hash}")
    if not bot_data:
        bot_record = await db.get_bot_by_hash(token_hash)
        if not bot_record or bot_record.status != "running":
            return None
        token = decrypt_token(bot_record.token_encrypted)
    else:
        token = decrypt_token(bot_data["token_encrypted"])

    bot = Bot(token=token, default=DefaultBotProperties(parse_mode="HTML"))
    bot_registry[token_hash] = bot
    return bot
```

### 5.3 GraphInterpreter — интерпретатор JSON-графа

```python
class GraphInterpreter:
    """
    Ядро системы. Получает update от подписчика,
    определяет текущий узел в графе, выполняет его,
    переходит к следующему.
    """

    def __init__(self, schema: dict, bot: Bot, redis_storage):
        self.nodes = {n["id"]: n for n in schema["nodes"]}
        self.edges = schema["edges"]
        self.bot = bot
        self.storage = redis_storage
        self.block_registry = BlockRegistry()  # text, buttons, condition...

    async def process_update(self, chat_id: int, user_id: int, update_data: dict):
        # 1. Получаем текущее состояние подписчика из Redis
        state = await self.storage.get_state(chat_id, user_id)
        # state = {"current_node": "node_3", "variables": {"name": "Иван"}, ...}

        if state is None:
            # Новый пользователь — ищем стартовый узел
            current_node = self._find_start_node(update_data)
        else:
            current_node = self.nodes.get(state["current_node"])

        if not current_node:
            return

        # 2. Выполняем текущий блок
        handler = self.block_registry.get(current_node["type"])
        result = await handler.execute(
            node=current_node,
            bot=self.bot,
            chat_id=chat_id,
            update_data=update_data,
            variables=state.get("variables", {}),
        )
        # result = BlockResult(next_handle="btn_catalog", variables={...}, wait_input=False)

        # 3. Если блок ждёт ввода — сохраняем состояние и выходим
        if result.wait_input:
            await self.storage.set_state(chat_id, user_id, {
                "current_node": current_node["id"],
                "variables": result.variables,
            })
            return

        # 4. Находим следующий узел по рёбрам
        next_node = self._resolve_next_node(current_node["id"], result.next_handle)

        if next_node:
            # Сохраняем переход и рекурсивно выполняем следующий блок
            await self.storage.set_state(chat_id, user_id, {
                "current_node": next_node["id"],
                "variables": result.variables,
            })
            # Рекурсия для цепочек (текст → текст → кнопки)
            # Но только если блок не требует ввода
            await self.process_update(chat_id, user_id, update_data={})
        else:
            # Конец цепочки — очищаем состояние
            await self.storage.clear_state(chat_id, user_id)

    def _resolve_next_node(self, source_id: str, handle: str | None) -> dict | None:
        """Находит следующий узел по рёбрам графа."""
        for edge in self.edges:
            if edge["source"] == source_id:
                if handle is None or edge.get("sourceHandle") == handle:
                    return self.nodes.get(edge["target"])
        return None

    def _find_start_node(self, update_data: dict) -> dict | None:
        """Ищет стартовый узел, который матчит входящий update."""
        for node in self.nodes.values():
            if node["type"] == "start":
                triggers = node["data"].get("triggers", [])
                if self._matches_trigger(triggers, update_data):
                    return node
        return None
```

### 5.4 Обработчик блока (пример — TextBlock)

```python
from dataclasses import dataclass

@dataclass
class BlockResult:
    next_handle: str | None = None      # какой выход активировать
    variables: dict = None               # обновлённые переменные
    wait_input: bool = False             # ждать ввода от пользователя?

class BaseBlockHandler:
    """Абстрактный обработчик блока."""
    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        raise NotImplementedError

class TextBlockHandler(BaseBlockHandler):
    """Отправляет текстовое сообщение и переходит дальше."""

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        text = node["data"]["text"]

        # Подстановка переменных: "Привет, {name}!" → "Привет, Иван!"
        for key, value in variables.items():
            text = text.replace(f"{{{key}}}", str(value))

        parse_mode = node["data"].get("parse_mode", "HTML")
        await bot.send_message(chat_id=chat_id, text=text, parse_mode=parse_mode)

        return BlockResult(next_handle=None, variables=variables)

class ButtonsBlockHandler(BaseBlockHandler):
    """Отправляет сообщение с инлайн-кнопками и ЖДЁТ нажатия."""

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        # Если это callback от кнопки — определяем какая нажата
        callback = update_data.get("callback_query")
        if callback:
            handle = callback["data"]  # "btn_catalog"
            return BlockResult(next_handle=handle, variables=variables, wait_input=False)

        # Иначе — отправляем кнопки и ждём
        buttons = node["data"]["buttons"]
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text=b["text"], callback_data=b["output_handle"])]
            for b in buttons
        ])
        text = self._interpolate(node["data"]["text"], variables)
        await bot.send_message(chat_id=chat_id, text=text, reply_markup=keyboard)

        return BlockResult(variables=variables, wait_input=True)
```

---

## 6. Запуск и остановка ботов (API)

### 6.1 Endpoint: запуск бота

```python
@router.post("/api/bots/{bot_id}/start")
async def start_bot(bot_id: UUID, user: User = Depends(get_current_user)):
    bot_record = await bot_service.get_bot(bot_id, user.id)

    # 1. Проверяем лимиты тарифа
    await limits.check_can_start(user)

    # 2. Валидируем токен через Telegram API
    token = decrypt_token(bot_record.token_encrypted)
    async with Bot(token=token) as tmp_bot:
        me = await tmp_bot.get_me()  # Telegram getMe — проверяем что токен рабочий

    # 3. Вычисляем token_hash (для URL вебхука)
    token_hash = hashlib.sha256(token.encode()).hexdigest()[:32]

    # 4. Устанавливаем webhook в Telegram
    webhook_url = f"{settings.BASE_URL}/webhook/{token_hash}"
    async with Bot(token=token) as tmp_bot:
        await tmp_bot.set_webhook(
            url=webhook_url,
            secret_token=settings.WEBHOOK_SECRET,  # дополнительная защита
            allowed_updates=["message", "callback_query", "inline_query"],
        )

    # 5. Кэшируем данные бота в Redis (для быстрого роутинга вебхуков)
    await redis.setex(
        f"bot:{token_hash}",
        ttl=86400,  # 24 часа, обновляется при каждом update
        value=json.dumps({
            "bot_id": str(bot_record.id),
            "token_encrypted": bot_record.token_encrypted.hex(),
            "schema_id": str(bot_record.active_schema_id),
        })
    )

    # 6. Обновляем статус в БД
    await bot_service.update_status(bot_id, status="running", username=me.username)

    return {"status": "running", "username": me.username}
```

### 6.2 Endpoint: остановка бота

```python
@router.post("/api/bots/{bot_id}/stop")
async def stop_bot(bot_id: UUID, user: User = Depends(get_current_user)):
    bot_record = await bot_service.get_bot(bot_id, user.id)
    token = decrypt_token(bot_record.token_encrypted)

    # 1. Удаляем webhook в Telegram
    async with Bot(token=token) as tmp_bot:
        await tmp_bot.delete_webhook()

    # 2. Очищаем кэш
    await redis.delete(f"bot:{bot_record.token_hash}")
    bot_registry.pop(bot_record.token_hash, None)

    # 3. Обновляем статус
    await bot_service.update_status(bot_id, status="stopped")

    return {"status": "stopped"}
```

---

## 7. Безопасность токенов

**Проблема:** Bot-токены — это ключи доступа к чужим ботам. Утечка = полный контроль.

### Решение: двойная защита

```
token (от пользователя)
   │
   ├──► SHA-256 → token_hash (32 символа)
   │    Используется для роутинга webhook-ов в URL
   │    НЕ позволяет восстановить оригинальный токен
   │
   └──► AES-256-GCM → token_encrypted (в БД)
        Шифруется серверным ключом (env: ENCRYPTION_KEY)
        Расшифровывается только в рантайме для API-вызовов к Telegram
```

**Почему не хэш в URL как у aiogram?**
Документация aiogram **явно предупреждает**: `TokenBasedRequestHandler` не рекомендуется, т.к. токен в URL логируется reverse proxy. Мы используем SHA-256 хэш — даже если URL залогирован, восстановить токен невозможно.

**Дополнительно:** Telegram поддерживает `secret_token` при установке webhook — FastAPI проверяет заголовок `X-Telegram-Bot-Api-Secret-Token` в каждом входящем запросе.

---

## 8. Состояние подписчиков (Redis)

### Структура ключей

```
# FSM-состояние (в каком узле графа находится подписчик)
bot:{token_hash}:user:{user_id}:state
  → {"current_node": "node_3", "variables": {"name": "Иван", "cart": []}}

# Кэш схемы бота (чтобы не ходить в PostgreSQL на каждый update)
bot:{token_hash}:schema
  → {полный JSON-граф}

# Метаданные бота для роутинга
bot:{token_hash}
  → {"bot_id": "...", "token_encrypted": "...", "schema_id": "..."}
```

### TTL-политика

| Ключ | TTL | Причина |
|---|---|---|
| `state` | 24 часа | Неактивные диалоги очищаются |
| `schema` | 1 час | Перечитывается из PostgreSQL при обновлении |
| `bot:*` метаданные | 24 часа | Обновляется при каждом входящем update |

### Почему Redis, а не FSM aiogram напрямую

aiogram имеет `RedisStorage`, но его FSM заточен под `StorageKey(bot_id, chat_id, user_id)`. Для мультитенантного сценария нам нужен **свой слой абстракции** поверх Redis:
- Один `Dispatcher` обслуживает все боты
- Состояние привязано к `token_hash + user_id`, а не к глобальному `bot_id`
- Нужны кастомные TTL и обработка «засыпания» ботов

---

## 9. Фронтенд: React Flow — кастомные ноды

### 9.1 Паттерн кастомной ноды (по документации React Flow)

```tsx
// nodes/TextNode.tsx
import { memo } from 'react';
import { Handle, Position, NodeToolbar, type NodeProps, type Node } from '@xyflow/react';

type TextNodeData = {
  label: string;
  text: string;
  parse_mode: 'HTML' | 'Markdown';
};

type TextNodeType = Node<TextNodeData, 'text'>;

const TextNode = memo(({ data, selected }: NodeProps<TextNodeType>) => {
  return (
    <>
      {/* Тулбар — появляется при выделении */}
      <NodeToolbar isVisible={selected}>
        <button>Дублировать</button>
        <button>Удалить</button>
      </NodeToolbar>

      {/* Входной порт */}
      <Handle type="target" position={Position.Top} />

      {/* Тело блока */}
      <div className="rounded-lg border bg-white p-3 shadow-sm min-w-[200px]">
        <div className="text-xs font-medium text-blue-600 mb-1">💬 Текст</div>
        <div className="text-sm text-gray-700 line-clamp-3">
          {data.text || 'Пустой текст...'}
        </div>
      </div>

      {/* Выходной порт */}
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

export default TextNode;
```

### 9.2 Регистрация типов нод

```tsx
// nodes/index.ts
import StartNode from './StartNode';
import TextNode from './TextNode';
import ButtonsNode from './ButtonsNode';
import ConditionNode from './ConditionNode';
import InputNode from './InputNode';
import DelayNode from './DelayNode';
import PaymentNode from './PaymentNode';
import GptNode from './GptNode';
import WebhookNode from './WebhookNode';
import VariableNode from './VariableNode';

export const nodeTypes = {
  start: StartNode,
  text: TextNode,
  buttons: ButtonsNode,
  condition: ConditionNode,
  input: InputNode,
  delay: DelayNode,
  payment: PaymentNode,
  gpt: GptNode,
  webhook: WebhookNode,
  variable: VariableNode,
} as const;
```

### 9.3 Сохранение/загрузка схемы

```tsx
// Сохранение — React Flow → JSON → API
const { toObject } = useReactFlow();

const saveSchema = async () => {
  const flow = toObject(); // {nodes, edges, viewport}
  await api.put(`/api/bots/${botId}/schema`, { schema_json: flow });
};

// Загрузка — API → JSON → React Flow
const loadSchema = async () => {
  const { schema_json } = await api.get(`/api/bots/${botId}/schema`);
  setNodes(schema_json.nodes);
  setEdges(schema_json.edges);
  setViewport(schema_json.viewport);
};
```

### 9.4 Перформанс (по best practices React Flow)

1. **`memo()` на каждой ноде** — обязательно, предотвращает ре-рендер при изменении соседних нод
2. **`useStore` с селекторами** — не подписываемся на весь стор, только на нужные поля
3. **`className="nodrag"` на инпутах** — чтобы ноды оставались перетаскиваемыми
4. **Скрытие дальних нод** — `node.hidden = true` для свёрнутых поддеревьев
5. **Простые CSS-стили** — избегаем анимаций, теней, градиентов на нодах при большом графе

---

## 10. Эмулятор Telegram (Live Preview)

### Как работает

```
┌────────────────┐         WebSocket          ┌──────────────┐
│  PhoneFrame    │ ◄───────────────────────── │  FastAPI WS  │
│  (React)       │                             │  /ws/preview │
│                │  { type: "message",         │              │
│  Рисует чат    │    text: "Привет!",         │  Интерпрети- │
│  как в TG      │    buttons: [...] }         │  рует граф   │
│                │ ──────────────────────────► │  локально    │
│                │  { type: "user_input",       │  (без Telegram│
│                │    text: "/start" }          │   API)       │
└────────────────┘                             └──────────────┘
```

Эмулятор **не использует Telegram API** — он прогоняет граф через тот же `GraphInterpreter`, но вместо `bot.send_message()` отправляет данные по WebSocket обратно в браузер. Это позволяет тестировать бота без токена и без деплоя.

---

## 11. AI-агент для построения схем (Tool-Calling Architecture)

> Вдохновлено паттернами из проекта AgiWork (outllokai):
> `@tool` registry, multi-turn executor loop, SSE streaming, anti-loop detection.

### 11.1 Почему агент с инструментами, а не one-shot генерация

**Проблема one-shot подхода:** LLM генерирует весь JSON-граф за один вызов.
- Сложные схемы (15+ нод) → ошибки в JSON, невалидные связи, дубли ID
- Нет возможности итерации — либо всё хорошо, либо переделывай целиком
- Пользователь не видит процесс — ждёт 10-20 секунд, потом всё появляется разом

**Решение: AI-агент с инструментами (tool-calling loop).**
LLM пошагово строит граф, вызывая инструменты. Каждый шаг валидируется.
Блоки появляются на холсте в реальном времени через SSE.

```
Пользователь: "Бот для записи в барбершоп с выбором мастера и оплатой"
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────┐
│                    AI Agent Executor                          │
│                                                              │
│  Итерация 1: add_node(type="start", triggers=["/start"])    │
│  Итерация 2: add_node(type="text", text="Добро пожаловать") │
│  Итерация 3: connect_nodes("node_1", "node_2")              │
│  Итерация 4: add_node(type="buttons", buttons=[             │
│                  {text:"Мастер Алексей"}, {text:"Мастер Иван"}│
│              ])                                               │
│  Итерация 5: connect_nodes("node_2", "node_3")              │
│  ...                                                          │
│  Итерация N: validate_schema() → ✓ OK                        │
│  → финальный текстовый ответ пользователю                    │
└──────────────────────────────────────────────────────────────┘
                    │ SSE stream
                    ▼
          React Flow холст
     (блоки появляются по одному
      с анимацией, как будто
      кто-то рисует на доске)
```

### 11.2 Архитектура агента

```
backend/app/
├── agent/
│   ├── executor.py          # AgentExecutor — главный цикл
│   ├── tools/
│   │   ├── _registry.py     # TOOL_REGISTRY + @tool декоратор
│   │   ├── graph_tools.py   # Инструменты для работы с графом
│   │   ├── template_tools.py# Работа с шаблонами
│   │   └── info_tools.py    # Информационные инструменты
│   ├── prompts/
│   │   ├── system.py        # Системный промпт агента
│   │   └── examples.py      # Few-shot примеры вызовов инструментов
│   └── safety.py            # Anti-loop, лимиты итераций
```

### 11.3 Tool Registry (паттерн из AgiWork)

```python
# agent/tools/_registry.py

from typing import Callable, Any
from dataclasses import dataclass, field

@dataclass
class AgentTool:
    name: str
    description: str
    parameters: dict          # JSON Schema
    handler: Callable
    is_write: bool = False    # Модифицирует граф?

TOOL_REGISTRY: dict[str, AgentTool] = {}

def tool(
    name: str,
    description: str,
    parameters: dict,
    is_write: bool = False,
):
    """Декоратор для регистрации инструмента агента."""
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
```

### 11.4 Инструменты агента (graph_tools.py)

```python
# agent/tools/graph_tools.py

from ._registry import tool

@tool(
    name="add_node",
    description="Добавить блок на холст конструктора бота",
    parameters={
        "type": "object",
        "properties": {
            "type": {
                "type": "string",
                "enum": ["start", "text", "buttons", "condition", "input",
                         "delay", "payment", "gpt", "webhook", "variable"],
                "description": "Тип блока"
            },
            "data": {
                "type": "object",
                "description": "Настройки блока (зависят от типа)"
            },
            "position_after": {
                "type": "string",
                "description": "ID ноды, после которой расположить новую (авто-layout)"
            },
        },
        "required": ["type", "data"],
    },
    is_write=True,
)
async def add_node(schema: dict, type: str, data: dict,
                   position_after: str | None = None) -> dict:
    """
    Добавляет ноду в граф.
    Авто-вычисляет position на основе position_after.
    Возвращает {node_id, position} для последующих connect_nodes.
    """
    node_id = f"node_{len(schema['nodes']) + 1}"

    # Авто-позиционирование (сетка 250x150)
    if position_after and position_after in {n["id"] for n in schema["nodes"]}:
        ref = next(n for n in schema["nodes"] if n["id"] == position_after)
        position = {"x": ref["position"]["x"], "y": ref["position"]["y"] + 150}
    else:
        position = {"x": 100, "y": len(schema["nodes"]) * 150 + 50}

    node = {
        "id": node_id,
        "type": type,
        "position": position,
        "data": {"label": data.get("label", type.capitalize()), **data},
    }
    schema["nodes"].append(node)

    return {"node_id": node_id, "position": position, "status": "created"}


@tool(
    name="connect_nodes",
    description="Соединить два блока линией (создать ребро в графе)",
    parameters={
        "type": "object",
        "properties": {
            "source_id": {"type": "string", "description": "ID блока-источника"},
            "target_id": {"type": "string", "description": "ID блока-цели"},
            "source_handle": {
                "type": "string",
                "description": "ID выхода (для кнопок/условий). None = основной выход"
            },
        },
        "required": ["source_id", "target_id"],
    },
    is_write=True,
)
async def connect_nodes(schema: dict, source_id: str, target_id: str,
                        source_handle: str | None = None) -> dict:
    """Создаёт ребро между двумя нодами. Валидирует существование нод."""
    node_ids = {n["id"] for n in schema["nodes"]}
    if source_id not in node_ids:
        return {"error": f"Нода {source_id} не найдена. Существующие: {node_ids}"}
    if target_id not in node_ids:
        return {"error": f"Нода {target_id} не найдена. Существующие: {node_ids}"}

    edge_id = f"e_{source_id}_{target_id}"
    edge = {"id": edge_id, "source": source_id, "target": target_id}
    if source_handle:
        edge["sourceHandle"] = source_handle

    schema["edges"].append(edge)
    return {"edge_id": edge_id, "status": "connected"}


@tool(
    name="update_node",
    description="Обновить настройки существующего блока",
    parameters={
        "type": "object",
        "properties": {
            "node_id": {"type": "string", "description": "ID блока"},
            "data": {"type": "object", "description": "Новые настройки (merge с текущими)"},
        },
        "required": ["node_id", "data"],
    },
    is_write=True,
)
async def update_node(schema: dict, node_id: str, data: dict) -> dict:
    """Обновляет data ноды через merge."""
    for node in schema["nodes"]:
        if node["id"] == node_id:
            node["data"].update(data)
            return {"node_id": node_id, "status": "updated", "data": node["data"]}
    return {"error": f"Нода {node_id} не найдена"}


@tool(
    name="delete_node",
    description="Удалить блок и все его связи",
    parameters={
        "type": "object",
        "properties": {
            "node_id": {"type": "string", "description": "ID блока для удаления"},
        },
        "required": ["node_id"],
    },
    is_write=True,
)
async def delete_node(schema: dict, node_id: str) -> dict:
    """Удаляет ноду и все рёбра, связанные с ней."""
    schema["nodes"] = [n for n in schema["nodes"] if n["id"] != node_id]
    removed_edges = [e["id"] for e in schema["edges"]
                     if e["source"] == node_id or e["target"] == node_id]
    schema["edges"] = [e for e in schema["edges"]
                       if e["source"] != node_id and e["target"] != node_id]
    return {"status": "deleted", "removed_edges": removed_edges}


@tool(
    name="get_current_schema",
    description="Получить текущую схему бота (все блоки и связи)",
    parameters={"type": "object", "properties": {}},
    is_write=False,
)
async def get_current_schema(schema: dict) -> dict:
    """Возвращает текущее состояние графа для ориентации агента."""
    return {
        "nodes_count": len(schema["nodes"]),
        "edges_count": len(schema["edges"]),
        "nodes": [{"id": n["id"], "type": n["type"], "label": n["data"].get("label")}
                  for n in schema["nodes"]],
        "edges": [{"source": e["source"], "target": e["target"],
                   "handle": e.get("sourceHandle")}
                  for e in schema["edges"]],
    }


@tool(
    name="validate_schema",
    description="Валидировать схему: проверить связность, наличие старта, отсутствие висящих нод",
    parameters={"type": "object", "properties": {}},
    is_write=False,
)
async def validate_schema(schema: dict) -> dict:
    """
    Проверяет:
    1. Есть хотя бы один start-нод
    2. Все ноды достижимы из start
    3. Нет рёбер в несуществующие ноды
    4. У condition-нод есть оба выхода (true/false)
    5. У buttons-нод все кнопки имеют рёбра
    """
    errors = []
    warnings = []
    node_ids = {n["id"] for n in schema["nodes"]}

    # Проверка 1: start
    starts = [n for n in schema["nodes"] if n["type"] == "start"]
    if not starts:
        errors.append("Нет стартового блока. Добавьте блок типа 'start'.")

    # Проверка 2: висячие рёбра
    for edge in schema["edges"]:
        if edge["source"] not in node_ids:
            errors.append(f"Ребро {edge['id']}: источник {edge['source']} не существует")
        if edge["target"] not in node_ids:
            errors.append(f"Ребро {edge['id']}: цель {edge['target']} не существует")

    # Проверка 3: достижимость (BFS)
    if starts:
        reachable = set()
        queue = [s["id"] for s in starts]
        while queue:
            current = queue.pop(0)
            if current in reachable:
                continue
            reachable.add(current)
            for edge in schema["edges"]:
                if edge["source"] == current and edge["target"] not in reachable:
                    queue.append(edge["target"])
        unreachable = node_ids - reachable
        if unreachable:
            warnings.append(f"Недостижимые блоки: {unreachable}. Соедините их или удалите.")

    # Проверка 4: condition без обоих выходов
    for node in schema["nodes"]:
        if node["type"] == "condition":
            handles = {e.get("sourceHandle") for e in schema["edges"]
                       if e["source"] == node["id"]}
            if "handle_yes" not in handles:
                warnings.append(f"Условие '{node['data'].get('label')}': нет выхода 'Да'")
            if "handle_no" not in handles:
                warnings.append(f"Условие '{node['data'].get('label')}': нет выхода 'Нет'")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
    }


@tool(
    name="apply_template",
    description="Загрузить готовый шаблон бота (барбершоп, доставка, онлайн-школа и т.д.)",
    parameters={
        "type": "object",
        "properties": {
            "template_name": {
                "type": "string",
                "enum": ["barbershop", "delivery", "online_school", "support",
                         "lead_funnel", "quiz", "appointment"],
                "description": "Название шаблона"
            },
        },
        "required": ["template_name"],
    },
    is_write=True,
)
async def apply_template(schema: dict, template_name: str) -> dict:
    """Загружает предустановленный шаблон. Агент может дальше модифицировать."""
    template = await load_template(template_name)  # из БД или JSON-файлов
    schema["nodes"] = template["nodes"]
    schema["edges"] = template["edges"]
    return {
        "status": "template_applied",
        "template": template_name,
        "nodes_count": len(template["nodes"]),
        "edges_count": len(template["edges"]),
    }


@tool(
    name="auto_layout",
    description="Автоматически расположить блоки (выровнять в дерево сверху вниз)",
    parameters={"type": "object", "properties": {}},
    is_write=True,
)
async def auto_layout(schema: dict) -> dict:
    """Dagre-подобный layout: BFS от start, уровни по 150px."""
    # Определяем уровни через BFS
    starts = [n["id"] for n in schema["nodes"] if n["type"] == "start"]
    if not starts:
        return {"error": "Нет стартового блока для layout"}

    levels = {}
    queue = [(s, 0) for s in starts]
    while queue:
        node_id, level = queue.pop(0)
        if node_id in levels:
            continue
        levels[node_id] = level
        for edge in schema["edges"]:
            if edge["source"] == node_id:
                queue.append((edge["target"], level + 1))

    # Группируем по уровням
    by_level = {}
    for node_id, level in levels.items():
        by_level.setdefault(level, []).append(node_id)

    # Расставляем позиции
    for level, node_ids in by_level.items():
        for i, node_id in enumerate(node_ids):
            for node in schema["nodes"]:
                if node["id"] == node_id:
                    node["position"] = {
                        "x": i * 280 + 100,
                        "y": level * 180 + 50,
                    }

    return {"status": "layout_applied", "levels": len(by_level)}
```

### 11.5 Agent Executor (цикл tool-calling)

```python
# agent/executor.py

import json
from anthropic import AsyncAnthropic
from .tools._registry import TOOL_REGISTRY

MAX_ITERATIONS = 25          # макс шагов агента
MAX_CALLS_PER_TOOL = 10     # макс вызовов одного инструмента

class AgentExecutor:
    """
    Multi-turn tool-calling loop.
    Паттерн из AgiWork: LLM вызывает инструменты итеративно,
    пока не сгенерирует текстовый ответ.
    """

    def __init__(self, anthropic_client: AsyncAnthropic, schema: dict):
        self.client = anthropic_client
        self.schema = schema  # Мутабельный граф — инструменты меняют его in-place
        self.messages = []
        self.tool_call_counts = {}  # anti-loop: считаем вызовы

    async def run(self, user_prompt: str, on_event=None):
        """
        Запускает агента. on_event — callback для SSE-стриминга.

        on_event({
            "type": "tool_start", "tool": "add_node",
            "args": {"type": "text", ...}
        })
        on_event({
            "type": "tool_done", "tool": "add_node",
            "result": {"node_id": "node_1", ...}
        })
        on_event({
            "type": "schema_update",
            "schema": {текущий граф}   ← фронт обновляет React Flow
        })
        """
        self.messages = [{"role": "user", "content": user_prompt}]

        tools_for_llm = [
            {
                "name": t.name,
                "description": t.description,
                "input_schema": t.parameters,
            }
            for t in TOOL_REGISTRY.values()
        ]

        for iteration in range(MAX_ITERATIONS):
            # 1. Вызов LLM
            response = await self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=self.messages,
                tools=tools_for_llm,
            )

            # 2. Если LLM ответил текстом — конец цикла
            if response.stop_reason == "end_turn":
                text = "".join(
                    b.text for b in response.content if b.type == "text"
                )
                if on_event:
                    await on_event({"type": "done", "text": text})
                return {"text": text, "schema": self.schema}

            # 3. Обработка tool_use блоков
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    tool_name = block.name
                    tool_input = block.input

                    # Anti-loop: проверяем лимит вызовов
                    self.tool_call_counts[tool_name] = \
                        self.tool_call_counts.get(tool_name, 0) + 1
                    if self.tool_call_counts[tool_name] > MAX_CALLS_PER_TOOL:
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps({
                                "error": f"Лимит вызовов {tool_name} ({MAX_CALLS_PER_TOOL}) "
                                         f"исчерпан. Используй другой подход."
                            }),
                        })
                        continue

                    # SSE: начало выполнения инструмента
                    if on_event:
                        await on_event({
                            "type": "tool_start",
                            "tool": tool_name,
                            "args": tool_input,
                            "iteration": iteration + 1,
                        })

                    # Выполняем инструмент
                    handler = TOOL_REGISTRY[tool_name].handler
                    result = await handler(schema=self.schema, **tool_input)

                    # SSE: результат + обновлённая схема
                    if on_event:
                        await on_event({"type": "tool_done", "tool": tool_name, "result": result})
                        if TOOL_REGISTRY[tool_name].is_write:
                            await on_event({"type": "schema_update", "schema": self.schema})

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result, ensure_ascii=False),
                    })

            # 4. Добавляем assistant response + tool results в историю
            self.messages.append({"role": "assistant", "content": response.content})
            self.messages.append({"role": "user", "content": tool_results})

        # Если вышли из цикла — слишком много итераций
        return {"text": "Схема построена (достигнут лимит итераций).", "schema": self.schema}
```

### 11.6 SSE Streaming (фронтенд видит процесс в реальном времени)

```python
# api/ai.py

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

router = APIRouter()

@router.post("/api/ai/generate-stream")
async def generate_schema_stream(
    request: GenerateRequest,
    user: User = Depends(get_current_user),
):
    """
    SSE-эндпоинт: агент строит схему, фронтенд получает события.
    Блоки появляются на холсте один за другим.
    """
    await limits.check_ai_quota(user)

    # Начинаем с пустой или существующей схемы
    schema = request.existing_schema or {"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}

    executor = AgentExecutor(
        anthropic_client=anthropic_client,
        schema=schema,
    )

    async def event_generator():
        async def on_event(event: dict):
            yield {"event": event["type"], "data": json.dumps(event, ensure_ascii=False)}

        result = await executor.run(
            user_prompt=request.prompt,
            on_event=on_event,
        )

        # Финальная схема
        yield {
            "event": "complete",
            "data": json.dumps({"schema": result["schema"]}, ensure_ascii=False),
        }

    return EventSourceResponse(event_generator())
```

### 11.7 Фронтенд: SSE → React Flow (блоки появляются в реальном времени)

```tsx
// components/editor/AiBuilder.tsx

const useAiBuilder = (botId: string) => {
  const { setNodes, setEdges } = useReactFlow();

  const generate = async (prompt: string) => {
    const eventSource = new EventSource(`/api/ai/generate-stream`, {
      // POST через fetch + ReadableStream (SSE-стриминг)
    });

    // Фронтенд слушает события от агента
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const events = parseSSE(decoder.decode(value));
      for (const event of events) {
        switch (event.type) {
          case "tool_start":
            // Показываем: "AI добавляет блок «Текст»..."
            showProgress(`Шаг ${event.iteration}: ${event.tool}...`);
            break;

          case "schema_update":
            // Обновляем React Flow холст — блоки появляются один за одним
            setNodes(event.schema.nodes);
            setEdges(event.schema.edges);
            // Анимация: новая нода появляется с fade-in
            break;

          case "done":
            // Агент закончил — показываем его текстовый ответ
            showMessage(event.text);
            break;
        }
      }
    }
  };

  return { generate };
};
```

### 11.8 Системный промпт агента

```python
# agent/prompts/system.py

SYSTEM_PROMPT = """
Ты — AI-ассистент конструктора Telegram-ботов BotForge.
Твоя задача — строить схемы ботов, используя инструменты.

## Правила

1. ВСЕГДА начинай с блока "start" с триггером /start
2. Строй схему ПОШАГОВО: сначала add_node, потом connect_nodes
3. После каждой группы из 3-5 нод вызывай validate_schema для проверки
4. Используй auto_layout в конце для красивого расположения
5. Если пользователь описывает бота кратко — сам додумай логичную структуру
6. Тексты пиши на русском, дружелюбно
7. Для ветвления (выбор из нескольких вариантов) используй buttons
8. Для проверки условий (подписка, оплата) используй condition
9. Если описание подходит под шаблон — предложи apply_template, потом модифицируй

## Типы блоков и когда использовать

- start:     Точка входа. Триггер: команда (/start, /help) или текст
- text:      Отправить сообщение. Поддержка переменных: {name}, {phone}
- buttons:   Инлайн-кнопки с ветвлением. Каждая кнопка = отдельный выход
- condition:  Ветвление по условию (переменная == значение)
- input:     Ожидание ввода от пользователя → сохранение в переменную
- delay:     Задержка перед следующим блоком (секунды/минуты)
- payment:   Приём оплаты (ЮKassa / Telegram Stars)
- gpt:       Ответ через GPT (нужен API-ключ пользователя)
- webhook:   Отправка/получение данных по HTTP
- variable:  Установить/изменить переменную

## Пример хорошего построения

Запрос: "Бот для пиццерии с выбором пиццы и доставкой"

Вызовы:
1. add_node(type="start", data={label:"Старт", triggers:["command:/start"]})
2. add_node(type="text", data={label:"Приветствие", text:"Привет! Закажи пиццу 🍕"})
3. connect_nodes(source_id="node_1", target_id="node_2")
4. add_node(type="buttons", data={label:"Выбор пиццы", text:"Что будете?",
     buttons:[{text:"Маргарита",output_handle:"pizza_1"},
              {text:"Пепперони",output_handle:"pizza_2"}]})
5. connect_nodes(source_id="node_2", target_id="node_3")
6. add_node(type="input", data={label:"Адрес", text:"Введите адрес доставки:",
     variable:"address"})
7. connect_nodes(source_id="node_3", target_id="node_4", source_handle="pizza_1")
8. connect_nodes(source_id="node_3", target_id="node_4", source_handle="pizza_2")
9. add_node(type="payment", data={label:"Оплата", amount:599, currency:"RUB"})
10. connect_nodes(source_id="node_4", target_id="node_5")
11. add_node(type="text", data={label:"Готово", text:"Спасибо! Доставим по адресу {address}"})
12. connect_nodes(source_id="node_5", target_id="node_6")
13. auto_layout()
14. validate_schema()
"""
```

### 11.9 Режимы работы AI-агента

| Режим | Описание | Триггер |
|---|---|---|
| **Генерация с нуля** | Пустой холст → агент строит всю схему | Кнопка "AI: Создать бота" + текстовое описание |
| **Доработка** | Есть схема → агент модифицирует | Кнопка "AI: Доработать" + описание изменений |
| **Из шаблона** | Агент берёт шаблон + адаптирует под описание | Выбор шаблона + "Настроить под мой бизнес" |
| **Чат с агентом** | Диалог: "Добавь блок оплаты после выбора" | Чат-окно рядом с холстом |

### 11.10 Anti-loop и безопасность (паттерн GRACE из AgiWork)

```python
# agent/safety.py

class SafetyGuard:
    """
    Защита от зацикливания и злоупотреблений.
    Вдохновлено GRACE belief log из AgiWork.
    """

    def __init__(self):
        self.call_log = []       # история вызовов
        self.consecutive_errors = 0

    def check_before_call(self, tool_name: str, args: dict) -> str | None:
        """Возвращает None если ОК, или текст ошибки."""

        # 1. Лимит вызовов одного инструмента
        same_tool_count = sum(1 for c in self.call_log if c["tool"] == tool_name)
        if same_tool_count >= 10:
            return f"Инструмент {tool_name} вызван {same_tool_count} раз. Лимит исчерпан."

        # 2. Детекция повторяющихся вызовов (одинаковые аргументы)
        last_3 = [c for c in self.call_log[-3:] if c["tool"] == tool_name]
        if len(last_3) >= 2 and all(c["args"] == args for c in last_3):
            return f"Обнаружен цикл: {tool_name} с теми же аргументами 3 раза подряд."

        # 3. Слишком много ошибок подряд
        if self.consecutive_errors >= 5:
            return "5 ошибок подряд. Вызови get_current_schema() и пересмотри подход."

        return None

    def log_call(self, tool_name: str, args: dict, success: bool):
        self.call_log.append({"tool": tool_name, "args": args, "success": success})
        if success:
            self.consecutive_errors = 0
        else:
            self.consecutive_errors += 1
```

### 11.11 Обновлённая структура проекта (agent/)

```
backend/app/agent/
├── executor.py              # AgentExecutor — multi-turn loop
├── tools/
│   ├── __init__.py
│   ├── _registry.py         # @tool декоратор + TOOL_REGISTRY
│   ├── graph_tools.py       # add_node, connect_nodes, delete_node, update_node
│   ├── query_tools.py       # get_current_schema, validate_schema
│   ├── layout_tools.py      # auto_layout
│   └── template_tools.py    # apply_template
├── prompts/
│   ├── system.py            # Системный промпт
│   └── examples.py          # Few-shot примеры tool-calling
└── safety.py                # Anti-loop, лимиты, GRACE-лог
```

---

## 12. Тарифные планы и лимиты

| | Free | Starter (299₽/мес) | Pro (999₽/мес) |
|---|---|---|---|
| Ботов | 1 | 3 | 10 |
| Подписчиков / бот | 100 | 1 000 | Безлимит |
| Блоки | Все | Все | Все |
| Засыпание | 48ч неактивности | Нет | Нет |
| AI-генерация | 3 раза / мес | 30 раз / мес | Безлимит |
| Экспорт в код | — | ✓ | ✓ |
| GPT-блок | — | ✓ (свой ключ) | ✓ (свой ключ) |
| Брендинг BotForge | В сообщениях бота | Убирается | Убирается |
| Приоритет обработки | Низкий | Средний | Высокий |

### Засыпание бота (free-тариф)

Cron-задача каждый час проверяет: если бот не получал updates 48 часов → `deleteWebhook()` + статус `sleeping`. Пользователь видит: "Ваш бот уснул. Нажмите Запустить или перейдите на Starter."

---

## 13. API-эндпоинты (сводка)

### Аутентификация
| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Логин → JWT |
| GET | `/api/auth/me` | Текущий пользователь |

### Боты
| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/bots` | Список ботов пользователя |
| POST | `/api/bots` | Создать бота (name + token) |
| DELETE | `/api/bots/{id}` | Удалить бота |
| POST | `/api/bots/{id}/start` | Запустить (setWebhook) |
| POST | `/api/bots/{id}/stop` | Остановить (deleteWebhook) |
| GET | `/api/bots/{id}/stats` | Статистика |

### Схемы
| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/bots/{id}/schema` | Получить текущую схему |
| PUT | `/api/bots/{id}/schema` | Сохранить схему |
| POST | `/api/bots/{id}/schema/validate` | Валидировать граф |
| POST | `/api/bots/{id}/export` | Экспорт в aiogram 3 код |

### AI-агент
| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/ai/generate-stream` | SSE: агент пошагово строит схему (блоки появляются в реальном времени) |
| POST | `/api/ai/modify-stream` | SSE: агент модифицирует существующую схему |
| POST | `/api/ai/chat` | Диалог с агентом о текущей схеме (без SSE, обычный JSON) |

### Webhook
| Метод | Путь | Описание |
|---|---|---|
| POST | `/webhook/{token_hash}` | Приём updates от Telegram |

### WebSocket
| Путь | Описание |
|---|---|
| `/ws/preview/{bot_id}` | Live-превью в эмулятор |

### SSE (Server-Sent Events)
| Путь | Описание |
|---|---|
| `/api/ai/generate-stream` | Стриминг: агент строит схему, фронтенд видит tool_start → schema_update → done |
| `/api/ai/modify-stream` | Стриминг: агент модифицирует существующую схему |

---

## 14. Docker Compose (production)

```yaml
version: "3.9"

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./certbot/conf:/etc/letsencrypt
    depends_on:
      - backend
      - frontend

  frontend:
    build: ./frontend
    # Nginx проксирует / → frontend:3000

  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    environment:
      - DATABASE_URL=postgresql+asyncpg://botforge:${DB_PASSWORD}@postgres:5432/botforge
      - REDIS_URL=redis://redis:6379/0
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
      - BASE_URL=https://botforge.ru
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=botforge
      - POSTGRES_USER=botforge
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    command: redis-server --appendonly yes

volumes:
  pgdata:
  redisdata:
```

---

## 15. Масштабирование по этапам

### Этап 1: MVP (до 100 ботов)
- Один сервер (VPS 4 CPU / 8 GB RAM)
- Docker Compose
- 4 uvicorn workers
- PostgreSQL + Redis на том же сервере

### Этап 2: Рост (100–1000 ботов)
- Выделенный сервер для PostgreSQL
- Redis Sentinel для отказоустойчивости
- 2 backend-инстанса за Nginx
- Мониторинг: Prometheus + Grafana

### Этап 3: Масштаб (1000+ ботов)
- Kubernetes (managed: Yandex Cloud / Selectel)
- PostgreSQL managed (Yandex MDB)
- Redis Cluster
- Горизонтальное масштабирование workers
- CDN для фронтенда

---

## 16. Порядок разработки

### Фаза 1 — Ядро (2–3 недели)
1. Backend: FastAPI scaffold, модели, миграции
2. Engine: GraphInterpreter + блоки text, buttons, start
3. API: webhook endpoint + запуск/остановка бота
4. Базовый тест: ввёл токен → бот отвечает по графу

### Фаза 2 — Редактор (2–3 недели)
5. Frontend: React Flow + кастомные ноды
6. Сохранение/загрузка схем через API
7. Панель свойств блока
8. Все типы блоков: condition, input, delay, variable

### Фаза 3 — Превью + AI (1–2 недели)
9. TG-эмулятор (WebSocket)
10. AI-генератор схем (Claude API)

### Фаза 4 — Продакшен (1–2 недели)
11. Авторизация, тарифы, лимиты
12. Payment-блок (ЮKassa / Telegram Stars)
13. Docker Compose, Nginx, SSL
14. Деплой

### Фаза 5 — Рост
15. Шаблоны ботов
16. Экспорт в aiogram 3 код
17. GPT-блок
18. Аналитика
