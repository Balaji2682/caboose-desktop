import { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Save,
  Clock,
  Database,
  Table,
  Columns,
  Key,
  Loader2,
  Power,
  PowerOff,
  ChevronRight,
  ChevronDown,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  History,
  Search,
  Code,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SqlEditor, type TableSchema, type SqlEditorRef } from '@/components/editors/SqlEditor';
import {
  databaseAPI,
  eventsAPI,
  isWailsEnv,
  type DatabaseConnectionConfig,
  type DatabaseStatus,
  type TableInfo,
  type ColumnInfo,
  type QueryResult,
  type ExplainResult,
  type SavedQuery,
} from '@/lib/wails';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
type SortDirection = 'asc' | 'desc' | null;

interface QueryHistoryEntry {
  id: string;
  sql: string;
  timestamp: number;
  executionTime?: number;
  rowCount?: number;
  error?: boolean;
}

const QUERY_HISTORY_KEY = 'caboose-query-history';
const MAX_HISTORY_ENTRIES = 100;

// Load query history from localStorage
const loadQueryHistory = (): QueryHistoryEntry[] => {
  try {
    const stored = localStorage.getItem(QUERY_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save query history to localStorage
const saveQueryHistory = (history: QueryHistoryEntry[]) => {
  try {
    localStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ENTRIES)));
  } catch {
    // Ignore localStorage errors
  }
};

interface ConnectionDialogProps {
  onConnect: (config: DatabaseConnectionConfig) => void;
  onCancel: () => void;
  isConnecting: boolean;
}

const ConnectionDialog = memo<ConnectionDialogProps>(({ onConnect, onCancel, isConnecting }) => {
  const [config, setConfig] = useState<DatabaseConnectionConfig>({
    driver: 'mysql',
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: '',
    name: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect(config);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop with solid color for webview compatibility */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />
      {/* Dialog */}
      <Card className="relative z-10 bg-gray-900 border-gray-700 p-6 w-[400px] shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Connect to Database
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Driver</label>
              <select
                value={config.driver}
                onChange={(e) => setConfig({ ...config, driver: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-sm appearance-none cursor-pointer"
                style={{ colorScheme: 'dark' }}
              >
                <option value="mysql" className="bg-gray-800 text-gray-100">MySQL</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Port</label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 3306 })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Host</label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              placeholder="localhost"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">User</label>
              <input
                type="text"
                value={config.user}
                onChange={(e) => setConfig({ ...config, user: e.target.value })}
                placeholder="root"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Password</label>
              <input
                type="password"
                value={config.password}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Database</label>
            <input
              type="text"
              value={config.database}
              onChange={(e) => setConfig({ ...config, database: e.target.value })}
              placeholder="myapp_development"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onCancel} disabled={isConnecting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isConnecting || !config.database}>
              {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
              Connect
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
});

ConnectionDialog.displayName = 'ConnectionDialog';

interface TableTreeItemProps {
  table: TableInfo;
  isExpanded: boolean;
  columns: ColumnInfo[];
  onToggle: () => void;
  onSelect: (tableName: string) => void;
  onShowCreateTable: (tableName: string) => void;
  isLoading: boolean;
}

const TableTreeItem = memo<TableTreeItemProps>(
  ({ table, isExpanded, columns, onToggle, onSelect, onShowCreateTable, isLoading }) => {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    };

    // Close context menu on click outside
    useEffect(() => {
      if (!showContextMenu) return;
      const handleClick = () => setShowContextMenu(false);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }, [showContextMenu]);

    return (
      <div className="relative">
        <button
          onClick={onToggle}
          onContextMenu={handleContextMenu}
          className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-800 rounded flex items-center gap-1"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
          ) : isExpanded ? (
            <ChevronDown className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          )}
          <Table className="w-3 h-3 text-cyan-400" />
          <span
            className="flex-1 truncate cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(table.name);
            }}
          >
            {table.name}
          </span>
          {table.rowCount !== undefined && table.rowCount > 0 && (
            <span className="text-xs text-gray-500">~{table.rowCount}</span>
          )}
        </button>
        {isExpanded && columns.length > 0 && (
          <div className="ml-4 border-l border-gray-800 pl-2">
            {columns.map((col) => (
              <div
                key={col.name}
                className="px-2 py-1 text-xs text-gray-400 flex items-center gap-1.5"
              >
                {col.isPrimaryKey ? (
                  <Key className="w-3 h-3 text-yellow-500" />
                ) : (
                  <Columns className="w-3 h-3 text-gray-600" />
                )}
                <span className="truncate">{col.name}</span>
                <span className="text-gray-600 text-[10px]">{col.dataType}</span>
              </div>
            ))}
          </div>
        )}
        {/* Context Menu */}
        {showContextMenu && (
          <div
            className="fixed z-50 bg-gray-900 border border-gray-700 rounded shadow-xl py-1 min-w-[160px]"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(table.name);
                setShowContextMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2"
            >
              <Play className="w-3 h-3" />
              Select Data (LIMIT 100)
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowCreateTable(table.name);
                setShowContextMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2"
            >
              <Code className="w-3 h-3" />
              Show CREATE TABLE
            </button>
          </div>
        )}
      </div>
    );
  }
);

