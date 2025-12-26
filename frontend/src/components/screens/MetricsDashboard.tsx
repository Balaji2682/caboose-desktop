import { memo, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Cpu, HardDrive, Activity, Clock, TrendingUp, TrendingDown, RefreshCw, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useMetricsStore } from '@/stores/metricsStore';

const CustomTooltip = memo<{ active?: boolean; payload?: unknown[] }>(({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload as Array<{ payload: { time: string }; name: string; value: number; color: string }>;
    return (
      <div className="glass rounded-lg p-3 shadow-xl">
        <p className="text-sm text-gray-400 mb-2">{data[0].payload.time}</p>
        {data.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-300">{entry.name}:</span>
            <span className="text-gray-100 font-semibold">{entry.value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = 'CustomTooltip';

const MetricCard = memo<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  color: string;
}>(({ icon: Icon, label, value, unit, trend, trendValue, color }) => (
  <Card className="bg-gray-900 border-gray-800 p-5">
    <div className="flex items-center gap-2 mb-3">
      <div className={cn('p-2 rounded-lg', `bg-${color}-500/10`)}>
        <Icon className={cn('w-4 h-4', `text-${color}-400`)} />
      </div>
      <span className="text-sm text-gray-400">{label}</span>
    </div>
    <p className="text-2xl font-bold text-white mb-1">
      {value}
      {unit && <span className="text-sm text-gray-500">{unit}</span>}
    </p>
    {trend && trendValue && (
      <div className={cn('flex items-center gap-1 text-xs', trend === 'up' ? 'text-green-400' : 'text-red-400')}>
        {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>{trendValue}</span>
      </div>
    )}
  </Card>
));

MetricCard.displayName = 'MetricCard';

export const MetricsDashboard = memo(() => {
  const { metrics, loading, fetchMetrics, resetMetrics } = useMetricsStore();

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const metricsData = metrics?.timeSeries && metrics.timeSeries.length > 0 ? metrics.timeSeries : [];

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Metrics Dashboard</h1>
          <p className="text-sm text-gray-400">Real-time performance monitoring and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Button variant="outline" size="sm" onClick={resetMetrics}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Current Metrics */}
      <div className="grid grid-cols-6 gap-4">
        <MetricCard
          icon={Cpu}
          label="CPU Usage"
          value={metrics?.system.cpu.toFixed(1) || '0'}
          unit="%"
          color="cyan"
        />
        <MetricCard
          icon={HardDrive}
          label="Memory"
          value={metrics?.system.memory.toFixed(1) || '0'}
          unit="%"
          color="blue"
        />
        <MetricCard
          icon={Activity}
          label="Requests/min"
          value={Math.round(metrics?.requests.requestRate || 0)}
          color="purple"
        />
        <MetricCard
          icon={Clock}
          label="Avg Response"
          value={metrics?.requests.avgResponseTime.toFixed(0) || '0'}
          unit="ms"
          color="green"
        />
        <MetricCard
          icon={Activity}
          label="Error Rate"
          value={metrics?.requests.errorRate.toFixed(1) || '0'}
          unit="%"
          color="red"
        />
        <MetricCard
          icon={Activity}
          label="Connections"
          value={metrics?.requests.activeConnections || 0}
          color="yellow"
        />
      </div>

      {/* System Resources Chart */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">System Resources</h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-cyan-500 rounded" />
              <span className="text-gray-400">CPU</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span className="text-gray-400">Memory</span>
            </div>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metricsData}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="cpu" stroke="#06b6d4" fill="url(#cpuGradient)" strokeWidth={2} name="CPU" />
              <Area type="monotone" dataKey="memory" stroke="#3b82f6" fill="url(#memoryGradient)" strokeWidth={2} name="Memory" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Request Rate Chart */}
        <Card className="bg-gray-900 border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Request Rate</h2>
            <span className="text-sm text-gray-400">requests/min</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metricsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="requests" stroke="#a855f7" strokeWidth={2} dot={false} name="Requests" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Response Time Chart */}
        <Card className="bg-gray-900 border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Response Time</h2>
            <span className="text-sm text-gray-400">milliseconds</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metricsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="responseTime" stroke="#10b981" strokeWidth={2} dot={false} name="Response Time" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Error Rate Chart */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Error Rate</h2>
          <span className="text-sm text-gray-400">errors/hour</span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="errors" fill="#ef4444" radius={[4, 4, 0, 0]} name="Errors" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Endpoint Metrics Table */}
      <Card className="bg-gray-900 border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">
            Top Endpoints ({metrics?.topEndpoints.length || 0})
          </h2>
        </div>
        {(!metrics || metrics.topEndpoints.length === 0) ? (
          <div className="p-12 text-center text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p>No endpoint metrics available</p>
            <p className="text-xs mt-2">Metrics will appear as requests are processed</p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50 sticky top-0">
                <tr className="text-left text-xs text-gray-400">
                  <th className="px-4 py-3">Endpoint</th>
                  <th className="px-4 py-3 text-right">Requests</th>
                  <th className="px-4 py-3 text-right">Avg Time</th>
                  <th className="px-4 py-3 text-right">P95</th>
                  <th className="px-4 py-3 text-right">Errors</th>
                  <th className="px-4 py-3 text-right">Error Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {metrics.topEndpoints.map((endpoint, index) => {
                  const errorRate = endpoint.requests > 0
                    ? ((endpoint.errors / endpoint.requests) * 100).toFixed(2)
                    : '0.00';
                  return (
                    <tr key={index} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <code className="text-cyan-400">{endpoint.endpoint}</code>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {endpoint.requests.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={endpoint.avgTime > 100 ? 'text-yellow-400' : 'text-gray-300'}>
                          {endpoint.avgTime.toFixed(0)}ms
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={endpoint.p95 > 200 ? 'text-red-400' : 'text-gray-300'}>
                          {endpoint.p95.toFixed(0)}ms
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={endpoint.errors > 10 ? 'text-red-400' : 'text-gray-300'}>
                          {endpoint.errors}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={parseFloat(errorRate) > 0.5 ? 'text-red-400' : 'text-gray-300'}>
                          {errorRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
});

MetricsDashboard.displayName = 'MetricsDashboard';
