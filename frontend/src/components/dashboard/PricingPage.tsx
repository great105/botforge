import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentsApi, botsApi } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

interface Plan {
  id: string;
  price_rub: number;
  days: number;
  label: string;
  price_per_bot: number;
}

interface Sub {
  id: string;
  bot_id: string;
  bot_name: string;
  status: string;
  plan: string;
  expires_at: string;
  days_left: number;
}

export default function PricingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const botId = searchParams.get('bot');
  const logout = useAuthStore((s) => s.logout);
  const email = useAuthStore((s) => s.email);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [bots, setBots] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBot, setSelectedBot] = useState(botId || '');
  const [loading, setLoading] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    paymentsApi.pricing().then(setPlans);
    paymentsApi.subscriptions().then(setSubs);
    botsApi.list().then((data) => setBots(data.map((b: any) => ({ id: b.id, name: b.name }))));
  }, []);

  // Check for return from payment
  useEffect(() => {
    if (window.location.pathname === '/payment/success') {
      setSuccess(true);
      paymentsApi.subscriptions().then(setSubs);
    }
  }, []);

  const handlePay = async (planId: string) => {
    if (!selectedBot) return;
    setLoading(planId);
    try {
      const res = await paymentsApi.create(selectedBot, planId);
      window.location.href = res.confirmation_url;
    } catch (e: any) {
      alert(e.message);
    }
    setLoading('');
  };

  const activeSubs = subs.filter((s) => s.status === 'active' && s.days_left > 0);

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-white">← Назад</button>
            <h1 className="text-lg font-bold text-white">Тарифы</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{email}</span>
            <button onClick={logout} className="text-xs text-gray-500 hover:text-white">Выйти</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">

        {/* Success banner */}
        {success && (
          <div className="mb-8 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
            <p className="text-green-400 font-medium">Оплата прошла успешно!</p>
            <p className="text-sm text-gray-400 mt-1">Подписка активирована. Теперь можно запускать бота.</p>
            <button onClick={() => navigate('/')} className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg">
              К моим ботам
            </button>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">
            Создавайте бесплатно.<br />
            <span className="text-brand-400">Платите только за запуск.</span>
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            Конструктор, шаблоны, AI — всё бесплатно. Оплата только за работающих ботов.
            Безлимит подписчиков на любом тарифе.
          </p>
        </div>

        {/* Free features */}
        <div className="mb-12 p-6 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">✨</span>
            <h3 className="text-lg font-bold text-white">Бесплатно — навсегда</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: '🔧', text: 'Создание ботов' },
              { icon: '🎨', text: 'Визуальный редактор' },
              { icon: '📋', text: '12 шаблонов' },
              { icon: '🧩', text: 'Все 12 типов блоков' },
              { icon: '🤖', text: 'AI-генерация (3/мес)' },
              { icon: '🧠', text: 'База знаний (RAG)' },
              { icon: '📱', text: 'Telegram + MAX' },
              { icon: '🔌', text: 'Public API' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2">
                <span>{item.icon}</span>
                <span className="text-sm text-gray-300">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bot selector */}
        {bots.length > 0 && (
          <div className="mb-8 text-center">
            <label className="text-sm text-gray-400 mr-3">Оплатить для бота:</label>
            <select
              value={selectedBot}
              onChange={(e) => setSelectedBot(e.target.value)}
              className="input-field !w-auto !inline-block min-w-[200px]"
            >
              <option value="">Выберите бота</option>
              {bots.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan, i) => {
            const isPopular = plan.id === '3month';
            const hasSub = activeSubs.some((s) => s.bot_id === selectedBot);
            return (
              <div
                key={plan.id}
                className={`relative p-6 rounded-2xl border transition-all ${
                  isPopular
                    ? 'border-brand-500 bg-brand-600/5 shadow-lg shadow-brand-500/10 scale-[1.02]'
                    : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-brand-600 text-white text-xs font-medium rounded-full">
                    Популярный
                  </div>
                )}

                <h3 className="text-lg font-bold text-white mb-1">{plan.label}</h3>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-white">{plan.price_rub}</span>
                  <span className="text-gray-400">₽</span>
                </div>

                {plan.id !== 'month' && (
                  <p className="text-sm text-emerald-400 mb-4">
                    {plan.price_per_bot}₽/мес за бота
                    {plan.id === '3month' && ' (экономия 20%)'}
                    {plan.id === 'year' && ' (экономия 40%)'}
                  </p>
                )}
                {plan.id === 'month' && <p className="text-sm text-gray-500 mb-4">за бота в месяц</p>}

                <ul className="space-y-2 mb-6">
                  {[
                    'Безлимит подписчиков',
                    'Все блоки и функции',
                    'Работает 24/7',
                    plan.id === 'year' ? 'AI-генерация безлимит' : 'AI-генерация 10/мес',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-brand-400">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePay(plan.id)}
                  disabled={!selectedBot || loading === plan.id}
                  className={`w-full py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    isPopular
                      ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                >
                  {loading === plan.id ? 'Перенаправление...' : hasSub ? 'Продлить' : 'Оплатить'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Active subscriptions */}
        {activeSubs.length > 0 && (
          <div className="mb-12">
            <h3 className="text-lg font-bold text-white mb-4">Активные подписки</h3>
            <div className="space-y-3">
              {activeSubs.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-4 bg-gray-900 border border-gray-800 rounded-xl">
                  <div>
                    <span className="text-sm font-medium text-white">{sub.bot_name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {sub.plan === 'month' ? '1 мес' : sub.plan === '3month' ? '3 мес' : '1 год'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${sub.days_left > 7 ? 'text-green-400' : sub.days_left > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {sub.days_left > 0 ? `${sub.days_left} дн.` : 'Истекла'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Активна</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="mb-12">
          <h3 className="text-lg font-bold text-white mb-6 text-center">Частые вопросы</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { q: 'Что бесплатно?', a: 'Создание ботов, редактор, шаблоны, AI-генерация (3 раза/мес). Платить нужно только за запуск бота.' },
              { q: 'Сколько стоит бот?', a: 'От 590₽/мес при оплате за год. Без лимитов на подписчиков и сообщения.' },
              { q: 'Можно попробовать перед оплатой?', a: 'Да! Создайте бота, настройте в редакторе, протестируйте — всё бесплатно. Оплата только когда захотите запустить.' },
              { q: 'Как работает AI?', a: 'Для GPT и Базы знаний — вы используете свой ключ OpenRouter (300+ моделей). AI-генерация схем — наш сервер, лимитирована по тарифу.' },
            ].map((item) => (
              <div key={item.q} className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
                <p className="text-sm font-medium text-white mb-1">{item.q}</p>
                <p className="text-xs text-gray-400">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
