import { useAuthStore } from '@/stores/authStore';

const BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${url}`, { ...options, headers });

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
    request<{ access_token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ id: string; email: string; plan: string }>('/auth/me'),
};

// Bots
export const botsApi = {
  list: () =>
    request<Array<{
      id: string;
      name: string;
      bot_username: string | null;
      status: string;
      subscribers_count: number;
      created_at: string;
    }>>('/bots'),
  create: (name: string, token: string) =>
    request('/bots', {
      method: 'POST',
      body: JSON.stringify({ name, token }),
    }),
  start: (id: string) =>
    request<{ status: string; username: string | null }>(`/bots/${id}/start`, { method: 'POST' }),
  stop: (id: string) =>
    request<{ status: string }>(`/bots/${id}/stop`, { method: 'POST' }),
  delete: (id: string) =>
    request(`/bots/${id}`, { method: 'DELETE' }),
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

  fetch(`${BASE}/ai/generate-stream`, {
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
