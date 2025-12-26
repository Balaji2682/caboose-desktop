import { memo, useEffect, useState } from 'react';
import {
  GitBranch,
  GitCommit,
  GitMerge,
  RefreshCw,
  FileCode,
  History,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { EnhancedDiffViewer } from '@/components/git/EnhancedDiffViewer';
import { BlameView } from '@/components/git/BlameView';
import { ConflictResolver } from '@/components/git/ConflictResolver';
import { CommitDialog } from '@/components/git/CommitDialog';
import { useGitStore } from '@/stores/gitStore';
import { cn } from '@/lib/utils';
import type { GitFileStatus } from '@/types/git';

export const GitManager = memo(() => {
  const {
    isGitRepo,
    status,
    branches,
    commits,
    currentDiff,
    currentBlame,
    currentConflict,
    isLoadingStatus,
    checkRepository,
    refreshStatus,
    loadBranches,
    loadCommits,
    loadDiff,
    loadBlame,
    loadConflict,
    stageFiles,
    unstageFiles,
    commit,
    revertFile,
    discardChanges,
    resolveConflict,
    clearDiff,
    clearBlame,
    clearConflict,
  } = useGitStore();

  const [selectedFile, setSelectedFile] = useState<GitFileStatus | null>(null);
  const [viewMode, setViewMode] = useState<'diff' | 'blame' | 'conflict'>('diff');
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);

  // Initialize on mount
  useEffect(() => {
    checkRepository();
  }, [checkRepository]);

  // Auto-refresh status periodically
  useEffect(() => {
    if (!isGitRepo) return;

    const interval = setInterval(() => {
      refreshStatus();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isGitRepo, refreshStatus]);

  // Load commits when repository is detected
  useEffect(() => {
    if (isGitRepo) {
      loadCommits({ maxCount: 50 });
    }
  }, [isGitRepo, loadCommits]);

  if (!isGitRepo) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <h2 className="text-lg font-semibold mb-2">No Git Repository</h2>
          <p className="text-sm text-gray-500">
            The current project is not a Git repository. Initialize a repository to use Git features.
          </p>
        </Card>
      </div>
    );
  }

  const handleFileClick = async (file: GitFileStatus) => {
    setSelectedFile(file);

    if (file.status === 'conflict') {
      setViewMode('conflict');
      await loadConflict(file.path);
    } else {
      setViewMode('diff');
      const staged = file.stagingStatus === 'staged' || file.stagingStatus === 'both';
      await loadDiff({ filePath: file.path, staged });
    }
  };

  const handleBlameClick = async (file: GitFileStatus) => {
    setSelectedFile(file);
    setViewMode('blame');
    await loadBlame(file.path);
  };

  const handleRefresh = async () => {
    await refreshStatus();
    await loadBranches();
    await loadCommits({ maxCount: 50 });
  };

  const handleCommit = async (message: string) => {
    await commit({ message });
    setCommitDialogOpen(false);
    setSelectedFile(null);
    clearDiff();
  };

  const handleResolveConflict = async (resolution: 'ours' | 'theirs') => {
    if (!selectedFile) return;

    await resolveConflict(selectedFile.path, resolution);
    setSelectedFile(null);
    clearConflict();
  };

  const stagedFiles = status?.files.filter(
    (f) => f.stagingStatus === 'staged' || f.stagingStatus === 'both'
  ) || [];
  const unstagedFiles = status?.files.filter(
    (f) => f.stagingStatus === 'unstaged' || f.stagingStatus === 'both'
  ) || [];
  const conflictFiles = status?.files.filter((f) => f.status === 'conflict') || [];

  // All viewable files for navigation
  const allFiles = [...conflictFiles, ...stagedFiles, ...unstagedFiles];
  const currentFileIndex = selectedFile ? allFiles.findIndex((f) => f.path === selectedFile.path) : -1;

  const handlePreviousFile = () => {
    if (currentFileIndex > 0) {
      handleFileClick(allFiles[currentFileIndex - 1]);
    }
  };

  const handleNextFile = () => {
    if (currentFileIndex < allFiles.length - 1) {
      handleFileClick(allFiles[currentFileIndex + 1]);
    }
  };

  const handleShowBlame = async () => {
    if (!selectedFile) return;
    await handleBlameClick(selectedFile);
  };

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-cyan-500" />
          <h1 className="text-lg font-semibold">Git</h1>
          {status && (
            <Badge variant="info">{status.currentBranch}</Badge>
          )}
          {status && status.ahead > 0 && (
            <Badge variant="success">↑{status.ahead}</Badge>
          )}
          {status && status.behind > 0 && (
            <Badge variant="warning">↓{status.behind}</Badge>
          )}
          {conflictFiles.length > 0 && (
            <Badge variant="destructive">
              {conflictFiles.length} conflict{conflictFiles.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} size="sm" variant="ghost" disabled={isLoadingStatus}>
            <RefreshCw className={cn('w-4 h-4', isLoadingStatus && 'animate-spin')} />
          </Button>
          <Button
            onClick={() => setCommitDialogOpen(true)}
            size="sm"
            disabled={stagedFiles.length === 0}
          >
            <GitCommit className="w-4 h-4 mr-2" />
            Commit
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-[300px_1fr] min-h-0">
        {/* Sidebar: File List */}
        <div className="border-r border-gray-800 flex flex-col">
          <Tabs defaultValue="changes" className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-2 m-2">
              <TabsTrigger value="changes">
                <FileCode className="w-4 h-4 mr-1" />
                Changes
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="w-4 h-4 mr-1" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="changes" className="flex-1 min-h-0 m-0">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-4">
                  {/* Conflicts */}
                  {conflictFiles.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-red-400 mb-2 px-2">
                        CONFLICTS ({conflictFiles.length})
                      </h3>
                      <div className="space-y-1">
                        {conflictFiles.map((file) => (
                          <FileListItem
                            key={file.path}
                            file={file}
                            isSelected={selectedFile?.path === file.path}
                            onClick={() => handleFileClick(file)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Staged Files */}
                  {stagedFiles.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-green-400 mb-2 px-2">
                        STAGED ({stagedFiles.length})
                      </h3>
                      <div className="space-y-1">
                        {stagedFiles.map((file) => (
                          <FileListItem
                            key={file.path}
                            file={file}
                            isSelected={selectedFile?.path === file.path}
                            onClick={() => handleFileClick(file)}
                            onBlame={() => handleBlameClick(file)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unstaged Files */}
                  {unstagedFiles.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-yellow-400 mb-2 px-2">
                        UNSTAGED ({unstagedFiles.length})
                      </h3>
                      <div className="space-y-1">
                        {unstagedFiles.map((file) => (
                          <FileListItem
                            key={file.path}
                            file={file}
                            isSelected={selectedFile?.path === file.path}
                            onClick={() => handleFileClick(file)}
                            onBlame={() => handleBlameClick(file)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {status?.files.length === 0 && (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No changes
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="history" className="flex-1 min-h-0 m-0">
              <ScrollArea className="h-full">
                <div className="p-2">
                  {commits.map((commit) => (
                    <div
                      key={commit.hash}
                      className="px-3 py-2 hover:bg-gray-800 rounded cursor-pointer border-b border-gray-900"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{commit.summary}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {commit.author} • {new Date(commit.authorDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-xs font-mono text-cyan-400 flex-shrink-0">
                          {commit.shortHash}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main View */}
        <div className="flex flex-col min-h-0">
          {!selectedFile ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Select a file to view changes</p>
            </div>
          ) : viewMode === 'conflict' && currentConflict ? (
            <ConflictResolver
              conflict={currentConflict}
              onResolve={handleResolveConflict}
              onCancel={() => {
                setSelectedFile(null);
                clearConflict();
              }}
            />
          ) : viewMode === 'blame' && currentBlame ? (
            <BlameView blame={currentBlame} />
          ) : currentDiff ? (
            <EnhancedDiffViewer
              diff={currentDiff}
              mode="side-by-side"
              onPreviousFile={handlePreviousFile}
              onNextFile={handleNextFile}
              onShowBlame={handleShowBlame}
              hasPreviousFile={currentFileIndex > 0}
              hasNextFile={currentFileIndex < allFiles.length - 1}
              currentFileIndex={currentFileIndex + 1}
              totalFiles={allFiles.length}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Loading...</p>
            </div>
          )}
        </div>
      </div>

      {/* Commit Dialog */}
      <CommitDialog
        open={commitDialogOpen}
        onOpenChange={setCommitDialogOpen}
        stagedFiles={stagedFiles}
        unstagedFiles={unstagedFiles}
        onStage={stageFiles}
        onUnstage={unstageFiles}
        onCommit={handleCommit}
      />
    </div>
  );
});

GitManager.displayName = 'GitManager';

// File list item component
const FileListItem = memo<{
  file: GitFileStatus;
  isSelected: boolean;
  onClick: () => void;
  onBlame?: () => void;
}>(({ file, isSelected, onClick, onBlame }) => {
  return (
    <div
      className={cn(
        'px-2 py-1.5 rounded cursor-pointer group hover:bg-gray-800 transition-colors',
        isSelected && 'bg-gray-800'
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Badge variant={getStatusBadge(file.status)} className="flex-shrink-0 text-xs">
            {file.status[0].toUpperCase()}
          </Badge>
          <span className="text-sm font-mono truncate">{file.path}</span>
        </div>
        {onBlame && file.status !== 'conflict' && file.status !== 'untracked' && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onBlame();
            }}
            size="sm"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
          >
            Blame
          </Button>
        )}
      </div>
    </div>
  );
});

FileListItem.displayName = 'FileListItem';

function getStatusBadge(status: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'added':
    case 'untracked':
      return 'success';
    case 'deleted':
      return 'destructive';
    case 'conflict':
      return 'destructive';
    case 'renamed':
    case 'copied':
      return 'warning';
    default:
      return 'secondary';
  }
}
