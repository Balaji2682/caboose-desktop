import { memo, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GitDiff, GitDiffHunk, DiffLineInfo } from '@/types/git';

interface DiffViewerProps {
  diff: GitDiff;
  mode?: 'side-by-side' | 'unified';
  className?: string;
}

export const DiffViewer = memo<DiffViewerProps>(({ diff, mode = 'side-by-side', className }) => {
  const processedDiff = useMemo(() => processDiff(diff), [diff]);

  if (diff.isBinary) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>Binary file cannot be displayed</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-gray-300">{diff.filePath}</span>
          <Badge variant={getStatusBadge(diff.status)}>{diff.status}</Badge>
        </div>
        {diff.oldPath && diff.oldPath !== diff.filePath && (
          <span className="text-xs text-gray-500">renamed from {diff.oldPath}</span>
        )}
      </div>

      {/* Diff Content */}
      <ScrollArea className="flex-1">
        {mode === 'side-by-side' ? (
          <SideBySideDiff diff={processedDiff} />
        ) : (
          <UnifiedDiff diff={processedDiff} />
        )}
      </ScrollArea>

      {/* Footer Stats */}
      <div className="flex items-center gap-4 px-4 py-2 text-xs text-gray-500 bg-gray-900 border-t border-gray-800">
        <span>
          <span className="text-green-500">+{processedDiff.additions}</span> additions
        </span>
        <span>
          <span className="text-red-500">-{processedDiff.deletions}</span> deletions
        </span>
      </div>
    </div>
  );
});

DiffViewer.displayName = 'DiffViewer';

