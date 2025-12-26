import { useRef, useEffect, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useLogStore, getFilteredLogs, LogEntry, LogLevel } from '../../stores/logStore'

const levelColors: Record<string, string> = {
  debug: 'log-debug',
  info: 'log-info',
  warn: 'log-warn',
  error: 'log-error',
  fatal: 'log-fatal',
}

function LogLine({ log, style }: { log: LogEntry; style: React.CSSProperties }) {
  const timestamp = new Date(log.timestamp).toLocaleTimeString()
  const levelClass = levelColors[log.level] || 'log-info'

  return (
    <div
      style={style}
      className="flex items-start gap-2 px-2 py-0.5 hover:bg-border/30 font-mono text-xs"
    >
      {/* Timestamp */}
      <span className="text-muted shrink-0 w-20">{timestamp}</span>

      {/* Process Name */}
      <span className="text-accent shrink-0 w-24 truncate">{log.process}</span>

      {/* Level */}
      <span className={`shrink-0 w-12 ${levelClass}`}>
        [{log.level.toUpperCase()}]
      </span>

      {/* Message */}
      <span className="text-foreground whitespace-pre-wrap break-all flex-1">
        {log.content}
      </span>
    </div>
  )
}

export function LogViewer() {
  const { logs, filter, autoScroll, setFilter, setAutoScroll, clearLogs } = useLogStore()
  const parentRef = useRef<HTMLDivElement>(null)

  // Filter logs
  const filteredLogs = useMemo(
    () => getFilteredLogs(logs, filter),
    [logs, filter]
  )

  // Virtualizer for efficient rendering
  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,
    overscan: 20,
  })

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && filteredLogs.length > 0 && parentRef.current) {
      virtualizer.scrollToIndex(filteredLogs.length - 1)
    }
  }, [filteredLogs.length, autoScroll, virtualizer])

  // Handle scroll to detect if user scrolled up
  const handleScroll = () => {
    if (!parentRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = parentRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    setAutoScroll(isAtBottom)
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-border">
        {/* Search */}
        <input
          type="text"
          placeholder="Search logs..."
          value={filter.search || ''}
          onChange={(e) => setFilter({ search: e.target.value })}
          className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
        />

        {/* Level Filter */}
        <select
          value={filter.level || ''}
          onChange={(e) => setFilter({ level: (e.target.value || undefined) as LogLevel | undefined })}
          className="px-3 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Levels</option>
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
          <option value="fatal">Fatal</option>
        </select>

        {/* Clear Button */}
        <button
          onClick={clearLogs}
          className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
        >
          Clear
        </button>

        {/* Auto-scroll indicator */}
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`px-3 py-1.5 text-sm rounded ${
            autoScroll
              ? 'bg-green-500/20 text-green-400'
              : 'bg-muted/20 text-muted'
          }`}
          title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
        >
          {autoScroll ? '↓ Auto' : '↓ Manual'}
        </button>
      </div>

      {/* Log Stats */}
      <div className="px-2 py-1 text-xs text-muted border-b border-border">
        Showing {filteredLogs.length} of {logs.length} logs
        {filter.processName && ` (filtered by: ${filter.processName})`}
      </div>

      {/* Virtualized Log List */}
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <LogLine
              key={filteredLogs[virtualItem.index].id}
              log={filteredLogs[virtualItem.index]}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredLogs.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted">
            {logs.length === 0 ? 'No logs yet. Start a process to see logs.' : 'No logs match the current filter.'}
          </div>
        )}
      </div>
    </div>
  )
}
