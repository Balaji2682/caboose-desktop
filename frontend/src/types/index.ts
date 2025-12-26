// Screen types
export type Screen =
  | 'dashboard'
  | 'processes'
  | 'queries'
  | 'database'
  | 'tests'
  | 'exceptions'
  | 'metrics'
  | 'settings'

// Theme types
export type ThemeName =
  | 'tokyo-night'
  | 'dracula'
  | 'nord'
  | 'solarized-dark'
  | 'material'

// Process types
export interface Process {
  id: string
  name: string
  type: 'rails' | 'frontend' | 'worker' | 'database' | 'other'
  status: 'running' | 'stopped' | 'error' | 'starting'
  port?: number
  command: string
  logs: string[]
  uptime?: string
  pid?: number
}

// Query types
export interface Query {
  id: string
  sql: string
  fingerprint: string
  count: number
  avgTime: number
  endpoint: string
  issue?: 'n+1' | 'slow' | null
}

// Database health types
export interface DatabaseIssue {
  id: string
  type: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  table?: string
  impact: string
}

export interface TableStats {
  name: string
  rows: string
  size: string
  indexes: number
  bloat: string
}

// Exception types
export interface Exception {
  id: string
  type: string
  message: string
  severity: 'error' | 'warning'
  count: number
  lastSeen: string
  file: string
  line: number
  stackTrace: string[]
  context?: Record<string, unknown>
}

// Test types
export interface TestResult {
  id: string
  name: string
  file: string
  status: 'passed' | 'failed' | 'pending' | 'running'
  duration?: number
  errorMessage?: string
}

export interface TestSuite {
  name: string
  file: string
  tests: TestResult[]
  passed: number
  failed: number
  pending: number
}

// Metrics types
export interface MetricDataPoint {
  timestamp: number
  value: number
}

export interface Metric {
  name: string
  current: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  change: string
  data: MetricDataPoint[]
}

// Navigation item type
export interface NavItem {
  id: Screen
  label: string
  icon: React.ComponentType<{ className?: string }>
  keywords?: string
}
