import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { botsApi } from '@/api/client';
import { useBotStore } from '@/stores/botStore';
import { useAuthStore } from '@/stores/authStore';
import TokenInput from './TokenInput';

export default function Dashboard() {
  const navigate = useNavigate();
  const { bots, setBots, setLoading, loading, updateBot, removeBot } = useBotStore();
  const logout = useAuthStore((s) => s.logout);
  const email = useAuthStore((s) => s.email);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    setLoading(true);
    botsApi
      .list()
      .then((data) => setBots(data as any))
      .finally(() => setLoading(false));
  }, [setBots, setLoading]);

  const handleStart = async (id: string) => {
    try {
      const res = await botsApi.start(id);
      updateBot(id, { status: 'running' as any, bot_username: res.username });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleStop = async (id: string) => {
    await botsApi.stop(id);
    updateBot(id, { status: 'stopped' as any });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить бота?')) return;
    await botsApi.delete(id);
    removeBot(id);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">BotForge</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{email}</span>
            <button
              onClick={logout}
              className="text-xs text-gray-500 hover:text-white"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-100">Мои боты</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-lg transition-colors"
          >
            + Создать бота
          </button>
        </div>

        {showCreate && (
          <TokenInput
            onCreated={() => {
              setShowCreate(false);
              botsApi.list().then((data) => setBots(data as any));
            }}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {loading ? (
          <p className="text-gray-500">Загрузка...</p>
        ) : bots.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">У вас пока нет ботов</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg"
            >
              Создать первого бота
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-200">{bot.name}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      bot.status === 'running'
                        ? 'bg-green-900/50 text-green-400'
                        : bot.status === 'error'
                        ? 'bg-red-900/50 text-red-400'
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {bot.status === 'running' ? 'Работает' : bot.status === 'error' ? 'Ошибка' : 'Остановлен'}
                  </span>
                </div>

                {bot.bot_username && (
                  <p className="text-xs text-gray-500 mb-2">@{bot.bot_username}</p>
                )}

                <p className="text-xs text-gray-600 mb-4">
                  Подписчиков: {bot.subscribers_count}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/editor/${bot.id}`)}
                    className="flex-1 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg"
                  >
                    Редактор
                  </button>
                  {bot.status === 'running' ? (
                    <button
                      onClick={() => handleStop(bot.id)}
                      className="px-3 py-1.5 text-xs bg-red-900/50 hover:bg-red-900 text-red-400 rounded-lg"
                    >
                      Стоп
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStart(bot.id)}
                      className="px-3 py-1.5 text-xs bg-green-900/50 hover:bg-green-900 text-green-400 rounded-lg"
                    >
                      Запуск
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(bot.id)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:text-red-400"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
