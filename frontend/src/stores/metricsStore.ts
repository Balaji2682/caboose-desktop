import { create } from 'zustand';

export interface SystemMetrics {
  cpu: number;
  memory: number;
  goroutines: number;
  timestamp: string;
  memoryAllocMB: number;
  memorySysMB: number;
  numGC: number;
}

export interface RequestMetrics {
  totalRequests: number;
  requestRate: number;
  avgResponseTime: number;
  errorRate: number;
  activeConnections: number;
}

export interface TimeSeriesPoint {
  time: string;
  cpu: number;
  memory: number;
  requests: number;
  responseTime: number;
  errors: number;
}

export interface EndpointMetric {
  endpoint: string;
  requests: number;
  avgTime: number;
  p95: number;
  errors: number;
}

export interface Metrics {
  system: SystemMetrics;
  requests: RequestMetrics;
  timeSeries: TimeSeriesPoint[];
  topEndpoints: EndpointMetric[];
  lastUpdated: string;
}

interface MetricsStore {
  metrics: Metrics | null;
  loading: boolean;
  error: string | null;

  fetchMetrics: () => Promise<void>;
  resetMetrics: () => Promise<void>;
}

export const useMetricsStore = create<MetricsStore>((set) => ({
  metrics: null,
  loading: false,
  error: null,

  fetchMetrics: async () => {
    set({ loading: true, error: null });
    try {
      if (typeof window !== 'undefined' && (window as any).go) {
        const metrics = await (window as any).go.main.App.GetMetrics();
        set({
          metrics: metrics || null,
          loading: false,
          error: null,
        });
      } else {
        set({ metrics: null, loading: false });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch metrics',
        loading: false,
      });
    }
  },

  resetMetrics: async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).go) {
        await (window as any).go.main.App.ResetMetrics();
        set({ metrics: null });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to reset metrics',
      });
    }
  },
}));
