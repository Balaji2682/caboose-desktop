import { memo, useEffect } from 'react';
import { Activity, AlertTriangle, Database, Clock, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useHealthStore } from '@/stores/healthStore';


const HealthGauge = memo<{ score: number; status?: string }>(({ score, status }) => {
  const circumference = 2 * Math.PI * 80;
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r="80"
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            className="text-gray-800"
          />
          <circle
            cx="96"
            cy="96"
            r="80"
            stroke="url(#healthGradient)"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            className="transition-all duration-1000"
          />
          <defs>
            <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-4xl font-bold', score >= 80 ? 'text-green-400' : 'text-yellow-400')}>
            {score}
          </span>
          <span className="text-sm text-gray-500">/ 100</span>
        </div>
      </div>
      {status && (
        <div className="mt-4 text-center">
          <span className="text-sm text-gray-400 capitalize">{status}</span>
        </div>
      )}
    </div>
  );
});

HealthGauge.displayName = 'HealthGauge';

const IssueCard = memo<{ issue: any }>(({ issue }) => (
  <div className="p-4 hover:bg-gray-800/30 transition-colors">
    <div className="flex items-start gap-4">
      <AlertTriangle
        className={cn(
          'w-5 h-5 mt-0.5 flex-shrink-0',
          issue.severity === 'critical' && 'text-red-400',
          issue.severity === 'warning' && 'text-yellow-400',
          issue.severity === 'info' && 'text-blue-400'
        )}
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm text-white">{issue.title}</h3>
          <Badge
            variant={
              issue.severity === 'critical'
                ? 'destructive'
                : issue.severity === 'warning'
                ? 'warning'
                : 'info'
            }
          >
            {issue.type}
          </Badge>
        </div>
        <p className="text-sm text-gray-400 mb-2">{issue.description}</p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {issue.table && (
            <span>
              Table: <code className="text-cyan-400">{issue.table}</code>
            </span>
          )}
          <span>{issue.impact}</span>
        </div>
      </div>
      <Button variant="outline" size="sm">
        Fix Now
      </Button>
    </div>
  </div>
));

IssueCard.displayName = 'IssueCard';

const formatNumber = (n: number): string => {
  if (n < 1000) return n.toString();
  if (n < 1000000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1000000).toFixed(1)}M`;
};

export const DatabaseHealth = memo(() => {
  const { health, loading, fetchHealth } = useHealthStore();

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const criticalCount = health?.issues.filter((i) => i.severity === 'critical').length || 0;
  const warningCount = health?.issues.filter((i) => i.severity === 'warning').length || 0;
  const infoCount = health?.issues.filter((i) => i.severity === 'info').length || 0;

  if (!health && loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading database health...</p>
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Database className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No database connected</p>
          <Button onClick={fetchHealth}>Connect to Database</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Database Health</h1>
          <p className="text-sm text-gray-400">Monitor database performance and optimization opportunities</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Health Score */}
        <Card className="bg-gray-900 border-gray-800 p-6">
          <h2 className="text-lg font-bold text-white mb-6">Overall Health Score</h2>
          <HealthGauge score={health.score} status={health.status} />
        </Card>

        {/* Quick Stats */}
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <Card className="bg-gray-900 border-gray-800 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Database className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-sm text-gray-400">Active Connections</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {health.connections.active}
              <span className="text-sm text-gray-500"> / {health.connections.max}</span>
            </p>
            <p className="text-xs text-gray-400">{health.connections.utilization.toFixed(1)}% utilization</p>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-sm text-gray-400">Cache Hit Rate</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{health.performance.cacheHitRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-400">Buffer pool efficiency</p>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Activity className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-sm text-gray-400">Queries/sec</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {health.performance.transactionsPerSecond.toFixed(1)}
            </p>
            <p className="text-xs text-gray-400">Average throughput</p>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-sm text-gray-400">Issues Detected</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{health.issues.length}</p>
            <p className="text-xs text-gray-400">
              {criticalCount} critical, {warningCount} warnings
            </p>
          </Card>
        </div>
      </div>

      {/* Issues List */}
      <Card className="bg-gray-900 border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Detected Issues</h2>
          <div className="flex items-center gap-2 text-xs">
            {criticalCount > 0 && <Badge variant="destructive">{criticalCount} Critical</Badge>}
            {warningCount > 0 && <Badge variant="warning">{warningCount} Warnings</Badge>}
            {infoCount > 0 && <Badge variant="info">{infoCount} Info</Badge>}
            {health.issues.length === 0 && <Badge variant="success">No Issues</Badge>}
          </div>
        </div>
        {health.issues.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No issues detected. Database health is optimal!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {health.issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Slow Queries */}
        <Card className="bg-gray-900 border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">Slowest Queries</h2>
          </div>
          {health.slowQueries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No slow queries detected</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {health.slowQueries.map((query, index) => (
                <div key={index} className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <code className="text-sm text-gray-300 flex-1 truncate">{query.query}</code>
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        query.time > 100 ? 'text-red-400' : query.time > 50 ? 'text-yellow-400' : 'text-gray-400'
                      )}
                    >
                      {query.time.toFixed(1)}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Executed {query.count}x</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Table Statistics */}
        <Card className="bg-gray-900 border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">Table Statistics</h2>
          </div>
          <ScrollArea className="h-64">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50 sticky top-0">
                <tr className="text-left text-xs text-gray-400">
                  <th className="px-4 py-3">Table</th>
                  <th className="px-4 py-3">Rows</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Indexes</th>
                  <th className="px-4 py-3">Bloat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {health.tableStats.map((table) => (
                  <tr key={table.name} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <code className="text-cyan-400">{table.name}</code>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{formatNumber(table.rows)}</td>
                    <td className="px-4 py-3 text-gray-300">{table.sizeFormatted}</td>
                    <td className="px-4 py-3 text-gray-300">{table.indexCount}</td>
                    <td className="px-4 py-3">
                      <span className={table.bloat > 10 ? 'text-yellow-400' : 'text-gray-400'}>
                        {table.bloat.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
});

DatabaseHealth.displayName = 'DatabaseHealth';
