import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  email: string | null;
  plan: string | null;
  setAuth: (token: string, email: string, plan: string, refreshToken?: string) => void;
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      email: null,
      plan: null,
      setAuth: (token, email, plan, refreshToken) =>
        set({ token, email, plan, ...(refreshToken ? { refreshToken } : {}) }),
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      logout: () => set({ token: null, refreshToken: null, email: null, plan: null }),
    }),
    { name: 'botforge-auth' },
  ),
);
