// Query Analysis Types

export interface SmartRecommendation {
  id: string;
  type: 'n+1' | 'index' | 'slow' | 'select-star' | 'duplicate' | 'structure';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: ImpactEstimate;
  affectedQueries: string[];
  fix: RecommendationFix;
  estimatedEffort: 'trivial' | 'easy' | 'moderate' | 'complex';
}

export interface ImpactEstimate {
  queryTimeReduction: number; // Percentage (0-100)
  queryCountReduction: number; // For N+1 queries
  totalTimeSaved: number; // Milliseconds per request
  confidenceScore: number; // 0-100
}

export interface RecommendationFix {
  type: 'rails-code' | 'sql-index' | 'query-rewrite' | 'configuration';
  code: string;
  explanation: string;
  railsModel?: string;
  railsAssociation?: string;
}

export interface RequestQueryGroup {
  requestId: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  timestamp: string;
  totalQueries: number;
  totalDuration: number;
  queries: QueryInfo[];
  n1Warnings: N1Warning[];
  slowQueries: QueryInfo[];
  duplicateCount: number;
  healthScore: number; // 0-100
}

export interface QueryInfo {
  sql: string;
  fingerprint: string;
  duration: number;
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  count: number;
  isSlow: boolean;
  hasSelectStar: boolean;
}

export interface N1Warning {
  fingerprint: string;
  table: string;
  count: number;
  totalDuration: number;
  confidence: number; // 0-100
  suggestion: string;
  examples: string[];
}

export interface TableDistribution {
  table: string;
  queryCount: number;
  avgTime: number;
  totalTime: number;
  issueCount: number;
}

export interface OperationDistribution {
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  count: number;
  avgTime: number;
  percentage: number;
}

export interface QueryDistribution {
  byTable: TableDistribution[];
  byOperation: OperationDistribution[];
}

export interface QueryComparison {
  before: {
    sql: string;
    explainResult: ExplainResult;
    estimatedTime: number;
    rowsExamined: number;
    performanceScore: number;
  };
  after: {
    sql: string;
    explainResult: ExplainResult;
    estimatedTime: number;
    rowsExamined: number;
    performanceScore: number;
  };
  improvement: {
    timeReduction: number; // Percentage
    rowsReduction: number; // Percentage
    scoreImprovement: number; // Absolute difference
  };
}

export interface ExplainResult {
  rows: Record<string, unknown>[];
  columns: string[];
  query: string;
  executionTime: number;
  recommendations: IndexRecommendation[];
  analysis: ExplainAnalysis;
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  reason: string;
  severity: 'high' | 'medium' | 'low';
  sql: string;
  estimatedImpact: string;
}

export interface ExplainAnalysis {
  hasTableScan: boolean;
  hasIndexScan: boolean;
  rowsExamined: number;
  usingTemporary: boolean;
  usingFilesort: boolean;
  summary: string;
  performanceScore: number; // 0-100
}

export interface QueryStatistics {
  totalQueries: number;
  totalExecutions: number;
  avgResponseTime: number;
  nPlusOneCount: number;
  slowCount: number;
  healthScore: number; // 0-100
  issueCount: number;
}

export interface QueryFilters {
  search: string;
  issueType: 'all' | 'n+1' | 'slow' | 'select-star' | 'healthy';
  table: string | null;
  operation: string | null;
  minCount: number;
  minAvgTime: number;
  sortBy: 'count' | 'avgTime' | 'totalTime' | 'impact';
  sortDirection: 'asc' | 'desc';
}
