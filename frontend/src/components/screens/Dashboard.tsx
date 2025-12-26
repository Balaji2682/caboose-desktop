import { memo, useMemo } from 'react';
import {
  Activity,
  Database,
  AlertTriangle,
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  Server,
  HardDrive,
  Cpu,
  type LucideIcon,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Reusable stat card data
interface StatData {
  label: string;
  value: string;
  unit?: string;
  change: string;
  trend: 'up' | 'down';
  color: 'cyan' | 'blue' | 'green' | 'red';
  icon: LucideIcon;
  description: string;
}

interface ProcessData {
  name: string;
  status: 'running' | 'stopped' | 'error';
  port: number | null;
  uptime: string;
  cpu: number;
  memory: number;
}

interface IssueData {
  type: string;
  endpoint?: string;
  table?: string;
  message?: string;
  severity: 'critical' | 'warning';
  count: number;
  time: string;
}

// Generate chart data
const generateMockData = () =>
  Array.from({ length: 20 }, (_, i) => ({
    value: Math.random() * 100 + 50,
    time: i,
  }));

const generatePerformanceData = () =>
  Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    requests: Math.floor(Math.random() * 500 + 200),
    responseTime: Math.floor(Math.random() * 100 + 50),
  }));

// Static data
const stats: StatData[] = [
  {
    label: 'DB Health Score',
    value: '87',
    unit: '/100',
    change: '+5',
    trend: 'up',
    color: 'cyan',
    icon: Activity,
    description: 'Overall database performance',
  },
  {
    label: 'Active Queries',
    value: '1,234',
    change: '-23',
    trend: 'down',
    color: 'blue',
    icon: Database,
    description: 'Queries per minute',
  },
  {
    label: 'Test Coverage',
    value: '94',
    unit: '%',
    change: '+2',
    trend: 'up',
    color: 'green',
    icon: FlaskConical,
    description: 'Code coverage ratio',
  },
  {
    label: 'Active Exceptions',
    value: '7',
    change: '+3',
    trend: 'up',
    color: 'red',
    icon: AlertTriangle,
    description: 'Unresolved errors',
  },
];

const processes: ProcessData[] = [
  { name: 'Rails Server', status: 'running', port: 3000, uptime: '2h 34m', cpu: 45, memory: 512 },
  { name: 'React (Vite)', status: 'running', port: 5173, uptime: '2h 34m', cpu: 12, memory: 256 },
  { name: 'Sidekiq', status: 'running', port: null, uptime: '2h 34m', cpu: 23, memory: 384 },
  { name: 'PostgreSQL', status: 'running', port: 5432, uptime: '5d 12h', cpu: 34, memory: 1024 },
];

const recentIssues: IssueData[] = [
  { type: 'N+1 Query', endpoint: 'GET /api/users', severity: 'critical', count: 47, time: '2m ago' },
  { type: 'Slow Query', endpoint: 'GET /api/posts', severity: 'warning', count: 12, time: '5m ago' },
  { type: 'Missing Index', table: 'comments.user_id', severity: 'warning', count: 1, time: '12m ago' },
  { type: 'Exception', message: 'NoMethodError in UsersController', severity: 'critical', count: 5, time: '18m ago' },
];

const systemMetrics = [
  { name: 'CPU', value: 45, color: '#06b6d4' },
  { name: 'Memory', value: 68, color: '#3b82f6' },
  { name: 'Disk', value: 34, color: '#8b5cf6' },
];

// Stat Card Component
interface StatCardProps {
  stat: StatData;
  chartData: { value: number; time: number }[];
  index: number;
}

