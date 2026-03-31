import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { openrouterApi, knowledgeApi, type OpenRouterModel } from '@/api/client';
import type { ButtonItem, InputConfig, RandomBranch, NotifyNodeData } from '@/types/nodes';

export default function PropertiesPanel() {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const nodes = useEditorStore((s) => s.nodes);
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);

  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <div className="w-72 bg-gray-900 border-l border-gray-800 p-4 flex items-center justify-center">
        <p className="text-gray-500 text-sm text-center">
          Выберите блок для редактирования
        </p>
      </div>
    );
  }

  const data = node.data as Record<string, unknown>;

  const handleChange = (key: string, value: unknown) => {
    updateNodeData(node.id, { [key]: value });
  };

  const isMessage = node.type === 'message' || node.type === 'start' || node.type === 'text' || node.type === 'buttons' || node.type === 'input';

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-200 truncate max-w-[140px]">
          {String(data.label || node.type)}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => duplicateNode(node.id)}
            className="text-xs text-gray-400 hover:text-gray-200 px-1"
            title="Дублировать (Ctrl+D)"
          >
            ⧉
          </button>
          <button
            onClick={() => deleteNode(node.id)}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Удалить
          </button>
        </div>
      </div>

      <FlowHint type={node.type} />

      <div className="space-y-3">
        {/* Label */}
        <Field label="Название" tooltip="Имя блока на холсте. Не влияет на работу бота — только для вашего удобства.">
          <input
            type="text"
            value={String(data.label || '')}
            onChange={(e) => handleChange('label', e.target.value)}
            className="input-field"
          />
        </Field>

        {/* ============ MESSAGE NODE ============ */}
        {isMessage && (
          <>
            <Field label="Текст сообщения" tooltip="Текст, который бот отправит пользователю. Поддерживает переменные в фигурных скобках: {name}, {phone}. HTML-теги: <b>жирный</b>, <i>курсив</i>, <a>ссылка</a>.">
              <textarea
                value={String(data.text || '')}
                onChange={(e) => handleChange('text', e.target.value)}
                className="input-field min-h-[80px] resize-y"
                rows={3}
                placeholder="Привет! Добро пожаловать..."
              />
            </Field>

            <Field label="Формат" tooltip="HTML — теги <b>, <i>, <a href>. Markdown — *жирный*, _курсив_, [ссылка](url). Если не уверены — оставьте HTML.">
              <select
                value={String(data.parse_mode || 'HTML')}
                onChange={(e) => handleChange('parse_mode', e.target.value)}
                className="input-field"
              >
                <option value="HTML">HTML</option>
                <option value="Markdown">Markdown</option>
              </select>
            </Field>

            {/* Triggers toggle */}
            <Toggle
              label="Точка входа (старт)"
              tooltip="Делает блок стартовым. Бот начнёт выполнение с этого блока, когда пользователь отправит указанную команду или текст."
              active={Array.isArray(data.triggers) && (data.triggers as string[]).length > 0}
              onToggle={(on) => handleChange('triggers', on ? ['command:/start'] : undefined)}
            />
            {Array.isArray(data.triggers) && (data.triggers as string[]).length > 0 && (
              <Field label="Триггеры (через запятую)" tooltip="Команды или текст, запускающие этот блок. Формат: command:/start — реагирует на команду, text:привет — на текстовое сообщение. Можно указать несколько через запятую.">
                <input
                  type="text"
                  value={(data.triggers as string[]).join(', ')}
                  onChange={(e) =>
                    handleChange('triggers', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
                  }
                  className="input-field"
                  placeholder="command:/start, text:привет"
                />
              </Field>
            )}

            {/* Input toggle */}
            <Toggle
              label="Ожидать ввод"
              tooltip="Бот остановится и будет ждать сообщение от пользователя. Ответ сохраняется в переменную, которую можно использовать в следующих блоках."
              active={data.input != null}
              onToggle={(on) => handleChange('input', on ? { variable: 'user_input', validation: null } : null)}
            />
            {data.input != null && (
              <>
                <Field label="Переменная" tooltip="Имя переменной для сохранения ответа. Используйте в других блоках как {имя_переменной}. Пример: user_input, name, phone.">
                  <input
                    type="text"
                    value={(data.input as InputConfig).variable || ''}
                    onChange={(e) => handleChange('input', { ...(data.input as InputConfig), variable: e.target.value })}
                    className="input-field"
                    placeholder="user_input"
                  />
                </Field>
                <Field label="Валидация" tooltip="Проверка формата ввода. Если пользователь отправит неверный формат, бот попросит ввести снова. Например: email проверит наличие @.">
                  <select
                    value={(data.input as InputConfig).validation || ''}
                    onChange={(e) => handleChange('input', { ...(data.input as InputConfig), validation: e.target.value || null })}
                    className="input-field"
                  >
                    <option value="">Нет</option>
                    <option value="email">Email</option>
                    <option value="phone">Телефон</option>
                    <option value="number">Число</option>
                  </select>
                </Field>
              </>
            )}

            {/* Buttons toggle */}
            <Toggle
              label="Кнопки"
              tooltip="Инлайн-кнопки под сообщением. Каждая обычная кнопка создаёт отдельный выход — соедините его с нужным блоком. URL-кнопки открывают ссылку."
              active={Array.isArray(data.buttons) && (data.buttons as ButtonItem[]).length > 0}
              onToggle={(on) => handleChange('buttons', on ? [{ text: 'Кнопка 1', output_handle: 'btn_1' }] : undefined)}
            />
            {Array.isArray(data.buttons) && (data.buttons as ButtonItem[]).length > 0 && (
              <>
                <ButtonsEditor
                  buttons={data.buttons as ButtonItem[]}
                  onChange={(buttons) => handleChange('buttons', buttons)}
                />
                <Field label="Раскладка кнопок" tooltip="Вертикально — каждая кнопка на новой строке (удобнее для длинных текстов). Горизонтально — кнопки в одну строку (для коротких, 2-3 шт).">
                  <select
                    value={String(data.button_layout || 'vertical')}
                    onChange={(e) => handleChange('button_layout', e.target.value)}
                    className="input-field"
                  >
                    <option value="vertical">Вертикально</option>
                    <option value="horizontal">Горизонтально</option>
                  </select>
                </Field>
                <Toggle
                  label="Сохранять ответ в переменную"
                  tooltip="Текст нажатой кнопки сохранится в переменную. Полезно для квизов и опросов — можно использовать ответ в условиях или текстах."
                  active={Boolean(data.button_answer_variable)}
                  onToggle={(on) => handleChange('button_answer_variable', on ? 'answer' : undefined)}
                />
                {data.button_answer_variable && (
                  <Field label="Переменная для ответа" tooltip="Имя переменной, в которую запишется текст нажатой кнопки. Используйте {answer} в следующих блоках.">
                    <input
                      type="text"
                      value={String(data.button_answer_variable || '')}
                      onChange={(e) => handleChange('button_answer_variable', e.target.value)}
                      className="input-field"
                      placeholder="answer"
                    />
                  </Field>
                )}
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-2 space-y-1">
                  <p className="text-[10px] text-purple-300 font-medium">Как подключить кнопки:</p>
                  <p className="text-[10px] text-gray-400">Каждая кнопка создаёт <span className="text-purple-400">фиолетовую точку</span> внизу блока. Перетяните линию от этой точки к следующему блоку — при нажатии кнопки бот пойдёт туда.</p>
                  <p className="text-[10px] text-gray-500">Серая точка &#9679; — дефолтный выход. Если кнопка не подключена, переход через него.</p>
                </div>
              </>
            )}
          </>
        )}

        {/* ============ CONDITION NODE ============ */}
        {node.type === 'condition' && (
          <>
            <Field label="Переменная" tooltip="Имя переменной для проверки. Например: user_role, is_subscribed, counter. Переменные задаются блоками «Ввод» и «Переменная».">
              <input type="text" value={String(data.variable || '')} onChange={(e) => handleChange('variable', e.target.value)} className="input-field" placeholder="user_role" />
            </Field>
            <Field label="Оператор" tooltip="Тип сравнения. «Равно» — точное совпадение, «Содержит» — вхождение подстроки, «Задано» / «Не задано» — проверяет существование переменной.">
              <select value={String(data.operator || 'equals')} onChange={(e) => handleChange('operator', e.target.value)} className="input-field">
                <option value="equals">Равно (==)</option>
                <option value="not_equals">Не равно (!=)</option>
                <option value="contains">Содержит</option>
                <option value="greater_than">Больше (&gt;)</option>
                <option value="less_than">Меньше (&lt;)</option>
                <option value="is_set">Задано</option>
                <option value="is_not_set">Не задано</option>
                <option value="starts_with">Начинается с</option>
                <option value="ends_with">Заканчивается на</option>
                <option value="matches">Регулярное выражение</option>
              </select>
            </Field>
            <Field label="Значение" tooltip="С чем сравнить переменную. Можно указать текст, число или {другую_переменную}. Для операторов «Задано»/«Не задано» не требуется.">
              <input type="text" value={String(data.value || '')} onChange={(e) => handleChange('value', e.target.value)} className="input-field" placeholder="true" />
            </Field>
          </>
        )}

        {/* ============ DELAY NODE ============ */}
        {node.type === 'delay' && (
          <>
            <Field label="Задержка (секунды)" tooltip="Пауза перед переходом к следующему блоку. Используйте для имитации «печатает...» или отложенных сообщений. Максимум 300 сек (5 мин).">
              <input type="number" value={Number(data.delay_seconds || 1)} onChange={(e) => handleChange('delay_seconds', parseInt(e.target.value) || 1)} className="input-field" min={1} max={300} />
            </Field>
            <p className="text-[10px] text-gray-600">
              Максимум 300 сек (5 мин). Для более длительных задержек используйте scheduled-сообщения.
            </p>
          </>
        )}

        {/* ============ PAYMENT NODE ============ */}
        {node.type === 'payment' && (
          <>
            <Field label="Название товара" tooltip="Отображается в платёжной форме Telegram. Например: «Подписка Premium», «Онлайн-курс», «Консультация».">
              <input type="text" value={String(data.title || '')} onChange={(e) => handleChange('title', e.target.value)} className="input-field" placeholder="Подписка Premium" />
            </Field>
            <Field label="Описание" tooltip="Подробное описание товара. Пользователь увидит его в платёжной форме перед оплатой.">
              <textarea value={String(data.description || '')} onChange={(e) => handleChange('description', e.target.value)} className="input-field min-h-[50px]" rows={2} placeholder="Описание для платёжной формы" />
            </Field>
            <Field label="Сумма" tooltip="Для Telegram Stars — количество звёзд (целое число, мин. 1). Для RUB/USD/EUR — сумма в основных единицах (рубли, доллары).">
              <input type="number" value={Number(data.amount || 100)} onChange={(e) => handleChange('amount', parseInt(e.target.value) || 100)} className="input-field" min={1} />
            </Field>
            <Field label="Валюта" tooltip="Telegram Stars — встроенная валюта Telegram, не требует платёжного провайдера. Для RUB/USD/EUR нужен Provider Token от ЮKassa, Stripe и т.д.">
              <select value={String(data.currency || 'XTR')} onChange={(e) => handleChange('currency', e.target.value)} className="input-field">
                <option value="XTR">Telegram Stars ⭐</option>
                <option value="RUB">RUB ₽</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
              </select>
            </Field>
            {String(data.currency || 'XTR') !== 'XTR' && (
              <Field label="Provider Token" tooltip="Токен платёжного провайдера (ЮKassa, Stripe и др.). Получите в @BotFather → Payments → выберите провайдера → получите токен.">
                <input type="text" value={String(data.provider_token || '')} onChange={(e) => handleChange('provider_token', e.target.value)} className="input-field" placeholder="Токен платёжного провайдера" />
              </Field>
            )}
          </>
        )}

        {/* ============ GPT NODE ============ */}
        {node.type === 'gpt' && (
          <GptNodePanel data={data} onChange={handleChange} />
        )}

        {/* ============ KNOWLEDGE NODE ============ */}
        {node.type === 'knowledge' && (
          <KnowledgeNodePanel nodeId={node.id} botId={(window.location.pathname.match(/\/editor\/([^/]+)/)?.[1]) || ''} data={data} onChange={handleChange} />
        )}

        {/* ============ WEBHOOK NODE ============ */}
        {node.type === 'webhook' && (
          <>
            <Field label="Метод" tooltip="HTTP-метод запроса. POST — отправить данные (заказ, заявка). GET — получить данные (информация, статус). Если не уверены — используйте POST.">
              <select value={String(data.method || 'POST')} onChange={(e) => handleChange('method', e.target.value)} className="input-field">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </Field>
            <Field label="URL" tooltip="Адрес API, куда отправить запрос. Поддерживает переменные: https://api.example.com/users/{user_id}. Все переменные бота передаются в теле запроса.">
              <input type="text" value={String(data.url || '')} onChange={(e) => handleChange('url', e.target.value)} className="input-field" placeholder="https://api.example.com/..." />
            </Field>
            <Field label="Сохранить ответ в переменную" tooltip="Имя переменной для сохранения ответа от API. Потом используйте {имя} в текстовых блоках для вывода результата.">
              <input type="text" value={String(data.save_response_to || '')} onChange={(e) => handleChange('save_response_to', e.target.value)} className="input-field" placeholder="api_result" />
            </Field>
            <p className="text-[10px] text-gray-600">
              Все переменные бота автоматически передаются в теле запроса.
            </p>
          </>
        )}

        {/* ============ VARIABLE NODE ============ */}
        {node.type === 'variable' && (
          <>
            <Field label="Переменная" tooltip="Имя переменной. Используйте латиницу без пробелов: counter, user_name, total_price. Переменные доступны во всех блоках через {имя}.">
              <input type="text" value={String(data.variable || '')} onChange={(e) => handleChange('variable', e.target.value)} className="input-field" placeholder="counter" />
            </Field>
            <Field label="Действие" tooltip="Установить — задать конкретное значение. Увеличить/Уменьшить — для числовых счётчиков (+1/-1). Добавить в список — для коллекций. Удалить — стереть переменную.">
              <select value={String(data.action || 'set')} onChange={(e) => handleChange('action', e.target.value)} className="input-field">
                <option value="set">Установить (=)</option>
                <option value="increment">Увеличить (+=)</option>
                <option value="decrement">Уменьшить (-=)</option>
                <option value="append">Добавить в список (+)</option>
                <option value="delete">Удалить (del)</option>
              </select>
            </Field>
            {String(data.action || 'set') !== 'delete' && (
              <Field label="Значение" tooltip="Новое значение переменной. Можно указать текст, число или ссылку на другую переменную через {имя_переменной}.">
                <input type="text" value={String(data.value || '')} onChange={(e) => handleChange('value', e.target.value)} className="input-field" placeholder="Значение или {переменная}" />
              </Field>
            )}
          </>
        )}

        {/* ============ MEDIA NODE ============ */}
        {node.type === 'media' && (
          <>
            <Field label="Тип медиа" tooltip="Тип файла для отправки пользователю. Фото — до 10 МБ, видео — до 50 МБ, документ — любой файл до 50 МБ.">
              <select value={String(data.media_type || 'photo')} onChange={(e) => handleChange('media_type', e.target.value)} className="input-field">
                <option value="photo">📷 Фото</option>
                <option value="video">🎥 Видео</option>
                <option value="document">📄 Документ</option>
                <option value="sticker">🌟 Стикер</option>
                <option value="voice">🎙️ Голосовое</option>
                <option value="audio">🎵 Аудио</option>
                <option value="animation">🌞 GIF</option>
              </select>
            </Field>
            <Field label="URL или file_id" tooltip="Прямая ссылка на файл (https://...) или file_id из Telegram. File_id — идентификатор уже загруженного файла, работает быстрее. Получить можно через @userinfobot.">
              <input type="text" value={String(data.url || '')} onChange={(e) => handleChange('url', e.target.value)} className="input-field" placeholder="https://... или file_id из Telegram" />
            </Field>
            <Field label="Подпись (caption)" tooltip="Текст под медиафайлом. Поддерживает переменные {name} и форматирование (HTML/Markdown). Максимум 1024 символа.">
              <textarea value={String(data.caption || '')} onChange={(e) => handleChange('caption', e.target.value)} className="input-field min-h-[50px]" rows={2} placeholder="Текст под медиа..." />
            </Field>
            <Field label="Формат подписи" tooltip="Формат текста подписи. HTML — теги <b>, <i>, <a>. Markdown — *жирный*, _курсив_.">
              <select
                value={String(data.parse_mode || 'HTML')}
                onChange={(e) => handleChange('parse_mode', e.target.value)}
                className="input-field"
              >
                <option value="HTML">HTML</option>
                <option value="Markdown">Markdown</option>
              </select>
            </Field>
          </>
        )}

        {/* ============ RANDOM NODE ============ */}
        {node.type === 'random' && (
          <>
            <BranchesEditor
              branches={(data.branches as RandomBranch[]) || []}
              onChange={(branches) => handleChange('branches', branches)}
            />
            <p className="text-[10px] text-gray-600">
              Вес определяет вероятность выбора ветки. Чем больше вес, тем чаще выбирается.
            </p>
          </>
        )}

        {/* ============ CHECK_SUB NODE ============ */}
        {node.type === 'check_sub' && (
          <>
            <Field label="Канал (ID или @username)" tooltip="Укажите @username канала (например @my_channel) или числовой ID (начинается с -100). Бот должен быть добавлен администратором канала.">
              <input type="text" value={String(data.channel_id || '')} onChange={(e) => handleChange('channel_id', e.target.value)} className="input-field" placeholder="@my_channel или -100123456789" />
            </Field>
            <Field label="Текст если не подписан" tooltip="Сообщение для пользователей, которые не подписаны на канал. Обычно содержит ссылку на канал и просьбу подписаться.">
              <textarea value={String(data.fail_text || '')} onChange={(e) => handleChange('fail_text', e.target.value)} className="input-field min-h-[50px]" rows={2} placeholder="Подпишитесь на канал..." />
            </Field>
            <p className="text-[10px] text-gray-600">
              Бот должен быть администратором канала. Два выхода: "Подписан" и "Не подписан".
            </p>
          </>
        )}

        {/* ============ NOTIFY NODE ============ */}
        {node.type === 'notify' && (
          <>
            <Field label="Chat ID получателя" tooltip="Telegram ID пользователя, которому придёт уведомление. Узнайте свой ID через @userinfobot в Telegram. Или используйте {переменную}.">
              <input type="text" value={String(data.chat_id || '')} onChange={(e) => handleChange('chat_id', e.target.value)} className="input-field" placeholder="123456789 или {переменная}" />
            </Field>
            <Field label="Текст уведомления" tooltip="Сообщение для получателя. Поддерживает переменные: {name}, {phone}, {email} и т.д. Полезно для уведомления админа о новой заявке.">
              <textarea value={String(data.text || '')} onChange={(e) => handleChange('text', e.target.value)} className="input-field min-h-[80px] resize-y" rows={3} placeholder="Новая заявка от {name}&#10;Телефон: {phone}" />
            </Field>
            <Field label="Формат" tooltip="Формат текста уведомления. HTML — теги <b>, <i>, <a>. Markdown — *жирный*, _курсив_.">
              <select value={String(data.parse_mode || 'HTML')} onChange={(e) => handleChange('parse_mode', e.target.value)} className="input-field">
                <option value="HTML">HTML</option>
                <option value="Markdown">Markdown</option>
              </select>
            </Field>
            <p className="text-[10px] text-gray-600">
              Отправляет сообщение конкретному пользователю (например, админу). Поддерживает переменные: &#123;name&#125;, &#123;phone&#125; и т.д.
            </p>
          </>
        )}

        {/* ============ NOTE NODE ============ */}
        {node.type === 'note' && (
          <>
            <Field label="Текст заметки" tooltip="Заметка видна только в редакторе. Бот её не выполняет. Используйте для комментариев и пояснений к схеме.">
              <textarea value={String(data.text || '')} onChange={(e) => handleChange('text', e.target.value)} className="input-field min-h-[80px]" rows={3} placeholder="Комментарий для разработчика..." />
            </Field>
            <Field label="Цвет" tooltip="Цвет заметки на холсте — для визуальной группировки и навигации.">
              <div className="flex gap-2">
                {(['yellow', 'blue', 'green', 'pink', 'gray'] as const).map((color) => (
                  <button
                    key={color}
                    onClick={() => handleChange('color', color)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      data.color === color ? 'border-white scale-110' : 'border-gray-600 hover:border-gray-400'
                    } ${
                      color === 'yellow' ? 'bg-yellow-500' :
                      color === 'blue' ? 'bg-blue-500' :
                      color === 'green' ? 'bg-green-500' :
                      color === 'pink' ? 'bg-pink-500' :
                      'bg-gray-500'
                    }`}
                  />
                ))}
              </div>
            </Field>
            <p className="text-[10px] text-gray-600">
              Заметки видны только в редакторе. Бот их не выполняет.
            </p>
          </>
        )}

        {/* Node ID info */}
        <div className="pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-600">ID: {node.id}</p>
          <p className="text-xs text-gray-600">Тип: {node.type}</p>
        </div>
      </div>
    </div>
  );
}

function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Show above if not enough space below
      if (spaceBelow < 160) {
        setPos({ top: rect.top - 8, left: rect.right - 224 });
      } else {
        setPos({ top: rect.bottom + 4, left: rect.right - 224 });
      }
    }
    setOpen(!open);
  };

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        className="w-3.5 h-3.5 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-500 hover:text-gray-200 text-[9px] font-bold leading-none inline-flex items-center justify-center ml-1.5 shrink-0 transition-colors"
      >
        ?
      </button>
      {open && pos && (
        <div
          className="fixed z-[100] w-56 p-2.5 rounded-lg bg-gray-800 border border-gray-600 shadow-xl text-[11px] text-gray-300 leading-relaxed"
          style={{
            top: pos.top < 0 ? 8 : pos.top,
            left: Math.max(8, pos.left),
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

const FLOW_HINTS: Record<string, { desc: string; flow: string[]; outputs?: string[] }> = {
  message: {
    desc: 'Универсальный блок. Отправляет текст, может ждать ввод и показывать кнопки.',
    flow: ['Старт', 'Сообщение', 'следующий блок'],
  },
  start: {
    desc: 'Точка входа в бота. С этого блока начинается выполнение, когда пользователь отправит команду.',
    flow: ['Пользователь: /start', 'Старт', 'Сообщение'],
  },
  text: {
    desc: 'Отправляет текстовое сообщение и переходит к следующему блоку.',
    flow: ['любой блок', 'Текст', 'следующий блок'],
  },
  buttons: {
    desc: 'Показывает кнопки и ждёт нажатия. Каждая кнопка ведёт к своему блоку.',
    flow: ['Сообщение', 'Кнопки', 'разные блоки'],
  },
  input: {
    desc: 'Ждёт сообщение от пользователя и сохраняет в переменную.',
    flow: ['Сообщение (вопрос)', 'Ввод → {имя}', 'следующий блок'],
  },
  condition: {
    desc: 'Проверяет значение переменной. Два выхода: зелёный (Да) и красный (Нет).',
    flow: ['Ввод / Переменная', 'Условие', 'Да → ... / Нет → ...'],
    outputs: ['Да (зелёный) — условие верно', 'Нет (красный) — условие не верно'],
  },
  delay: {
    desc: 'Пауза перед следующим блоком. Используйте между сообщениями для эффекта набора текста.',
    flow: ['Сообщение', 'Задержка', 'Сообщение'],
  },
  payment: {
    desc: 'Показывает форму оплаты в Telegram. Два выхода: успешная оплата и ошибка.',
    flow: ['Сообщение (товар)', 'Оплата', 'Спасибо! / Ошибка'],
    outputs: ['Успех (зелёный) — оплата прошла', 'Ошибка (красный) — оплата не удалась'],
  },
  gpt: {
    desc: 'Отвечает на сообщение пользователя через GPT. Требуется API-ключ OpenAI.',
    flow: ['Сообщение (задай вопрос)', 'GPT', 'ответ отправляется'],
  },
  webhook: {
    desc: 'Отправляет HTTP-запрос на внешний сервер и может сохранить ответ в переменную.',
    flow: ['Ввод (данные)', 'Webhook', 'Сообщение ({ответ})'],
  },
  variable: {
    desc: 'Устанавливает или меняет переменную. Используйте перед условиями или в текстах как {имя}.',
    flow: ['любой блок', 'Переменная', 'Условие / Сообщение'],
  },
  media: {
    desc: 'Отправляет фото, видео, документ или стикер по ссылке или file_id.',
    flow: ['Старт / Кнопка', 'Медиа', 'следующий блок'],
  },
  random: {
    desc: 'Случайно выбирает одну из веток. Полезно для A/B тестов и рандомных ответов.',
    flow: ['любой блок', 'Случайный', 'Вариант A / B / C'],
  },
  check_sub: {
    desc: 'Проверяет, подписан ли пользователь на канал. Бот должен быть админом канала.',
    flow: ['Старт', 'Подписка?', 'Да → ... / Нет → подпишись!'],
    outputs: ['Подписан (зелёный)', 'Не подписан (красный)'],
  },
  notify: {
    desc: 'Отправляет сообщение конкретному пользователю (например, админу). Бот продолжает работу.',
    flow: ['Ввод (заявка)', 'Уведомление', 'Сообщение (принято!)'],
  },
  note: {
    desc: 'Комментарий для вас. Не выполняется ботом, не подключается к другим блокам.',
    flow: [],
  },
};

function FlowHint({ type }: { type: string }) {
  const [collapsed, setCollapsed] = useState(true);
  const hint = FLOW_HINTS[type];
  if (!hint) return null;

  return (
    <div className="mb-3">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-1.5 text-left group"
      >
        <span className="text-[10px] text-blue-400 group-hover:text-blue-300 transition-colors">
          {collapsed ? '▶' : '▼'} Как использовать
        </span>
      </button>
      {!collapsed && (
        <div className="mt-2 bg-blue-500/5 border border-blue-500/20 rounded-lg p-2.5 space-y-2">
          <p className="text-[11px] text-gray-300 leading-relaxed">
            {hint.desc}
          </p>
          {hint.flow.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {hint.flow.map((step, i) => (
                <span key={i} className="contents">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    i === 1
                      ? 'bg-blue-500/20 text-blue-300 font-medium border border-blue-500/30'
                      : 'bg-gray-800 text-gray-400'
                  }`}>
                    {step}
                  </span>
                  {i < hint.flow.length - 1 && (
                    <span className="text-gray-600 text-[10px]">→</span>
                  )}
                </span>
              ))}
            </div>
          )}
          {hint.outputs && (
            <div className="space-y-0.5 pt-0.5">
              <p className="text-[10px] text-gray-500">Выходы:</p>
              {hint.outputs.map((out, i) => (
                <p key={i} className="text-[10px] text-gray-400 pl-2">• {out}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children, tooltip }: { label: string; children: React.ReactNode; tooltip?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-400 mb-1 flex items-center">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </span>
      {children}
    </label>
  );
}

function Toggle({ label, active, onToggle, tooltip }: { label: string; active: boolean; onToggle: (on: boolean) => void; tooltip?: string }) {
  return (
    <div
      className="flex items-center justify-between py-1.5 cursor-pointer group"
      onClick={() => onToggle(!active)}
    >
      <span className="text-xs text-gray-400 group-hover:text-gray-300 flex items-center">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </span>
      <div className={`w-8 h-4.5 rounded-full transition-colors ${active ? 'bg-brand-600' : 'bg-gray-700'} relative shrink-0`}>
        <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${active ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </div>
  );
}

// Reusable model picker with search
function ModelPicker({ value, onSelect, label, tooltip, placeholder }: {
  value: string; onSelect: (id: string) => void; label: string; tooltip: string; placeholder?: string;
}) {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShow(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show]);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try { setModels(await openrouterApi.models(q)); } catch {}
    setLoading(false);
  }, []);

  const handleSearch = (q: string) => { setSearch(q); setShow(true); load(q); };

  return (
    <div ref={ref} className="relative">
      <Field label={label} tooltip={tooltip}>
        <input
          type="text"
          value={show ? search : value}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => { setShow(true); if (!models.length) load(''); }}
          className="input-field font-mono text-xs"
          placeholder={placeholder || 'Поиск модели...'}
        />
      </Field>
      {show && models.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-44 overflow-y-auto bg-gray-800 border border-gray-600 rounded-lg shadow-xl">
          {models.slice(0, 25).map((m) => (
            <button
              key={m.id}
              onClick={() => { onSelect(m.id); setSearch(''); setShow(false); }}
              className={`w-full text-left px-2.5 py-1.5 hover:bg-gray-700 border-b border-gray-700/50 last:border-0 ${m.id === value ? 'bg-brand-600/20' : ''}`}
            >
              <div className="text-[11px] text-gray-200 truncate">{m.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] text-gray-500">{(m.context_length / 1000).toFixed(0)}K</span>
                <span className="text-[9px] text-emerald-500">${m.price_prompt.toFixed(2)}/1M</span>
                {m.supports_tools && <span className="text-[9px] text-purple-400">tools</span>}
                {m.supports_vision && <span className="text-[9px] text-blue-400">vision</span>}
              </div>
            </button>
          ))}
          {loading && <div className="px-3 py-2 text-[10px] text-gray-500 text-center">Загрузка...</div>}
        </div>
      )}
    </div>
  );
}