// Side-by-side diff view (IntelliJ-like)
const SideBySideDiff = memo<{ diff: ProcessedDiff }>(({ diff }) => {
  return (
    <div className="font-mono text-xs">
      {diff.hunks.map((hunk, hunkIndex) => (
        <div key={hunkIndex} className="border-b border-gray-800">
          {/* Hunk header */}
          <div className="px-4 py-1 bg-gray-800 text-cyan-400 sticky top-0 z-10">
            {hunk.header}
          </div>

          {/* Side-by-side lines */}
          <div className="grid grid-cols-2 divide-x divide-gray-800">
            {/* Left side (old) */}
            <div>
              {hunk.leftLines.map((line, lineIndex) => (
                <div
                  key={lineIndex}
                  className={cn(
                    'flex hover:bg-gray-800/50 transition-colors',
                    line.type === 'deletion' && 'bg-red-950/30',
                    line.type === 'context' && 'bg-gray-950'
                  )}
                >
                  {/* Line number */}
                  <div
                    className={cn(
                      'w-12 flex-shrink-0 px-2 text-right select-none',
                      line.type === 'deletion' ? 'text-red-400 bg-red-950/50' : 'text-gray-600'
                    )}
                  >
                    {line.oldLineNum || ''}
                  </div>

                  {/* Content */}
                  <div
                    className={cn(
                      'flex-1 px-2 whitespace-pre font-mono',
                      line.type === 'deletion' && 'text-red-300'
                    )}
                  >
                    {line.content || ' '}
                  </div>
                </div>
              ))}
            </div>

            {/* Right side (new) */}
            <div>
              {hunk.rightLines.map((line, lineIndex) => (
                <div
                  key={lineIndex}
                  className={cn(
                    'flex hover:bg-gray-800/50 transition-colors',
                    line.type === 'addition' && 'bg-green-950/30',
                    line.type === 'context' && 'bg-gray-950'
                  )}
                >
                  {/* Line number */}
                  <div
                    className={cn(
                      'w-12 flex-shrink-0 px-2 text-right select-none',
                      line.type === 'addition' ? 'text-green-400 bg-green-950/50' : 'text-gray-600'
                    )}
                  >
                    {line.newLineNum || ''}
                  </div>

                  {/* Content */}
                  <div
                    className={cn(
                      'flex-1 px-2 whitespace-pre font-mono',
                      line.type === 'addition' && 'text-green-300'
                    )}
                  >
                    {line.content || ' '}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

SideBySideDiff.displayName = 'SideBySideDiff';

// Unified diff view
const UnifiedDiff = memo<{ diff: ProcessedDiff }>(({ diff }) => {
  return (
    <div className="font-mono text-xs">
      {diff.hunks.map((hunk, hunkIndex) => (
        <div key={hunkIndex} className="border-b border-gray-800">
          {/* Hunk header */}
          <div className="px-4 py-1 bg-gray-800 text-cyan-400">
            {hunk.header}
          </div>

          {/* Unified lines */}
          {hunk.unifiedLines.map((line, lineIndex) => (
            <div
              key={lineIndex}
              className={cn(
                'flex hover:bg-gray-800/50 transition-colors',
                line.type === 'addition' && 'bg-green-950/30',
                line.type === 'deletion' && 'bg-red-950/30',
                line.type === 'context' && 'bg-gray-950'
              )}
            >
              {/* Old line number */}
              <div
                className={cn(
                  'w-10 flex-shrink-0 px-2 text-right select-none border-r border-gray-800',
                  line.type === 'deletion' ? 'text-red-400' : 'text-gray-600'
                )}
              >
                {line.oldLineNum || ''}
              </div>

              {/* New line number */}
              <div
                className={cn(
                  'w-10 flex-shrink-0 px-2 text-right select-none border-r border-gray-800',
                  line.type === 'addition' ? 'text-green-400' : 'text-gray-600'
                )}
              >
                {line.newLineNum || ''}
              </div>

              {/* Content */}
              <div
                className={cn(
                  'flex-1 px-2 whitespace-pre font-mono',
                  line.type === 'addition' && 'text-green-300',
                  line.type === 'deletion' && 'text-red-300'
                )}
              >
                {line.content || ' '}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});

UnifiedDiff.displayName = 'UnifiedDiff';

// Helper functions

function getStatusBadge(status: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'added':
      return 'success';
    case 'deleted':
      return 'destructive';
    case 'renamed':
      return 'warning';
    default:
      return 'secondary';
  }
}

interface ProcessedHunk {
  header: string;
  leftLines: DiffLineInfo[];
  rightLines: DiffLineInfo[];
  unifiedLines: DiffLineInfo[];
}

interface ProcessedDiff {
  hunks: ProcessedHunk[];
  additions: number;
  deletions: number;
}

function processDiff(diff: GitDiff): ProcessedDiff {
  let additions = 0;
  let deletions = 0;

  const processedHunks = diff.hunks.map((hunk) => processHunk(hunk));

  // Count additions and deletions
  diff.hunks.forEach((hunk) => {
    hunk.lines.forEach((line) => {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
      }
    });
  });

  return {
    hunks: processedHunks,
    additions,
    deletions,
  };
}

function processHunk(hunk: GitDiffHunk): ProcessedHunk {
  const leftLines: DiffLineInfo[] = [];
  const rightLines: DiffLineInfo[] = [];
  const unifiedLines: DiffLineInfo[] = [];

  let oldLineNum = hunk.oldStart;
  let newLineNum = hunk.newStart;

  hunk.lines.forEach((line) => {
    const firstChar = line[0];
    const content = line.substring(1);

    if (firstChar === '+') {
      // Addition
      const lineInfo: DiffLineInfo = {
        newLineNum: newLineNum++,
        type: 'addition',
        content,
      };

      // For side-by-side, add empty line on left
      leftLines.push({
        type: 'addition',
        content: '',
      });
      rightLines.push(lineInfo);
      unifiedLines.push(lineInfo);
    } else if (firstChar === '-') {
      // Deletion
      const lineInfo: DiffLineInfo = {
        oldLineNum: oldLineNum++,
        type: 'deletion',
        content,
      };

      // For side-by-side, add empty line on right
      leftLines.push(lineInfo);
      rightLines.push({
        type: 'deletion',
        content: '',
      });
      unifiedLines.push(lineInfo);
    } else {
      // Context (unchanged)
      const lineInfo: DiffLineInfo = {
        oldLineNum: oldLineNum++,
        newLineNum: newLineNum++,
        type: 'context',
        content,
      };

      leftLines.push(lineInfo);
      rightLines.push(lineInfo);
      unifiedLines.push(lineInfo);
    }
  });

  return {
    header: hunk.header,
    leftLines,
    rightLines,
    unifiedLines,
  };
}
