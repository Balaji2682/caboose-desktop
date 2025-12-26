import { memo } from 'react';
import { AlertTriangle, Lightbulb, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { SmartRecommendation } from '@/types/query';

interface RecommendationCardProps {
  recommendation: SmartRecommendation;
  onCopyFix: (code: string) => void;
  onViewDetails: () => void;
  onDismiss?: () => void;
  copiedId?: string;
  className?: string;
}

const severityConfig = {
  critical: {
    badge: 'destructive' as const,
    icon: 'text-red-400',
    border: 'border-red-500/20 bg-red-500/5',
  },
  high: {
    badge: 'warning' as const,
    icon: 'text-orange-400',
    border: 'border-orange-500/20 bg-orange-500/5',
  },
  medium: {
    badge: 'default' as const,
    icon: 'text-yellow-400',
    border: 'border-yellow-500/20 bg-yellow-500/5',
  },
  low: {
    badge: 'info' as const,
    icon: 'text-blue-400',
    border: 'border-blue-500/20 bg-blue-500/5',
  },
};

const typeLabels = {
  'n+1': 'N+1 Query',
  index: 'Missing Index',
  slow: 'Slow Query',
  'select-star': 'SELECT *',
  duplicate: 'Duplicate Query',
  structure: 'Query Structure',
};

export const RecommendationCard = memo<RecommendationCardProps>(
  ({ recommendation, onCopyFix, onViewDetails, onDismiss, copiedId, className }) => {
    const config = severityConfig[recommendation.severity];
    const isCopied = copiedId === recommendation.id;

    return (
      <div className={cn('p-4 rounded-lg border transition-all', config.border, className)}>
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <AlertTriangle className={cn('w-5 h-5 mt-0.5 flex-shrink-0', config.icon)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={config.badge} className="text-xs">
                {recommendation.severity.toUpperCase()}
              </Badge>
              <span className="text-xs text-gray-500">{typeLabels[recommendation.type]}</span>
            </div>
            <h4 className="text-white font-medium text-sm">{recommendation.title}</h4>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">
              {recommendation.description}
            </p>
          </div>
        </div>

        {/* Impact Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-3 p-3 bg-gray-800/50 rounded-lg">
          <div>
            <div className="text-xs text-gray-500 mb-1">Query Time</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-cyan-400">
                -{recommendation.impact.queryTimeReduction.toFixed(0)}%
              </span>
            </div>
          </div>
          {recommendation.impact.queryCountReduction > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Queries Saved</div>
              <div className="text-lg font-bold text-green-400">
                {recommendation.impact.queryCountReduction}
              </div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500 mb-1">Time Saved</div>
            <div className="text-lg font-bold text-purple-400">
              {recommendation.impact.totalTimeSaved.toFixed(0)}ms
            </div>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Confidence</span>
            <span>{recommendation.impact.confidenceScore}%</span>
          </div>
          <Progress
            value={recommendation.impact.confidenceScore}
            indicatorClassName="bg-gradient-to-r from-cyan-500 to-blue-500"
          />
        </div>

        {/* Fix Code */}
        {recommendation.fix.code && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400">Suggested Fix</span>
              <Badge variant="secondary" className="text-xs ml-auto">
                {recommendation.estimatedEffort}
              </Badge>
            </div>
            <div className="relative">
              <pre className="text-xs text-gray-300 bg-gray-800 p-3 rounded overflow-x-auto border border-gray-700">
                {recommendation.fix.code}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopyFix(recommendation.fix.code)}
                className="absolute top-2 right-2 h-7 px-2"
              >
                {isCopied ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
            {recommendation.fix.explanation && (
              <p className="text-xs text-gray-500 mt-2 italic">
                {recommendation.fix.explanation}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onViewDetails} className="flex-1">
            View Affected Queries ({recommendation.affectedQueries.length})
          </Button>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      </div>
    );
  }
);

RecommendationCard.displayName = 'RecommendationCard';
