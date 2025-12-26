// Wails runtime bindings
// This file provides TypeScript wrappers for Wails Go functions

import type {
  SmartRecommendation,
  N1Warning,
  RequestQueryGroup,
  QueryDistribution,
  QueryComparison,
} from '@/types/query';
import type { SSHServer, SSHSession, SSHTunnel } from '@/types/ssh';

declare global {
  interface Window {
    go: {
      main: {
        App: {
          GetProcesses(): Promise<ProcessInfo[]>;
          GetProcess(name: string): Promise<ProcessInfo>;
          StartProcess(name: string): Promise<void>;
          StopProcess(name: string): Promise<void>;
          RestartProcess(name: string): Promise<void>;
          StartAllProcesses(): Promise<void>;
          StopAllProcesses(): Promise<void>;
          AddProcess(config: ProcessConfig): Promise<void>;
          RemoveProcess(name: string): Promise<void>;
          WriteToPTY(name: string, input: string): Promise<void>;
          ResizePTY(name: string, rows: number, cols: number): Promise<void>;
          GetLogs(filter: LogFilter): Promise<LogEntry[]>;
          ClearLogs(): Promise<void>;
          GetProjectInfo(): Promise<ProjectInfo>;
          SetProjectDirectory(dir: string): Promise<void>;
          SelectProjectDirectory(): Promise<string>;
          // Rails Console methods
          StartRailsConsole(): Promise<void>;
          StopRailsConsole(): Promise<void>;
          IsRailsConsoleRunning(): Promise<boolean>;
          WriteToRailsConsole(input: string): Promise<void>;
          ResizeRailsConsole(rows: number, cols: number): Promise<void>;
          // Database methods
          ConnectDatabase(config: DatabaseConnectionConfig): Promise<void>;
          DisconnectDatabase(): Promise<void>;
          GetDatabaseStatus(): Promise<DatabaseStatus>;
          GetDatabaseTables(): Promise<TableInfo[]>;
          GetTableColumns(tableName: string): Promise<ColumnInfo[]>;
          ExecuteDatabaseQuery(query: string, limit: number): Promise<QueryResult>;
          ExplainDatabaseQuery(query: string): Promise<ExplainResult>;
          SaveDatabaseQuery(name: string, sql: string): Promise<SavedQuery>;
          GetSavedQueries(): Promise<SavedQuery[]>;
          DeleteSavedQuery(id: string): Promise<void>;
          GetSavedConnections(): Promise<SavedConnection[]>;
          SaveDatabaseConnection(conn: SavedConnection): Promise<void>;
          DeleteSavedConnection(name: string): Promise<void>;
          GetQueryStatistics(): Promise<QueryStatistic[]>;
          ClearQueryStatistics(): Promise<void>;
          GetDatabaseHealth(): Promise<DatabaseHealth>;
          // Query Analysis & Recommendations
          GetSmartRecommendations(): Promise<SmartRecommendation[]>;
          GetN1Warnings(): Promise<N1Warning[]>;
          GetRequestQueryGroups(limit: number): Promise<RequestQueryGroup[]>;
          GetQueryDistribution(): Promise<QueryDistribution>;
          IgnoreQueryPattern(fingerprint: string): Promise<void>;
          CompareQueryPlans(originalSQL: string, optimizedSQL: string): Promise<QueryComparison>;
          // SSH methods
          GetSSHServers(): Promise<SSHServer[]>;
          SaveSSHServer(server: SSHServer): Promise<void>;
          DeleteSSHServer(id: string): Promise<void>;
          ConnectSSH(serverID: string): Promise<string>;
          DisconnectSSH(sessionID: string): Promise<void>;
          WriteSSH(sessionID: string, data: string): Promise<void>;
          ResizeSSH(sessionID: string, rows: number, cols: number): Promise<void>;
          CreateSSHTunnel(sessionID: string, tunnel: SSHTunnel): Promise<void>;
          ExportSSHSession(sessionID: string, format: string): Promise<string>;
          GetSSHSessions(): Promise<SSHSession[]>;
        };
      };
    };
    runtime: {
      EventsOn(event: string, callback: (...args: unknown[]) => void): () => void;
      EventsOff(event: string): void;
      EventsEmit(event: string, ...args: unknown[]): void;
    };
  }
}

export interface ProcessInfo {
  id: string;
  name: string;
  type: string;
  status: 'stopped' | 'starting' | 'running' | 'crashed' | 'stopping';
  port?: number;
  command: string;
  pid?: number;
  uptime?: string;
  cpu: number;
  memory: number;
  autoRestart: boolean;
  color?: string;
  startedAt?: string;
}

export interface ProcessConfig {
  name: string;
  command: string;
  args?: string[];
  workingDir?: string;
  autoRestart?: boolean;
  usePty?: boolean;
  color?: string;
}