TableTreeItem.displayName = 'TableTreeItem';

export const QueryConsole = memo(() => {
  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Schema browser state
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [tableColumns, setTableColumns] = useState<Map<string, ColumnInfo[]>>(new Map());
  const [loadingColumns, setLoadingColumns] = useState<Set<string>>(new Set());

  // Query state
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 10');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [explainResult, setExplainResult] = useState<ExplainResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  // Saved queries
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);

  // Query history with search
  const [queryHistory, setQueryHistory] = useState<QueryHistoryEntry[]>(() => loadQueryHistory());
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Editor ref for keyboard shortcuts
  const editorRef = useRef<SqlEditorRef>(null);

  // Check initial connection status
  useEffect(() => {
    const checkStatus = async () => {
      if (!isWailsEnv()) return;
      const status = await databaseAPI.getStatus();
      setDbStatus(status);
      if (status.connected) {
        setConnectionState('connected');
        loadTables();
        loadSavedQueries();
      }
    };
    checkStatus();

    // Listen for connection events
    const unsubConnect = eventsAPI.on('database:connected', (data) => {
      setDbStatus(data as DatabaseStatus);
      setConnectionState('connected');
      loadTables();
    });

    const unsubDisconnect = eventsAPI.on('database:disconnected', () => {
      setDbStatus(null);
      setConnectionState('disconnected');
      setTables([]);
      setTableColumns(new Map());
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
    };
  }, []);

  const loadTables = useCallback(async () => {
    try {
      const tableList = await databaseAPI.getTables();
      setTables(tableList);

      // Load all columns for autocomplete
      const columnsMap = new Map<string, ColumnInfo[]>();
      for (const table of tableList) {
        try {
          const cols = await databaseAPI.getColumns(table.name);
          columnsMap.set(table.name, cols);
        } catch {
          // Ignore errors for individual tables
        }
      }
      setTableColumns(columnsMap);
    } catch (err) {
      console.error('Failed to load tables:', err);
    }
  }, []);

  const loadSavedQueries = useCallback(async () => {
    try {
      const queries = await databaseAPI.getSavedQueries();
      setSavedQueries(queries);
    } catch (err) {
      console.error('Failed to load saved queries:', err);
    }
  }, []);

  const handleConnect = useCallback(async (config: DatabaseConnectionConfig) => {
    setConnectionState('connecting');
    setConnectionError(null);
    try {
      await databaseAPI.connect(config);
      setShowConnectDialog(false);
      loadSavedQueries();
    } catch (err) {
      setConnectionState('error');
      setConnectionError(err instanceof Error ? err.message : String(err));
    }
  }, [loadSavedQueries]);

  const handleDisconnect = useCallback(async () => {
    try {
      await databaseAPI.disconnect();
      setConnectionState('disconnected');
      setDbStatus(null);
      setTables([]);
      setResult(null);
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  }, []);

  const toggleTableExpand = useCallback(async (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
      // Load columns if not already loaded
      if (!tableColumns.has(tableName)) {
        setLoadingColumns((prev) => new Set(prev).add(tableName));
        try {
          const cols = await databaseAPI.getColumns(tableName);
          setTableColumns((prev) => new Map(prev).set(tableName, cols));
        } catch (err) {
          console.error('Failed to load columns:', err);
        } finally {
          setLoadingColumns((prev) => {
            const next = new Set(prev);
            next.delete(tableName);
            return next;
          });
        }
      }
    }
    setExpandedTables(newExpanded);
  }, [expandedTables, tableColumns]);

  // Select table and auto-execute
  const selectTable = useCallback(async (tableName: string) => {
    const newQuery = `SELECT * FROM ${tableName} LIMIT 100`;
    setQuery(newQuery);
    // Auto-execute the query
    if (connectionState === 'connected') {
      setIsExecuting(true);
      setResult(null);
      setExplainResult(null);
      setShowExplain(false);
      setSortColumn(null);
      setSortDirection(null);

      try {
        const res = await databaseAPI.executeQuery(newQuery, 100);
        setResult(res);
        // Add to history
        addToHistory(newQuery, res.executionTime, res.rowCount, !!res.error);
      } catch (err) {
        setResult({
          columns: [],
          columnTypes: [],
          rows: [],
          rowCount: 0,
          affectedRows: 0,
          executionTime: 0,
          error: err instanceof Error ? err.message : String(err),
          isSelect: false,
        });
      } finally {
        setIsExecuting(false);
      }
    }
  }, [connectionState]);

  // Show CREATE TABLE (right-click menu)
  const showCreateTable = useCallback(async (tableName: string) => {
    if (connectionState !== 'connected') return;

    const showQuery = `SHOW CREATE TABLE ${tableName}`;
    setQuery(showQuery);
    setIsExecuting(true);
    setResult(null);
    setShowExplain(false);
    setSortColumn(null);
    setSortDirection(null);

    try {
      const res = await databaseAPI.executeQuery(showQuery, 1);
      setResult(res);
      addToHistory(showQuery, res.executionTime, res.rowCount, !!res.error);
    } catch (err) {
      setResult({
        columns: [],
        columnTypes: [],
        rows: [],
        rowCount: 0,
        affectedRows: 0,
        executionTime: 0,
        error: err instanceof Error ? err.message : String(err),
        isSelect: false,
      });
    } finally {
      setIsExecuting(false);
    }
  }, [connectionState]);

  // Add query to history
  const addToHistory = useCallback((sql: string, executionTime?: number, rowCount?: number, error?: boolean) => {
    const entry: QueryHistoryEntry = {
      id: Date.now().toString(),
      sql: sql.trim(),
      timestamp: Date.now(),
      executionTime,
      rowCount,
      error,
    };
    setQueryHistory(prev => {
      const newHistory = [entry, ...prev.filter(h => h.sql !== sql.trim())].slice(0, MAX_HISTORY_ENTRIES);
      saveQueryHistory(newHistory);
      return newHistory;
    });
  }, []);

  const executeQuery = useCallback(async () => {
    if (!query.trim()) return;
    setIsExecuting(true);
    setResult(null);
    setExplainResult(null);
    setShowExplain(false);
    setSortColumn(null);
    setSortDirection(null);

    try {
      const res = await databaseAPI.executeQuery(query, 1000);
      setResult(res);
      addToHistory(query, res.executionTime, res.rowCount, !!res.error);
    } catch (err) {
      setResult({
        columns: [],
        columnTypes: [],
        rows: [],
        rowCount: 0,
        affectedRows: 0,
        executionTime: 0,
        error: err instanceof Error ? err.message : String(err),
        isSelect: false,
      });
      addToHistory(query, 0, 0, true);
    } finally {
      setIsExecuting(false);
    }
  }, [query, addToHistory]);

  const executeExplain = useCallback(async () => {
    if (!query.trim()) return;
    setIsExecuting(true);

    try {
      const res = await databaseAPI.explainQuery(query);
      setExplainResult(res);
      setShowExplain(true);
    } catch (err) {
      console.error('Failed to explain:', err);
    } finally {
      setIsExecuting(false);
    }
  }, [query]);

  const saveCurrentQuery = useCallback(async () => {
    const name = prompt('Enter a name for this query:');
    if (!name) return;

    try {
      await databaseAPI.saveQuery(name, query);
      loadSavedQueries();
    } catch (err) {
      console.error('Failed to save query:', err);
    }
  }, [query, loadSavedQueries]);

  const deleteSavedQuery = useCallback(async (id: string) => {
    try {
      await databaseAPI.deleteQuery(id);
      loadSavedQueries();
    } catch (err) {
      console.error('Failed to delete query:', err);
    }
  }, [loadSavedQueries]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (!result || !result.isSelect || result.columns.length === 0) return;

    const escape = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = result.columns.map(escape).join(',');
    const rows = result.rows.map(row =>
      result.columns.map(col => escape(row[col])).join(',')
    );
    const csv = [header, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-result-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  // Export to JSON
  const exportToJSON = useCallback(() => {
    if (!result || !result.isSelect || result.columns.length === 0) return;

    const json = JSON.stringify(result.rows, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-result-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  // Column sorting handler
  const handleColumnSort = useCallback((columnName: string) => {
    if (sortColumn === columnName) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnName);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  // Sort result rows
  const sortedRows = useMemo(() => {
    if (!result || !result.isSelect || !sortColumn || !sortDirection) {
      return result?.rows || [];
    }

    return [...result.rows].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      // Handle nulls
      if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? -1 : 1;
      if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? 1 : -1;

      // Try numeric comparison
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      }
      return bStr.localeCompare(aStr);
    });
  }, [result, sortColumn, sortDirection]);

  // Filtered history based on search
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return queryHistory;
    const search = historySearch.toLowerCase();
    return queryHistory.filter(h => h.sql.toLowerCase().includes(search));
  }, [queryHistory, historySearch]);

  // Clear history
  const clearHistory = useCallback(() => {
    setQueryHistory([]);
    saveQueryHistory([]);
  }, []);

  // Build schema for Monaco autocomplete with enhanced metadata
  const editorSchema: TableSchema[] = tables.map(table => ({
    name: table.name,
    comment: table.comment,
    rowCount: table.rowCount,
    columns: (tableColumns.get(table.name) || []).map(col => ({
      name: col.name,
      dataType: col.dataType,
      isPrimaryKey: col.isPrimaryKey,
      isNullable: col.isNullable,
      comment: col.comment,
      default: col.default,
    })),
  }));

  const getStatusBadge = () => {
    if (connectionState === 'connected' && dbStatus) {
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          {dbStatus.driver?.toUpperCase()} - {dbStatus.database}
        </Badge>
      );
    }
    if (connectionState === 'connecting') {
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Connecting...
        </Badge>
      );
    }
    if (connectionState === 'error') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Connection Error
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Info className="w-3 h-3" />
        Disconnected
      </Badge>
    );
  };

  return (
    <div className="h-full flex p-6 gap-6">
      {/* Connection Dialog */}
      {showConnectDialog && (
        <ConnectionDialog
          onConnect={handleConnect}
          onCancel={() => setShowConnectDialog(false)}
          isConnecting={connectionState === 'connecting'}
        />
      )}

      {/* Left Sidebar - Schema Browser */}
      <div className="w-64 flex-shrink-0 space-y-4">
        {/* Connection Status */}
        <Card className="bg-gray-900 border-gray-800 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase">Connection</span>
            {connectionState === 'connected' ? (
              <Button variant="ghost" size="sm" onClick={handleDisconnect} className="h-6 px-2">
                <PowerOff className="w-3 h-3" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConnectDialog(true)}
                className="h-6 px-2"
              >
                <Power className="w-3 h-3" />
              </Button>
            )}
          </div>
          {getStatusBadge()}
          {connectionError && (
            <p className="text-xs text-red-400 mt-2 break-words">{connectionError}</p>
          )}
          {dbStatus?.version && (
            <p className="text-xs text-gray-500 mt-1">v{dbStatus.version}</p>
          )}
        </Card>

        {/* Tables */}
        <Card className="bg-gray-900 border-gray-800 p-4 flex-1">
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Tables ({tables.length})
          </h3>
          {connectionState !== 'connected' ? (
            <p className="text-xs text-gray-500 italic">Connect to view tables</p>
          ) : tables.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No tables found</p>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-0.5">
                {tables.map((table) => (
                  <TableTreeItem
                    key={table.name}
                    table={table}
                    isExpanded={expandedTables.has(table.name)}
                    columns={tableColumns.get(table.name) || []}
                    onToggle={() => toggleTableExpand(table.name)}
                    onSelect={selectTable}
                    onShowCreateTable={showCreateTable}
                    isLoading={loadingColumns.has(table.name)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>

        {/* Saved Queries */}
        <Card className="bg-gray-900 border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Save className="w-4 h-4" />
            Saved Queries
          </h3>
          {savedQueries.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No saved queries</p>
          ) : (
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {savedQueries.map((saved) => (
                  <div
                    key={saved.id}
                    className="flex items-center gap-1 group"
                  >
                    <button
                      onClick={() => setQuery(saved.sql)}
                      className="flex-1 text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-800 rounded flex items-center gap-2"
                    >
                      <FileText className="w-3 h-3 text-gray-500" />
                      <span className="truncate">{saved.name}</span>
                    </button>
                    <button
                      onClick={() => deleteSavedQuery(saved.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded"
                    >
                      <Trash2 className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Query Console</h1>
            <p className="text-sm text-gray-400">Execute SQL queries directly</p>
          </div>
          {getStatusBadge()}
        </div>

        {/* Query Editor */}
        <Card className="bg-gray-900 border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">SQL Query</span>
              {/* History Dropdown */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                  className="text-xs"
                >
                  <History className="w-3 h-3" />
                  History
                  {queryHistory.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                      {queryHistory.length}
                    </Badge>
                  )}
                </Button>
                {showHistoryDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-96 bg-gray-900 border border-gray-700 rounded shadow-xl z-50">
                    <div className="p-2 border-b border-gray-800">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          placeholder="Search history..."
                          className="flex-1 bg-transparent border-none text-sm text-gray-300 focus:outline-none"
                          autoFocus
                        />
                        {historySearch && (
                          <button onClick={() => setHistorySearch('')} className="text-gray-500 hover:text-gray-300">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <ScrollArea className="max-h-64">
                      {filteredHistory.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          {queryHistory.length === 0 ? 'No history yet' : 'No matches found'}
                        </div>
                      ) : (
                        <div className="p-1">
                          {filteredHistory.map((entry) => (
                            <button
                              key={entry.id}
                              onClick={() => {
                                setQuery(entry.sql);
                                setShowHistoryDropdown(false);
                                setHistorySearch('');
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-800 rounded text-sm"
                            >
                              <div className="flex items-center gap-2">
                                {entry.error ? (
                                  <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                                ) : (
                                  <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                                )}
                                <span className="text-gray-300 truncate font-mono text-xs">
                                  {entry.sql.length > 60 ? entry.sql.slice(0, 60) + '...' : entry.sql}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500 ml-5">
                                <span>{new Date(entry.timestamp).toLocaleString()}</span>
                                {entry.executionTime !== undefined && (
                                  <span>{entry.executionTime.toFixed(0)}ms</span>
                                )}
                                {entry.rowCount !== undefined && (
                                  <span>{entry.rowCount} rows</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    {queryHistory.length > 0 && (
                      <div className="p-2 border-t border-gray-800 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            clearHistory();
                            setShowHistoryDropdown(false);
                          }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3 h-3" />
                          Clear History
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveCurrentQuery}
                disabled={connectionState !== 'connected' || !query.trim()}
              >
                <Save className="w-4 h-4" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={executeExplain}
                disabled={connectionState !== 'connected' || isExecuting || !query.trim()}
              >
                <FileText className="w-4 h-4" />
                Explain
              </Button>
              <Button
                onClick={executeQuery}
                disabled={connectionState !== 'connected' || isExecuting || !query.trim()}
                size="sm"
              >
                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {isExecuting ? 'Running...' : 'Execute'}
              </Button>
            </div>
          </div>
          <SqlEditor
            ref={editorRef}
            value={query}
            onChange={setQuery}
            onExecute={executeQuery}
            schema={editorSchema}
            disabled={connectionState !== 'connected'}
            height="180px"
          />
        </Card>

        {/* Results */}
        {(result || showExplain) && (
          <Card className="flex-1 bg-gray-900 border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {showExplain && explainResult ? (
                  <>
                    <span className="text-sm text-gray-300">Execution Plan</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowExplain(false)}
                      className="text-xs"
                    >
                      Show Results
                    </Button>
                  </>
                ) : result ? (
                  <>
                    {result.error ? (
                      <span className="text-sm text-red-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Error
                      </span>
                    ) : result.isSelect ? (
                      <span className="text-sm text-gray-300">
                        {result.rowCount} rows returned
                        {sortColumn && (
                          <span className="text-gray-500 ml-2">
                            (sorted by {sortColumn} {sortDirection})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-300">
                        {result.affectedRows} rows affected
                      </span>
                    )}
                    <Badge variant="default" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {result.executionTime.toFixed(2)}ms
                    </Badge>
                    {explainResult && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowExplain(true)}
                        className="text-xs"
                      >
                        Show Plan
                      </Button>
                    )}
                  </>
                ) : null}
              </div>
              {/* Export buttons */}
              {result && result.isSelect && result.columns.length > 0 && !result.error && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToCSV}
                    className="text-xs"
                  >
                    <Download className="w-3 h-3" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToJSON}
                    className="text-xs"
                  >
                    <Download className="w-3 h-3" />
                    JSON
                  </Button>
                </div>
              )}
            </div>

            <ScrollArea className="h-64">
              {showExplain && explainResult ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-800/50 sticky top-0">
                    <tr>
                      {explainResult.columns.map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {explainResult.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-800/30">
                        {explainResult.columns.map((col) => (
                          <td key={col} className="px-4 py-3 text-gray-300 font-mono text-xs">
                            {row[col] !== null && row[col] !== undefined
                              ? String(row[col])
                              : <span className="text-gray-600">NULL</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : result?.error ? (
                <div className="p-4 text-red-400 font-mono text-sm whitespace-pre-wrap">
                  {result.error}
                </div>
              ) : result && result.isSelect && result.columns.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-800/50 sticky top-0">
                    <tr>
                      {result.columns.map((col, i) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:bg-gray-700/50 select-none"
                          onClick={() => handleColumnSort(col)}
                        >
                          <div className="flex items-center gap-1">
                            <span>{col}</span>
                            {sortColumn === col ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="w-3 h-3 text-cyan-400" />
                              ) : (
                                <ArrowDown className="w-3 h-3 text-cyan-400" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100" />
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 normal-case">
                            {result.columnTypes[i]}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {sortedRows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-800/30">
                        {result.columns.map((col) => (
                          <td key={col} className="px-4 py-3 text-gray-300">
                            {row[col] !== null && row[col] !== undefined
                              ? String(row[col])
                              : <span className="text-gray-600">NULL</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : result && !result.isSelect ? (
                <div className="p-4 text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Query executed successfully. {result.affectedRows} rows affected.
                </div>
              ) : null}
            </ScrollArea>
          </Card>
        )}

        {/* Tips */}
        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Ctrl+Enter to execute
          </span>
          <span>Ctrl+Shift+F format</span>
          <span>Ctrl+Shift+U uppercase</span>
          <span>Ctrl+/ comment</span>
          <span>Click header to sort</span>
          <span>Right-click table for menu</span>
        </div>
      </div>
    </div>
  );
});

QueryConsole.displayName = 'QueryConsole';
