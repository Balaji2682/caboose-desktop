/**
 * Web Worker for query analysis and EXPLAIN plan processing
 * Handles heavy computation for query optimization recommendations
 */

export interface QueryAnalyzerMessage {
  type: 'ANALYZE_EXPLAIN' | 'DETECT_PATTERNS' | 'GENERATE_RECOMMENDATIONS';
  data: any;
  id: string;
}

export interface QueryAnalyzerResponse {
  type: 'ANALYSIS_COMPLETE' | 'PATTERNS_COMPLETE' | 'RECOMMENDATIONS_COMPLETE' | 'ERROR';
  data: any;
  id: string;
  error?: string;
}

interface ExplainRow {
  id: number;
  select_type: string;
  table: string;
  type: string;
  possible_keys?: string;
  key?: string;
  key_len?: string;
  ref?: string;
  rows: number;
  filtered?: number;
  Extra?: string;
}

interface QueryIssue {
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  table: string;
  recommendation: string;
  estimatedImpact: string;
}

interface IndexRecommendation {
  table: string;
  columns: string[];
  reason: string;
  severity: string;
  sql: string;
  estimatedImpact: string;
}

// Analyze EXPLAIN plan and detect issues
function analyzeExplain(explainRows: ExplainRow[]): {
  issues: QueryIssue[];
  recommendations: IndexRecommendation[];
  score: number;
} {
  const issues: QueryIssue[] = [];
  const recommendations: IndexRecommendation[] = [];
  let score = 100;

  for (const row of explainRows) {
    // Full table scan detection
    if (row.type === 'ALL') {
      score -= 20;
      issues.push({
        severity: 'critical',
        type: 'FULL_TABLE_SCAN',
        message: `Full table scan on ${row.table} (${row.rows} rows)`,
        table: row.table,
        recommendation: 'Add index to optimize query',
        estimatedImpact: `Scanning ${row.rows} rows`,
      });

      // Generate index recommendation
      if (row.possible_keys) {
        const columns = row.possible_keys.split(',').map((k) => k.trim());
        recommendations.push({
          table: row.table,
          columns,
          reason: 'Full table scan detected',
          severity: 'critical',
          sql: `CREATE INDEX idx_${row.table}_${columns.join('_')} ON ${row.table} (${columns.join(', ')});`,
          estimatedImpact: `Reduce scan from ${row.rows} to ~${Math.ceil(row.rows * 0.1)} rows`,
        });
      }
    }

    // Using filesort
    if (row.Extra?.includes('Using filesort')) {
      score -= 10;
      issues.push({
        severity: 'warning',
        type: 'FILESORT',
        message: `Filesort required for ${row.table}`,
        table: row.table,
        recommendation: 'Add index on ORDER BY columns',
        estimatedImpact: 'In-memory sort required',
      });
    }

    // Using temporary table
    if (row.Extra?.includes('Using temporary')) {
      score -= 15;
      issues.push({
        severity: 'warning',
        type: 'TEMPORARY_TABLE',
        message: `Temporary table created for ${row.table}`,
        table: row.table,
        recommendation: 'Optimize GROUP BY or DISTINCT clause',
        estimatedImpact: 'Additional memory/disk usage',
      });
    }

    // High row count with no index
    if (row.rows > 10000 && !row.key) {
      score -= 15;
      issues.push({
        severity: 'critical',
        type: 'HIGH_ROW_SCAN',
        message: `Scanning ${row.rows} rows without index on ${row.table}`,
        table: row.table,
        recommendation: 'Add appropriate index',
        estimatedImpact: `${row.rows} rows examined`,
      });
    }

    // Low filtered percentage
    if (row.filtered && row.filtered < 10) {
      score -= 5;
      issues.push({
        severity: 'info',
        type: 'LOW_SELECTIVITY',
        message: `Low filter selectivity (${row.filtered}%) on ${row.table}`,
        table: row.table,
        recommendation: 'Consider more selective WHERE conditions',
        estimatedImpact: `Only ${row.filtered}% of rows match condition`,
      });
    }

    // Index not used
    if (row.possible_keys && !row.key) {
      score -= 10;
      issues.push({
        severity: 'warning',
        type: 'INDEX_NOT_USED',
        message: `Available indexes not used for ${row.table}`,
        table: row.table,
        recommendation: 'Review WHERE clause to utilize existing indexes',
        estimatedImpact: 'Available indexes: ' + row.possible_keys,
      });
    }
  }

  return {
    issues,
    recommendations,
    score: Math.max(0, score),
  };
}