export interface LogEntry {
  id: string;
  process: string;
  content: string;
  level: string;
  timestamp: string;
}

export interface LogFilter {
  process?: string;
  level?: string;
  limit?: number;
}

export interface ProjectInfo {
  directory: string;
  framework?: string;
  projectName?: string;
}

export interface ProcessStatusEvent {
  name: string;
  status: string;
}

export interface ProcessErrorEvent {
  name: string;
  error: string;
}

export interface ConsoleOutputEvent {
  process: string;
  content: string;
}

// Database types
export interface DatabaseConnectionConfig {
  driver: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  sslMode?: string;
  name?: string;
}

export interface DatabaseStatus {
  connected: boolean;
  driver?: string;
  database?: string;
  host?: string;
  version?: string;
  error?: string;
}

export interface TableInfo {
  name: string;
  schema?: string;
  type: string;
  rowCount?: number;
  comment?: string;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  default?: string;
  comment?: string;
  maxLength?: number;
}

export interface QueryResult {
  columns: string[];
  columnTypes: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  affectedRows: number;
  executionTime: number;
  error?: string;
  isSelect: boolean;
}

export interface ExplainResult {
  rows: Record<string, unknown>[];
  columns: string[];
  query: string;
  executionTime: number;
  recommendations: IndexRecommendation[];
  analysis: ExplainAnalysis;
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  reason: string;
  severity: 'high' | 'medium' | 'low';
  sql: string;
  estimatedImpact: string;
}

export interface ExplainAnalysis {
  hasTableScan: boolean;
  hasIndexScan: boolean;
  rowsExamined: number;
  usingTemporary: boolean;
  usingFilesort: boolean;
  summary: string;
  performanceScore: number;
}

export interface DatabaseHealth {
  score: number;
  status: string;
  connections: ConnectionMetrics;
  performance: PerformanceMetrics;
  issues: HealthIssue[];
  slowQueries: SlowQueryHealth[];
  tableStats: TableStatistic[];
  lastChecked: string;
}

export interface ConnectionMetrics {
  active: number;
  max: number;
  idle: number;
  utilization: number;
}

export interface PerformanceMetrics {
  cacheHitRate: number;
  transactionsPerSecond: number;
  avgQueryTime: number;
  slowQueryCount: number;
}

export interface HealthIssue {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  table?: string;
  impact: string;
  recommendation?: string;
}

export interface SlowQueryHealth {
  query: string;
  time: number;
  count: number;
  fingerprint: string;
}

export interface TableStatistic {
  name: string;
  rows: number;
  size: number;
  indexCount: number;
  bloat: number;
  sizeFormatted: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface SavedConnection {
  name: string;
  driver: string;
  host: string;
  port: number;
  user: string;
  database: string;
  sslMode?: string;
}

export interface QueryStatistic {
  id: string;
  fingerprint: string;
  sql: string;
  count: number;
  avgTime: number;
  totalTime: number;
  lastExecuted: string;
  issue?: string;
}

// Check if running in Wails environment
export const isWailsEnv = (): boolean => {
  return typeof window !== 'undefined' && window.go !== undefined;
};

// Process API
export const processAPI = {
  getAll: async (): Promise<ProcessInfo[]> => {
    if (!isWailsEnv()) return [];
    return window.go.main.App.GetProcesses();
  },

  get: async (name: string): Promise<ProcessInfo | null> => {
    if (!isWailsEnv()) return null;
    try {
      return await window.go.main.App.GetProcess(name);
    } catch {
      return null;
    }
  },

  start: async (name: string): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.StartProcess(name);
  },

  stop: async (name: string): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.StopProcess(name);
  },

  restart: async (name: string): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.RestartProcess(name);
  },

  startAll: async (): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.StartAllProcesses();
  },

  stopAll: async (): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.StopAllProcesses();
  },

  add: async (config: ProcessConfig): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.AddProcess(config);
  },

  remove: async (name: string): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.RemoveProcess(name);
  },

  writeToPTY: async (name: string, input: string): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.WriteToPTY(name, input);
  },

  resizePTY: async (name: string, rows: number, cols: number): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.ResizePTY(name, rows, cols);
  },
};

// Rails Console API
export const railsConsoleAPI = {
  start: async (): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.StartRailsConsole();
  },

  stop: async (): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.StopRailsConsole();
  },

  isRunning: async (): Promise<boolean> => {
    if (!isWailsEnv()) return false;
    return window.go.main.App.IsRailsConsoleRunning();
  },

  write: async (input: string): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.WriteToRailsConsole(input);
  },

  resize: async (rows: number, cols: number): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.ResizeRailsConsole(rows, cols);
  },
};

