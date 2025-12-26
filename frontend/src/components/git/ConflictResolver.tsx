import { memo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GitConflictFile, GitConflictRegion } from '@/types/git';

interface ConflictResolverProps {
  conflict: GitConflictFile;
  onResolve: (resolution: 'ours' | 'theirs') => void;
  onCancel: () => void;
  className?: string;
}

export const ConflictResolver = memo<ConflictResolverProps>(
  ({ conflict, onResolve, onCancel, className }) => {
    const [selectedResolutions, setSelectedResolutions] = useState<Map<number, 'ours' | 'theirs'>>(
      new Map()
    );

    const oursLines = conflict.oursContent.split('\n');
    const theirsLines = conflict.theirsContent.split('\n');
    const baseLines = conflict.baseContent ? conflict.baseContent.split('\n') : [];

    const handleAcceptOurs = () => {
      onResolve('ours');
    };

    const handleAcceptTheirs = () => {
      onResolve('theirs');
    };

    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-gray-300">{conflict.path}</span>
            <Badge variant="destructive">Conflict</Badge>
            <span className="text-xs text-gray-500">
              {conflict.conflictRegions.length} conflict{conflict.conflictRegions.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleAcceptOurs} size="sm" variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Accept Ours
            </Button>
            <Button onClick={handleAcceptTheirs} size="sm" variant="outline">
              Accept Theirs
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button onClick={onCancel} size="sm" variant="ghost">
              Cancel
            </Button>
          </div>
        </div>

        {/* 3-Way Merge View */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-3 divide-x divide-gray-800 font-mono text-xs">
            {/* Left: Ours (Current Branch) */}
            <div className="flex flex-col">
              <div className="sticky top-0 z-10 px-4 py-2 bg-blue-900/50 text-blue-200 font-medium border-b border-blue-800">
                Ours (Current Branch)
              </div>
              <div>
                {oursLines.map((line, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex hover:bg-gray-800/50 transition-colors',
                      isInConflictRegion(index + 1, conflict.conflictRegions, 'ours') &&
                        'bg-blue-950/30'
                    )}
                  >
                    <div className="w-10 flex-shrink-0 px-2 text-right text-gray-600 select-none border-r border-gray-800">
                      {index + 1}
                    </div>
                    <div className="flex-1 px-3 py-1 whitespace-pre text-gray-200">
                      {line || ' '}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Center: Base (Common Ancestor) */}
            {baseLines.length > 0 && (
              <div className="flex flex-col">
                <div className="sticky top-0 z-10 px-4 py-2 bg-gray-800 text-gray-400 font-medium border-b border-gray-700">
                  Base (Common Ancestor)
                </div>
                <div>
                  {baseLines.map((line, index) => (
                    <div
                      key={index}
                      className="flex hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="w-10 flex-shrink-0 px-2 text-right text-gray-600 select-none border-r border-gray-800">
                        {index + 1}
                      </div>
                      <div className="flex-1 px-3 py-1 whitespace-pre text-gray-400">
                        {line || ' '}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Right: Theirs (Incoming Branch) */}
            <div className="flex flex-col">
              <div className="sticky top-0 z-10 px-4 py-2 bg-green-900/50 text-green-200 font-medium border-b border-green-800">
                Theirs (Incoming Branch)
              </div>
              <div>
                {theirsLines.map((line, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex hover:bg-gray-800/50 transition-colors',
                      isInConflictRegion(index + 1, conflict.conflictRegions, 'theirs') &&
                        'bg-green-950/30'
                    )}
                  >
                    <div className="w-10 flex-shrink-0 px-2 text-right text-gray-600 select-none border-r border-gray-800">
                      {index + 1}
                    </div>
                    <div className="flex-1 px-3 py-1 whitespace-pre text-gray-200">
                      {line || ' '}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Conflict Regions Overlay */}
          <div className="border-t-2 border-red-600 mt-4">
            {conflict.conflictRegions.map((region, index) => (
              <ConflictRegionView key={index} region={region} regionIndex={index} />
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-2 text-xs text-gray-500 bg-gray-900 border-t border-gray-800">
          Resolve all conflicts to proceed with merge
        </div>
      </div>
    );
  }
);

ConflictResolver.displayName = 'ConflictResolver';

// Conflict region detail view
const ConflictRegionView = memo<{ region: GitConflictRegion; regionIndex: number }>(
  ({ region, regionIndex }) => {
    const [selectedSide, setSelectedSide] = useState<'ours' | 'theirs' | null>(null);

    return (
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center gap-4 mb-3">
          <Badge variant="destructive">Conflict {regionIndex + 1}</Badge>
          <span className="text-xs text-gray-500">
            Lines {region.startLine}-{region.endLine}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Ours */}
          <div
            className={cn(
              'border rounded p-3 cursor-pointer transition-colors',
              selectedSide === 'ours'
                ? 'border-blue-500 bg-blue-950/30'
                : 'border-gray-700 hover:border-blue-600'
            )}
            onClick={() => setSelectedSide('ours')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-300">Ours</span>
              {selectedSide === 'ours' && (
                <Check className="w-4 h-4 text-blue-500" />
              )}
            </div>
            <div className="font-mono text-xs text-gray-300 whitespace-pre-wrap bg-gray-900 p-2 rounded">
              {region.oursLines.join('\n')}
            </div>
          </div>

          {/* Theirs */}
          <div
            className={cn(
              'border rounded p-3 cursor-pointer transition-colors',
              selectedSide === 'theirs'
                ? 'border-green-500 bg-green-950/30'
                : 'border-gray-700 hover:border-green-600'
            )}
            onClick={() => setSelectedSide('theirs')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-green-300">Theirs</span>
              {selectedSide === 'theirs' && (
                <Check className="w-4 h-4 text-green-500" />
              )}
            </div>
            <div className="font-mono text-xs text-gray-300 whitespace-pre-wrap bg-gray-900 p-2 rounded">
              {region.theirsLines.join('\n')}
            </div>
          </div>
        </div>

        {/* Base (if available) */}
        {region.baseLines && region.baseLines.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-medium text-gray-500 mb-1">Base (Common Ancestor)</div>
            <div className="font-mono text-xs text-gray-400 whitespace-pre-wrap bg-gray-900 p-2 rounded border border-gray-700">
              {region.baseLines.join('\n')}
            </div>
          </div>
        )}
      </div>
    );
  }
);

ConflictRegionView.displayName = 'ConflictRegionView';

// Helper functions

function isInConflictRegion(
  lineNumber: number,
  regions: GitConflictRegion[],
  side: 'ours' | 'theirs'
): boolean {
  return regions.some((region) => {
    if (lineNumber >= region.startLine && lineNumber <= region.endLine) {
      // Check if this line is actually in the specified side's content
      return side === 'ours' ? region.oursLines.length > 0 : region.theirsLines.length > 0;
    }
    return false;
  });
}
