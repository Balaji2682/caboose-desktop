import { memo, useEffect } from 'react';
import { Copy, Database, Eye, EyeOff, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import type { QueryStatistic } from '@/lib/wails';

interface QuickActionsProps {
  selectedQuery: QueryStatistic | null;
  onExplain: () => void;
  onCopySQL: () => void;
  onIgnorePattern: () => void;
  explainLoading?: boolean;
  className?: string;
}

export const QuickActions = memo<QuickActionsProps>(
  ({ selectedQuery, onExplain, onCopySQL, onIgnorePattern, explainLoading = false, className }) => {
    // Keyboard shortcuts
    useEffect(() => {
      if (!selectedQuery) return;

      const handleKeyPress = (e: KeyboardEvent) => {
        // Cmd/Ctrl + C - Copy SQL
        if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !e.shiftKey) {
          // Only if not in an input field
          if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
            e.preventDefault();
            onCopySQL();
          }
        }

        // Cmd/Ctrl + E - Explain query
        if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
          e.preventDefault();
          onExplain();
        }

        // Cmd/Ctrl + I - Ignore pattern
        if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
          e.preventDefault();
          onIgnorePattern();
        }
      };

      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }, [selectedQuery, onCopySQL, onExplain, onIgnorePattern]);

    if (!selectedQuery) {
      return null;
    }

    return (
      <TooltipProvider>
        <div
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-2 p-2 rounded-lg',
            'bg-gray-900/95 border border-gray-700 backdrop-blur-sm',
            'shadow-xl shadow-black/50',
            'animate-slide-in-up',
            className
          )}
        >
          <div className="flex items-center gap-2 px-3 py-1 border-r border-gray-700">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-gray-300 font-medium">Quick Actions</span>
          </div>

          {/* Copy SQL */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCopySQL}
                className="h-9 gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy SQL
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-gray-700 bg-gray-800 px-1.5 font-mono text-xs text-gray-400">
                  <span className="text-xs">⌘</span>C
                </kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copy SQL query to clipboard</p>
            </TooltipContent>
          </Tooltip>

          {/* Explain Query */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onExplain}
                disabled={explainLoading}
                className="h-9 gap-2"
              >
                <Database className={cn('w-4 h-4', explainLoading && 'animate-spin')} />
                Analyze with EXPLAIN
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-gray-700 bg-gray-800 px-1.5 font-mono text-xs text-gray-400">
                  <span className="text-xs">⌘</span>E
                </kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Run EXPLAIN to analyze query performance</p>
            </TooltipContent>
          </Tooltip>

          {/* Ignore Pattern */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onIgnorePattern}
                className="h-9 gap-2"
              >
                <EyeOff className="w-4 h-4" />
                Ignore Pattern
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-gray-700 bg-gray-800 px-1.5 font-mono text-xs text-gray-400">
                  <span className="text-xs">⌘</span>I
                </kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ignore this query pattern from future analysis</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }
);

QuickActions.displayName = 'QuickActions';
