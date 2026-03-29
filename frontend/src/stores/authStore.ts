import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  email: string | null;
  plan: string | null;
  setAuth: (token: string, email: string, plan: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      plan: null,
      setAuth: (token, email, plan) => set({ token, email, plan }),
      logout: () => set({ token: null, email: null, plan: null }),
    }),
    { name: 'botforge-auth' },
  ),
);