// Logs API
export const logsAPI = {
  get: async (filter: LogFilter = {}): Promise<LogEntry[]> => {
    if (!isWailsEnv()) return [];
    return window.go.main.App.GetLogs(filter);
  },

  clear: async (): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.ClearLogs();
  },
};

// Project API
export const projectAPI = {
  getInfo: async (): Promise<ProjectInfo | null> => {
    if (!isWailsEnv()) return null;
    return window.go.main.App.GetProjectInfo();
  },

  setDirectory: async (dir: string): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.SetProjectDirectory(dir);
  },

  selectDirectory: async (): Promise<string> => {
    if (!isWailsEnv()) return '';
    return window.go.main.App.SelectProjectDirectory();
  },
};

// Events API
export const eventsAPI = {
  on: (event: string, callback: (...args: unknown[]) => void): (() => void) => {
    if (!isWailsEnv()) return () => {};
    return window.runtime.EventsOn(event, callback);
  },

  off: (event: string): void => {
    if (!isWailsEnv()) return;
    window.runtime.EventsOff(event);
  },

  emit: (event: string, ...args: unknown[]): void => {
    if (!isWailsEnv()) return;
    window.runtime.EventsEmit(event, ...args);
  },
};

// Database API
export const databaseAPI = {
  connect: async (config: DatabaseConnectionConfig): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.ConnectDatabase(config);
  },

  disconnect: async (): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.DisconnectDatabase();
  },

  getStatus: async (): Promise<DatabaseStatus> => {
    if (!isWailsEnv()) return { connected: false };
    return window.go.main.App.GetDatabaseStatus();
  },

  getTables: async (): Promise<TableInfo[]> => {
    if (!isWailsEnv()) return [];
    return window.go.main.App.GetDatabaseTables();
  },

  getColumns: async (tableName: string): Promise<ColumnInfo[]> => {
    if (!isWailsEnv()) return [];
    return window.go.main.App.GetTableColumns(tableName);
  },

  executeQuery: async (query: string, limit: number = 1000): Promise<QueryResult> => {
    if (!isWailsEnv()) {
      return {
        columns: [],
        columnTypes: [],
        rows: [],
        rowCount: 0,
        affectedRows: 0,
        executionTime: 0,
        isSelect: false,
        error: 'Not in Wails environment',
      };
    }
    return window.go.main.App.ExecuteDatabaseQuery(query, limit);
  },

  explainQuery: async (query: string): Promise<ExplainResult> => {
    if (!isWailsEnv()) {
      return {
        rows: [],
        columns: [],
        query: '',
        executionTime: 0,
        recommendations: [],
        analysis: {
          hasTableScan: false,
          hasIndexScan: false,
          rowsExamined: 0,
          usingTemporary: false,
          usingFilesort: false,
          summary: '',
          performanceScore: 0,
        },
      };
    }
    return window.go.main.App.ExplainDatabaseQuery(query);
  },

  saveQuery: async (name: string, sql: string): Promise<SavedQuery | null> => {
    if (!isWailsEnv()) return null;
    return window.go.main.App.SaveDatabaseQuery(name, sql);
  },

  getSavedQueries: async (): Promise<SavedQuery[]> => {
    if (!isWailsEnv()) return [];
    return window.go.main.App.GetSavedQueries();
  },

  deleteQuery: async (id: string): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.DeleteSavedQuery(id);
  },

  getSavedConnections: async (): Promise<SavedConnection[]> => {
    if (!isWailsEnv()) return [];
    return window.go.main.App.GetSavedConnections();
  },

  saveConnection: async (conn: SavedConnection): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.SaveDatabaseConnection(conn);
  },

  deleteConnection: async (name: string): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.DeleteSavedConnection(name);
  },

  getQueryStatistics: async (): Promise<QueryStatistic[]> => {
    if (!isWailsEnv()) return [];
    return window.go.main.App.GetQueryStatistics();
  },

  clearQueryStatistics: async (): Promise<void> => {
    if (!isWailsEnv()) return;
    return window.go.main.App.ClearQueryStatistics();
  },

  getDatabaseHealth: async (): Promise<DatabaseHealth | null> => {
    if (!isWailsEnv()) return null;
    try {
      return await window.go.main.App.GetDatabaseHealth();
    } catch (error) {
      console.error('Failed to get database health:', error);
      return null;
    }
  },

  // Query Analysis & Recommendations
  getSmartRecommendations: async () => {
    if (!isWailsEnv()) return [];
    try {
      return await window.go.main.App.GetSmartRecommendations();
    } catch (error) {
      console.error('Failed to get smart recommendations:', error);
      return [];
    }
  },

  getN1Warnings: async () => {
    if (!isWailsEnv()) return [];
    try {
      return await window.go.main.App.GetN1Warnings();
    } catch (error) {
      console.error('Failed to get N+1 warnings:', error);
      return [];
    }
  },

  getRequestQueryGroups: async (limit: number = 50) => {
    if (!isWailsEnv()) return [];
    try {
      return await window.go.main.App.GetRequestQueryGroups(limit);
    } catch (error) {
      console.error('Failed to get request query groups:', error);
      return [];
    }
  },

  getQueryDistribution: async () => {
    if (!isWailsEnv()) return null;
    try {
      return await window.go.main.App.GetQueryDistribution();
    } catch (error) {
      console.error('Failed to get query distribution:', error);
      return null;
    }
  },

  ignoreQueryPattern: async (fingerprint: string) => {
    if (!isWailsEnv()) return;
    try {
      await window.go.main.App.IgnoreQueryPattern(fingerprint);
    } catch (error) {
      console.error('Failed to ignore query pattern:', error);
      throw error;
    }
  },

  compareQueryPlans: async (originalSQL: string, optimizedSQL: string) => {
    if (!isWailsEnv()) return null;
    try {
      return await window.go.main.App.CompareQueryPlans(originalSQL, optimizedSQL);
    } catch (error) {
      console.error('Failed to compare query plans:', error);
      return null;
    }
  },
};