// Detect query anti-patterns
function detectPatterns(queries: Array<{ sql: string; executionTime?: number }>): {
  patterns: Array<{ type: string; count: number; examples: string[]; severity: string }>;
  summary: {
    totalQueries: number;
    slowQueries: number;
    nPlusOneCount: number;
    selectStarCount: number;
  };
} {
  const patterns = new Map<string, { count: number; examples: string[]; severity: string }>();
  let slowQueries = 0;
  let nPlusOneCount = 0;
  let selectStarCount = 0;

  const queryCounts = new Map<string, number>();

  for (const query of queries) {
    const sql = query.sql.trim().toUpperCase();

    // Detect slow queries
    if (query.executionTime && query.executionTime > 1000) {
      slowQueries++;
    }

    // Detect SELECT *
    if (sql.includes('SELECT *')) {
      selectStarCount++;
      addPattern(patterns, 'SELECT_STAR', query.sql, 'warning');
    }

    // Detect missing LIMIT
    if (sql.startsWith('SELECT') && !sql.includes('LIMIT')) {
      addPattern(patterns, 'NO_LIMIT', query.sql, 'info');
    }

    // Detect LIKE with leading wildcard
    if (sql.includes('LIKE \'%')) {
      addPattern(patterns, 'LEADING_WILDCARD', query.sql, 'warning');
    }

    // Detect OR in WHERE clause (may not use index)
    if (sql.includes(' OR ')) {
      addPattern(patterns, 'OR_CONDITION', query.sql, 'info');
    }

    // Track query frequency for N+1 detection
    const normalizedQuery = normalizeQuery(sql);
    queryCounts.set(normalizedQuery, (queryCounts.get(normalizedQuery) || 0) + 1);
  }

  // Detect N+1 queries (same query executed many times)
  for (const [query, count] of queryCounts) {
    if (count > 10) {
      nPlusOneCount++;
      addPattern(patterns, 'N_PLUS_ONE', `Query executed ${count} times`, 'critical');
    }
  }

  return {
    patterns: Array.from(patterns.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      examples: data.examples.slice(0, 3),
      severity: data.severity,
    })),
    summary: {
      totalQueries: queries.length,
      slowQueries,
      nPlusOneCount,
      selectStarCount,
    },
  };
}

// Helper function to add pattern
function addPattern(
  patterns: Map<string, { count: number; examples: string[]; severity: string }>,
  type: string,
  example: string,
  severity: string
) {
  const existing = patterns.get(type);
  if (existing) {
    existing.count++;
    if (existing.examples.length < 5) {
      existing.examples.push(example);
    }
  } else {
    patterns.set(type, { count: 1, examples: [example], severity });
  }
}

// Normalize query for comparison
function normalizeQuery(sql: string): string {
  const result = sql
    .replace(/\d+/g, 'N')
    .replace(/'[^']*'/g, "'?'")
    .replace(/\s+/g, ' ')
    .trim();
  return result;
}

// Generate comprehensive recommendations
function generateRecommendations(data: {
  explainResults?: Array<{ rows: ExplainRow[] }>;
  patterns?: any;
}): Array<{
  priority: number;
  category: string;
  title: string;
  description: string;
  action: string;
}> {
  const recommendations: Array<{
    priority: number;
    category: string;
    title: string;
    description: string;
    action: string;
  }> = [];

  // Recommendations from EXPLAIN analysis
  if (data.explainResults) {
    for (const result of data.explainResults) {
      const analysis = analyzeExplain(result.rows);

      for (const issue of analysis.issues) {
        recommendations.push({
          priority: issue.severity === 'critical' ? 1 : issue.severity === 'warning' ? 2 : 3,
          category: 'Performance',
          title: issue.type.replace(/_/g, ' '),
          description: issue.message,
          action: issue.recommendation,
        });
      }
    }
  }

  // Recommendations from pattern detection
  if (data.patterns) {
    for (const pattern of data.patterns.patterns) {
      if (pattern.count > 5) {
        recommendations.push({
          priority: pattern.severity === 'critical' ? 1 : pattern.severity === 'warning' ? 2 : 3,
          category: 'Query Pattern',
          title: pattern.type.replace(/_/g, ' '),
          description: `Detected ${pattern.count} occurrences`,
          action: getPatternRecommendation(pattern.type),
        });
      }
    }
  }

  // Sort by priority
  return recommendations.sort((a, b) => a.priority - b.priority);
}

function getPatternRecommendation(patternType: string): string {
  const recommendations: Record<string, string> = {
    SELECT_STAR: 'Specify only needed columns to reduce data transfer',
    NO_LIMIT: 'Add LIMIT clause to prevent large result sets',
    LEADING_WILDCARD: 'Avoid leading wildcards in LIKE; use full-text search instead',
    OR_CONDITION: 'Consider using IN() or UNION for better index usage',
    N_PLUS_ONE: 'Use JOINs or batch queries to eliminate N+1 pattern',
  };
  return recommendations[patternType] || 'Review and optimize this query pattern';
}

// Worker message handler
self.addEventListener('message', (event: MessageEvent<QueryAnalyzerMessage>) => {
  const { type, data, id } = event.data;

  try {
    let result: any;

    switch (type) {
      case 'ANALYZE_EXPLAIN':
        result = analyzeExplain(data.explainRows);
        self.postMessage({
          type: 'ANALYSIS_COMPLETE',
          data: result,
          id,
        } as QueryAnalyzerResponse);
        break;

      case 'DETECT_PATTERNS':
        result = detectPatterns(data.queries);
        self.postMessage({
          type: 'PATTERNS_COMPLETE',
          data: result,
          id,
        } as QueryAnalyzerResponse);
        break;

      case 'GENERATE_RECOMMENDATIONS':
        result = generateRecommendations(data);
        self.postMessage({
          type: 'RECOMMENDATIONS_COMPLETE',
          data: result,
          id,
        } as QueryAnalyzerResponse);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      data: null,
      id,
      error: error instanceof Error ? error.message : String(error),
    } as QueryAnalyzerResponse);
  }
});

// Signal ready
self.postMessage({ type: 'ANALYSIS_COMPLETE', data: null, id: 'init' } as QueryAnalyzerResponse);
