import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

type Step = 'form' | 'verify';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const finishAuth = async (token: string, refreshToken?: string) => {
    setAuth(token, email, 'free', refreshToken);
    try {
      const me = await authApi.me();
      setAuth(token, me?.email || email, me?.plan || 'free', refreshToken);
    } catch {}
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await authApi.login(email, password);
        await finishAuth(res.access_token, res.refresh_token);
      } else {
        await authApi.register(email, password);
        setStep('verify');
        setResendCooldown(60);
        setTimeout(() => codeInputRef.current?.focus(), 100);
      }
    } catch (e: any) {
      const msg = e.message || '';
      // If login says "not verified" — switch to verify step
      if (msg.includes('не подтверждён')) {
        setStep('verify');
        setResendCooldown(60);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyCode(email, code);
      await finishAuth(res.access_token, res.refresh_token);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await authApi.resendCode(email);
      setResendCooldown(60);
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Telegram callback
  useEffect(() => {
    (window as any).onTelegramAuth = async (user: any) => {
      setLoading(true);
      setError('');
      try {
        const res = await authApi.telegramAuth(user);
        setAuth(res.access_token, user.username || `tg_${user.id}`, 'free', res.refresh_token);
        try {
          const me = await authApi.me();
          setAuth(res.access_token, me?.email || user.username, me?.plan || 'free', res.refresh_token);
        } catch {}
        navigate('/');
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    return () => { delete (window as any).onTelegramAuth; };
  }, [navigate, setAuth]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">BotForge</h1>
          <p className="text-gray-400">Конструктор ботов</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          {step === 'form' ? (
            <>
              <h2 className="text-lg font-semibold text-gray-200">
                {isLogin ? 'Вход' : 'Регистрация'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field w-full"
                  required
                />
                <input
                  type="password"
                  placeholder="Пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field w-full"
                  required
                  minLength={6}
                />

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-700" />
                <span className="text-[10px] text-gray-500">или</span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>

              {/* Telegram Login */}
              <TelegramWidget />

              <p className="text-center text-xs text-gray-500">
                {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setError(''); }}
                  className="text-brand-500 hover:underline"
                >
                  {isLogin ? 'Регистрация' : 'Войти'}
                </button>
              </p>
            </>
          ) : (
            /* Verification step */
            <>
              <h2 className="text-lg font-semibold text-gray-200">Подтверждение email</h2>
              <p className="text-sm text-gray-400">
                Код отправлен на <span className="text-white font-medium">{email}</span>
              </p>

              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(v);
                  if (v.length === 6) setTimeout(handleVerify, 100);
                }}
                className="input-field w-full text-center text-2xl tracking-[0.5em] font-mono"
                autoFocus
              />

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                onClick={handleVerify}
                disabled={loading || code.length !== 6}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Проверка...' : 'Подтвердить'}
              </button>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="text-xs text-gray-500 hover:text-brand-400 disabled:text-gray-700"
                >
                  {resendCooldown > 0 ? `Отправить снова (${resendCooldown}с)` : 'Отправить код снова'}
                </button>
                <button
                  onClick={() => { setStep('form'); setCode(''); setError(''); }}
                  className="text-xs text-gray-500 hover:text-white"
                >
                  ← Назад
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TelegramWidget() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only render if bot username is configured
    // We'll inject it from a meta tag or just hardcode for now
    const botUsername = (document.querySelector('meta[name="tg-bot"]') as HTMLMetaElement)?.content || '';
    if (!botUsername || !ref.current) return;

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;
    ref.current.appendChild(script);
  }, []);

  return <div ref={ref} className="flex justify-center" />;
}
