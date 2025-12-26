# Caboose Desktop - Complete Feature List

**Application Type:** Desktop Development Tool for Rails/Node.js Applications
**Framework:** Wails (Go + React/TypeScript)
**Version:** 1.0.0

---

## Table of Contents
1. [Process Management](#process-management)
2. [Database Management](#database-management)
3. [Query Analysis & Optimization](#query-analysis--optimization)
4. [SSH Management](#ssh-management)
5. [Rails Console Integration](#rails-console-integration)
6. [Exception Tracking](#exception-tracking)
7. [Metrics & Performance Monitoring](#metrics--performance-monitoring)
8. [Testing Integration](#testing-integration)
9. [Configuration & Settings](#configuration--settings)
10. [Plugin Architecture](#plugin-architecture)
11. [Security Features](#security-features)
12. [Worker Pool](#worker-pool)
13. [UI/UX Features](#uiux-features)

---

## Process Management

Comprehensive process lifecycle management with PTY support for interactive processes.

### Core Features

| Feature | Description | Implementation Files | API Methods |
|---------|-------------|---------------------|-------------|
| **Process Lifecycle** | Start, stop, restart processes | `internal/core/process/manager.go` | `StartProcess()`, `StopProcess()`, `RestartProcess()` |
| **Bulk Operations** | Start/stop all processes at once | `internal/core/process/manager.go` | `StartAllProcesses()`, `StopAllProcesses()` |
| **Auto-Restart** | Automatic process restart on crash | `internal/core/process/manager.go` | Configurable per process |
| **PTY Support** | Pseudo-terminal for interactive processes | `internal/core/process/pty.go` | `WriteToPTY()`, `ResizePTY()` |
| **Process Monitoring** | CPU, memory, uptime tracking | `internal/core/process/manager.go` | `GetProcesses()`, `GetProcess()` |
| **Log Streaming** | Real-time log output capture | `internal/core/log/streamer.go` | Event-based via callbacks |
| **Dynamic Process Addition** | Add processes at runtime | `app.go` | `AddProcess()` |
| **Process Removal** | Remove processes from manager | `app.go` | `RemoveProcess()` |
| **Status Events** | Real-time status change notifications | `app.go` | Wails event: `process:status` |
| **Color Coding** | Visual process identification | `internal/models/process.go` | Config field |
| **Environment Variables** | Custom env vars per process | `internal/models/process.go` | Config field |
| **Working Directory** | Custom working dir per process | `internal/models/process.go` | Config field |

### UI Components

| Component | Location | Description |
|-----------|----------|-------------|
| **ProcessManagement Screen** | `frontend/src/components/screens/ProcessManagement.tsx` | Main process control panel |
| **ProcessSidebar** | `frontend/src/components/processes/ProcessSidebar.tsx` | Process list sidebar with status |
| **ProcessDetails** | `frontend/src/components/processes/` | Process metrics and controls |
| **LogViewer** | `frontend/src/components/logs/LogViewer.tsx` | Scrollable log display with filtering |

### State Management

| Store | File | Purpose |
|-------|------|---------|
| **Process Store** | `frontend/src/stores/processStore.ts` | Process state management |
| **Log Store** | `frontend/src/stores/logStore.ts` | Log entries and filtering |

---

## Database Management

Multi-database support with query execution, analysis, and management.

### Core Features

| Feature | Description | Implementation Files | API Methods |
|---------|-------------|---------------------|-------------|
| **Multi-DB Support** | MySQL (PostgreSQL/SQLite planned) | `internal/core/database/manager.go` | `ConnectDatabase()` |
| **Connection Management** | Connect, disconnect, status tracking | `internal/core/database/manager.go` | `DisconnectDatabase()`, `GetDatabaseStatus()` |
| **Schema Exploration** | List tables and columns | `internal/core/database/manager.go` | `GetDatabaseTables()`, `GetTableColumns()` |
| **Query Execution** | Execute SQL with row limits | `internal/core/database/manager.go` | `ExecuteDatabaseQuery()` |
| **Confirm Dangerous Queries** | Safety confirmation for UPDATE/DELETE | `app.go` | `ConfirmAndExecuteQuery()` |
| **Query Explain** | Execution plan analysis | `internal/core/database/manager.go` | `ExplainDatabaseQuery()` |
| **Saved Queries** | Save and manage frequently used queries | `internal/core/database/manager.go` | `SaveDatabaseQuery()`, `GetSavedQueries()` |
| **Connection Profiles** | Save database connection configs | `internal/core/config/config.go` | `SaveDatabaseConnection()` |
| **Query Statistics** | Track query performance metrics | `internal/core/database/manager.go` | `GetQueryStatistics()` |
| **Database Health** | Connection pool and performance metrics | `internal/core/database/manager.go` | `GetDatabaseHealth()` |
| **Slow Query Detection** | Identify queries exceeding threshold | `internal/core/database/manager.go` | Configurable threshold |
| **Query History** | Recent query tracking | `internal/core/database/manager.go` | Built-in |

### Database Drivers

| Driver | Status | File |
|--------|--------|------|
| **MySQL** | ✅ Implemented | `internal/core/database/mysql.go` |
| **PostgreSQL** | 🔄 Planned | - |
| **SQLite** | 🔄 Planned | - |

### UI Components

| Component | Location | Description |
|-----------|----------|-------------|
| **QueryConsole Screen** | `frontend/src/components/screens/QueryConsole.tsx` | SQL query editor and executor |
| **DatabaseHealth Screen** | `frontend/src/components/screens/DatabaseHealth.tsx` | Database metrics dashboard |
| **Database Components** | `frontend/src/components/database/` | Connection manager, table browser |

### State Management

| Store | File | Purpose |
|-------|------|---------|
| **Query Store** | `frontend/src/stores/queryStore.ts` | Query execution state |
| **Health Store** | `frontend/src/stores/healthStore.ts` | Database health metrics |

---

## Query Analysis & Optimization

Advanced SQL query analysis and optimization recommendations (Rails-specific).

### Core Features

| Feature | Description | Implementation Files | API Methods |
|---------|-------------|---------------------|-------------|
| **N+1 Detection** | Identify N+1 query patterns | `internal/plugins/rails/query.go` | `GetN1Warnings()` |
| **Smart Recommendations** | AI-powered optimization suggestions | `internal/plugins/rails/recommendations.go` | `GetSmartRecommendations()` |
| **Query Grouping** | Group queries by request/endpoint | `internal/plugins/rails/query.go` | `GetRequestQueryGroups()` |
| **Query Distribution** | Visualize query type distribution | `internal/plugins/rails/query.go` | `GetQueryDistribution()` |
| **Query Fingerprinting** | Normalize queries for pattern matching | `internal/plugins/rails/query.go` | Built-in |
| **Index Recommendations** | Suggest missing indexes | `internal/plugins/rails/recommendations.go` | Part of recommendations |
| **Eager Loading Suggestions** | Recommend includes/joins | `internal/plugins/rails/recommendations.go` | Part of recommendations |
| **Pattern Ignoring** | Ignore known query patterns | `app.go` | `IgnoreQueryPattern()` |
| **Query Plan Comparison** | Compare original vs optimized plans | `app.go` | `CompareQueryPlans()` |

### Query Metrics

| Metric | Tracked | Displayed |
|--------|---------|-----------|
| **Execution Count** | ✅ | Query groups |
| **Average Duration** | ✅ | Query statistics |
| **Max Duration** | ✅ | Query statistics |
| **Total Duration** | ✅ | Query statistics |
| **Query Type Distribution** | ✅ | Pie chart |
| **N+1 Severity** | ✅ | High/Medium/Low |

### UI Components

| Component | Location | Description |
|-----------|----------|-------------|
| **QueryAnalysis Screen** | `frontend/src/components/screens/QueryAnalysis/` | Full analysis dashboard |
| **N1Detection** | `QueryAnalysis/components/N1Detection/` | N+1 query warnings |
| **Recommendations** | `QueryAnalysis/components/Recommendations/` | Optimization suggestions |
| **Visualizations** | `QueryAnalysis/components/Visualizations/` | Charts and graphs |
| **Actions** | `QueryAnalysis/components/Actions/` | Query actions (ignore, compare) |

### State Management

| Store | File | Purpose |
|-------|------|---------|
| **Query Store** | `frontend/src/stores/queryStore.ts` | Query analysis state |

---

## SSH Management

Professional SSH connection management with Termius-like features.

### Core Features

| Feature | Description | Implementation Files | API Methods |
|---------|-------------|---------------------|-------------|
| **Server Profiles** | Save and manage SSH servers | `internal/core/ssh/manager.go` | `GetSSHServers()`, `SaveSSHServer()` |
| **One-Click Connect** | Quick connection to saved servers | `internal/core/ssh/manager.go` | `ConnectSSH()` |
| **SSH Agent Support** | Use system SSH agent (primary auth) | `internal/core/ssh/agent.go` | `GetSSHAgent()` |
| **Private Key Support** | SSH key file authentication | `internal/core/ssh/agent.go` | `LoadPrivateKey()` |
| **Known Hosts Verification** | Secure host key checking | `internal/core/ssh/agent.go` | `GetKnownHostsCallback()` |
| **MITM Detection** | Detect changed host keys | `internal/core/ssh/agent.go` | Built-in warning |
| **Auto-Retry with Backoff** | Connection retry (configurable) | `internal/core/ssh/session.go` | Built-in (3 retries) |
| **SSH Keepalive** | Prevent connection timeout | `internal/core/ssh/session.go` | `startKeepalive()` |
| **Session Limits** | Max concurrent sessions (5, max 10) | `internal/core/ssh/manager.go` | Enforced at creation |
| **Session Cleanup** | Auto-cleanup stale sessions | `internal/core/ssh/manager.go` | Every 5 minutes |
| **Log Rotation** | Prevent memory leaks (10k entries) | `internal/core/ssh/session.go` | Auto-rotating |
| **Connection Health** | Latency tracking and monitoring | `internal/core/ssh/session.go` | `measureLatency()` |
| **Health Status** | Healthy/Degraded/Unhealthy | `internal/core/ssh/session.go` | Every 10 seconds |
| **Session Export** | Export logs to CSV/plain text | `app.go` | `ExportSSHSession()` |
| **Tab Management** | Browser-like session tabs | Frontend | UI-based |
| **Split Panes** | Tmux-style flexible splits | Frontend | Recursive layout |
| **SSH Tunneling** | Local port forwarding | `internal/core/ssh/tunnel.go` | `CreateLocalTunnel()` |
| **SOCKS5 Proxy** | Dynamic SOCKS5 proxy | `internal/core/ssh/tunnel.go` | `CreateDynamicTunnel()` |
| **Server Tags** | Organize servers by tags | `internal/models/ssh.go` | Model field |
| **Color Coding** | Visual server identification | `internal/models/ssh.go` | Model field |

### Configuration

| Setting | Default | Range | Purpose |
|---------|---------|-------|---------|
| **MaxSessions** | 5 | 1-10 | Concurrent SSH sessions |
| **ConnectionTimeout** | 10s | - | Initial connection timeout |
| **MaxRetries** | 3 | - | Connection retry attempts |
| **RetryBackoff** | 1s | - | Initial retry delay |
| **KeepaliveInterval** | 30s | 0=disable | SSH keepalive frequency |
| **MaxLogEntries** | 10,000 | - | Session log rotation |

### Health Thresholds

| Status | Condition |
|--------|-----------|
| **Healthy** | Avg < 200ms, Current < 500ms |
| **Degraded** | Avg 200-500ms, Current 500-1000ms |
| **Unhealthy** | Avg > 500ms, Current > 1000ms |

### UI Components

| Component | Location | Description |
|-----------|----------|-------------|
| **SSHManager Screen** | `frontend/src/components/screens/SSHManager.tsx` | Main SSH interface |
| **ServerList** | `frontend/src/components/ssh/ServerList.tsx` | Server sidebar with groups |
| **ServerFormDialog** | `frontend/src/components/ssh/ServerFormDialog.tsx` | Add/edit server form |
| **SessionTabs** | `frontend/src/components/ssh/SessionTabs.tsx` | Tab management |
| **SplitViewManager** | `frontend/src/components/ssh/SplitViewManager.tsx` | Flexible pane splits |
| **TerminalPane** | `frontend/src/components/ssh/TerminalPane.tsx` | XTerm terminal wrapper |

### State Management

| Store | File | Purpose |
|-------|------|---------|
| **SSH Store** | `frontend/src/stores/sshStore.ts` | SSH state with Zustand + Immer |

### Security Features

| Feature | Status |
|---------|--------|
| **SSH Agent Forwarding** | ✅ Primary method |
| **Known Hosts Verification** | ✅ Replaces InsecureIgnoreHostKey |
| **MITM Detection** | ✅ Host key change detection |
| **Config File Permissions** | ✅ 0600 (owner read/write only) |
| **No Password Storage** | ✅ Keys + agent only |
| **Session Log Security** | ✅ Memory-only, cleared on disconnect |

---

## Rails Console Integration

Interactive Rails console with PTY support.

### Core Features

| Feature | Description | Implementation Files | API Methods |
|---------|-------------|---------------------|-------------|
| **Rails Console** | Interactive `rails console` | `app.go` | `StartRailsConsole()` |
| **PTY Support** | Full terminal emulation | `app.go` | Uses process manager PTY |
| **Console I/O** | Bidirectional communication | `app.go` | `WriteToRailsConsole()` |
| **Terminal Resize** | Dynamic terminal sizing | `app.go` | `ResizeRailsConsole()` |
| **Status Checking** | Console running status | `app.go` | `IsRailsConsoleRunning()` |
| **Auto-Start** | Start with Rails detection | Plugin system | Framework detection |

### UI Components

| Component | Location | Description |
|-----------|----------|-------------|
| **RailsConsole Screen** | `frontend/src/components/screens/RailsConsole.tsx` | Interactive console UI |
| **Terminal Component** | `frontend/src/components/terminal/` | XTerm integration |

---

## Exception Tracking

Real-time exception monitoring and management.

### Core Features

| Feature | Description | Implementation Files | API Methods |
|---------|-------------|---------------------|-------------|
| **Exception Capture** | Capture and track exceptions | `internal/core/exceptions/tracker.go` | Built-in |
| **Exception List** | View all captured exceptions | `app.go` | `GetExceptions()` |
| **Resolve Exceptions** | Mark exceptions as resolved | `app.go` | `ResolveException()` |
| **Ignore Exceptions** | Ignore specific exceptions | `app.go` | `IgnoreException()` |
| **Clear All** | Clear exception history | `app.go` | `ClearExceptions()` |
| **Stack Traces** | Full stack trace capture | `internal/models/` | Built-in |
| **Timestamp Tracking** | Exception occurrence time | `internal/models/` | Built-in |

### UI Components

| Component | Location | Description |
|-----------|----------|-------------|
| **ExceptionTracking Screen** | `frontend/src/components/screens/ExceptionTracking.tsx` | Exception dashboard |
| **Exception Components** | `frontend/src/components/exceptions/` | Exception list and details |

### State Management

| Store | File | Purpose |
|-------|------|---------|
| **Exception Store** | `frontend/src/stores/exceptionStore.ts` | Exception state |

---

## Metrics & Performance Monitoring

Application performance metrics and monitoring.

### Core Features

| Feature | Description | Implementation Files | API Methods |
|---------|-------------|---------------------|-------------|
| **Metrics Collection** | Track application metrics | `internal/core/metrics/tracker.go` | Built-in |
| **Get Metrics** | Retrieve current metrics | `app.go` | `GetMetrics()` |
| **Reset Metrics** | Clear metric data | `app.go` | `ResetMetrics()` |
| **Time Series** | Historical metric tracking | `internal/core/metrics/tracker.go` | 1-minute intervals |
| **Worker Pool Stats** | Worker pool metrics | `app.go` | `GetWorkerPoolStats()` |

### Tracked Metrics

| Metric | Description |
|--------|-------------|
| **Request Count** | Total requests |
| **Average Response Time** | Avg request duration |
| **Error Rate** | Error percentage |
| **Active Connections** | Current connections |
| **Memory Usage** | Application memory |
| **CPU Usage** | CPU utilization |

### UI Components

| Component | Location | Description |
|-----------|----------|-------------|
| **MetricsDashboard Screen** | `frontend/src/components/screens/MetricsDashboard.tsx` | Metrics visualization |

### State Management

| Store | File | Purpose |
|-------|------|---------|
| **Metrics Store** | `frontend/src/stores/metricsStore.ts` | Metrics state |

---

## Testing Integration

Test framework integration and management.

### Core Features

| Feature | Description | Implementation Files | API Methods |
|---------|-------------|---------------------|-------------|
| **Test Detection** | Detect test framework | `internal/plugins/rails/test.go` | `DetectTestFramework()` |
| **Test Runner** | Execute tests | `app.go` | `GetTestRunner()` |
| **Framework Support** | RSpec, Minitest detection | Rails plugin | Built-in |

### UI Components

| Component | Location | Description |
|-----------|----------|-------------|
| **TestIntegration Screen** | `frontend/src/components/screens/TestIntegration.tsx` | Test management UI |
| **Test Components** | `frontend/src/components/tests/` | Test runner components |

---

## Configuration & Settings

Application configuration and settings management.

### Core Features

| Feature | Description | Implementation Files | API Methods |
|---------|-------------|---------------------|-------------|
| **TOML Configuration** | .caboose.toml config file | `internal/core/config/config.go` | `Load()`, `Save()` |
| **Secure Permissions** | Config file permissions (0600) | `internal/core/config/config.go` | Enforced on save |
| **Process Config** | Process configurations | `internal/core/config/config.go` | `Processes` map |
| **Log Config** | Logging configuration | `internal/core/config/config.go` | `LogConfig` |
| **Database Config** | Database settings | `internal/core/config/config.go` | `DatabaseConfig` |
| **Debug Config** | Debugger settings | `internal/core/config/config.go` | `DebugConfig` |
| **SSH Config** | SSH settings (7 fields) | `internal/core/config/config.go` | `SSHConfig` |
| **Project Detection** | Auto-detect framework | `app.go` | `detectFramework()` |
| **Default Processes** | Auto-add framework processes | `app.go` | `detectAndAddDefaultProcesses()` |

### Configuration Files

| File | Format | Purpose |
|------|--------|---------|
| `.caboose.toml` | TOML | Main configuration |
| `~/.ssh/known_hosts` | SSH | Known SSH hosts |
| `~/.ssh/id_rsa` | SSH | Private key (not stored) |

### UI Components

| Component | Location | Description |
|-----------|----------|-------------|
| **Settings Screen** | `frontend/src/components/screens/Settings.tsx` | Settings management |

### State Management

| Store | File | Purpose |
|-------|------|---------|
| **App Store** | `frontend/src/stores/appStore.ts` | Global app state |

---

## Plugin Architecture

Extensible framework-specific plugin system.

### Core Features

| Feature | Description | Implementation Files |
|---------|-------------|---------------------|
| **Plugin Interface** | Standard plugin contract | `internal/plugin/interface.go` |
| **Plugin Registry** | Plugin registration system | `internal/plugin/registry.go` |
| **Plugin Detector** | Auto-detect frameworks | `internal/plugin/detector.go` |
| **Rails Plugin** | Rails-specific features | `internal/plugins/rails/` |
| **Log Parsing** | Framework-specific log parsing | Plugin interface |
| **Smart Recommendations** | Framework-specific suggestions | Plugin interface |
| **Debug Support** | Framework-specific debugging | Plugin interface |
| **Test Support** | Framework-specific testing | Plugin interface |

### Plugin Capabilities

| Capability | Rails Plugin | Future Plugins |
|------------|--------------|----------------|
| **Framework Detection** | ✅ Gemfile, config/application.rb | Django, Node.js, etc. |
| **Log Parsing** | ✅ Rails log format | Framework-specific |
| **Query Analysis** | ✅ N+1, recommendations | ORM-specific |
| **Console Integration** | ✅ rails console | Framework REPL |
| **Test Integration** | ✅ RSpec, Minitest | Jest, PyTest, etc. |
| **Debug Integration** | ✅ Debug gem detection | Framework-specific |

### Rails Plugin Features

| Feature | File | Description |
|---------|------|-------------|
| **Log Parser** | `rails/parser.go` | Parse Rails logs |
| **Query Analyzer** | `rails/query.go` | N+1 detection, grouping |
| **Recommendations** | `rails/recommendations.go` | Smart optimization tips |
| **Test Detector** | `rails/test.go` | RSpec/Minitest detection |
| **Debug Detector** | `rails/debug.go` | Debug gem detection |

---

## Security Features

Application security and rate limiting.

### Core Features

| Feature | Description | Implementation Files |
|---------|-------------|---------------------|
| **Rate Limiting** | API request rate limiting | `internal/core/security/ratelimit.go` |
| **Input Validation** | SQL injection prevention | `internal/core/security/validation.go` |
| **Config Permissions** | Secure config file (0600) | `internal/core/config/config.go` |
| **SSH Security** | Known hosts, agent forwarding | `internal/core/ssh/agent.go` |
| **MITM Detection** | SSH host key verification | `internal/core/ssh/agent.go` |
| **No Password Storage** | SSH keys + agent only | SSH implementation |

---

## Worker Pool

Background job processing and task management.

### Core Features

| Feature | Description | Implementation Files | API Methods |
|---------|-------------|---------------------|-------------|
| **Worker Pool** | Concurrent task execution | `internal/core/workers/pool.go` | Created with CPU count |
| **Auto-Sizing** | CPU-based worker count | `app.go` | `NewPool(0)` |
| **Pool Stats** | Worker pool metrics | `app.go` | `GetWorkerPoolStats()` |
| **Graceful Shutdown** | 5-second timeout on close | `app.go` | `CloseWithTimeout()` |

---

## UI/UX Features

User interface and experience enhancements.

### Global UI Features

| Feature | Description | Implementation |
|---------|-------------|----------------|
| **Dark Theme** | Glassmorphism dark UI | Global CSS + Tailwind |
| **Responsive Layout** | Adaptive to window size | Flexbox + Grid |
| **Status Bar** | Global status information | `frontend/src/components/layout/StatusBar.tsx` |
| **Sidebar Navigation** | App-wide navigation | `frontend/src/components/layout/Sidebar.tsx` |
| **Command Palette** | Quick actions (Cmd+K) | `frontend/src/components/common/CommandPalette.tsx` |
| **Toast Notifications** | User feedback | Sonner library |
| **Error Boundaries** | Graceful error handling | React error boundaries |
| **Loading States** | Loading indicators | Global spinner |

### SSH UI Features

| Feature | Description | Shortcut |
|---------|-------------|----------|
| **Keyboard Shortcuts** | Full keyboard navigation | Multiple |
| **New Tab** | Create session tab | Cmd/Ctrl+T |
| **Close Tab** | Close active tab | Cmd/Ctrl+W |
| **Switch Tab** | Jump to tab 1-9 | Cmd/Ctrl+1-9 |
| **Toggle Sidebar** | Show/hide server list | Cmd/Ctrl+B |
| **New Server** | Add server dialog | Cmd/Ctrl+N |
| **Shortcuts Help** | Keyboard shortcuts guide | Keyboard icon |
| **Split Panes** | Tmux-style splits | UI buttons |
| **Server Form** | Add/edit server dialog | Modal form |
| **Health Indicators** | Connection health dots | Color-coded |
| **Latency Display** | Current + average latency | Real-time |

### Terminal Components

| Component | Library | Features |
|-----------|---------|----------|
| **XTerminal** | @xterm/xterm | Full terminal emulation |
| **XTerm Addons** | xterm-addon-fit | Auto-fit, web links |

### Component Library

| Component | Source | Usage |
|-----------|--------|-------|
| **Dialog** | @radix-ui/react-dialog | Modals |
| **Button** | Custom + Radix | Actions |
| **Input** | Custom | Forms |
| **Switch** | @radix-ui/react-switch | Toggles |
| **Tooltip** | @radix-ui/react-tooltip | Hints |
| **Tabs** | Custom | Tab navigation |
| **Card** | Custom | Content containers |
| **Badge** | Custom | Labels |
| **Progress** | Custom | Progress bars |

### Icons

| Library | Usage |
|---------|-------|
| **lucide-react** | All UI icons |

---

## State Management

Frontend state architecture using Zustand.

### Stores

| Store | File | Purpose | Middleware |
|-------|------|---------|------------|
| **App Store** | `stores/appStore.ts` | Global app state | Persist |
| **Process Store** | `stores/processStore.ts` | Process management | - |
| **Log Store** | `stores/logStore.ts` | Log entries | - |
| **SSH Store** | `stores/sshStore.ts` | SSH sessions | Persist + Immer |
| **Query Store** | `stores/queryStore.ts` | Query analysis | - |
| **Exception Store** | `stores/exceptionStore.ts` | Exception tracking | - |
| **Health Store** | `stores/healthStore.ts` | Database health | - |
| **Metrics Store** | `stores/metricsStore.ts` | Metrics data | - |

### Middleware

| Middleware | Usage |
|------------|-------|
| **Persist** | LocalStorage persistence |
| **Immer** | Immutable state updates |

---

## Event System

Real-time event communication between Go backend and React frontend.

### Events

| Event | Direction | Data | Purpose |
|-------|-----------|------|---------|
| `process:status` | Backend → Frontend | Process name, status | Process state changes |
| `console:output` | Backend → Frontend | Process name, content | Console output streaming |
| `ssh:output` | Backend → Frontend | Session ID, content | SSH terminal output |
| `ssh:disconnect` | Backend → Frontend | Session ID | SSH disconnection |
| `ssh:health` | Backend → Frontend | Health metrics | Connection health updates |

---

## Technology Stack

### Backend (Go)

| Technology | Purpose | Version |
|------------|---------|---------|
| **Wails** | Desktop framework | v2 |
| **golang.org/x/crypto/ssh** | SSH client | Latest |
| **golang.org/x/crypto/ssh/knownhosts** | SSH security | Latest |
| **github.com/go-sql-driver/mysql** | MySQL driver | Latest |
| **github.com/BurntSushi/toml** | Config parsing | Latest |
| **github.com/google/uuid** | UUID generation | Latest |

### Frontend (React/TypeScript)

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI framework | 18.x |
| **TypeScript** | Type safety | 5.x |
| **Vite** | Build tool | 6.x |
| **Zustand** | State management | Latest |
| **Immer** | Immutable updates | Latest |
| **@xterm/xterm** | Terminal emulator | Latest |
| **@radix-ui** | UI primitives | Latest |
| **lucide-react** | Icons | Latest |
| **recharts** | Charts | Latest |
| **sonner** | Toast notifications | Latest |
| **Tailwind CSS** | Styling | 3.x |

---

## File Structure

### Backend

```
internal/
├── core/
│   ├── config/         # Configuration management
│   ├── database/       # Database management
│   ├── debugger/       # Debug integration
│   ├── exceptions/     # Exception tracking
│   ├── log/           # Log streaming
│   ├── metrics/       # Metrics tracking
│   ├── process/       # Process management
│   ├── security/      # Security features
│   ├── ssh/           # SSH management
│   └── workers/       # Worker pool
├── models/            # Data models
│   ├── log_entry.go
│   ├── process.go
│   ├── query.go
│   ├── recommendation.go
│   └── ssh.go
├── plugin/            # Plugin system
│   ├── detector.go
│   ├── interface.go
│   └── registry.go
└── plugins/
    └── rails/         # Rails plugin
        ├── debug.go
        ├── parser.go
        ├── plugin.go
        ├── query.go
        ├── recommendations.go
        └── test.go
```

### Frontend

```
frontend/src/
├── components/
│   ├── common/        # Shared components
│   ├── database/      # Database UI
│   ├── debug/         # Debug UI
│   ├── editors/       # Code editors
│   ├── exceptions/    # Exception UI
│   ├── layout/        # Layout components
│   ├── logs/          # Log viewer
│   ├── processes/     # Process UI
│   ├── queries/       # Query UI
│   ├── screens/       # Main screens
│   ├── ssh/           # SSH UI
│   ├── terminal/      # Terminal component
│   ├── tests/         # Test UI
│   └── ui/            # UI primitives
├── hooks/             # Custom React hooks
├── lib/               # Utilities
├── stores/            # Zustand stores
├── themes/            # Theme definitions
├── types/             # TypeScript types
└── workers/           # Web workers
```

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **Total Features** | 150+ |
| **Backend Modules** | 12 |
| **Frontend Screens** | 11 |
| **API Methods** | 70+ |
| **UI Components** | 50+ |
| **Zustand Stores** | 8 |
| **Go Packages** | 20+ |
| **TypeScript Files** | 100+ |
| **Keyboard Shortcuts** | 6 |
| **Wails Events** | 5 |

---

**Last Updated:** 2025-12-27
**Documentation Version:** 1.0