const StatCard = memo<StatCardProps>(({ stat, chartData, index }) => {
  const Icon = stat.icon;
  const isPositive = stat.trend === 'up' && stat.color !== 'red';
  const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;

  const colorClasses = {
    cyan: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30 text-cyan-400',
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-400',
    red: 'from-red-500/20 to-red-600/20 border-red-500/30 text-red-400',
  };

  const strokeColors = {
    cyan: '#06b6d4',
    blue: '#3b82f6',
    green: '#10b981',
    red: '#ef4444',
  };

  return (
    <Card
      variant="glass"
      hoverable
      className="p-6 overflow-hidden"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div className={cn('p-3 rounded-2xl bg-gradient-to-br border', colorClasses[stat.color])}>
            <Icon className="w-6 h-6" />
          </div>
          <Badge variant={isPositive ? 'success' : 'destructive'}>
            <TrendIcon className="w-3 h-3 mr-1" />
            {stat.change}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
              {stat.value}
            </span>
            {stat.unit && <span className="text-lg text-gray-500">{stat.unit}</span>}
          </div>
          <p className="text-sm font-medium text-gray-300">{stat.label}</p>
          <p className="text-xs text-gray-500">{stat.description}</p>
        </div>

        <div className="h-12 -mx-2 opacity-60 hover:opacity-100 transition-opacity">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColors[stat.color]} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={strokeColors[stat.color]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeColors[stat.color]}
                fill={`url(#gradient-${index})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

// Performance Chart Component
const PerformanceChart = memo(() => {
  const data = useMemo(() => generatePerformanceData(), []);

  return (
    <Card variant="glass" hoverable className="col-span-2 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Performance Metrics</h2>
          <p className="text-sm text-gray-400">Real-time request analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">24h</Button>
          <Button variant="outline" size="sm" className="border-cyan-500/30 text-cyan-400">7d</Button>
          <Button variant="ghost" size="sm">30d</Button>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="requests" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="responseTime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                background: 'rgba(17, 24, 39, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                backdropFilter: 'blur(20px)',
              }}
            />
            <Area
              type="monotone"
              dataKey="requests"
              stroke="#06b6d4"
              fill="url(#requests)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="responseTime"
              stroke="#3b82f6"
              fill="url(#responseTime)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <p className="text-xs text-cyan-400 mb-1">Avg Requests/min</p>
          <p className="text-2xl font-bold text-white">347</p>
        </div>
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-400 mb-1">Avg Response Time</p>
          <p className="text-2xl font-bold text-white">76ms</p>
        </div>
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <p className="text-xs text-purple-400 mb-1">Success Rate</p>
          <p className="text-2xl font-bold text-white">99.8%</p>
        </div>
      </div>
    </Card>
  );
});

PerformanceChart.displayName = 'PerformanceChart';

// System Resources Component
const SystemResources = memo(() => (
  <Card variant="glass" hoverable className="p-6">
    <h2 className="text-xl font-bold text-white mb-1">System Resources</h2>
    <p className="text-sm text-gray-400 mb-6">Current utilization</p>

    <div className="space-y-6">
      {systemMetrics.map((metric) => (
        <div key={metric.name}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: metric.color }} />
              <span className="text-sm font-medium text-gray-300">{metric.name}</span>
            </div>
            <span className="text-sm font-bold text-white">{metric.value}%</span>
          </div>
          <Progress
            value={metric.value}
            indicatorClassName={cn(
              metric.name === 'CPU' && 'from-cyan-500 to-cyan-400',
              metric.name === 'Memory' && 'from-blue-500 to-blue-400',
              metric.name === 'Disk' && 'from-purple-500 to-purple-400'
            )}
          />
        </div>
      ))}
    </div>

    <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-cyan-500/20">
          <Server className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-300">Server Load</p>
          <p className="text-xs text-gray-500">Optimal performance</p>
        </div>
        <Badge variant="success">Healthy</Badge>
      </div>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-3">
      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <p className="text-xs text-gray-400">CPU Cores</p>
        </div>
        <p className="text-lg font-bold text-white">8</p>
      </div>
      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <HardDrive className="w-4 h-4 text-blue-400" />
          <p className="text-xs text-gray-400">RAM</p>
        </div>
        <p className="text-lg font-bold text-white">16GB</p>
      </div>
    </div>
  </Card>
));

SystemResources.displayName = 'SystemResources';

// Process Card Component
const ProcessCard = memo<{ process: ProcessData }>(({ process }) => (
  <div className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 hover:bg-white/10 transition-all">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={cn(
            'w-2.5 h-2.5 rounded-full',
            process.status === 'running' && 'bg-green-400',
            process.status === 'stopped' && 'bg-gray-400',
            process.status === 'error' && 'bg-red-400'
          )} />
          {process.status === 'running' && (
            <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{process.name}</p>
          <p className="text-xs text-gray-500">
            {process.port && `Port ${process.port} • `}Uptime: {process.uptime}
          </p>
        </div>
      </div>
      <Badge variant={process.status === 'running' ? 'success' : 'secondary'}>
        {process.status.charAt(0).toUpperCase() + process.status.slice(1)}
      </Badge>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-2">
        <Cpu className="w-3 h-3 text-cyan-400" />
        <span className="text-xs text-gray-400">
          CPU: <span className="text-white font-medium">{process.cpu}%</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <HardDrive className="w-3 h-3 text-blue-400" />
        <span className="text-xs text-gray-400">
          RAM: <span className="text-white font-medium">{process.memory}MB</span>
        </span>
      </div>
    </div>
  </div>
));

ProcessCard.displayName = 'ProcessCard';

// Issue Card Component
const IssueCard = memo<{ issue: IssueData }>(({ issue }) => (
  <div className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/30 hover:bg-white/10 transition-all">
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        <Badge variant={issue.severity === 'critical' ? 'destructive' : 'warning'}>
          {issue.type}
        </Badge>
        <span className="text-xs text-gray-500">×{issue.count}</span>
      </div>
      <AlertTriangle className={cn(
        'w-4 h-4',
        issue.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
      )} />
    </div>
    <p className="text-sm text-gray-300 mb-2">
      {issue.endpoint || issue.table || issue.message}
    </p>
    <div className="flex items-center gap-2">
      <Clock className="w-3 h-3 text-gray-500" />
      <span className="text-xs text-gray-500">{issue.time}</span>
    </div>
  </div>
));

IssueCard.displayName = 'IssueCard';

// Main Dashboard Component
export const Dashboard = memo(() => {
  const chartData = useMemo(() => generateMockData(), []);

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-950 via-gray-900 to-black dot-pattern">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <Badge variant="success" className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                All Systems Operational
              </Badge>
            </div>
            <p className="text-sm text-gray-400">Real-time monitoring for your Rails application</p>
          </div>
          <div className="flex items-center gap-3">
            <Card variant="glass" className="px-4 py-2">
              <p className="text-xs text-gray-400">Last updated</p>
              <p className="text-sm text-gray-200 font-medium">Just now</p>
            </Card>
            <Button>
              <Zap className="w-4 h-4" />
              Run Diagnostics
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <StatCard key={stat.label} stat={stat} chartData={chartData} index={index} />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          <PerformanceChart />
          <SystemResources />
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Running Processes */}
          <Card variant="glass" hoverable className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Running Processes</h2>
                <p className="text-sm text-gray-400">{processes.length} active services</p>
              </div>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            <div className="space-y-3">
              {processes.map((process) => (
                <ProcessCard key={process.name} process={process} />
              ))}
            </div>
          </Card>

          {/* Recent Issues */}
          <Card variant="glass" hoverable className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Recent Issues</h2>
                <p className="text-sm text-gray-400">{recentIssues.length} issues detected</p>
              </div>
              <Button variant="outline" size="sm" className="hover:border-red-500/50 hover:text-red-400">
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {recentIssues.map((issue, index) => (
                <IssueCard key={index} issue={issue} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';
