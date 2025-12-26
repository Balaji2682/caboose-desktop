import { memo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RailsSuggestion } from './RailsSuggestion';
import type { N1Warning } from '@/types/query';

interface N1WarningPanelProps {
  warning: N1Warning;
  onViewQueries?: (fingerprint: string) => void;
  className?: string;
}

export const N1WarningPanel = memo<N1WarningPanelProps>(
  ({ warning, onViewQueries, className }) => {
    const [showExamples, setShowExamples] = useState(false);
    const [showRailsFixes, setShowRailsFixes] = useState(false);

    const getConfidenceColor = (confidence: number) => {
      if (confidence >= 80) return 'bg-red-500';
      if (confidence >= 60) return 'bg-orange-500';
      return 'bg-yellow-500';
    };

    const getConfidenceLabel = (confidence: number) => {
      if (confidence >= 80) return 'Very High';
      if (confidence >= 60) return 'High';
      if (confidence >= 40) return 'Medium';
      return 'Low';
    };

    return (
      <Card
        className={cn(
          'bg-red-500/5 border-red-500/20 overflow-hidden transition-all',
          className
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-red-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-red-400 font-medium">N+1 Query Pattern Detected</h3>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded',
                    warning.confidence >= 80
                      ? 'bg-red-500/20 text-red-400'
                      : warning.confidence >= 60
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  )}
                >
                  {getConfidenceLabel(warning.confidence)} Confidence
                </span>
              </div>
              <p className="text-sm text-gray-300">
                This query is being executed{' '}
                <span className="font-bold text-white">{warning.count} times</span> in a loop,
                causing {warning.count} separate database calls.
              </p>
            </div>
          </div>

          {/* Confidence Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>Detection Confidence</span>
              <span className="font-medium">{warning.confidence}%</span>
            </div>
            <Progress
              value={warning.confidence}
              indicatorClassName={getConfidenceColor(warning.confidence)}
            />
          </div>
        </div>

        {/* Metrics */}
        <div className="p-4 border-b border-red-500/20 bg-gray-900/30">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Execution Count</div>
              <div className="text-xl font-bold text-red-400">{warning.count}x</div>
              <div className="text-xs text-gray-400 mt-0.5">Can be reduced to 1-2</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Total Duration</div>
              <div className="text-xl font-bold text-orange-400">
                {warning.totalDuration.toFixed(1)}ms
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Time spent on duplicates</div>
            </div>
            {warning.table && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Affected Table</div>
                <div className="flex items-center gap-1 mt-1">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-white">{warning.table}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Suggestion */}
        {warning.suggestion && (
          <div className="p-4 border-b border-red-500/20 bg-gray-900/20">
            <p className="text-sm text-gray-300">
              <span className="text-yellow-400 font-medium">💡 Quick Fix:</span>{' '}
              {warning.suggestion}
            </p>
          </div>
        )}

        {/* Rails Fix Options */}
        <div className="p-4 border-b border-red-500/20">
          <button
            onClick={() => setShowRailsFixes(!showRailsFixes)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-white">Show Rails Fix Options</span>
            {showRailsFixes ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {showRailsFixes && (
            <div className="mt-4">
              <RailsSuggestion table={warning.table} />
            </div>
          )}
        </div>

        {/* Example Queries */}
        {warning.examples && warning.examples.length > 0 && (
          <div className="p-4">
            <button
              onClick={() => setShowExamples(!showExamples)}
              className="flex items-center justify-between w-full text-left mb-3"
            >
              <span className="text-sm font-medium text-white">
                Example Queries ({Math.min(warning.examples.length, 3)})
              </span>
              {showExamples ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {showExamples && (
              <div className="space-y-2">
                {warning.examples.slice(0, 3).map((example, index) => (
                  <pre
                    key={index}
                    className="text-xs text-gray-300 bg-gray-900/50 p-3 rounded overflow-x-auto border border-gray-700"
                  >
                    {example}
                  </pre>
                ))}
                {warning.examples.length > 3 && (
                  <p className="text-xs text-gray-500 italic">
                    And {warning.examples.length - 3} more similar queries...
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="p-4 bg-gray-900/30">
          {onViewQueries && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewQueries(warning.fingerprint)}
              className="w-full"
            >
              View All Affected Queries
            </Button>
          )}
        </div>
      </Card>
    );
  }
);

N1WarningPanel.displayName = 'N1WarningPanel';
