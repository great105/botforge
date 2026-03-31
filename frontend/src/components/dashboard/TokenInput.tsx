import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { botsApi, schemasApi } from '@/api/client';
import { BOT_TEMPLATES, type BotTemplate } from '@/lib/templates';

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

type Step = 'name' | 'choose' | 'templates';

export default function TokenInput({ onCreated, onCancel }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<'telegram' | 'max'>('telegram');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const createBot = async (template?: BotTemplate) => {
    if (!name.trim()) {
      setError('Введите название бота');
      return;
    }
    if (platform === 'telegram' && token.trim() && !token.includes(':')) {
      setError('Неверный формат токена Telegram');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const bot = await botsApi.create(name, token.trim() || undefined, platform) as any;
      const botId = bot.id;

      // If template selected — save its schema
      if (template) {
        await schemasApi.save(botId, {
          version: 2,
          nodes: template.nodes,
          edges: template.edges,
          viewport: { x: 0, y: 0, zoom: 1 },
        });
      }

      onCreated();
      // Navigate to editor
      navigate(`/editor/${botId}`);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? BOT_TEMPLATES.filter((t) => {
        const q = search.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((tag) => tag.includes(q));
      })
    : BOT_TEMPLATES;

  // Step 1: Name + token
  if (step === 'name') {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Новый бот</h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Название бота"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field w-full"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep('choose')}
          />

          {/* Platform selector */}
          <div>
            <span className="text-xs text-gray-400 mb-1.5 block">Платформа</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPlatform('telegram')}
                className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all ${
                  platform === 'telegram'
                    ? 'border-sky-500 bg-sky-500/15 text-sky-400'
                    : 'border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                Telegram
              </button>
              <button
                type="button"
                onClick={() => setPlatform('max')}
                className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all ${
                  platform === 'max'
                    ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                    : 'border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                MAX
              </button>
            </div>
          </div>

          <div>
            <input
              type="text"
              placeholder={platform === 'telegram' ? 'Токен от @BotFather (можно позже)' : 'Токен из MAX Platform (можно позже)'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="input-field w-full font-mono text-xs"
            />
            <p className="text-[10px] text-gray-600 mt-1 px-1">
              {platform === 'telegram'
                ? 'Без токена можно строить схему. Токен нужен для запуска.'
                : 'Получите токен в MAX Platform → Чат-боты → Интеграция.'}
            </p>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!name.trim()) { setError('Введите название'); return; }
                setStep('choose');
              }}
              className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-lg transition-colors"
            >
              Далее
            </button>
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Choose — template or blank
  if (step === 'choose') {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setStep('name')} className="text-gray-500 hover:text-white text-sm">←</button>
          <h3 className="text-sm font-semibold text-gray-200">
            Как начать: <span className="text-brand-400">{name}</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {/* From template */}
          <button
            onClick={() => setStep('templates')}
            className="text-left p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-brand-500/50 rounded-xl transition-all group"
          >
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-semibold text-gray-200 group-hover:text-brand-400">Из шаблона</div>
            <p className="text-xs text-gray-500 mt-1">
              Выберите готовый шаблон и настройте под себя. 12 шаблонов: магазин, квиз, поддержка, консультант и др.
            </p>
          </button>

          {/* Blank */}
          <button
            onClick={() => createBot()}
            disabled={loading}
            className="text-left p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-500 rounded-xl transition-all group disabled:opacity-50"
          >
            <div className="text-2xl mb-2">✨</div>
            <div className="text-sm font-semibold text-gray-200 group-hover:text-white">Пустой холст</div>
            <p className="text-xs text-gray-500 mt-1">
              {loading ? 'Создание...' : 'Начните с нуля — добавляйте блоки сами или попросите AI.'}
            </p>
          </button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  // Step 3: Template picker
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setStep('choose')} className="text-gray-500 hover:text-white text-sm">←</button>
        <h3 className="text-sm font-semibold text-gray-200">Выберите шаблон</h3>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input-field w-full mb-3"
        placeholder="Поиск шаблонов..."
        autoFocus
      />

      <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => createBot(t)}
            disabled={loading}
            className="w-full text-left p-3 bg-gray-800/30 hover:bg-gray-800 border border-gray-700/30 hover:border-gray-600 rounded-xl transition-all disabled:opacity-50"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-200">{t.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                    t.complexity === 'simple' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    t.complexity === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}>
                    {t.complexity === 'simple' ? 'Простой' : t.complexity === 'medium' ? 'Средний' : 'Сложный'}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {t.nodes.filter((n) => n.type !== 'note').length} блоков
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {loading && <p className="text-xs text-brand-400 mt-3 text-center animate-pulse">Создание бота из шаблона...</p>}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
