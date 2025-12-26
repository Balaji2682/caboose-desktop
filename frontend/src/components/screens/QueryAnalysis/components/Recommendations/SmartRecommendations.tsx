import { memo, useState, useMemo } from 'react';
import { AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecommendationCard } from './RecommendationCard';
import type { SmartRecommendation } from '@/types/query';
import { toast } from 'sonner';

interface SmartRecommendationsProps {
  recommendations: SmartRecommendation[];
  loading?: boolean;
  onRefresh?: () => void;
  onViewQueries?: (queryIds: string[]) => void;
  className?: string;
}

type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';

export const SmartRecommendations = memo<SmartRecommendationsProps>(
  ({ recommendations, loading = false, onRefresh, onViewQueries, className }) => {
    const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const filteredRecommendations = useMemo(() => {
      if (severityFilter === 'all') return recommendations;
      return recommendations.filter((rec) => rec.severity === severityFilter);
    }, [recommendations, severityFilter]);

    const stats = useMemo(() => {
      const critical = recommendations.filter((r) => r.severity === 'critical').length;
      const high = recommendations.filter((r) => r.severity === 'high').length;
      const medium = recommendations.filter((r) => r.severity === 'medium').length;
      const low = recommendations.filter((r) => r.severity === 'low').length;

      const totalImpact = recommendations.reduce((sum, rec) => {
        return sum + rec.impact.totalTimeSaved;
      }, 0);

      const totalQueriesReduced = recommendations.reduce((sum, rec) => {
        return sum + rec.impact.queryCountReduction;
      }, 0);

      return { critical, high, medium, low, totalImpact, totalQueriesReduced };
    }, [recommendations]);

    const handleCopyFix = (code: string, recId: string) => {
      navigator.clipboard.writeText(code);
      setCopiedId(recId);
      toast.success('Fix copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    };

    const handleViewDetails = (rec: SmartRecommendation) => {
      if (onViewQueries) {
        onViewQueries(rec.affectedQueries);
      }
    };

    if (loading) {
      return (
        <Card className={cn('bg-gray-900 border-gray-800 p-6', className)}>
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        </Card>
      );
    }

    if (recommendations.length === 0) {
      return (
        <Card className={cn('bg-gray-900 border-gray-800 p-6', className)}>
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <TrendingUp className="w-12 h-12 text-green-400 mb-3" />
            <h3 className="text-white font-medium mb-1">All Clear!</h3>
            <p className="text-sm text-gray-400">
              No optimization recommendations at this time.
            </p>
          </div>
        </Card>
      );
    }

    return (
      <Card className={cn('bg-gray-900 border-gray-800 overflow-hidden', className)}>
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-cyan-400" />
                Smart Recommendations
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                AI-powered query optimization suggestions
              </p>
            </div>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>

          {/* Impact Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800/50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500 mb-1">Total Issues</div>
              <div className="text-2xl font-bold text-white">{recommendations.length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Potential Time Saved</div>
              <div className="text-2xl font-bold text-cyan-400">
                {stats.totalImpact.toFixed(0)}ms
              </div>
            </div>
            {stats.totalQueriesReduced > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Queries Reducible</div>
                <div className="text-2xl font-bold text-green-400">
                  {stats.totalQueriesReduced}
                </div>
              </div>
            )}
          </div>

          {/* Severity Filter */}
          <div className="mt-4">
            <Tabs value={severityFilter} onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}>
              <TabsList className="bg-gray-800 w-full">
                <TabsTrigger value="all" className="flex-1">
                  All ({recommendations.length})
                </TabsTrigger>
                {stats.critical > 0 && (
                  <TabsTrigger value="critical" className="flex-1">
                    Critical ({stats.critical})
                  </TabsTrigger>
                )}
                {stats.high > 0 && (
                  <TabsTrigger value="high" className="flex-1">
                    High ({stats.high})
                  </TabsTrigger>
                )}
                {stats.medium > 0 && (
                  <TabsTrigger value="medium" className="flex-1">
                    Medium ({stats.medium})
                  </TabsTrigger>
                )}
                {stats.low > 0 && (
                  <TabsTrigger value="low" className="flex-1">
                    Low ({stats.low})
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Recommendations List */}
        <ScrollArea className="h-96">
          <div className="p-6 space-y-4">
            {filteredRecommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onCopyFix={(code) => handleCopyFix(code, rec.id)}
                onViewDetails={() => handleViewDetails(rec)}
                copiedId={copiedId || undefined}
              />
            ))}

            {filteredRecommendations.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No {severityFilter} severity recommendations
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    );
  }
);

SmartRecommendations.displayName = 'SmartRecommendations';
