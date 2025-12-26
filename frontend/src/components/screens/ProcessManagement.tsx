import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Play, Square, RotateCw, Settings, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useProcessStore, type Process, type ProcessStatus } from '@/stores/processStore';
import type { LogEntry, ProcessConfig } from '@/lib/wails';

const getStatusColor = (status: ProcessStatus) => {
  switch (status) {
    case 'running':
      return 'bg-green-500 animate-pulse';
    case 'starting':
      return 'bg-yellow-500 animate-pulse';
    case 'stopping':
      return 'bg-orange-500 animate-pulse';
    case 'crashed':
      return 'bg-red-500';
    case 'stopped':
    default:
      return 'bg-gray-500';
  }
};

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'purple' | 'gradient';

const getStatusBadge = (status: ProcessStatus): BadgeVariant => {
  switch (status) {
    case 'running':
      return 'success';
    case 'starting':
    case 'stopping':
      return 'warning';
    case 'crashed':
      return 'destructive';
    case 'stopped':
    default:
      return 'secondary';
  }
};

interface ProcessCardProps {
  process: Process;
  isSelected: boolean;
  onSelect: () => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onRemove: () => void;
}

const ProcessCard = memo<ProcessCardProps>(
  ({ process, isSelected, onSelect, onStart, onStop, onRestart, onRemove }) => {
    const handleStart = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onStart();
      },
      [onStart]
    );

    const handleStop = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onStop();
      },
      [onStop]
    );

    const handleRestart = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onRestart();
      },
      [onRestart]
    );

    const handleRemove = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove();
      },
      [onRemove]
    );

    const isActionable = process.status === 'running' || process.status === 'stopped' || process.status === 'crashed';
    const canRemove = process.status === 'stopped' || process.status === 'crashed';

    return (
      <button
        onClick={onSelect}
        className={cn(
          'p-4 rounded-xl text-left transition-all w-full',
          isSelected
            ? 'bg-cyan-500/10 border-2 border-cyan-500/50'
            : 'bg-gray-900 border-2 border-gray-800 hover:border-gray-700'
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className={cn('w-3 h-3 rounded-full', getStatusColor(process.status))} />
          <Badge variant={getStatusBadge(process.status)}>
            {process.status}
          </Badge>
        </div>
        <h3 className="text-white font-medium mb-1">{process.name}</h3>
        {process.port && <p className="text-xs text-gray-500">Port: {process.port}</p>}
        {process.uptime && (
          <p className="text-xs text-gray-500">Uptime: {process.uptime}</p>
        )}
        <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2">
          {process.status === 'running' || process.status === 'stopping' ? (
            <Square
              className={cn(
                'w-4 h-4 transition-colors',
                isActionable
                  ? 'text-red-400 cursor-pointer hover:text-red-300'
                  : 'text-gray-600 cursor-not-allowed'
              )}
              onClick={isActionable ? handleStop : undefined}
            />
          ) : (
            <Play
              className={cn(
                'w-4 h-4 transition-colors',
                isActionable
                  ? 'text-green-400 cursor-pointer hover:text-green-300'
                  : 'text-gray-600 cursor-not-allowed'
              )}
              onClick={isActionable ? handleStart : undefined}
            />
          )}
          <RotateCw
            className={cn(
              'w-4 h-4 transition-colors',
              process.status === 'running'
                ? 'text-cyan-400 cursor-pointer hover:text-cyan-300'
                : 'text-gray-600 cursor-not-allowed'
            )}
            onClick={process.status === 'running' ? handleRestart : undefined}
          />
          <Trash2
            className={cn(
              'w-4 h-4 ml-auto transition-colors',
              canRemove
                ? 'text-gray-500 cursor-pointer hover:text-gray-400'
                : 'text-gray-700 cursor-not-allowed'
            )}
            onClick={canRemove ? handleRemove : undefined}
          />
        </div>
      </button>
    );
  }
);

ProcessCard.displayName = 'ProcessCard';

interface LogViewerProps {
  logs: LogEntry[];
  processName: string | null;
}

