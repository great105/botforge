import { create } from 'zustand';
import type { BotInfo } from '@/types/schema';

interface BotState {
  bots: BotInfo[];
  loading: boolean;
  setBots: (bots: BotInfo[]) => void;
  setLoading: (loading: boolean) => void;
  updateBot: (id: string, data: Partial<BotInfo>) => void;
  removeBot: (id: string) => void;
}

export const useBotStore = create<BotState>((set) => ({
  bots: [],
  loading: false,
  setBots: (bots) => set({ bots }),
  setLoading: (loading) => set({ loading }),
  updateBot: (id, data) =>
    set((s) => ({
      bots: s.bots.map((b) => (b.id === id ? { ...b, ...data } : b)),
    })),
  removeBot: (id) =>
    set((s) => ({ bots: s.bots.filter((b) => b.id !== id) })),
}));
