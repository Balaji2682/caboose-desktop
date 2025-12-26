import { create } from 'zustand'
import type { LogEntry as WailsLogEntry } from '@/lib/wails'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

// Re-export the LogEntry type from wails for consistency
export type LogEntry = WailsLogEntry

interface LogFilter {
  processName?: string
  level?: LogLevel
  search?: string
}

interface LogState {
  logs: LogEntry[]
  filter: LogFilter
  autoScroll: boolean
  loading: boolean

  // Actions
  addLog: (log: LogEntry) => void
  setLogs: (logs: LogEntry[]) => void
  clearLogs: () => void
  setFilter: (filter: Partial<LogFilter>) => void
  setAutoScroll: (autoScroll: boolean) => void
  fetchLogs: (filter?: LogFilter) => Promise<void>
  exportLogs: (path: string) => Promise<void>
}

const MAX_LOGS = 10000

export const useLogStore = create<LogState>((set, _get) => ({
  logs: [],
  filter: {},
  autoScroll: true,
  loading: false,

  addLog: (log) =>
    set((state) => {
      const newLogs = [...state.logs, log]
      // Keep only the last MAX_LOGS entries
      if (newLogs.length > MAX_LOGS) {
        return { logs: newLogs.slice(-MAX_LOGS) }
      }
      return { logs: newLogs }
    }),

  setLogs: (logs) => set({ logs }),

  clearLogs: () => {
    set({ logs: [] })
    try {
      // @ts-ignore - Wails binding
      window.go.main.App.ClearLogs()
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  },

  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),

  setAutoScroll: (autoScroll) => set({ autoScroll }),

  fetchLogs: async (filter) => {
    set({ loading: true })
    try {
      // @ts-ignore - Wails binding
      const logs = await window.go.main.App.GetLogs(filter || {})
      set({ logs: logs || [] })
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      set({ loading: false })
    }
  },

  exportLogs: async (path) => {
    try {
      // @ts-ignore - Wails binding
      await window.go.main.App.ExportLogs(path)
    } catch (error) {
      console.error('Failed to export logs:', error)
    }
  },
}))

// Helper to get filtered logs
export const getFilteredLogs = (logs: LogEntry[], filter: LogFilter): LogEntry[] => {
  return logs.filter((log) => {
    if (filter.processName && log.process !== filter.processName) {
      return false
    }
    if (filter.level && log.level !== filter.level) {
      return false
    }
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      return log.content.toLowerCase().includes(searchLower)
    }
    return true
  })
}
