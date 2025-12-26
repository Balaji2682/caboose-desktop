import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  ArrowUpDown,
  RefreshCw,
  Trash2,
  Search,
  Download,
  Filter,
  Lightbulb,
  Database,
  Copy,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useQueryStore } from '@/stores/queryStore';
import { databaseAPI } from '@/lib/wails';
import type { QueryStatistic, ExplainResult } from '@/lib/wails';
import { toast } from 'sonner';

type SortField = 'count' | 'avgTime' | 'fingerprint';

interface QueryRowProps {
  query: QueryStatistic;
  isSelected: boolean;
  onSelect: () => void;
}

const QueryRow = memo<QueryRowProps>(({ query, isSelected, onSelect }) => (
  <button
    onClick={onSelect}
    className={cn(
      'w-full px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50 transition-colors text-left',
      isSelected && 'bg-cyan-500/5 border-l-2 border-l-cyan-500'
    )}
  >
    <div className="flex items-start gap-3">
      {query.issue && (
        <AlertTriangle
          className={cn(
            'w-4 h-4 mt-0.5 flex-shrink-0',
            query.issue === 'n+1' ? 'text-red-400' : 'text-yellow-400'
          )}
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-300 truncate font-mono">{query.fingerprint}</p>
        <p className="text-xs text-gray-500 mt-1">Executed {query.count}x</p>
      </div>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400 w-16 text-right">{query.count}x</span>
        <span
          className={cn(
            'w-16 text-right',
            query.avgTime > 100 ? 'text-yellow-400' : 'text-gray-400'
          )}
        >
          {query.avgTime.toFixed(1)}ms
        </span>
      </div>
    </div>
  </button>
));

QueryRow.displayName = 'QueryRow';

export const QueryAnalysis = memo(() => {
  const { queries, loading, fetchQueries, clearStatistics } = useQueryStore();
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('count');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [issueFilter, setIssueFilter] = useState<'all' | 'n+1' | 'slow' | 'none'>('all');
  const [explainResult, setExplainResult] = useState<ExplainResult | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);

  useEffect(() => {
    fetchQueries();
    const interval = setInterval(fetchQueries, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchQueries]);

  useEffect(() => {
    if (queries.length > 0 && !selectedQuery) {
      setSelectedQuery(queries[0].id);
    }
  }, [queries, selectedQuery]);

  const selectedQueryData = useMemo(
    () => queries.find((q) => q.id === selectedQuery),
    [queries, selectedQuery]
  );

  const filteredQueries = useMemo(() => {
    let filtered = queries;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.fingerprint.toLowerCase().includes(term) || q.sql.toLowerCase().includes(term)
      );
    }

    // Issue filter
    if (issueFilter !== 'all') {
      if (issueFilter === 'none') {
        filtered = filtered.filter((q) => !q.issue);
      } else {
        filtered = filtered.filter((q) => q.issue === issueFilter);
      }
    }

    return filtered;
  }, [queries, searchTerm, issueFilter]);

  const sortedQueries = useMemo(() => {
    return [...filteredQueries].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      if (sortField === 'fingerprint') {
        return multiplier * a.fingerprint.localeCompare(b.fingerprint);
      }
      return multiplier * (a[sortField] - b[sortField]);
    });
  }, [filteredQueries, sortField, sortDirection]);

  const toggleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDirection('desc');
      return field;
    });
  }, []);

  const stats = useMemo(() => {
    const nPlusOneCount = queries.filter((q) => q.issue === 'n+1').length;
    const slowCount = queries.filter((q) => q.issue === 'slow' || q.avgTime > 100).length;
    const totalQueries = queries.reduce((sum, q) => sum + q.count, 0);
    const avgResponseTime =
      queries.length > 0 ? queries.reduce((sum, q) => sum + q.avgTime, 0) / queries.length : 0;

    return { nPlusOneCount, slowCount, totalQueries, avgResponseTime };
  }, [queries]);

  const handleRefresh = useCallback(() => {
    fetchQueries();
  }, [fetchQueries]);

  const handleClear = useCallback(async () => {
    if (confirm('Are you sure you want to clear all query statistics?')) {
      await clearStatistics();
      setSelectedQuery(null);
    }
  }, [clearStatistics]);

  const handleExport = useCallback(
    (format: 'json' | 'csv') => {
      const data = filteredQueries;

      if (format === 'json') {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `query-analysis-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // CSV export
        const headers = ['Fingerprint', 'Count', 'Avg Time (ms)', 'Total Time (ms)', 'Issue', 'Last Executed'];
        const rows = data.map((q) => [
          q.fingerprint,
          q.count.toString(),
          q.avgTime.toFixed(2),
          q.totalTime.toFixed(2),
          q.issue || 'none',
          q.lastExecuted,
        ]);
        const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `query-analysis-${new Date().toISOString()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [filteredQueries]
  );

  const getOptimizationSuggestions = useCallback((query: QueryStatistic): string[] => {
    const suggestions: string[] = [];

    if (query.issue === 'n+1') {
      suggestions.push('Use eager loading with .includes() or .joins() to reduce query count');
      suggestions.push('Consider caching if this data changes infrequently');
      suggestions.push('Batch queries using .where(id: [...]) instead of individual lookups');
    }

    if (query.avgTime > 100) {
      suggestions.push('Add database indexes on frequently queried columns');
      suggestions.push('Review EXPLAIN plan to identify bottlenecks');
      suggestions.push('Consider denormalizing data for frequently accessed patterns');
    }

    if (query.sql.toLowerCase().includes('select *')) {
      suggestions.push('Specify only required columns instead of SELECT *');
      suggestions.push('Reducing data transfer can improve query performance');
    }

    if (query.count > 1000) {
      suggestions.push('High execution frequency - consider caching this query result');
      suggestions.push('Use database query result caching if available');
    }

    if (suggestions.length === 0) {
      suggestions.push('Query performance looks good! No immediate optimization needed.');
    }

    return suggestions;
  }, []);

  const handleExplainQuery = useCallback(async () => {
    if (!selectedQueryData) return;

    setLoadingExplain(true);
    try {
      const result = await databaseAPI.explainQuery(selectedQueryData.sql);
      setExplainResult(result);
      toast.success('EXPLAIN analysis completed');
    } catch (error) {
      toast.error('Failed to analyze query: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setExplainResult(null);
    } finally {
      setLoadingExplain(false);
    }
  }, [selectedQueryData]);

  const handleCopySQL = useCallback((sql: string) => {
    navigator.clipboard.writeText(sql);
    toast.success('SQL copied to clipboard');
  }, []);

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Query Analysis</h1>
          <p className="text-sm text-gray-400">Monitor SQL queries and detect performance issues</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-gray-400">N+1</span>
              <Badge variant="destructive">{stats.nPlusOneCount}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded" />
              <span className="text-gray-400">Slow</span>
              <Badge variant="warning">{stats.slowCount}</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4 mr-1" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
            <Download className="w-4 h-4 mr-1" />
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Card className="bg-gray-900 border-gray-800 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search queries by fingerprint or SQL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <Tabs value={issueFilter} onValueChange={(v) => setIssueFilter(v as any)}>
              <TabsList className="bg-gray-800">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="n+1">N+1</TabsTrigger>
                <TabsTrigger value="slow">Slow</TabsTrigger>
                <TabsTrigger value="none">Healthy</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="text-sm text-gray-400">
            {filteredQueries.length} / {queries.length} queries
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800 p-5">
          <p className="text-sm text-gray-400 mb-2">Total Queries</p>
          <p className="text-2xl font-bold text-white">{stats.totalQueries.toLocaleString()}</p>
          <p className="text-xs mt-1 text-gray-500">Executed</p>
        </Card>
        <Card className="bg-gray-900 border-gray-800 p-5">
          <p className="text-sm text-gray-400 mb-2">Avg Response Time</p>
          <p className="text-2xl font-bold text-white">{stats.avgResponseTime.toFixed(1)}ms</p>
          <p className="text-xs mt-1 text-gray-500">Across all queries</p>
        </Card>
        <Card className="bg-gray-900 border-gray-800 p-5">
          <p className="text-sm text-gray-400 mb-2">Unique Fingerprints</p>
          <p className="text-2xl font-bold text-white">{queries.length}</p>
          <p className="text-xs mt-1 text-gray-500">Tracked patterns</p>
        </Card>
        <Card className="bg-gray-900 border-gray-800 p-5">
          <p className="text-sm text-gray-400 mb-2">Issues Detected</p>
          <p className="text-2xl font-bold text-white">{stats.nPlusOneCount + stats.slowCount}</p>
          <p className="text-xs mt-1 text-gray-500">
            {stats.nPlusOneCount} N+1, {stats.slowCount} slow
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Query List */}
        <Card className="bg-gray-900 border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">Query Fingerprints</h2>
          </div>

          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-800 flex items-center text-xs text-gray-400">
            <div className="flex-1">Query Pattern</div>
            <button
              onClick={() => toggleSort('count')}
              className="w-20 flex items-center gap-1 hover:text-gray-300"
            >
              Count <ArrowUpDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => toggleSort('avgTime')}
              className="w-20 flex items-center gap-1 hover:text-gray-300"
            >
              Avg Time <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>

          <ScrollArea className="h-96">
            {sortedQueries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                <p className="text-sm">No query statistics available</p>
                <p className="text-xs mt-2">Execute some database queries to see statistics here</p>
              </div>
            ) : (
              sortedQueries.map((query) => (
                <QueryRow
                  key={query.id}
                  query={query}
                  isSelected={selectedQuery === query.id}
                  onSelect={() => setSelectedQuery(query.id)}
                />
              ))
            )}
          </ScrollArea>
        </Card>

        {/* Query Details */}
        <div className="space-y-4">
          {selectedQueryData && (
            <>
              {selectedQueryData.issue && (
                <Card
                  className={cn(
                    'p-4',
                    selectedQueryData.issue === 'n+1'
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-yellow-500/5 border-yellow-500/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={cn(
                        'w-5 h-5 mt-0.5',
                        selectedQueryData.issue === 'n+1' ? 'text-red-400' : 'text-yellow-400'
                      )}
                    />
                    <div>
                      <h3
                        className={cn(
                          'font-medium mb-1',
                          selectedQueryData.issue === 'n+1' ? 'text-red-400' : 'text-yellow-400'
                        )}
                      >
                        {selectedQueryData.issue === 'n+1' ? 'N+1 Query Detected' : 'Slow Query Warning'}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {selectedQueryData.issue === 'n+1'
                          ? 'This query is being executed multiple times in a loop. Consider using includes() or joins().'
                          : 'This query is taking longer than expected. Consider adding indexes.'}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="bg-gray-900 border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Query Details</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExplainQuery}
                      disabled={loadingExplain}
                    >
                      <Database className={cn('w-4 h-4 mr-2', loadingExplain && 'animate-spin')} />
                      Analyze with EXPLAIN
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-2">Last Executed</label>
                    <code className="text-sm text-gray-300 bg-gray-800 px-3 py-2 rounded block">
                      {new Date(selectedQueryData.lastExecuted).toLocaleString()}
                    </code>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 block mb-2">Full SQL Query</label>
                    <pre className="text-xs text-gray-300 bg-gray-800 p-4 rounded overflow-x-auto">
                      {selectedQueryData.sql}
                    </pre>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 block mb-2">Execution Count</label>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-cyan-400" />
                        <span className="text-lg font-bold text-white">{selectedQueryData.count}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-2">Average Time</label>
                      <span
                        className={cn(
                          'text-lg font-bold',
                          selectedQueryData.avgTime > 100 ? 'text-yellow-400' : 'text-white'
                        )}
                      >
                        {selectedQueryData.avgTime.toFixed(1)}ms
                      </span>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-2">Total Time</label>
                      <span className="text-lg font-bold text-white">
                        {selectedQueryData.totalTime.toFixed(1)}ms
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-gray-900 border-gray-800 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-white font-medium">Optimization Suggestions</h3>
                </div>
                <div className="space-y-3">
                  {getOptimizationSuggestions(selectedQueryData).map((suggestion, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-cyan-400 font-medium">{idx + 1}</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="bg-gray-900 border-gray-800 p-6">
                <h3 className="text-white font-medium mb-4">Performance Breakdown</h3>
                <div className="space-y-3">
                  {(() => {
                    // Calculate approximate breakdown based on query stats
                    const dbTimePercent = Math.min(95, Math.max(70, 85 + (selectedQueryData.avgTime - 50) / 10));
                    const networkPercent = Math.max(5, 15 - dbTimePercent / 10);
                    const otherPercent = 100 - dbTimePercent - networkPercent;
                    return [
                      { label: 'Database Time', value: Math.round(dbTimePercent), color: 'bg-cyan-500' },
                      { label: 'Network Time', value: Math.round(networkPercent), color: 'bg-blue-500' },
                      { label: 'Other', value: Math.round(otherPercent), color: 'bg-gray-500' },
                    ];
                  })().map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">{item.label}</span>
                        <span className="text-gray-300">{item.value}%</span>
                      </div>
                      <Progress value={item.value} indicatorClassName={item.color} />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Database Insights - EXPLAIN Analysis */}
              {explainResult && (
                <Card className="bg-gray-900 border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-white font-medium">Database Insights</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Performance Score</span>
                      <div
                        className={cn(
                          'px-3 py-1 rounded-full text-sm font-bold',
                          explainResult.analysis.performanceScore >= 80
                            ? 'bg-green-500/10 text-green-400'
                            : explainResult.analysis.performanceScore >= 60
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-red-500/10 text-red-400'
                        )}
                      >
                        {explainResult.analysis.performanceScore}/100
                      </div>
                    </div>
                  </div>

                  {/* Analysis Summary */}
                  <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-300">{explainResult.analysis.summary}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>Rows Examined: {explainResult.analysis.rowsExamined.toLocaleString()}</span>
                      {explainResult.analysis.usingFilesort && (
                        <Badge variant="warning">Using Filesort</Badge>
                      )}
                      {explainResult.analysis.usingTemporary && (
                        <Badge variant="warning">Using Temporary</Badge>
                      )}
                    </div>
                  </div>

                  {/* Index Recommendations */}
                  {explainResult.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        Index Recommendations ({explainResult.recommendations.length})
                      </h4>
                      <div className="space-y-3">
                        {explainResult.recommendations.map((rec, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'p-4 rounded-lg border',
                              rec.severity === 'high'
                                ? 'bg-red-500/5 border-red-500/20'
                                : rec.severity === 'medium'
                                ? 'bg-yellow-500/5 border-yellow-500/20'
                                : 'bg-blue-500/5 border-blue-500/20'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    variant={
                                      rec.severity === 'high'
                                        ? 'destructive'
                                        : rec.severity === 'medium'
                                        ? 'warning'
                                        : 'info'
                                    }
                                  >
                                    {rec.severity.toUpperCase()}
                                  </Badge>
                                  <span className="text-sm font-medium text-white">
                                    Index on {rec.table}.{rec.columns.join(', ')}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400 mb-2">{rec.reason}</p>
                                <p className="text-xs text-cyan-400">{rec.estimatedImpact}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <code className="flex-1 text-xs text-gray-300 bg-gray-800 px-3 py-2 rounded overflow-x-auto">
                                {rec.sql}
                              </code>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopySQL(rec.sql)}
                                className="flex-shrink-0"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* EXPLAIN Output */}
                  <details className="mt-4">
                    <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                      View Raw EXPLAIN Output
                    </summary>
                    <div className="mt-2 p-3 bg-gray-800 rounded overflow-x-auto">
                      <table className="text-xs text-gray-300 w-full">
                        <thead>
                          <tr className="border-b border-gray-700">
                            {explainResult.columns.map((col) => (
                              <th key={col} className="text-left p-2 font-medium text-gray-400">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {explainResult.rows.map((row, idx) => (
                            <tr key={idx} className="border-b border-gray-800">
                              {explainResult.columns.map((col) => (
                                <td key={col} className="p-2">
                                  {String(row[col] ?? 'NULL')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

QueryAnalysis.displayName = 'QueryAnalysis';
