import { useState } from 'react';
import { botsApi } from '@/api/client';

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

export default function TokenInput({ onCreated, onCancel }: Props) {
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !token.trim()) {
      setError('Заполните все поля');
      return;
    }
    if (!token.includes(':')) {
      setError('Неверный формат токена. Получите его у @BotFather');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await botsApi.create(name, token);
      onCreated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-3">Новый бот</h3>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Название бота"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field w-full"
        />
        <input
          type="text"
          placeholder="Токен бота от @BotFather"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="input-field w-full font-mono text-xs"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-lg disabled:opacity-50"
          >
            {loading ? 'Создание...' : 'Создать'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white"
          >
            Отмена
          </button>
        </div>
      </div>
    </form>
  );
}
