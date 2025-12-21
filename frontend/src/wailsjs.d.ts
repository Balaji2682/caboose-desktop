// Wails runtime type declarations

declare global {
  interface Window {
    go: {
      main: {
        App: {
          GetProcesses(): Promise<Process[]>
          StartProcess(name: string): Promise<void>
          StopProcess(name: string): Promise<void>
          RestartProcess(name: string): Promise<void>
          GetLogs(filter: Record<string, unknown>): Promise<LogEntry[]>
          ClearLogs(): Promise<void>
          ExportLogs(path: string): Promise<void>
          GetQueryAnalysis(): Promise<QueryAnalysis>
          GetRequestDetails(requestID: string): Promise<RequestDetails>
        }
      }
    }
    runtime: {
      EventsOn(event: string, callback: (...args: unknown[]) => void): () => void
      EventsOff(event: string): void
      EventsEmit(event: string, ...args: unknown[]): void
      Quit(): void
    }
  }
}

interface Process {
  name: string
  command: string
  status: 'stopped' | 'starting' | 'running' | 'crashed' | 'stopping'
  pid?: number
  startedAt?: string
  exitCode?: number
  restartCount: number
  color: string
}

interface LogEntry {
  id: string
  timestamp: string
  raw: string
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  message: string
  processName: string
  requestId?: string
  metadata?: Record<string, unknown>
}

interface QueryAnalysis {
  requestId: string
  queries: QueryInfo[]
  totalQueries: number
  totalDuration: number
  duplicateCount: number
  n1Warnings: N1Warning[]
  slowQueries: QueryInfo[]
}

interface QueryInfo {
  sql: string
  fingerprint: string
  duration: number
  table: string
  operation: string
  count: number
  isSlow: boolean
  hasSelectStar: boolean
}

interface N1Warning {
  fingerprint: string
  table: string
  count: number
  totalDuration: number
  confidence: number
  suggestion: string
  examples: string[]
}

interface RequestDetails {
  method: string
  path: string
  controller: string
  action: string
  status: number
  duration: number
  queries: QueryInfo[]
}

export {}
