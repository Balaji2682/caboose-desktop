import { create } from 'zustand';
import { GetDatabaseHealth, type DatabaseHealth } from '@/lib/wails';

interface HealthStore {
  health: DatabaseHealth | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  fetchHealth: () => Promise<void>;
  setHealth: (health: DatabaseHealth | null) => void;
}

export const useHealthStore = create<HealthStore>((set) => ({
  health: null,
  loading: false,
  error: null,
  lastUpdated: null,

  fetchHealth: async () => {
    set({ loading: true, error: null });
    try {
      const health = await GetDatabaseHealth();
      set({
        health,
        loading: false,
        lastUpdated: new Date(),
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch database health',
        loading: false,
      });
    }
  },

  setHealth: (health) => set({ health }),
}));
