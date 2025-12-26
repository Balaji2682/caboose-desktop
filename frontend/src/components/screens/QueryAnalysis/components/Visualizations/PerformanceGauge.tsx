import { memo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceGaugeProps {
  score: number; // 0-100
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  previousScore?: number;
  className?: string;
}

const sizeConfig = {
  sm: { width: 80, strokeWidth: 8, fontSize: 'text-lg' },
  md: { width: 120, strokeWidth: 10, fontSize: 'text-2xl' },
  lg: { width: 160, strokeWidth: 12, fontSize: 'text-3xl' },
};

export const PerformanceGauge = memo<PerformanceGaugeProps>(
  ({ score, label = 'Performance', size = 'md', showTrend = false, previousScore, className }) => {
    const { width, strokeWidth, fontSize } = sizeConfig[size];
    const radius = (width - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const scorePercent = Math.max(0, Math.min(100, score));
    const offset = circumference - (scorePercent / 100) * circumference;

    // Calculate trend
    const trend = previousScore !== undefined ? score - previousScore : 0;
    const hasTrend = showTrend && previousScore !== undefined;

    // Determine color based on score
    const getColor = (score: number) => {
      if (score >= 80) return { stroke: '#10b981', text: 'text-green-400', bg: 'from-green-500 to-emerald-500' };
      if (score >= 60) return { stroke: '#f59e0b', text: 'text-yellow-400', bg: 'from-yellow-500 to-amber-500' };
      if (score >= 40) return { stroke: '#f97316', text: 'text-orange-400', bg: 'from-orange-500 to-red-500' };
      return { stroke: '#ef4444', text: 'text-red-400', bg: 'from-red-500 to-rose-500' };
    };

    const color = getColor(scorePercent);
    const center = width / 2;

    return (
      <div className={cn('flex flex-col items-center gap-3', className)}>
        <div className="relative" style={{ width, height: width }}>
          {/* SVG Gauge */}
          <svg width={width} height={width} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={strokeWidth}
              fill="none"
            />

            {/* Progress circle with gradient */}
            <defs>
              <linearGradient id={`gradient-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className={cn('transition-colors', color.bg.split(' ')[0])} />
                <stop offset="100%" className={cn('transition-colors', color.bg.split(' ')[1])} />
              </linearGradient>
            </defs>

            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke={color.stroke}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{
                filter: `drop-shadow(0 0 8px ${color.stroke}40)`,
              }}
            />
          </svg>

          {/* Score text in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('font-bold', fontSize, color.text, 'transition-colors')}>
              {Math.round(scorePercent)}
            </span>
            <span className="text-xs text-gray-500">/ 100</span>
          </div>
        </div>

        {/* Label and trend */}
        <div className="text-center">
          <p className="text-sm font-medium text-gray-300">{label}</p>
          {hasTrend && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs mt-1',
                trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-400'
              )}
            >
              {trend > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : trend < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : null}
              <span>
                {trend > 0 ? '+' : ''}
                {trend.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

PerformanceGauge.displayName = 'PerformanceGauge';
