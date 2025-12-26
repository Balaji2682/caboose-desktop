import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { GetQueryStatistics, ClearQueryStatistics, databaseAPI, type QueryStatistic, type ExplainResult } from '@/lib/wails';
import type {
  SmartRecommendation,
  RequestQueryGroup,
  N1Warning,
  QueryDistribution,
  QueryFilters,
  QueryStatistics,
} from '@/types/query';

interface QueryStore {
  // Existing State
  queries: QueryStatistic[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // New Enhanced State
  selectedQueryId: string | null;
  explainResults: Map<string, ExplainResult>;
  n1Warnings: N1Warning[];
  requestGroups: RequestQueryGroup[];
  recommendations: SmartRecommendation[];
  distribution: QueryDistribution | null;
  ignoredPatterns: Set<string>;

  // Loading states
  recommendationsLoading: boolean;
  distributionLoading: boolean;
  requestGroupsLoading: boolean;

  // Comparison state
  comparisonMode: boolean;
  beforeQuery: QueryStatistic | null;
  afterQuery: QueryStatistic | null;

  // Filter state
  filters: QueryFilters;

  // Analytics/derived state
  statistics: QueryStatistics;

  // Existing Actions
  fetchQueries: () => Promise<void>;
  clearStatistics: () => Promise<void>;
  setQueries: (queries: QueryStatistic[]) => void;

  // New Actions
  selectQuery: (queryId: string | null) => void;
  fetchRecommendations: () => Promise<void>;
  fetchN1Warnings: () => Promise<void>;
  fetchRequestGroups: (limit?: number) => Promise<void>;
  fetchDistribution: () => Promise<void>;
  analyzeQuery: (queryId: string) => Promise<void>;
  ignorePattern: (fingerprint: string) => Promise<void>;
  setFilters: (filters: Partial<QueryFilters>) => void;
  setComparisonMode: (enabled: boolean) => void;
  updateStatistics: () => void;
}

const calculateStatistics = (queries: QueryStatistic[]): QueryStatistics => {
  const totalQueries = queries.length;
  const totalExecutions = queries.reduce((sum, q) => sum + q.count, 0);
  const avgResponseTime = totalQueries > 0
    ? queries.reduce((sum, q) => sum + q.avgTime, 0) / totalQueries
    : 0;
  const nPlusOneCount = queries.filter((q) => q.issue === 'n+1').length;
  const slowCount = queries.filter((q) => q.issue === 'slow' || q.avgTime > 100).length;
  const issueCount = nPlusOneCount + slowCount;

  // Calculate health score (0-100)
  let healthScore = 100;
  healthScore -= Math.min(30, nPlusOneCount * 5); // -5 per N+1, max -30
  healthScore -= Math.min(30, slowCount * 3); // -3 per slow query, max -30
  healthScore -= Math.min(20, (avgResponseTime / 10)); // Penalty for avg time
  healthScore = Math.max(0, healthScore);

  return {
    totalQueries,
    totalExecutions,
    avgResponseTime,
    nPlusOneCount,
    slowCount,
    healthScore,
    issueCount,
  };
};

export const useQueryStore = create<QueryStore>()(
  immer((set, get) => ({
    // Initial State
    queries: [],
    loading: false,
    error: null,
    lastUpdated: null,

    // New Enhanced State
    selectedQueryId: null,
    explainResults: new Map(),
    n1Warnings: [],
    requestGroups: [],
    recommendations: [],
    distribution: null,
    ignoredPatterns: new Set(),

    // Loading states
    recommendationsLoading: false,
    distributionLoading: false,
    requestGroupsLoading: false,

    // Comparison state
    comparisonMode: false,
    beforeQuery: null,
    afterQuery: null,

    // Filter state
    filters: {
      search: '',
      issueType: 'all',
      table: null,
      operation: null,
      minCount: 0,
      minAvgTime: 0,
      sortBy: 'count',
      sortDirection: 'desc',
    },

    // Analytics/derived state
    statistics: {
      totalQueries: 0,
      totalExecutions: 0,
      avgResponseTime: 0,
      nPlusOneCount: 0,
      slowCount: 0,
      healthScore: 100,
      issueCount: 0,
    },

    // Existing Actions
    fetchQueries: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const stats = await GetQueryStatistics();
        set((state) => {
          state.queries = stats || [];
          state.loading = false;
          state.lastUpdated = new Date();
        });
        get().updateStatistics();
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to fetch query statistics';
          state.loading = false;
        });
      }
    },

    clearStatistics: async () => {
      try {
        await ClearQueryStatistics();
        set((state) => {
          state.queries = [];
          state.lastUpdated = null;
          state.selectedQueryId = null;
          state.recommendations = [];
          state.n1Warnings = [];
          state.explainResults = new Map();
        });
        get().updateStatistics();
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to clear statistics';
        });
      }
    },

    setQueries: (queries) => {
      set((state) => {
        state.queries = queries;
      });
      get().updateStatistics();
    },

    // New Actions
    selectQuery: (queryId) =>
      set((state) => {
        state.selectedQueryId = queryId;
      }),

    fetchRecommendations: async () => {
      set((state) => {
        state.recommendationsLoading = true;
      });

      try {
        const recs = await databaseAPI.getSmartRecommendations();

        set((state) => {
          state.recommendations = recs;
          state.recommendationsLoading = false;
        });
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to fetch recommendations';
          state.recommendationsLoading = false;
        });
      }
    },

    fetchN1Warnings: async () => {
      try {
        const warnings = await databaseAPI.getN1Warnings();

        set((state) => {
          state.n1Warnings = warnings;
        });
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to fetch N+1 warnings';
        });
      }
    },

    fetchRequestGroups: async (limit = 50) => {
      set((state) => {
        state.requestGroupsLoading = true;
      });

      try {
        const groups = await databaseAPI.getRequestQueryGroups(limit);

        set((state) => {
          state.requestGroups = groups;
          state.requestGroupsLoading = false;
        });
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to fetch request groups';
          state.requestGroupsLoading = false;
        });
      }
    },

    fetchDistribution: async () => {
      set((state) => {
        state.distributionLoading = true;
      });

      try {
        const dist = await databaseAPI.getQueryDistribution();

        set((state) => {
          state.distribution = dist;
          state.distributionLoading = false;
        });
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to fetch distribution';
          state.distributionLoading = false;
        });
      }
    },

    analyzeQuery: async (queryId) => {
      const query = get().queries.find((q) => q.id === queryId);
      if (!query) return;

      try {
        const result = await databaseAPI.explainQuery(query.sql);
        if (result) {
          set((state) => {
            state.explainResults.set(queryId, result);
          });
        }
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to analyze query';
        });
      }
    },

    ignorePattern: async (fingerprint) => {
      try {
        await databaseAPI.ignoreQueryPattern(fingerprint);

        set((state) => {
          state.ignoredPatterns.add(fingerprint);
          // Remove ignored queries from the list
          state.queries = state.queries.filter((q) => q.fingerprint !== fingerprint);
        });
        get().updateStatistics();
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to ignore pattern';
        });
      }
    },

    setFilters: (filters) =>
      set((state) => {
        state.filters = { ...state.filters, ...filters };
      }),

    setComparisonMode: (enabled) =>
      set((state) => {
        state.comparisonMode = enabled;
        if (!enabled) {
          state.beforeQuery = null;
          state.afterQuery = null;
        }
      }),

    updateStatistics: () => {
      const queries = get().queries;
      const stats = calculateStatistics(queries);
      set((state) => {
        state.statistics = stats;
      });
    },
  }))
);