function KnowledgeNodePanel({ nodeId, botId, data, onChange }: { nodeId: string; botId: string; data: Record<string, unknown>; onChange: (key: string, val: unknown) => void }) {
  const [files, setFiles] = useState<Array<{ file_id: string; filename: string; chunks: number }>>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const apiKey = String(data.api_key || '');
  const embeddingModel = String(data.embedding_model || 'openai/text-embedding-3-small');

  // Load files on mount
  useEffect(() => {
    if (!botId) return;
    knowledgeApi.files(botId).then(setFiles).catch(() => {});
  }, [botId]);

  // Update files_count in node data
  useEffect(() => {
    onChange('files_count', files.length);
  }, [files.length]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !botId || !apiKey) return;
    setUploading(true);
    setUploadStatus(`Загрузка ${file.name}...`);
    try {
      const result = await knowledgeApi.upload(botId, file, apiKey, embeddingModel);
      setUploadStatus(`${result.filename}: ${result.chunks} чанков`);
      const updated = await knowledgeApi.files(botId);
      setFiles(updated);
    } catch (err: any) {
      setUploadStatus(`Ошибка: ${err.message}`);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (fileId: string) => {
    try {
      await knowledgeApi.deleteFile(botId, fileId);
      setFiles((f) => f.filter((x) => x.file_id !== fileId));
    } catch {}
  };

  return (
    <>
      {/* API Key */}
      <Field label="OpenRouter API Key" tooltip="Ключ для эмбеддингов и AI-ответов. Получите на openrouter.ai/keys.">
        <input type="password" value={apiKey} onChange={(e) => onChange('api_key', e.target.value)} className="input-field" placeholder="sk-or-v1-..." />
      </Field>

      {/* System prompt */}
      <Field label="Системный промпт" tooltip="Инструкция для AI. Контекст из базы знаний добавляется автоматически перед вопросом пользователя.">
        <textarea value={String(data.system_prompt || '')} onChange={(e) => onChange('system_prompt', e.target.value)} className="input-field min-h-[60px]" rows={2} placeholder="Отвечай на вопросы по контексту..." />
      </Field>

      {/* Models */}
      <ModelPicker
        value={String(data.model || '')}
        onSelect={(id) => onChange('model', id)}
        label="Модель ответа"
        tooltip="AI-модель для генерации ответов на основе найденного контекста."
        placeholder="openai/gpt-4o-mini"
      />
      <Field label="Модель эмбеддингов" tooltip="Модель для векторизации текста. text-embedding-3-small — быстрая и дешёвая. Менять обычно не нужно.">
        <input type="text" value={embeddingModel} onChange={(e) => onChange('embedding_model', e.target.value)} className="input-field font-mono text-xs" placeholder="openai/text-embedding-3-small" />
      </Field>

      {/* File upload */}
      <div className="space-y-2">
        <span className="text-xs text-gray-400 flex items-center">
          Файлы базы знаний
          <Tooltip text="Загрузите файлы (PDF, DOCX, TXT, XLSX и др.) — они будут разбиты на чанки, векторизованы и сохранены. Бот будет искать по ним ответы." />
        </span>

        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((f) => (
              <div key={f.file_id} className="flex items-center gap-1.5 bg-gray-800/50 rounded-lg px-2 py-1.5">
                <span className="text-[10px] text-cyan-400">📄</span>
                <span className="text-[11px] text-gray-300 truncate flex-1">{f.filename}</span>
                <span className="text-[9px] text-gray-500 shrink-0">{f.chunks} чанков</span>
                <button onClick={() => handleDelete(f.file_id)} className="text-[10px] text-red-400 hover:text-red-300 shrink-0">&times;</button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          onChange={handleUpload}
          accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.md,.csv,.json,.html,.xml"
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !apiKey}
          className="w-full py-2 text-xs border border-dashed border-cyan-500/30 text-cyan-400 hover:border-cyan-500/60 hover:bg-cyan-500/5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? uploadStatus : '+ Загрузить файл'}
        </button>

        {uploadStatus && !uploading && (
          <p className="text-[10px] text-gray-500">{uploadStatus}</p>
        )}

        {!apiKey && (
          <p className="text-[10px] text-amber-400">Введите API Key для загрузки файлов</p>
        )}
      </div>

      {/* Max tokens */}
      <Field label="Макс. токенов ответа" tooltip="Ограничение длины AI-ответа.">
        <input type="number" value={Number(data.max_tokens || 1000)} onChange={(e) => onChange('max_tokens', parseInt(e.target.value) || 1000)} className="input-field" min={50} max={16384} />
      </Field>

      <Toggle
        label="Диалоговый режим"
        tooltip="Бот будет ждать следующее сообщение и отвечать по базе знаний. Без этого — однократный ответ."
        active={Boolean(data.conversational)}
        onToggle={(on) => onChange('conversational', on)}
      />
    </>
  );
}

function GptNodePanel({ data, onChange }: { data: Record<string, unknown>; onChange: (key: string, val: unknown) => void }) {
  const [keyStatus, setKeyStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [keyInfo, setKeyInfo] = useState<{ label?: string; usage?: number; limit?: number; limit_remaining?: number } | null>(null);

  const apiKey = String(data.api_key || '');
  const selectedModel = String(data.model || '');

  const validateKey = useCallback(async () => {
    if (!apiKey.trim()) return;
    setKeyStatus('checking');
    try {
      const res = await openrouterApi.validateKey(apiKey);
      if (res.valid) {
        setKeyStatus('valid');
        setKeyInfo({ label: res.label ?? undefined, usage: res.usage ?? undefined, limit: res.limit ?? undefined, limit_remaining: res.limit_remaining ?? undefined });
      } else {
        setKeyStatus('invalid');
        setKeyInfo(null);
      }
    } catch {
      setKeyStatus('invalid');
    }
  }, [apiKey]);

  return (
    <>
      {/* API Key */}
      <Field label="OpenRouter API Key" tooltip="Ключ от openrouter.ai — позволяет использовать 300+ AI-моделей. Получите на openrouter.ai/keys.">
        <div className="flex gap-1.5">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => { onChange('api_key', e.target.value); setKeyStatus('idle'); }}
            className="input-field flex-1"
            placeholder="sk-or-v1-..."
          />
          <button
            onClick={validateKey}
            disabled={!apiKey.trim() || keyStatus === 'checking'}
            className={`px-2 py-1 text-[10px] rounded-lg border shrink-0 transition-colors ${
              keyStatus === 'valid' ? 'border-green-500/40 text-green-400 bg-green-500/10' :
              keyStatus === 'invalid' ? 'border-red-500/40 text-red-400 bg-red-500/10' :
              'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            {keyStatus === 'checking' ? '...' : keyStatus === 'valid' ? '✓' : keyStatus === 'invalid' ? '✗' : 'Тест'}
          </button>
        </div>
      </Field>

      {/* Key info */}
      {keyStatus === 'valid' && keyInfo && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-2 space-y-0.5">
          {keyInfo.label && <p className="text-[10px] text-green-400 font-medium">{keyInfo.label}</p>}
          <div className="flex gap-3 text-[10px] text-gray-400">
            {keyInfo.usage != null && <span>Расход: ${keyInfo.usage.toFixed(2)}</span>}
            {keyInfo.limit_remaining != null && <span>Остаток: ${keyInfo.limit_remaining.toFixed(2)}</span>}
          </div>
        </div>
      )}
      {keyStatus === 'invalid' && (
        <p className="text-[10px] text-red-400">Ключ невалиден. Проверьте на openrouter.ai/keys</p>
      )}

      {/* Системный промпт */}
      <Field label="Системный промпт" tooltip="Инструкция для AI, задающая его роль. Например: «Ты консультант магазина. Отвечай кратко.»">
        <textarea value={String(data.system_prompt || '')} onChange={(e) => onChange('system_prompt', e.target.value)} className="input-field min-h-[80px]" rows={3} placeholder="Ты полезный ассистент..." />
      </Field>

      {/* Model search */}
      <ModelPicker
        value={selectedModel}
        onSelect={(id) => onChange('model', id)}
        label="Модель"
        tooltip="300+ моделей: GPT, Claude, Llama, Mistral и др. Начните вводить название для поиска."
        placeholder="Поиск модели..."
      />

      {/* Max tokens */}
      <Field label="Макс. токенов" tooltip="Ограничение длины ответа. 500 ~ 2-3 абзаца, 1000 ~ полстраницы. Больше = дороже.">
        <input type="number" value={Number(data.max_tokens || 1000)} onChange={(e) => onChange('max_tokens', parseInt(e.target.value) || 1000)} className="input-field" min={50} max={16384} />
      </Field>

      {/* Conversational mode */}
      <Toggle
        label="Диалоговый режим"
        tooltip="Бот запоминает контекст разговора. Без этого каждое сообщение обрабатывается отдельно."
        active={Boolean(data.conversational)}
        onToggle={(on) => onChange('conversational', on)}
      />
      {data.conversational && (
        <p className="text-[10px] text-gray-600">
          Бот ведёт диалог, запоминая историю. Каждый ответ расходует больше токенов.
        </p>
      )}
    </>
  );
}

function ButtonsEditor({ buttons, onChange }: { buttons: ButtonItem[]; onChange: (b: ButtonItem[]) => void }) {
  const addButton = (type: 'callback' | 'url' = 'callback') => {
    const idx = buttons.length + 1;
    if (type === 'url') {
      onChange([...buttons, { text: `Ссылка ${idx}`, output_handle: `btn_${idx}`, type: 'url', url: '' }]);
    } else {
      onChange([...buttons, { text: `Кнопка ${idx}`, output_handle: `btn_${idx}` }]);
    }
  };

  const removeButton = (i: number) => {
    onChange(buttons.filter((_, j) => j !== i));
  };

  const updateButton = (i: number, updates: Partial<ButtonItem>) => {
    onChange(buttons.map((b, j) => (j === i ? { ...b, ...updates } : b)));
  };

  const toggleType = (i: number) => {
    const btn = buttons[i];
    if (btn.type === 'url') {
      updateButton(i, { type: undefined, url: undefined });
    } else {
      updateButton(i, { type: 'url', url: '' });
    }
  };

  return (
    <div className="space-y-2">
      {buttons.map((btn, i) => (
        <div key={i} className="space-y-1">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={btn.text}
              onChange={(e) => updateButton(i, { text: e.target.value })}
              className="input-field flex-1 !py-1.5 text-xs"
              placeholder="Текст кнопки"
            />
            <button
              onClick={() => toggleType(i)}
              className={`text-[10px] px-1.5 shrink-0 rounded border transition-colors ${
                btn.type === 'url'
                  ? 'text-blue-400 border-blue-500/30 bg-blue-500/10'
                  : 'text-gray-500 border-gray-700 hover:text-gray-300'
              }`}
              title={btn.type === 'url' ? 'URL-кнопка (нажмите для переключения)' : 'Обычная кнопка (нажмите для URL)'}
            >
              {btn.type === 'url' ? '&#8599;' : '&#9654;'}
            </button>
            <button
              onClick={() => removeButton(i)}
              className="text-red-400 hover:text-red-300 text-xs px-1.5 shrink-0"
            >
              &times;
            </button>
          </div>
          {btn.type === 'url' && (
            <input
              type="text"
              value={btn.url || ''}
              onChange={(e) => updateButton(i, { url: e.target.value })}
              className="input-field !py-1.5 text-xs"
              placeholder="https://example.com"
            />
          )}
        </div>
      ))}
      {buttons.length < 10 && (
        <div className="flex gap-1.5">
          <button
            onClick={() => addButton('callback')}
            className="flex-1 text-xs text-brand-400 hover:text-brand-300 py-1.5 border border-dashed border-gray-700 rounded-lg hover:border-brand-500/50 transition-colors"
          >
            + Кнопка
          </button>
          <button
            onClick={() => addButton('url')}
            className="flex-1 text-xs text-blue-400 hover:text-blue-300 py-1.5 border border-dashed border-gray-700 rounded-lg hover:border-blue-500/50 transition-colors"
          >
            + Ссылка
          </button>
        </div>
      )}
    </div>
  );
}

function BranchesEditor({ branches, onChange }: { branches: RandomBranch[]; onChange: (b: RandomBranch[]) => void }) {
  const addBranch = () => {
    const idx = branches.length + 1;
    const letter = String.fromCharCode(64 + idx); // A, B, C...
    onChange([...branches, { label: `Вариант ${letter}`, weight: 50, output_handle: `branch_${letter.toLowerCase()}` }]);
  };

  const removeBranch = (i: number) => {
    if (branches.length <= 2) return; // Minimum 2 branches
    onChange(branches.filter((_, j) => j !== i));
  };

  const updateBranch = (i: number, updates: Partial<RandomBranch>) => {
    onChange(branches.map((b, j) => (j === i ? { ...b, ...updates } : b)));
  };

  return (
    <div className="space-y-2">
      <span className="text-xs text-gray-400">Ветки</span>
      {branches.map((branch, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <input
            type="text"
            value={branch.label}
            onChange={(e) => updateBranch(i, { label: e.target.value })}
            className="input-field flex-1 !py-1.5 text-xs"
            placeholder="Название ветки"
          />
          <input
            type="number"
            value={branch.weight}
            onChange={(e) => updateBranch(i, { weight: parseInt(e.target.value) || 1 })}
            className="input-field w-14 !py-1.5 text-xs text-center"
            min={1}
            max={100}
          />
          <button
            onClick={() => removeBranch(i)}
            className={`text-xs px-1.5 shrink-0 ${branches.length <= 2 ? 'text-gray-700 cursor-not-allowed' : 'text-red-400 hover:text-red-300'}`}
            disabled={branches.length <= 2}
          >
            &times;
          </button>
        </div>
      ))}
      {branches.length < 6 && (
        <button
          onClick={addBranch}
          className="w-full text-xs text-brand-400 hover:text-brand-300 py-1.5 border border-dashed border-gray-700 rounded-lg hover:border-brand-500/50 transition-colors"
        >
          + Добавить ветку
        </button>
      )}
    </div>
  );
}
