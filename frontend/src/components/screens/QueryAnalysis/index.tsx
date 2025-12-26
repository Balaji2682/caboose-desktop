import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import {
  RefreshCw,
  Trash2,
  Download,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useQueryStore } from '@/stores/queryStore';
import { databaseAPI } from '@/lib/wails';
import { toast } from 'sonner';

// Import all new components
import { PerformanceGauge, QueryDistributionChart, QueryTimeline } from './components/Visualizations';
import { SmartRecommendations } from './components/Recommendations';
import { N1WarningPanel } from './components/N1Detection';
import { QuickActions } from './components/Actions';

// Import existing QueryAnalysis components (we'll keep the existing QueryRow and filters)
import { memo as originalMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Search,
  Filter,
  Database,
  Copy,
  Lightbulb,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { QueryStatistic, ExplainResult } from '@/lib/wails';

type SortField = 'count' | 'avgTime' | 'fingerprint';

interface QueryRowProps {
  query: QueryStatistic;
  isSelected: boolean;
  onSelect: () => void;
}

const QueryRow = originalMemo<QueryRowProps>(({ query, isSelected, onSelect }) => (
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
  const {
    queries,
    loading,
    statistics,
    recommendations,
    recommendationsLoading,
    n1Warnings,
    distribution,
    selectedQueryId,
    fetchQueries,
    clearStatistics,
    fetchRecommendations,
    fetchN1Warnings,
    fetchDistribution,
    selectQuery,
    ignorePattern,
  } = useQueryStore();

  const [sortField, setSortField] = useState<SortField>('count');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [issueFilter, setIssueFilter] = useState<'all' | 'n+1' | 'slow' | 'none'>('all');
  const [explainResult, setExplainResult] = useState<ExplainResult | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);

  // Fetch data on mount and periodically
  useEffect(() => {
    fetchQueries();
    fetchRecommendations();
    fetchN1Warnings();
    fetchDistribution();

    const interval = setInterval(() => {
      fetchQueries();
      fetchRecommendations();
      fetchN1Warnings();
      fetchDistribution();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [fetchQueries, fetchRecommendations, fetchN1Warnings, fetchDistribution]);

  // Auto-select first query if none selected
  useEffect(() => {
    if (queries.length > 0 && !selectedQueryId) {
      selectQuery(queries[0].id);
    }
  }, [queries, selectedQueryId, selectQuery]);

  const selectedQueryData = useMemo(
    () => queries.find((q) => q.id === selectedQueryId),
    [queries, selectedQueryId]
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

  const handleRefresh = useCallback(() => {
    fetchQueries();
    fetchRecommendations();
    fetchN1Warnings();
    fetchDistribution();
    toast.success('Refreshed query analysis');
  }, [fetchQueries, fetchRecommendations, fetchN1Warnings, fetchDistribution]);

  const handleClear = useCallback(async () => {
    if (confirm('Are you sure you want to clear all query statistics?')) {
      await clearStatistics();
      setExplainResult(null);
      toast.success('Query statistics cleared');
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
      toast.success(`Exported ${format.toUpperCase()} successfully`);
    },
    [filteredQueries]
  );

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

  const handleCopySQL = useCallback(() => {
    if (!selectedQueryData) return;
    navigator.clipboard.writeText(selectedQueryData.sql);
    toast.success('SQL copied to clipboard');
  }, [selectedQueryData]);

  const handleIgnorePattern = useCallback(async () => {
    if (!selectedQueryData) return;

    if (confirm(`Are you sure you want to ignore this query pattern?\n\n${selectedQueryData.fingerprint}`)) {
      await ignorePattern(selectedQueryData.fingerprint);
      toast.success('Query pattern ignored');
    }
  }, [selectedQueryData, ignorePattern]);

  // Find N+1 warning for selected query
  const selectedN1Warning = useMemo(() => {
    if (!selectedQueryData || !selectedQueryData.issue || selectedQueryData.issue !== 'n+1') {
      return null;
    }
    return n1Warnings.find((w) => w.fingerprint === selectedQueryData.fingerprint);
  }, [selectedQueryData, n1Warnings]);

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Query Analysis</h1>
          <p className="text-sm text-gray-400">AI-powered SQL query optimization and monitoring</p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Stats Grid with Performance Gauge */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-gray-900 border-gray-800 p-5">
          <p className="text-sm text-gray-400 mb-2">Total Executions</p>
          <p className="text-2xl font-bold text-white">{statistics.totalExecutions.toLocaleString()}</p>
          <p className="text-xs mt-1 text-gray-500">{statistics.totalQueries} unique</p>
        </Card>
        <Card className="bg-gray-900 border-gray-800 p-5">
          <p className="text-sm text-gray-400 mb-2">Avg Response Time</p>
          <p className="text-2xl font-bold text-white">{statistics.avgResponseTime.toFixed(1)}ms</p>
          <p className="text-xs mt-1 text-gray-500">Across all queries</p>
        </Card>
        <Card className="bg-gray-900 border-gray-800 p-5">
          <p className="text-sm text-gray-400 mb-2">Issues Detected</p>
          <p className="text-2xl font-bold text-white">{statistics.issueCount}</p>
          <p className="text-xs mt-1 text-gray-500">
            {statistics.nPlusOneCount} N+1, {statistics.slowCount} slow
          </p>
        </Card>
        <Card className="bg-gray-900 border-gray-800 p-5 col-span-2 flex items-center justify-center">
          <PerformanceGauge score={statistics.healthScore} label="Query Health" size="md" />
        </Card>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Query List */}
        <div className="space-y-6">
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

            <ScrollArea className="h-[600px]">
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
                    isSelected={selectedQueryId === query.id}
                    onSelect={() => selectQuery(query.id)}
                  />
                ))
              )}
            </ScrollArea>
          </Card>

          {/* Distribution Charts */}
          {distribution && distribution.byTable.length > 0 && (
            <QueryDistributionChart type="table" data={distribution.byTable} />
          )}
        </div>

        {/* Middle Column - Query Details */}
        <div className="space-y-6">
          {selectedQueryData && (
            <>
              {/* N+1 Warning Panel */}
              {selectedN1Warning && (
                <N1WarningPanel warning={selectedN1Warning} />
              )}

              {/* Query Details Card */}
              <Card className="bg-gray-900 border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Query Details</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopySQL}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExplainQuery}
                      disabled={loadingExplain}
                    >
                      <Database className={cn('w-4 h-4 mr-2', loadingExplain && 'animate-spin')} />
                      EXPLAIN
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
                    <pre className="text-xs text-gray-300 bg-gray-800 p-4 rounded overflow-x-auto max-h-32">
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

                {/* EXPLAIN Results */}
                {explainResult && (
                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-medium">EXPLAIN Analysis</h3>
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
                    <p className="text-sm text-gray-300 mb-3">{explainResult.analysis.summary}</p>

                    {explainResult.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-white mb-2">Index Recommendations</h4>
                        {explainResult.recommendations.slice(0, 2).map((rec, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded text-sm"
                          >
                            <p className="text-yellow-400 font-medium mb-1">
                              {rec.table}.{rec.columns.join(', ')}
                            </p>
                            <p className="text-gray-400 text-xs">{rec.reason}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Distribution by Operation */}
              {distribution && distribution.byOperation.length > 0 && (
                <QueryDistributionChart type="operation" data={distribution.byOperation} />
              )}
            </>
          )}
        </div>

        {/* Right Column - Recommendations */}
        <div className="space-y-6">
          <SmartRecommendations
            recommendations={recommendations}
            loading={recommendationsLoading}
            onRefresh={fetchRecommendations}
          />
        </div>
      </div>

      {/* Quick Actions Bar */}
      <QuickActions
        selectedQuery={selectedQueryData || null}
        onExplain={handleExplainQuery}
        onCopySQL={handleCopySQL}
        onIgnorePattern={handleIgnorePattern}
        explainLoading={loadingExplain}
      />
    </div>
  );
});

QueryAnalysis.displayName = 'QueryAnalysis';
