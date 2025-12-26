import { create } from 'zustand';

export interface Exception {
  id: string;
  type: string;
  message: string;
  severity: 'error' | 'warning';
  count: number;
  firstSeen: string;
  lastSeen: string;
  file: string;
  line: number;
  stackTrace: string[];
  context?: Record<string, unknown>;
  resolved: boolean;
  ignored: boolean;
  fingerprint: string;
}

interface ExceptionStore {
  exceptions: Exception[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  fetchExceptions: () => Promise<void>;
  resolveException: (id: string) => Promise<void>;
  ignoreException: (id: string) => Promise<void>;
  clearExceptions: () => Promise<void>;
}

export const useExceptionStore = create<ExceptionStore>((set, get) => ({
  exceptions: [],
  loading: false,
  error: null,
  lastUpdated: null,

  fetchExceptions: async () => {
    set({ loading: true, error: null });
    try {
      // Check if running in Wails environment
      if (typeof window !== 'undefined' && (window as any).go) {
        const exceptions = await (window as any).go.main.App.GetExceptions();
        set({
          exceptions: exceptions || [],
          loading: false,
          lastUpdated: new Date(),
          error: null,
        });
      } else {
        set({ exceptions: [], loading: false });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch exceptions',
        loading: false,
      });
    }
  },

  resolveException: async (id: string) => {
    try {
      if (typeof window !== 'undefined' && (window as any).go) {
        await (window as any).go.main.App.ResolveException(id);
        // Refresh exceptions list
        await get().fetchExceptions();
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to resolve exception',
      });
    }
  },

  ignoreException: async (id: string) => {
    try {
      if (typeof window !== 'undefined' && (window as any).go) {
        await (window as any).go.main.App.IgnoreException(id);
        // Refresh exceptions list
        await get().fetchExceptions();
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to ignore exception',
      });
    }
  },

  clearExceptions: async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).go) {
        await (window as any).go.main.App.ClearExceptions();
        set({ exceptions: [], lastUpdated: new Date() });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to clear exceptions',
      });
    }
  },
}));
