import { memo, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, GitCompare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GitDiff, GitDiffHunk, DiffLineInfo } from '@/types/git';

interface EnhancedDiffViewerProps {
  diff: GitDiff;
  mode?: 'side-by-side' | 'unified';
  className?: string;
  onPreviousFile?: () => void;
  onNextFile?: () => void;
  onShowBlame?: () => void;
  hasPreviousFile?: boolean;
  hasNextFile?: boolean;
  currentFileIndex?: number;
  totalFiles?: number;
}

export const EnhancedDiffViewer = memo<EnhancedDiffViewerProps>(
  ({
    diff,
    mode = 'side-by-side',
    className,
    onPreviousFile,
    onNextFile,
    onShowBlame,
    hasPreviousFile = false,
    hasNextFile = false,
    currentFileIndex = 1,
    totalFiles = 1,
  }) => {
    const [currentChangeIndex, setCurrentChangeIndex] = useState(0);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const changeRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    // Process diff with full file context
    const processedDiff = useMemo(() => processFullFileDiff(diff), [diff]);
    const changePositions = useMemo(() => {
      const positions: number[] = [];
      processedDiff.fullFileLines.forEach((line, index) => {
        if (line.type === 'addition' || line.type === 'deletion') {
          positions.push(index);
        }
      });
      return positions;
    }, [processedDiff]);

    // Navigate to change
    const scrollToChange = useCallback((index: number) => {
      const lineIndex = changePositions[index];
      if (lineIndex !== undefined) {
        const element = changeRefs.current.get(lineIndex);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, [changePositions]);

    const handlePreviousChange = useCallback(() => {
      if (currentChangeIndex > 0) {
        const newIndex = currentChangeIndex - 1;
        setCurrentChangeIndex(newIndex);
        scrollToChange(newIndex);
      }
    }, [currentChangeIndex, scrollToChange]);

    const handleNextChange = useCallback(() => {
      if (currentChangeIndex < changePositions.length - 1) {
        const newIndex = currentChangeIndex + 1;
        setCurrentChangeIndex(newIndex);
        scrollToChange(newIndex);
      }
    }, [currentChangeIndex, changePositions.length, scrollToChange]);

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'F7' || (e.ctrlKey && e.key === 'ArrowDown')) {
          e.preventDefault();
          handleNextChange();
        } else if (e.shiftKey && e.key === 'F7' || (e.ctrlKey && e.key === 'ArrowUp')) {
          e.preventDefault();
          handlePreviousChange();
        } else if (e.altKey && e.key === 'ArrowLeft' && hasPreviousFile) {
          e.preventDefault();
          onPreviousFile?.();
        } else if (e.altKey && e.key === 'ArrowRight' && hasNextFile) {
          e.preventDefault();
          onNextFile?.();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNextChange, handlePreviousChange, hasPreviousFile, hasNextFile, onPreviousFile, onNextFile]);

    if (diff.isBinary) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>Binary file cannot be displayed</p>
        </div>
      );
    }

    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Header with Navigation */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-gray-300">{diff.filePath}</span>
            <Badge variant={getStatusBadge(diff.status)}>{diff.status}</Badge>
            {diff.oldPath && diff.oldPath !== diff.filePath && (
              <span className="text-xs text-gray-500">← {diff.oldPath}</span>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            {/* File Navigation */}
            <div className="flex items-center gap-1 border-r border-gray-700 pr-2">
              <Button
                onClick={onPreviousFile}
                disabled={!hasPreviousFile}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                title="Previous File (Alt+Left)"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-gray-500 px-2">
                {currentFileIndex} / {totalFiles}
              </span>
              <Button
                onClick={onNextFile}
                disabled={!hasNextFile}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                title="Next File (Alt+Right)"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Change Navigation */}
            <div className="flex items-center gap-1 border-r border-gray-700 pr-2">
              <Button
                onClick={handlePreviousChange}
                disabled={currentChangeIndex === 0}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                title="Previous Change (Ctrl+Up)"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <span className="text-xs text-gray-500 px-2">
                {changePositions.length > 0 ? currentChangeIndex + 1 : 0} / {changePositions.length}
              </span>
              <Button
                onClick={handleNextChange}
                disabled={currentChangeIndex >= changePositions.length - 1}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                title="Next Change (Ctrl+Down)"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>

            {/* Blame Button */}
            {onShowBlame && (
              <Button
                onClick={onShowBlame}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                title="Show Blame"
              >
                <GitCompare className="w-4 h-4 mr-1" />
                Blame
              </Button>
            )}
          </div>
        </div>

        {/* Diff Content */}
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          {mode === 'side-by-side' ? (
            <FullFileSideBySide
              diff={processedDiff}
              changePositions={changePositions}
              currentChangeIndex={currentChangeIndex}
              changeRefs={changeRefs}
            />
          ) : (
            <FullFileUnified
              diff={processedDiff}
              changePositions={changePositions}
              currentChangeIndex={currentChangeIndex}
              changeRefs={changeRefs}
            />
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
          <span className="ml-auto">
            {changePositions.length} change{changePositions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    );
  }
);

EnhancedDiffViewer.displayName = 'EnhancedDiffViewer';

// Full file side-by-side view
const FullFileSideBySide = memo<{
  diff: ProcessedFullFileDiff;
  changePositions: number[];
  currentChangeIndex: number;
  changeRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
}>(({ diff, changePositions, currentChangeIndex, changeRefs }) => {
  return (
    <div className="font-mono text-xs">
      <div className="grid grid-cols-2 divide-x divide-gray-800">
        {/* Left side (old) */}
        <div>
          {diff.fullFileLines.map((line, index) => {
            const isCurrentChange = changePositions[currentChangeIndex] === index;
            const isChange = line.type === 'deletion' || line.type === 'addition';

            return (
              <div
                key={index}
                ref={(el) => {
                  if (el && isChange) changeRefs.current.set(index, el);
                }}
                className={cn(
                  'flex hover:bg-gray-800/50 transition-colors',
                  line.type === 'deletion' && 'bg-red-950/30',
                  line.type === 'context' && 'bg-gray-950',
                  isCurrentChange && 'ring-2 ring-cyan-500 ring-inset'
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
            );
          })}
        </div>

        {/* Right side (new) */}
        <div>
          {diff.fullFileLines.map((line, index) => {
            const isCurrentChange = changePositions[currentChangeIndex] === index;

            return (
              <div
                key={index}
                className={cn(
                  'flex hover:bg-gray-800/50 transition-colors',
                  line.type === 'addition' && 'bg-green-950/30',
                  line.type === 'context' && 'bg-gray-950',
                  isCurrentChange && 'ring-2 ring-cyan-500 ring-inset'
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
            );
          })}
        </div>
      </div>
    </div>
  );
});

FullFileSideBySide.displayName = 'FullFileSideBySide';

// Full file unified view
const FullFileUnified = memo<{
  diff: ProcessedFullFileDiff;
  changePositions: number[];
  currentChangeIndex: number;
  changeRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
}>(({ diff, changePositions, currentChangeIndex, changeRefs }) => {
  return (
    <div className="font-mono text-xs">
      {diff.fullFileLines.map((line, index) => {
        const isCurrentChange = changePositions[currentChangeIndex] === index;
        const isChange = line.type === 'deletion' || line.type === 'addition';

        return (
          <div
            key={index}
            ref={(el) => {
              if (el && isChange) changeRefs.current.set(index, el);
            }}
            className={cn(
              'flex hover:bg-gray-800/50 transition-colors',
              line.type === 'addition' && 'bg-green-950/30',
              line.type === 'deletion' && 'bg-red-950/30',
              line.type === 'context' && 'bg-gray-950',
              isCurrentChange && 'ring-2 ring-cyan-500 ring-inset'
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
        );
      })}
    </div>
  );
});

FullFileUnified.displayName = 'FullFileUnified';

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

interface ProcessedFullFileDiff {
  fullFileLines: DiffLineInfo[];
  additions: number;
  deletions: number;
}

// Process diff to show full file with context
function processFullFileDiff(diff: GitDiff): ProcessedFullFileDiff {
  const fullFileLines: DiffLineInfo[] = [];
  let additions = 0;
  let deletions = 0;

  // Reconstruct full file from hunks
  diff.hunks.forEach((hunk, hunkIndex) => {
    let oldLineNum = hunk.oldStart;
    let newLineNum = hunk.newStart;

    hunk.lines.forEach((line) => {
      const firstChar = line[0];
      const content = line.substring(1);

      if (firstChar === '+') {
        // Addition
        fullFileLines.push({
          newLineNum: newLineNum++,
          type: 'addition',
          content,
        });
        additions++;
      } else if (firstChar === '-') {
        // Deletion
        fullFileLines.push({
          oldLineNum: oldLineNum++,
          type: 'deletion',
          content,
        });
        deletions++;
      } else {
        // Context
        fullFileLines.push({
          oldLineNum: oldLineNum++,
          newLineNum: newLineNum++,
          type: 'context',
          content,
        });
      }
    });
  });

  return {
    fullFileLines,
    additions,
    deletions,
  };
}
