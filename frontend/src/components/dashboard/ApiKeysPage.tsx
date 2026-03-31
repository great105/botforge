import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiKeysApi } from '@/api/client';

interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export default function ApiKeysPage() {
  const navigate = useNavigate();
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = useCallback(async () => {
    try {
      const data = await apiKeysApi.list();
      setKeys(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const result = await apiKeysApi.create(newKeyName.trim());
      setNewKey(result.key);
      setNewKeyName('');
      await loadKeys();
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    await apiKeysApi.revoke(keyId);
    await loadKeys();
  };

  const handleCopy = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-white">
              ← Назад
            </button>
            <span className="text-sm font-semibold">API Ключи</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Create new key */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Создать API ключ</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="input-field flex-1"
              placeholder="Название ключа (напр. Claude Code, Мой скрипт)"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim()}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50 shrink-0"
            >
              {creating ? '...' : 'Создать'}
            </button>
          </div>

          {/* New key display — shown once */}
          {newKey && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-xs text-green-400 mb-2 font-semibold">
                Ключ создан! Скопируйте его — он больше не будет показан.
              </p>
              <div className="flex gap-2">
                <code className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm font-mono text-green-300 break-all select-all">
                  {newKey}
                </code>
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 shrink-0 transition-colors"
                >
                  {copied ? 'Скопировано!' : 'Копировать'}
                </button>
              </div>
              <button
                onClick={() => setNewKey(null)}
                className="mt-2 text-xs text-gray-500 hover:text-gray-400"
              >
                Закрыть
              </button>
            </div>
          )}
        </div>

        {/* Existing keys */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Ваши ключи</h2>
          {loading ? (
            <p className="text-gray-500 text-sm">Загрузка...</p>
          ) : keys.length === 0 ? (
            <p className="text-gray-500 text-sm">Нет активных API ключей.</p>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium">{key.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      <code>{key.prefix}...****</code>
                      <span className="mx-2">·</span>
                      Создан: {new Date(key.created_at).toLocaleDateString('ru')}
                      {key.last_used_at && (
                        <>
                          <span className="mx-2">·</span>
                          Использован: {new Date(key.last_used_at).toLocaleDateString('ru')}
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(key.id)}
                    className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    Отозвать
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API Documentation */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Документация Public API</h2>
          <p className="text-sm text-gray-400 mb-4">
            Используйте API для программного создания ботов. Передавайте ключ в заголовке <code className="text-brand-400">X-API-Key</code>.
          </p>

          <div className="space-y-4">
            <DocSection
              title="Базовый URL"
              code={`${window.location.origin}/api/v1`}
            />

            <DocSection
              title="Авторизация"
              code={`curl -H "X-API-Key: bf_ваш_ключ" ${window.location.origin}/api/v1/bots`}
            />

            <DocSection
              title="Создать бота"
              code={`curl -X POST ${window.location.origin}/api/v1/bots \\
  -H "X-API-Key: bf_ваш_ключ" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Мой бот", "token": "123456:ABC..."}'`}
            />

            <DocSection
              title="Добавить блок"
              code={`curl -X POST ${window.location.origin}/api/v1/bots/{bot_id}/nodes \\
  -H "X-API-Key: bf_ваш_ключ" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "message",
    "data": {
      "label": "Привет",
      "text": "Привет! Это мой бот.",
      "triggers": ["command:/start"]
    }
  }'`}
            />

            <DocSection
              title="Соединить блоки"
              code={`curl -X POST ${window.location.origin}/api/v1/bots/{bot_id}/edges \\
  -H "X-API-Key: bf_ваш_ключ" \\
  -H "Content-Type: application/json" \\
  -d '{"source_id": "node_1", "target_id": "node_2"}'`}
            />

            <DocSection
              title="AI: сгенерировать бота по описанию"
              code={`curl -X POST ${window.location.origin}/api/v1/bots/{bot_id}/ai-generate \\
  -H "X-API-Key: bf_ваш_ключ" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Бот для пиццерии с выбором пиццы и оплатой"}'`}
            />

            <DocSection
              title="Запустить бота"
              code={`curl -X POST ${window.location.origin}/api/v1/bots/{bot_id}/start \\
  -H "X-API-Key: bf_ваш_ключ"`}
            />

            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Все эндпоинты</h4>
              <div className="space-y-1 text-xs font-mono">
                <ApiEndpoint method="GET" path="/bots" desc="Список ботов" />
                <ApiEndpoint method="POST" path="/bots" desc="Создать бота" />
                <ApiEndpoint method="GET" path="/bots/{id}" desc="Бот + схема" />
                <ApiEndpoint method="DELETE" path="/bots/{id}" desc="Удалить бота" />
                <ApiEndpoint method="PUT" path="/bots/{id}/schema" desc="Заменить всю схему" />
                <ApiEndpoint method="POST" path="/bots/{id}/nodes" desc="Добавить блок" />
                <ApiEndpoint method="PATCH" path="/bots/{id}/nodes/{node_id}" desc="Обновить блок" />
                <ApiEndpoint method="DELETE" path="/bots/{id}/nodes/{node_id}" desc="Удалить блок" />
                <ApiEndpoint method="POST" path="/bots/{id}/edges" desc="Соединить блоки" />
                <ApiEndpoint method="DELETE" path="/bots/{id}/edges/{edge_id}" desc="Удалить связь" />
                <ApiEndpoint method="POST" path="/bots/{id}/validate" desc="Валидировать схему" />
                <ApiEndpoint method="POST" path="/bots/{id}/auto-layout" desc="Авто-раскладка" />
                <ApiEndpoint method="POST" path="/bots/{id}/ai-generate" desc="AI генерация по описанию" />
                <ApiEndpoint method="POST" path="/bots/{id}/start" desc="Запустить бота" />
                <ApiEndpoint method="POST" path="/bots/{id}/stop" desc="Остановить бота" />
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Типы блоков</h4>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-brand-400 font-mono">message</span><span className="text-gray-400">Текст, кнопки, ввод</span>
                <span className="text-brand-400 font-mono">condition</span><span className="text-gray-400">Ветвление по условию</span>
                <span className="text-brand-400 font-mono">delay</span><span className="text-gray-400">Задержка</span>
                <span className="text-brand-400 font-mono">payment</span><span className="text-gray-400">Приём оплаты</span>
                <span className="text-brand-400 font-mono">gpt</span><span className="text-gray-400">AI-ответ (GPT)</span>
                <span className="text-brand-400 font-mono">webhook</span><span className="text-gray-400">HTTP-запрос</span>
                <span className="text-brand-400 font-mono">variable</span><span className="text-gray-400">Переменная</span>
                <span className="text-brand-400 font-mono">media</span><span className="text-gray-400">Фото/видео/документ</span>
                <span className="text-brand-400 font-mono">random</span><span className="text-gray-400">A/B тест</span>
                <span className="text-brand-400 font-mono">check_sub</span><span className="text-gray-400">Проверка подписки</span>
                <span className="text-brand-400 font-mono">note</span><span className="text-gray-400">Заметка на холсте</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocSection({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-300 mb-1.5">{title}</h4>
      <div className="relative group">
        <pre className="bg-gray-800/80 rounded-lg px-4 py-3 text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap break-all">
          {code}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 text-[10px] text-gray-500 hover:text-gray-300 bg-gray-800 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? 'OK!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function ApiEndpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const colors: Record<string, string> = {
    GET: 'text-green-400',
    POST: 'text-blue-400',
    PUT: 'text-amber-400',
    PATCH: 'text-amber-400',
    DELETE: 'text-red-400',
  };

  return (
    <div className="flex gap-2">
      <span className={`w-14 ${colors[method] || 'text-gray-400'}`}>{method}</span>
      <span className="text-gray-300 flex-1">{path}</span>
      <span className="text-gray-600">{desc}</span>
    </div>
  );
}
