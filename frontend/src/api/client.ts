import { useAuthStore } from '@/stores/authStore';

const BASE = import.meta.env.VITE_API_URL || '/api';

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;

    const data = await res.json();
    useAuthStore.getState().setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${BASE}${url}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && useAuthStore.getState().refreshToken) {
    if (!refreshPromise) {
      refreshPromise = tryRefreshToken().finally(() => { refreshPromise = null; });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      // Retry with new token
      const newToken = useAuthStore.getState().token;
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${BASE}${url}`, { ...options, headers });
    }
  }

  if (res.status === 401) {
    useAuthStore.getState().logout();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const authApi = {
  register: (email: string, password: string) =>
    request<{ requires_verification: boolean; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string; refresh_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  verifyCode: (email: string, code: string) =>
    request<{ access_token: string; refresh_token: string }>('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
  resendCode: (email: string) =>
    request<{ detail: string }>('/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  telegramAuth: (data: Record<string, unknown>) =>
    request<{ access_token: string; refresh_token: string }>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  me: () => request<{ id: string; email: string; plan: string; email_verified: boolean; telegram_id: number | null }>('/auth/me'),
};

// Bots
export const botsApi = {
  list: () =>
    request<Array<{
      id: string;
      name: string;
      bot_username: string | null;
      platform: string;
      status: string;
      subscribers_count: number;
      has_token: boolean;
      created_at: string;
    }>>('/bots'),
  create: (name: string, token?: string, platform: string = 'telegram') =>
    request('/bots', {
      method: 'POST',
      body: JSON.stringify({ name, platform, ...(token ? { token } : {}) }),
    }),
  start: (id: string) =>
    request<{ status: string; username: string | null }>(`/bots/${id}/start`, { method: 'POST' }),
  stop: (id: string) =>
    request<{ status: string }>(`/bots/${id}/stop`, { method: 'POST' }),
  update: (id: string, data: { name?: string; token?: string }) =>
    request(`/bots/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/bots/${id}`, { method: 'DELETE' }),
};

// Payments
export const paymentsApi = {
  pricing: () =>
    request<Array<{ id: string; price_rub: number; days: number; label: string; price_per_bot: number }>>('/payments/pricing'),
  create: (bot_id: string, plan: string) =>
    request<{ payment_id: string; confirmation_url: string }>('/payments/create', {
      method: 'POST',
      body: JSON.stringify({ bot_id, plan }),
    }),
  subscriptions: () =>
    request<Array<{
      id: string; bot_id: string; bot_name: string; status: string;
      plan: string; expires_at: string; days_left: number;
    }>>('/payments/subscriptions'),
};

// Schemas
export const schemasApi = {
  get: (botId: string) =>
    request<{ id: string; version: number; schema_json: object }>(`/bots/${botId}/schema`),
  save: (botId: string, schema_json: object) =>
    request(`/bots/${botId}/schema`, {
      method: 'PUT',
      body: JSON.stringify({ schema_json }),
    }),
  validate: (botId: string) =>
    request<{ valid: boolean; errors: string[]; warnings: string[] }>(
      `/bots/${botId}/schema/validate`,
      { method: 'POST' },
    ),
};

// Knowledge Base
export const knowledgeApi = {
  files: (botId: string) =>
    request<Array<{ file_id: string; filename: string; chunks: number; created_at: string }>>(
      `/bots/${botId}/knowledge/files`,
    ),
  upload: (botId: string, file: File, apiKey: string, embeddingModel: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', apiKey);
    form.append('embedding_model', embeddingModel);
    const token = useAuthStore.getState().token;
    return fetch(`${BASE}/bots/${botId}/knowledge/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Upload failed');
      return data as { file_id: string; filename: string; chunks: number };
    });
  },
  deleteFile: (botId: string, fileId: string) =>
    request(`/bots/${botId}/knowledge/files/${fileId}`, { method: 'DELETE' }),
};

// API Keys
export const apiKeysApi = {
  list: () =>
    request<Array<{
      id: string;
      name: string;
      prefix: string;
      created_at: string;
      last_used_at: string | null;
    }>>('/keys'),
  create: (name: string) =>
    request<{
      id: string;
      name: string;
      prefix: string;
      key: string;
      created_at: string;
    }>('/keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  revoke: (keyId: string) =>
    request(`/keys/${keyId}`, { method: 'DELETE' }),
};

// OpenRouter
export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  price_prompt: number;
  price_completion: number;
  supports_tools: boolean;
  supports_vision: boolean;
  max_completion: number | null;
}

export const openrouterApi = {
  validateKey: (api_key: string) =>
    request<{
      valid: boolean;
      label: string | null;
      usage: number | null;
      limit: number | null;
      limit_remaining: number | null;
      is_free_tier: boolean | null;
    }>('/openrouter/validate-key', {
      method: 'POST',
      body: JSON.stringify({ api_key }),
    }),
  models: (search = '') =>
    request<OpenRouterModel[]>(`/openrouter/models?search=${encodeURIComponent(search)}`),
};

// AI
export const aiApi = {
  chat: (prompt: string, schema_json: object) =>
    request<{ text: string; schema: object }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt, schema_json }),
    }),
};

// SSE helper for AI streaming
export function streamAiGenerate(
  prompt: string,
  existingSchema: object | null,
  onEvent: (event: { type: string; [key: string]: unknown }) => void,
): AbortController {
  const controller = new AbortController();
  const token = useAuthStore.getState().token;

  const endpoint = existingSchema ? '/ai/modify-stream' : '/ai/generate-stream';
  fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt, existing_schema: existingSchema }),
    signal: controller.signal,
  })
    .then(async (response) => {
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onEvent(data);
            } catch {
              // skip invalid JSON
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onEvent({ type: 'error', text: err.message });
      }
    });

  return controller;
}