const LogViewer = memo<LogViewerProps>(({ logs, processName }) => {
  const filteredLogs = useMemo(() => {
    if (!processName) return logs;
    return logs.filter((log) => log.process === processName);
  }, [logs, processName]);

  return (
    <div className="p-6 bg-black/30">
      <ScrollArea className="h-64">
        <div className="space-y-1 font-mono text-xs">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log, index) => (
              <div key={log.id || index} className="text-gray-300 flex">
                <span className="text-gray-600 mr-3 select-none w-8 text-right">
                  {String(index + 1).padStart(3, ' ')}
                </span>
                <span className="text-gray-500 mr-2">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={cn(
                    log.level === 'error' && 'text-red-400',
                    log.level === 'warn' && 'text-yellow-400',
                    log.level === 'info' && 'text-gray-300'
                  )}
                >
                  {log.content}
                </span>
              </div>
            ))
          ) : (
            <div className="text-gray-500 py-8 text-center">
              {processName
                ? 'No logs for this process. Start the process to see logs.'
                : 'No logs available. Start a process to see logs.'}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

LogViewer.displayName = 'LogViewer';

interface AddProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: ProcessConfig) => void;
}

const initialFormState: ProcessConfig = {
  name: '',
  command: '',
  args: [],
  workingDir: '',
  autoRestart: false,
  usePty: true,
  color: '#06b6d4',
};

