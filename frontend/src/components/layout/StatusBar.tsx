import { memo, useState, useEffect } from 'react';
import { GitBranch, Wifi, Clock, Zap, Activity, Database, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';

interface StatusItemProps {
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'purple';
  className?: string;
  onClick?: () => void;
}

const StatusItem = memo<StatusItemProps>(
  ({ icon, label, variant = 'default', className, onClick }) => {
    const variantStyles = {
      default: 'bg-foreground/5 border-border text-muted',
      success: 'bg-green-500/10 border-green-500/20 text-green-400',
      warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
      info: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
      purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    };

    return (
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1 rounded-lg border transition-all',
          variantStyles[variant],
          onClick && 'cursor-pointer hover:brightness-110',
          className
        )}
        onClick={onClick}
      >
        {icon}
        <span className="font-medium">{label}</span>
      </div>
    );
  }
);

StatusItem.displayName = 'StatusItem';

const Clock12Hour = memo(() => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <StatusItem
      icon={<Clock className="w-3 h-3" />}
      label={time.toLocaleTimeString()}
      className="font-mono"
    />
  );
});

Clock12Hour.displayName = 'Clock12Hour';

export const StatusBar = memo(() => {
  const connectionInfo = useAppStore((s) => s.connectionInfo);
  const isConnected = useAppStore((s) => s.isConnected);

  return (
    <div className="h-9 bg-background/40 backdrop-blur-xl border-t border-border px-4 flex items-center justify-between text-xs">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Git branch */}
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-foreground/5 border border-border hover:border-cyan-500/50 transition-all cursor-pointer group">
          <GitBranch className="w-3 h-3 text-cyan-400" />
          <span className="text-muted group-hover:text-foreground">main</span>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-green-400 font-medium">2</span>
          </div>
        </div>

        {/* Server status */}
        <StatusItem
          icon={
            <div className="relative">
              <Wifi className="w-3 h-3" />
              {isConnected && (
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              )}
            </div>
          }
          label={connectionInfo ? `${connectionInfo.host}:${connectionInfo.port}` : 'Disconnected'}
          variant={isConnected ? 'success' : 'warning'}
        />

        {/* Performance indicator */}
        <StatusItem
          icon={<Activity className="w-3 h-3" />}
          label="76ms avg"
          variant="info"
        />

        {/* Database */}
        <StatusItem
          icon={<Database className="w-3 h-3 text-blue-400" />}
          label="PostgreSQL"
          className="bg-blue-500/10 border-blue-500/20 text-blue-400"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Environment */}
        <StatusItem
          icon={<Zap className="w-3 h-3" />}
          label={connectionInfo?.environment || 'Development'}
          variant="purple"
        />

        {/* Rails version */}
        <span className="text-gray-500">
          Rails{' '}
          <span className="text-gray-400 font-medium">
            {connectionInfo?.railsVersion || '7.1.3'}
          </span>
        </span>

        {/* Separator */}
        <div className="w-px h-4 bg-border" />

        {/* Time */}
        <Clock12Hour />
      </div>
    </div>
  );
});

StatusBar.displayName = 'StatusBar';