// SSH API
export const sshAPI = {
  getServers: async (): Promise<SSHServer[]> => {
    if (!isWailsEnv()) return [];
    try {
      return await window.go.main.App.GetSSHServers();
    } catch (error) {
      console.error('Failed to get SSH servers:', error);
      return [];
    }
  },

  saveServer: async (server: SSHServer): Promise<void> => {
    if (!isWailsEnv()) return;
    try {
      await window.go.main.App.SaveSSHServer(server);
    } catch (error) {
      console.error('Failed to save SSH server:', error);
      throw error;
    }
  },

  deleteServer: async (id: string): Promise<void> => {
    if (!isWailsEnv()) return;
    try {
      await window.go.main.App.DeleteSSHServer(id);
    } catch (error) {
      console.error('Failed to delete SSH server:', error);
      throw error;
    }
  },

  connect: async (serverId: string): Promise<string> => {
    if (!isWailsEnv()) throw new Error('Not in Wails environment');
    try {
      return await window.go.main.App.ConnectSSH(serverId);
    } catch (error) {
      console.error('Failed to connect to SSH server:', error);
      throw error;
    }
  },

  disconnect: async (sessionId: string): Promise<void> => {
    if (!isWailsEnv()) return;
    try {
      await window.go.main.App.DisconnectSSH(sessionId);
    } catch (error) {
      console.error('Failed to disconnect SSH session:', error);
    }
  },

  write: async (sessionId: string, data: string): Promise<void> => {
    if (!isWailsEnv()) return;
    try {
      await window.go.main.App.WriteSSH(sessionId, data);
    } catch (error) {
      console.error('Failed to write to SSH session:', error);
    }
  },

  resize: async (sessionId: string, rows: number, cols: number): Promise<void> => {
    if (!isWailsEnv()) return;
    try {
      await window.go.main.App.ResizeSSH(sessionId, rows, cols);
    } catch (error) {
      console.error('Failed to resize SSH session:', error);
    }
  },

  createTunnel: async (sessionId: string, tunnel: SSHTunnel): Promise<void> => {
    if (!isWailsEnv()) return;
    try {
      await window.go.main.App.CreateSSHTunnel(sessionId, tunnel);
    } catch (error) {
      console.error('Failed to create SSH tunnel:', error);
      throw error;
    }
  },

  exportSession: async (sessionId: string, format: 'csv' | 'txt'): Promise<string> => {
    if (!isWailsEnv()) return '';
    try {
      return await window.go.main.App.ExportSSHSession(sessionId, format);
    } catch (error) {
      console.error('Failed to export SSH session:', error);
      return '';
    }
  },

  getSessions: async (): Promise<SSHSession[]> => {
    if (!isWailsEnv()) return [];
    try {
      return await window.go.main.App.GetSSHSessions();
    } catch (error) {
      console.error('Failed to get SSH sessions:', error);
      return [];
    }
  },
};

// Convenience exports for direct usage
export const GetQueryStatistics = databaseAPI.getQueryStatistics;
export const ClearQueryStatistics = databaseAPI.clearQueryStatistics;
export const GetDatabaseHealth = databaseAPI.getDatabaseHealth;

// Re-export types from query.ts for convenience
export type {
  SmartRecommendation,
  ImpactEstimate,
  RecommendationFix,
  RequestQueryGroup,
  N1Warning,
  QueryInfo,
  TableDistribution,
  OperationDistribution,
  QueryDistribution,
  QueryComparison,
  QueryStatistics,
  QueryFilters,
} from '@/types/query';
