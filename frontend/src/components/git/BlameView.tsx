import { memo, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { GitBlameFile, GitBlameLine } from '@/types/git';
import { formatDistance } from 'date-fns';

interface BlameViewProps {
  blame: GitBlameFile;
  className?: string;
}

export const BlameView = memo<BlameViewProps>(({ blame, className }) => {
  // Group consecutive lines by commit to assign colors
  const blameGroups = useMemo(() => groupBlameByCommit(blame.lines), [blame.lines]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-gray-300">{blame.filePath}</span>
          <span className="text-xs text-gray-500">Git Blame</span>
        </div>
      </div>

      {/* Blame Content */}
      <ScrollArea className="flex-1">
        <div className="font-mono text-xs">
          {blame.lines.map((line, index) => {
            const group = blameGroups.find((g) => g.lines.includes(line));
            const color = group?.color || 'bg-gray-800';

            return (
              <div
                key={index}
                className="flex hover:bg-gray-800/50 transition-colors border-b border-gray-900"
              >
                {/* Blame info sidebar */}
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'w-80 flex-shrink-0 px-3 py-1 select-none border-r border-gray-800',
                          color
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          {/* Author and date */}
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-gray-300 truncate font-medium">
                              {truncateAuthor(line.author)}
                            </span>
                            <span className="text-gray-500 text-xs whitespace-nowrap">
                              {formatRelativeDate(line.authorDate)}
                            </span>
                          </div>

                          {/* Short commit hash */}
                          <span className="text-cyan-400 font-mono text-xs">
                            {line.commitHash.substring(0, 7)}
                          </span>
                        </div>

                        {/* Commit summary (if first line of group) */}
                        {isFirstInGroup(line, group) && (
                          <div className="text-gray-400 text-xs mt-0.5 truncate">
                            {line.commitSummary}
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-md">
                      <div className="space-y-1">
                        <div className="font-mono text-xs text-cyan-400">{line.commitHash}</div>
                        <div className="text-sm font-medium">{line.author}</div>
                        <div className="text-xs text-gray-400">{line.authorEmail}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(line.authorDate).toLocaleString()}
                        </div>
                        <div className="text-sm mt-2 whitespace-pre-wrap">{line.commitMessage}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Line number */}
                <div className="w-12 flex-shrink-0 px-2 text-right text-gray-600 select-none border-r border-gray-800 py-1">
                  {line.lineNumber}
                </div>

                {/* Code content */}
                <div className="flex-1 px-3 py-1 whitespace-pre font-mono text-gray-200">
                  {line.content || ' '}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-2 text-xs text-gray-500 bg-gray-900 border-t border-gray-800">
        {blame.lines.length} lines
      </div>
    </div>
  );
});

BlameView.displayName = 'BlameView';

// Helper functions

interface BlameGroup {
  commitHash: string;
  lines: GitBlameLine[];
  color: string;
}

function groupBlameByCommit(lines: GitBlameLine[]): BlameGroup[] {
  const groups: BlameGroup[] = [];
  const colors = [
    'bg-blue-950/30',
    'bg-purple-950/30',
    'bg-green-950/30',
    'bg-yellow-950/30',
    'bg-red-950/30',
    'bg-indigo-950/30',
    'bg-pink-950/30',
    'bg-teal-950/30',
  ];

  let currentGroup: BlameGroup | null = null;
  let colorIndex = 0;

  lines.forEach((line) => {
    if (!currentGroup || currentGroup.commitHash !== line.commitHash) {
      // Start new group
      currentGroup = {
        commitHash: line.commitHash,
        lines: [line],
        color: colors[colorIndex % colors.length],
      };
      groups.push(currentGroup);
      colorIndex++;
    } else {
      // Add to current group
      currentGroup.lines.push(line);
    }
  });

  return groups;
}

function isFirstInGroup(line: GitBlameLine, group: BlameGroup | undefined): boolean {
  if (!group) return false;
  return group.lines[0] === line;
}

function truncateAuthor(author: string): string {
  // Take first name and last initial
  const parts = author.split(' ');
  if (parts.length === 1) return author;

  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0];

  return `${firstName} ${lastInitial}.`;
}

function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return formatDistance(date, new Date(), { addSuffix: true });
  } catch {
    return dateStr;
  }
}
