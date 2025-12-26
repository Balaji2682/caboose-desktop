import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  processAPI,
  logsAPI,
  eventsAPI,
  type ProcessInfo,
  type LogEntry,
  type ProcessConfig,
  type ProcessStatusEvent,
} from '@/lib/wails';

export type ProcessStatus = 'stopped' | 'starting' | 'running' | 'crashed' | 'stopping';

export interface Process extends ProcessInfo {}

interface ProcessState {
  // State
  processes: Process[];
  logs: LogEntry[];
  selectedProcess: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProcesses: () => Promise<void>;
  startProcess: (name: string) => Promise<void>;
  stopProcess: (name: string) => Promise<void>;
  restartProcess: (name: string) => Promise<void>;
  startAll: () => Promise<void>;
  stopAll: () => Promise<void>;
  addProcess: (config: ProcessConfig) => Promise<void>;
  removeProcess: (name: string) => Promise<void>;
  selectProcess: (name: string | null) => void;
  updateProcess: (name: string, updates: Partial<Process>) => void;

  // Logs
  fetchLogs: (processName?: string) => Promise<void>;
  clearLogs: () => Promise<void>;

  // PTY
  writeToPTY: (name: string, input: string) => Promise<void>;

  // Event handlers
  handleStatusChange: (event: ProcessStatusEvent) => void;
  handleLogEntry: (entry: LogEntry) => void;

  // Initialize event listeners
  initializeListeners: () => () => void;
}

export const useProcessStore = create<ProcessState>()(
  immer((set, get) => ({
    // Initial state
    processes: [],
    logs: [],
    selectedProcess: null,
    isLoading: false,
    error: null,

    // Fetch all processes from backend
    fetchProcesses: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const processes = await processAPI.getAll();
        set((state) => {
          state.processes = processes;
          state.isLoading = false;
        });
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to fetch processes';
          state.isLoading = false;
        });
      }
    },

    // Update a single process
    updateProcess: (name: string, updates: Partial<Process>) => {
      set((state) => {
        const index = state.processes.findIndex((p) => p.name === name);
        if (index !== -1) {
          state.processes[index] = { ...state.processes[index], ...updates };
        }
      });
    },

    // Start a process
    startProcess: async (name: string) => {
      // Optimistic update
      get().updateProcess(name, { status: 'starting' });

      try {
        await processAPI.start(name);
        // Status update will come via event
      } catch (err) {
        get().updateProcess(name, { status: 'crashed' });
        set((state) => {
          state.error = err instanceof Error ? err.message : `Failed to start ${name}`;
        });
      }
    },

    // Stop a process
    stopProcess: async (name: string) => {
      // Optimistic update
      get().updateProcess(name, { status: 'stopping' });

      try {
        await processAPI.stop(name);
        // Status update will come via event
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : `Failed to stop ${name}`;
        });
      }
    },

    // Restart a process
    restartProcess: async (name: string) => {
      try {
        await processAPI.restart(name);
        // Status update will come via event
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : `Failed to restart ${name}`;
        });
      }
    },

    // Start all processes
    startAll: async () => {
      try {
        await processAPI.startAll();
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to start all processes';
        });
      }
    },

    // Stop all processes
    stopAll: async () => {
      try {
        await processAPI.stopAll();
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to stop all processes';
        });
      }
    },

    // Add a new process
    addProcess: async (config: ProcessConfig) => {
      try {
        await processAPI.add(config);
        // Refresh process list
        await get().fetchProcesses();
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to add process';
        });
      }
    },

    // Remove a process
    removeProcess: async (name: string) => {
      try {
        await processAPI.remove(name);
        set((state) => {
          state.processes = state.processes.filter((p) => p.name !== name);
          if (state.selectedProcess === name) {
            state.selectedProcess = null;
          }
        });
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : `Failed to remove ${name}`;
        });
      }
    },

    // Select a process
    selectProcess: (name: string | null) => {
      set((state) => {
        state.selectedProcess = name;
      });
    },

    // Fetch logs
    fetchLogs: async (processName?: string) => {
      try {
        const logs = await logsAPI.get({
          process: processName,
          limit: 500,
        });
        set((state) => {
          state.logs = logs;
        });
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      }
    },

    // Clear logs
    clearLogs: async () => {
      try {
        await logsAPI.clear();
        set((state) => {
          state.logs = [];
        });
      } catch (err) {
        console.error('Failed to clear logs:', err);
      }
    },

    // Write to PTY
    writeToPTY: async (name: string, input: string) => {
      try {
        await processAPI.writeToPTY(name, input);
      } catch (err) {
        console.error('Failed to write to PTY:', err);
      }
    },

    // Handle status change event from backend
    handleStatusChange: (event: ProcessStatusEvent) => {
      set((state) => {
        const processIndex = state.processes.findIndex((p) => p.name === event.name);
        if (processIndex !== -1) {
          state.processes[processIndex].status = event.status as ProcessStatus;
        }
      });
    },

    // Handle log entry event from backend
    handleLogEntry: (entry: LogEntry) => {
      set((state) => {
        state.logs.push(entry);
        // Keep only last 1000 logs in memory
        if (state.logs.length > 1000) {
          state.logs = state.logs.slice(-1000);
        }
      });
    },

    // Initialize event listeners
    initializeListeners: () => {
      const store = get();

      // Listen for process status changes
      const unsubStatus = eventsAPI.on('process:status', (data: unknown) => {
        store.handleStatusChange(data as ProcessStatusEvent);
      });

      // Listen for log entries
      const unsubLog = eventsAPI.on('process:log', (data: unknown) => {
        store.handleLogEntry(data as LogEntry);
      });

      // Listen for process errors
      const unsubError = eventsAPI.on('process:error', (data: unknown) => {
        const { error } = data as { name: string; error: string };
        set((state) => {
          state.error = error;
        });
      });

      // Listen for logs cleared
      const unsubClear = eventsAPI.on('logs:cleared', () => {
        set((state) => {
          state.logs = [];
        });
      });

      // Fetch initial data
      store.fetchProcesses();
      store.fetchLogs();

      // Return cleanup function
      return () => {
        unsubStatus();
        unsubLog();
        unsubError();
        unsubClear();
      };
    },
  }))
);
