import { memo, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { QueryInfo } from '@/types/query';

interface QueryTimelineProps {
  queries: QueryInfo[];
  onSelectQuery?: (query: QueryInfo) => void;
  selectedQueryIndex?: number;
  className?: string;
}

export const QueryTimeline = memo<QueryTimelineProps>(
  ({ queries, onSelectQuery, selectedQueryIndex, className }) => {
    const { totalDuration, maxDuration } = useMemo(() => {
      const total = queries.reduce((sum, q) => sum + q.duration, 0);
      const max = Math.max(...queries.map((q) => q.duration));
      return { totalDuration: total, maxDuration: max };
    }, [queries]);

    if (queries.length === 0) {
      return (
        <Card className={cn('bg-gray-900 border-gray-800 p-6', className)}>
          <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
            No queries to display
          </div>
        </Card>
      );
    }

    const getQueryColor = (query: QueryInfo) => {
      if (query.isSlow) return 'bg-red-500';
      if (query.duration > 50) return 'bg-yellow-500';
      return 'bg-cyan-500';
    };

    const getQueryBorderColor = (query: QueryInfo) => {
      if (query.isSlow) return 'border-red-500';
      if (query.duration > 50) return 'border-yellow-500';
      return 'border-cyan-500';
    };

    // Calculate cumulative start times
    let cumulativeTime = 0;
    const timelineData = queries.map((query, index) => {
      const start = cumulativeTime;
      cumulativeTime += query.duration;
      return { query, start, index };
    });

    return (
      <Card className={cn('bg-gray-900 border-gray-800 p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Query Execution Timeline
          </h3>
          <div className="text-sm text-gray-400">
            Total: <span className="text-white font-medium">{totalDuration.toFixed(1)}ms</span>
          </div>
        </div>

        <ScrollArea className="h-80">
          <div className="space-y-3">
            {timelineData.map(({ query, start, index }) => {
              const widthPercent = (query.duration / totalDuration) * 100;
              const startPercent = (start / totalDuration) * 100;
              const isSelected = selectedQueryIndex === index;

              return (
                <button
                  key={index}
                  onClick={() => onSelectQuery?.(query)}
                  className={cn(
                    'w-full text-left group transition-all',
                    isSelected && 'scale-[1.02]'
                  )}
                >
                  {/* Query info */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 w-8">#{index + 1}</span>
                    <span className="text-xs text-gray-400 flex-1 truncate font-mono">
                      {query.sql.substring(0, 60)}...
                    </span>
                    <span className="text-xs text-gray-400">
                      {query.duration.toFixed(1)}ms
                    </span>
                  </div>

                  {/* Timeline bar */}
                  <div className="relative h-8 bg-gray-800/50 rounded overflow-hidden border border-gray-700 group-hover:border-gray-600">
                    {/* Start offset spacer */}
                    <div
                      className="absolute left-0 top-0 h-full"
                      style={{ width: `${startPercent}%` }}
                    />

                    {/* Query duration bar */}
                    <div
                      className={cn(
                        'absolute top-0 h-full transition-all duration-300',
                        getQueryColor(query),
                        'opacity-70 group-hover:opacity-90',
                        isSelected && 'opacity-100 border-2',
                        isSelected && getQueryBorderColor(query)
                      )}
                      style={{
                        left: `${startPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                    >
                      {/* Glow effect */}
                      <div
                        className={cn(
                          'absolute inset-0 opacity-30 blur-sm',
                          getQueryColor(query)
                        )}
                      />
                    </div>

                    {/* Operation label */}
                    <div
                      className="absolute inset-0 flex items-center px-2 pointer-events-none"
                      style={{ left: `${startPercent}%` }}
                    >
                      <span className="text-xs font-medium text-white drop-shadow-lg z-10">
                        {query.operation}
                      </span>
                    </div>
                  </div>

                  {/* Additional info */}
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-gray-500">
                      Table: <span className="text-gray-400">{query.table || 'N/A'}</span>
                    </span>
                    {query.hasSelectStar && (
                      <span className="text-yellow-500">SELECT *</span>
                    )}
                    {query.isSlow && (
                      <span className="text-red-400">SLOW</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-800 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-500 rounded" />
            <span className="text-gray-400">Fast (&lt;50ms)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded" />
            <span className="text-gray-400">Moderate (50-100ms)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span className="text-gray-400">Slow (&gt;100ms)</span>
          </div>
        </div>
      </Card>
    );
  }
);

QueryTimeline.displayName = 'QueryTimeline';
