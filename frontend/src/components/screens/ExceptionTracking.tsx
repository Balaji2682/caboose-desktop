import { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, XCircle, AlertCircle, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useExceptionStore } from '@/stores/exceptionStore';
import type { Exception } from '@/stores/exceptionStore';

const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } catch {
    return dateString;
  }
};

const ExceptionCard = memo<{
  exception: Exception;
  isExpanded: boolean;
  onToggle: () => void;
  onResolve: (id: string) => void;
  onIgnore: (id: string) => void;
}>(({ exception, isExpanded, onToggle, onResolve, onIgnore }) => (
  <div className="transition-colors">
    <button onClick={onToggle} className="w-full p-4 hover:bg-gray-800/30 transition-colors text-left">
      <div className="flex items-start gap-4">
        <div className="flex items-center gap-2 mt-1">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          {exception.severity === 'error' ? (
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-sm text-white">{exception.type}</h3>
            <Badge variant={exception.severity === 'error' ? 'destructive' : 'warning'}>
              {exception.severity}
            </Badge>
            <Badge variant="secondary">×{exception.count}</Badge>
          </div>
          <p className="text-sm text-gray-400 mb-2">{exception.message}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <code className="text-cyan-400">
              {exception.file}:{exception.line}
            </code>
            <span>Last seen {formatRelativeTime(exception.lastSeen)}</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onResolve(exception.id);
          }}
        >
          Resolve
        </Button>
      </div>
    </button>

    {isExpanded && (
      <div className="px-4 pb-4 bg-gray-800/30 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-400">Stack Trace</label>
            <Button variant="ghost" size="sm">
              <ExternalLink className="w-3 h-3" />
              Open in Editor
            </Button>
          </div>
          <div className="bg-black/30 rounded-lg p-4 font-mono text-xs space-y-1 overflow-x-auto">
            {exception.stackTrace.map((line, index) => (
              <div key={index} className="text-gray-300">
                <span className="text-gray-600 mr-3">{index + 1}</span>
                {line}
              </div>
            ))}
          </div>
        </div>

        {exception.context && (
          <div>
            <label className="text-sm text-gray-400 block mb-2">Request Context</label>
            <div className="bg-black/30 rounded-lg p-4 font-mono text-xs">
              <pre className="text-gray-300">{JSON.stringify(exception.context, null, 2)}</pre>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto"
            onClick={(e) => {
              e.stopPropagation();
              onIgnore(exception.id);
            }}
          >
            Ignore
          </Button>
        </div>
      </div>
    )}
  </div>
));

ExceptionCard.displayName = 'ExceptionCard';

export const ExceptionTracking = memo(() => {
  const { exceptions, loading, fetchExceptions, resolveException, ignoreException, clearExceptions } =
    useExceptionStore();
  const [expandedExceptions, setExpandedExceptions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchExceptions();
    const interval = setInterval(fetchExceptions, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchExceptions]);

  const toggleException = useCallback((id: string) => {
    setExpandedExceptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const totalExceptions = useMemo(
    () => exceptions.reduce((sum, e) => sum + e.count, 0),
    [exceptions]
  );
  const errorCount = useMemo(
    () => exceptions.filter((e) => e.severity === 'error').length,
    [exceptions]
  );
  const warningCount = useMemo(
    () => exceptions.filter((e) => e.severity === 'warning').length,
    [exceptions]
  );
  const mostFrequent = useMemo(() => {
    if (exceptions.length === 0) return null;
    return exceptions.reduce((max, e) => (e.count > max.count ? e : max), exceptions[0]);
  }, [exceptions]);

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Exception Tracking</h1>
          <p className="text-sm text-gray-400">Monitor and debug application errors</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchExceptions} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Button variant="outline" size="sm" onClick={clearExceptions}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-gray-400">Total Exceptions</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalExceptions}</p>
          <p className="text-xs text-gray-500 mt-1">All occurrences</p>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-gray-400">Errors</span>
          </div>
          <p className="text-2xl font-bold text-white">{errorCount}</p>
          <p className="text-xs text-gray-500 mt-1">Unique types</p>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-gray-400">Warnings</span>
          </div>
          <p className="text-2xl font-bold text-white">{warningCount}</p>
          <p className="text-xs text-gray-500 mt-1">Unique types</p>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-gray-400">Most Frequent</span>
          </div>
          <p className="text-lg font-bold text-white truncate">
            {mostFrequent ? mostFrequent.type : 'None'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {mostFrequent ? `${mostFrequent.count} occurrences` : 'No exceptions'}
          </p>
        </Card>
      </div>

      {/* Exception List */}
      <Card className="bg-gray-900 border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            Active Exceptions ({exceptions.length})
          </h2>
        </div>

        {exceptions.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p>No exceptions tracked</p>
            <p className="text-xs mt-2">Exceptions from application logs will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {exceptions.map((exception) => (
              <ExceptionCard
                key={exception.id}
                exception={exception}
                isExpanded={expandedExceptions.has(exception.id)}
                onToggle={() => toggleException(exception.id)}
                onResolve={resolveException}
                onIgnore={ignoreException}
              />
            ))}
          </div>
        )}
      </Card>

    </div>
  );
});

ExceptionTracking.displayName = 'ExceptionTracking';