const AddProcessDialog = memo<AddProcessDialogProps>(({ open, onOpenChange, onSubmit }) => {
  const [formData, setFormData] = useState<ProcessConfig>(initialFormState);
  const [argsInput, setArgsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.command.trim()) return;

    setIsSubmitting(true);
    try {
      const config: ProcessConfig = {
        ...formData,
        name: formData.name.trim(),
        command: formData.command.trim(),
        args: argsInput.trim() ? argsInput.split(' ').filter(Boolean) : [],
        workingDir: formData.workingDir?.trim() || undefined,
      };
      await onSubmit(config);
      setFormData(initialFormState);
      setArgsInput('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, argsInput, onSubmit, onOpenChange]);

  const handleClose = useCallback(() => {
    setFormData(initialFormState);
    setArgsInput('');
    onOpenChange(false);
  }, [onOpenChange]);

  const isValid = formData.name.trim() && formData.command.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Process</DialogTitle>
            <DialogDescription>
              Configure a new process to manage. Fill in the details below.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-300">
                Process Name <span className="text-red-400">*</span>
              </label>
              <Input
                id="name"
                placeholder="e.g., Rails Server, Webpack, Sidekiq"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="command" className="text-sm font-medium text-gray-300">
                Command <span className="text-red-400">*</span>
              </label>
              <Input
                id="command"
                placeholder="e.g., rails, npm, bundle"
                value={formData.command}
                onChange={(e) => setFormData((prev) => ({ ...prev, command: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="args" className="text-sm font-medium text-gray-300">
                Arguments
              </label>
              <Input
                id="args"
                placeholder="e.g., server -p 3000"
                value={argsInput}
                onChange={(e) => setArgsInput(e.target.value)}
              />
              <p className="text-xs text-gray-500">Space-separated arguments for the command</p>
            </div>

            <div className="grid gap-2">
              <label htmlFor="workingDir" className="text-sm font-medium text-gray-300">
                Working Directory
              </label>
              <Input
                id="workingDir"
                placeholder="Leave empty to use project directory"
                value={formData.workingDir || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, workingDir: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="autoRestart" className="text-sm font-medium text-gray-300">
                  Auto Restart
                </label>
                <p className="text-xs text-gray-500">Restart process if it crashes</p>
              </div>
              <Switch
                id="autoRestart"
                checked={formData.autoRestart || false}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, autoRestart: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="usePty" className="text-sm font-medium text-gray-300">
                  Use PTY
                </label>
                <p className="text-xs text-gray-500">Enable terminal emulation (recommended)</p>
              </div>
              <Switch
                id="usePty"
                checked={formData.usePty !== false}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, usePty: checked }))
                }
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="color" className="text-sm font-medium text-gray-300">
                Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="color"
                  value={formData.color || '#06b6d4'}
                  onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-700"
                />
                <span className="text-sm text-gray-400">{formData.color}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Process'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

AddProcessDialog.displayName = 'AddProcessDialog';

const envVariables = ['DATABASE_URL', 'REDIS_URL', 'SECRET_KEY_BASE', 'RAILS_ENV'];

export const ProcessManagement = memo(() => {
  const {
    processes,
    logs,
    selectedProcess,
    isLoading,
    error,
    selectProcess,
    startProcess,
    stopProcess,
    restartProcess,
    removeProcess,
    addProcess,
    startAll,
    stopAll,
    initializeListeners,
  } = useProcessStore();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Initialize event listeners on mount
  useEffect(() => {
    const cleanup = initializeListeners();
    return cleanup;
  }, [initializeListeners]);

  const selectedProcessData = useMemo(
    () => processes.find((p) => p.name === selectedProcess),
    [processes, selectedProcess]
  );

  const handleSelectProcess = useCallback(
    (name: string) => {
      selectProcess(name);
    },
    [selectProcess]
  );

  const handleStartProcess = useCallback(
    (name: string) => {
      startProcess(name);
    },
    [startProcess]
  );

  const handleStopProcess = useCallback(
    (name: string) => {
      stopProcess(name);
    },
    [stopProcess]
  );

  const handleRestartProcess = useCallback(
    (name: string) => {
      restartProcess(name);
    },
    [restartProcess]
  );

  const handleRemoveProcess = useCallback(
    (name: string) => {
      removeProcess(name);
    },
    [removeProcess]
  );

  const handleAddProcess = useCallback(
    async (config: ProcessConfig) => {
      await addProcess(config);
    },
    [addProcess]
  );

  const handleOpenAddDialog = useCallback(() => {
    setIsAddDialogOpen(true);
  }, []);

  const runningCount = useMemo(
    () => processes.filter((p) => p.status === 'running').length,
    [processes]
  );

  const totalCount = processes.length;

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Process Management</h1>
          <p className="text-sm text-gray-400">
            {runningCount} of {totalCount} processes running
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="success" onClick={startAll} disabled={runningCount === totalCount || totalCount === 0}>
            <Play className="w-4 h-4" />
            Start All
          </Button>
          <Button variant="destructive" onClick={stopAll} disabled={runningCount === 0}>
            <Square className="w-4 h-4" />
            Stop All
          </Button>
          <Button onClick={handleOpenAddDialog}>
            <Plus className="w-4 h-4" />
            Add Process
          </Button>
          <Button variant="secondary" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && processes.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-400">Loading processes...</div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && processes.length === 0 && (
        <Card className="bg-gray-900 border-gray-800 p-12 text-center">
          <div className="text-gray-400 mb-4">No processes configured</div>
          <Button onClick={handleOpenAddDialog}>
            <Plus className="w-4 h-4" />
            Add Your First Process
          </Button>
        </Card>
      )}

      {/* Process Cards Grid */}
      {processes.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {processes.map((process) => (
            <ProcessCard
              key={process.name}
              process={process}
              isSelected={selectedProcess === process.name}
              onSelect={() => handleSelectProcess(process.name)}
              onStart={() => handleStartProcess(process.name)}
              onStop={() => handleStopProcess(process.name)}
              onRestart={() => handleRestartProcess(process.name)}
              onRemove={() => handleRemoveProcess(process.name)}
            />
          ))}
        </div>
      )}

      {/* Process Details */}
      {selectedProcessData && (
        <Card className="bg-gray-900 border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-bold text-white">{selectedProcessData.name}</h2>
                <Badge variant={getStatusBadge(selectedProcessData.status)}>
                  {selectedProcessData.status}
                </Badge>
                {selectedProcessData.pid && (
                  <span className="text-xs text-gray-500">PID: {selectedProcessData.pid}</span>
                )}
              </div>
              <code className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                {selectedProcessData.command}
              </code>
            </div>
            <div className="flex items-center gap-2">
              {selectedProcessData.status === 'running' ||
              selectedProcessData.status === 'stopping' ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleStopProcess(selectedProcessData.name)}
                  disabled={selectedProcessData.status === 'stopping'}
                >
                  <Square className="w-4 h-4" />
                  {selectedProcessData.status === 'stopping' ? 'Stopping...' : 'Stop'}
                </Button>
              ) : (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleStartProcess(selectedProcessData.name)}
                  disabled={selectedProcessData.status === 'starting'}
                >
                  <Play className="w-4 h-4" />
                  {selectedProcessData.status === 'starting' ? 'Starting...' : 'Start'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRestartProcess(selectedProcessData.name)}
                disabled={selectedProcessData.status !== 'running'}
              >
                <RotateCw className="w-4 h-4" />
                Restart
              </Button>
            </div>
          </div>
          <LogViewer logs={logs} processName={selectedProcessData.name} />
        </Card>
      )}

      {/* Environment Variables */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Environment Variables</h2>
          <Button variant="secondary" size="sm">
            <Plus className="w-4 h-4" />
            Add Variable
          </Button>
        </div>
        <div className="space-y-2">
          {envVariables.map((env) => (
            <div key={env} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
              <code className="text-sm text-cyan-400 flex-1">{env}</code>
              <span className="text-xs text-gray-500">********</span>
              <Settings className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-400 transition-colors" />
            </div>
          ))}
        </div>
      </Card>

      {/* Add Process Dialog */}
      <AddProcessDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddProcess}
      />
    </div>
  );
});

ProcessManagement.displayName = 'ProcessManagement';
