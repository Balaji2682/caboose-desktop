import { memo, useState } from 'react';
import { GitCommit, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GitFileStatus } from '@/types/git';

interface CommitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stagedFiles: GitFileStatus[];
  unstagedFiles: GitFileStatus[];
  onStage: (files: string[]) => Promise<void>;
  onUnstage: (files: string[]) => Promise<void>;
  onCommit: (message: string) => Promise<void>;
}

export const CommitDialog = memo<CommitDialogProps>(
  ({ open, onOpenChange, stagedFiles, unstagedFiles, onStage, onUnstage, onCommit }) => {
    const [commitMessage, setCommitMessage] = useState('');
    const [isCommitting, setIsCommitting] = useState(false);

    const handleCommit = async () => {
      if (!commitMessage.trim() || stagedFiles.length === 0) return;

      setIsCommitting(true);
      try {
        await onCommit(commitMessage);
        setCommitMessage('');
        onOpenChange(false);
      } catch (error) {
        console.error('Failed to commit:', error);
      } finally {
        setIsCommitting(false);
      }
    };

    const handleStageFile = async (file: string) => {
      try {
        await onStage([file]);
      } catch (error) {
        console.error('Failed to stage file:', error);
      }
    };

    const handleUnstageFile = async (file: string) => {
      try {
        await onUnstage([file]);
      } catch (error) {
        console.error('Failed to unstage file:', error);
      }
    };

    const handleStageAll = async () => {
      try {
        await onStage(unstagedFiles.map((f) => f.path));
      } catch (error) {
        console.error('Failed to stage all files:', error);
      }
    };

    const handleUnstageAll = async () => {
      try {
        await onUnstage(stagedFiles.map((f) => f.path));
      } catch (error) {
        console.error('Failed to unstage all files:', error);
      }
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCommit className="w-5 h-5" />
              Commit Changes
            </DialogTitle>
            <DialogDescription>
              Stage your changes and create a commit
            </DialogDescription>
          </DialogHeader>

          {/* Commit Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Commit Message</label>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Enter commit message..."
              className="w-full h-24 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
            />
          </div>

          {/* Staged Files */}
          <div className="flex-1 space-y-3 min-h-0">
            <div className="flex flex-col h-full gap-3">
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">
                    Staged Changes{' '}
                    <Badge variant="secondary" className="ml-2">
                      {stagedFiles.length}
                    </Badge>
                  </h3>
                  {stagedFiles.length > 0 && (
                    <Button onClick={handleUnstageAll} size="sm" variant="ghost">
                      Unstage All
                    </Button>
                  )}
                </div>
                <ScrollArea className="flex-1 border border-gray-700 rounded-md">
                  {stagedFiles.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No staged changes
                    </div>
                  ) : (
                    <div className="p-2">
                      {stagedFiles.map((file) => (
                        <FileItem
                          key={file.path}
                          file={file}
                          onAction={() => handleUnstageFile(file.path)}
                          actionLabel="Unstage"
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Unstaged Files */}
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">
                    Unstaged Changes{' '}
                    <Badge variant="secondary" className="ml-2">
                      {unstagedFiles.length}
                    </Badge>
                  </h3>
                  {unstagedFiles.length > 0 && (
                    <Button onClick={handleStageAll} size="sm" variant="ghost">
                      Stage All
                    </Button>
                  )}
                </div>
                <ScrollArea className="flex-1 border border-gray-700 rounded-md">
                  {unstagedFiles.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No unstaged changes
                    </div>
                  ) : (
                    <div className="p-2">
                      {unstagedFiles.map((file) => (
                        <FileItem
                          key={file.path}
                          file={file}
                          onAction={() => handleStageFile(file.path)}
                          actionLabel="Stage"
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} variant="ghost">
              Cancel
            </Button>
            <Button
              onClick={handleCommit}
              disabled={!commitMessage.trim() || stagedFiles.length === 0 || isCommitting}
            >
              <GitCommit className="w-4 h-4 mr-2" />
              {isCommitting ? 'Committing...' : 'Commit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

CommitDialog.displayName = 'CommitDialog';

// File item in the list
const FileItem = memo<{
  file: GitFileStatus;
  onAction: () => void;
  actionLabel: string;
}>(({ file, onAction, actionLabel }) => {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-800 rounded group">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Badge variant={getStatusBadge(file.status)} className="flex-shrink-0">
          {file.status[0].toUpperCase()}
        </Badge>
        <span className="text-sm font-mono truncate">{file.path}</span>
        {file.oldPath && (
          <span className="text-xs text-gray-500">← {file.oldPath}</span>
        )}
      </div>
      <Button
        onClick={onAction}
        size="sm"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {actionLabel}
      </Button>
    </div>
  );
});

FileItem.displayName = 'FileItem';

function getStatusBadge(status: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'added':
    case 'untracked':
      return 'success';
    case 'deleted':
      return 'destructive';
    case 'renamed':
    case 'copied':
      return 'warning';
    default:
      return 'secondary';
  }
}
