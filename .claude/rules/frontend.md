---
paths:
  - "frontend/**/*.{ts,tsx}"
---

# Frontend Rules

## React Flow
- ВСЕГДА `memo()` на кастомных нодах — без этого каждая нода ре-рендерится при изменении любой другой
- `Handle` с уникальными `id` для множественных выходов (кнопки, условия)
- `nodeTypes` объект определён за пределами компонента (в index.ts)
- Сериализация: `toObject()` → JSON → API
- `className="nodrag"` на интерактивных элементах внутри нод

## Zustand
- Отдельные stores: `editorStore`, `botStore`, `authStore`
- Селекторы: `useEditorStore(s => s.nodes)` — не `useEditorStore()`
- `persist` middleware только для authStore (localStorage)

## Стили
- Tailwind utility classes, тёмная тема по умолчанию (bg-gray-950)
- `.bot-node` — базовый класс для всех нод (в index.css)
- `.input-field` — единый стиль инпутов
- Цвета нод: каждый тип = свой цвет (green=start, blue=text, purple=buttons...)

## API Client
- `client.ts`: централизованный fetch с JWT из authStore
- 401 → автоматический logout
- SSE через `ReadableStream` + `TextDecoder`
