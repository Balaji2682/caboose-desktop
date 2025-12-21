# Caboose Desktop - Sprint-Level Development Plan

**Strategy**: Rails-First with Multi-Framework Architecture

**Philosophy**: Build for Rails now, design for multiple frameworks later. Every component should have clear separation between framework-agnostic core and framework-specific plugins.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Caboose Desktop                           │
├─────────────────────────────────────────────────────────────┤
│  Framework-Agnostic Core (Go Backend)                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ Process Mgmt │ │ Log Streamer │ │ DAP Client   │         │
│  │ (PTY/Plain)  │ │ (Generic)    │ │ (Protocol)   │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  Plugin Interface Layer                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ type FrameworkPlugin interface {                       │ │
│  │   Detect() bool                                        │ │
│  │   ParseLog(line) LogEntry                             │ │
│  │   AnalyzeQuery(sql) QueryAnalysis                     │ │
│  │   GetDebugConfig() DebugConfig                        │ │
│  │   GetTestRunner() TestRunner                          │ │
│  │ }                                                      │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Framework Plugins (Implemented as needed)                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Rails   │ │ Django  │ │ Laravel │ │ FastAPI │           │
│  │ Plugin  │ │ Plugin  │ │ Plugin  │ │ Plugin  │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│     (v1.0)     (v2.0)      (v2.0)      (v2.1)              │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (React Frontend - Framework Agnostic)              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ Log Viewer   │ │ Query Panel  │ │ Debug Panel  │         │
│  │ (Virtual)    │ │ (Charts)     │ │ (Monaco)     │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
caboose-desktop/
├── main.go                      # Wails entry point
├── app.go                       # Main app with Wails bindings
├── internal/
│   ├── core/                    # Framework-agnostic core
│   │   ├── process/             # Process management (PTY)
│   │   │   ├── manager.go
│   │   │   └── pty.go
│   │   ├── log/                 # Generic log streaming
│   │   │   └── streamer.go
│   │   ├── debugger/            # DAP protocol client
│   │   │   └── dap.go
│   │   └── config/              # Config management
│   │       └── config.go
│   ├── plugin/                  # Plugin system
│   │   ├── interface.go         # Plugin interface definition
│   │   ├── registry.go          # Plugin registration
│   │   └── detector.go          # Auto-detect framework
│   ├── plugins/                 # Framework implementations
│   │   ├── rails/               # Rails plugin (v1.0)
│   │   │   ├── plugin.go
│   │   │   ├── parser.go        # Rails log parser
│   │   │   ├── query.go         # ActiveRecord analyzer
│   │   │   ├── test.go          # RSpec/Minitest
│   │   │   └── debug.go         # ruby-debug-ide config
│   │   ├── django/              # Django plugin (v2.0)
│   │   ├── laravel/             # Laravel plugin (v2.0)
│   │   └── fastapi/             # FastAPI plugin (v2.1)
│   └── models/                  # Shared data models
│       ├── log_entry.go
│       ├── query.go
│       └── process.go
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── logs/            # Log viewer (framework-agnostic)
│   │   │   ├── queries/         # Query analysis (framework-agnostic)
│   │   │   ├── debug/           # Debug panel (framework-agnostic)
│   │   │   └── processes/       # Process sidebar
│   │   ├── stores/              # Zustand state management
│   │   └── themes/              # Theme system
│   └── package.json
├── wails.json
├── go.mod
├── README.md
└── TODO.md                      # This file
```

---

## Sprint 0: Project Setup & Plugin Architecture (Week 1-2)

**Goal**: Establish Wails project, define plugin interface, set up development environment

### Tasks

#### Project Initialization
- [ ] Install Wails CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)
- [ ] Create new Wails project (`wails init -n caboose-desktop -t react-ts`)
- [ ] Initialize Go modules (`go mod init github.com/yourusername/caboose-desktop`)
- [ ] Set up frontend dependencies (React 18, TypeScript, Vite)
- [ ] Configure wails.json for development and builds
- [ ] Create .gitignore (Go, Node, IDE files)
- [ ] Initialize git repository

#### Plugin Interface Design
- [ ] Create `internal/plugin/interface.go` with FrameworkPlugin interface
- [ ] Create `internal/plugin/registry.go` for plugin registration
- [ ] Create `internal/plugin/detector.go` for auto-detection logic
- [ ] Design data models in `internal/models/` (LogEntry, Query, Process, etc.)

#### Core Infrastructure
- [ ] Create `internal/core/config/` for .caboose.toml parsing
- [ ] Add framework field to config schema
- [ ] Set up error handling patterns
- [ ] Create logging infrastructure (structured logging)
- [ ] Set up CI/CD skeleton (GitHub Actions)

#### Documentation
- [ ] Write ARCHITECTURE.md explaining plugin system
- [ ] Document plugin interface contract
- [ ] Create plugin development guide template
- [ ] Update README.md with multi-framework vision

**Deliverables:**
- Working Wails project structure
- Plugin interface defined and documented
- Config system with framework detection
- Development environment ready

---

## Sprint 1: Core Process Management (Week 3-4)

**Goal**: Build framework-agnostic process manager with PTY support

### Tasks

#### Process Manager Core
- [ ] Create `internal/core/process/manager.go`
- [ ] Implement PTY-based process spawning (use `github.com/creack/pty`)
- [ ] Support both PTY and plain process spawning
- [ ] Process lifecycle management (start, stop, restart)
- [ ] Process status tracking (running, crashed, stopped, starting)
- [ ] Auto-restart with exponential backoff
- [ ] Graceful shutdown (SIGTERM, then SIGKILL after timeout)
- [ ] Process exit code handling and logging

#### Configuration Integration
- [ ] Parse `.caboose.toml` process configuration
- [ ] Support `[processes.NAME]` sections
- [ ] Environment variable injection per process
- [ ] Working directory support per process
- [ ] Auto-restart configuration per process

#### Wails Bindings
- [ ] Create `app.go` with Wails-bound methods
- [ ] Expose `GetProcesses()` method to frontend
- [ ] Expose `StartProcess(name string)` method
- [ ] Expose `StopProcess(name string)` method
- [ ] Expose `RestartProcess(name string)` method
- [ ] Set up event emission (runtime.EventsEmit)
- [ ] Emit process status updates to frontend

#### Testing
- [ ] Unit tests for process manager
- [ ] Test PTY spawning
- [ ] Test process restart logic
- [ ] Test graceful shutdown
- [ ] Integration test with sample process

**Deliverables:**
- Framework-agnostic process manager working
- Wails bindings exposing process control to frontend
- Processes can be started/stopped/restarted
- Auto-restart functional

---

## Sprint 2: Log Streaming & Viewer (Week 5-6)

**Goal**: Generic log streaming with real-time updates to UI

### Tasks

#### Log Streaming Backend
- [ ] Create `internal/core/log/streamer.go`
- [ ] Capture stdout/stderr from PTY processes
- [ ] Buffer log lines (configurable buffer size, e.g., 10000 lines)
- [ ] Thread-safe log storage with ring buffer
- [ ] Support filtering by process name
- [ ] Timestamp each log line
- [ ] Emit log events to frontend (runtime.EventsEmit)

#### Wails API
- [ ] Expose `GetLogs(filter LogFilter)` method
- [ ] Expose `ClearLogs()` method
- [ ] Expose `ExportLogs(path string)` method
- [ ] Stream new logs via events (`log:new`)

#### Frontend Log Viewer
- [ ] Create `frontend/src/components/logs/LogViewer.tsx`
- [ ] Implement virtual scrolling (@tanstack/react-virtual)
- [ ] Display timestamps (toggleable absolute/relative)
- [ ] Color-code by process (assign colors to each process)
- [ ] Auto-scroll to bottom (with pause on user scroll)
- [ ] Horizontal scrolling for long lines
- [ ] Basic search/filter UI (filter by process, search text)

#### Store Setup
- [ ] Create Zustand store for logs
- [ ] Listen to `log:new` events from backend
- [ ] Manage log buffer in frontend (sync with backend)
- [ ] Store scroll position and auto-scroll state

**Deliverables:**
- Real-time log streaming from backend to frontend
- Virtual scrolling log viewer handling 10K+ lines
- Process-based filtering working
- Search and export functional

---

## Sprint 3: Rails Plugin - Log Parser (Week 7-8)

**Goal**: Implement Rails plugin with intelligent log parsing

### Tasks

#### Rails Plugin Foundation
- [ ] Create `internal/plugins/rails/plugin.go` implementing FrameworkPlugin
- [ ] Implement `Detect()` - check for Gemfile, config/application.rb
- [ ] Register Rails plugin in plugin registry
- [ ] Create Rails-specific config in .caboose.toml

#### Rails Log Parser
- [ ] Create `internal/plugins/rails/parser.go`
- [ ] Parse Rails request logs (Started GET "/path", Processing by Controller#action)
- [ ] Extract HTTP method, path, controller, action
- [ ] Parse response status and duration
- [ ] Extract SQL query logs with duration
- [ ] Parse ActiveRecord query format
- [ ] Detect exception logs and stack traces
- [ ] Parse view rendering logs
- [ ] Support both development and production log formats

#### Log Entry Enhancement
- [ ] Extend models.LogEntry with Rails-specific fields
- [ ] Add RequestID tracking for grouping related logs
- [ ] Add SQL queries array per request
- [ ] Add controller/action metadata
- [ ] Add response time, status code

#### Framework Detection Integration
- [ ] Wire Rails plugin into detector.go
- [ ] Auto-enable Rails plugin when detected
- [ ] Load Rails plugin at startup if configured
- [ ] Fall back to generic log parsing if no plugin matches

#### Testing
- [ ] Unit tests for Rails log parser
- [ ] Test various Rails log formats (Rails 6, 7)
- [ ] Test structured logging (JSON logs)
- [ ] Integration test with sample Rails app
- [ ] Reference TUI implementation in `../caboose/src/parser/`

**Deliverables:**
- Rails plugin fully integrated
- Rails log parsing working for requests, SQL, exceptions
- Framework auto-detection functional
- Logs enriched with Rails-specific metadata

---

## Sprint 4: Frontend UI & Process Sidebar (Week 9-10)

**Goal**: Build process sidebar and basic UI layout

### Tasks

#### Layout Components
- [ ] Create `frontend/src/components/layout/MainLayout.tsx`
- [ ] Implement resizable panels (react-resizable-panels)
- [ ] Left sidebar: Process list
- [ ] Main area: Log viewer (from Sprint 2)
- [ ] Status bar at bottom
- [ ] Save/restore panel sizes to localStorage

#### Process Sidebar
- [ ] Create `frontend/src/components/processes/ProcessSidebar.tsx`
- [ ] Display process list with status indicators
- [ ] Color-coded status (green=running, red=crashed, gray=stopped)
- [ ] Show process uptime
- [ ] Buttons: Start, Stop, Restart per process
- [ ] Highlight selected process
- [ ] Click to filter logs by process

#### Process Store
- [ ] Create Zustand store for processes
- [ ] Listen to `process:update` events from backend
- [ ] Store process status, uptime, metadata
- [ ] Track selected process for filtering

#### Theme System
- [ ] Create `frontend/src/themes/` directory
- [ ] Implement base theme interface
- [ ] Add default dark theme (Material Dark)
- [ ] Add theme switching logic
- [ ] Store theme preference in localStorage

#### Status Bar
- [ ] Create `frontend/src/components/layout/StatusBar.tsx`
- [ ] Display total processes, running count
- [ ] Show selected framework (Rails)
- [ ] Display keyboard shortcuts hint
- [ ] Show Git branch (placeholder for now)

**Deliverables:**
- Complete UI layout with resizable panels
- Process sidebar with start/stop/restart controls
- Theme system with dark theme
- Status bar showing app state

---

## Sprint 5: Rails Query Analysis & N+1 Detection (Week 11-12)

**Goal**: Implement query analysis with N+1 detection for Rails

### Tasks

#### Query Analyzer Core
- [ ] Create `internal/plugins/rails/query.go`
- [ ] Implement SQL fingerprinting (normalize parameters)
- [ ] Group queries by request ID
- [ ] Track query execution time
- [ ] Count total queries per request
- [ ] Calculate total query time per request

#### N+1 Detection Algorithm
- [ ] Detect repeated query patterns within same request
- [ ] Identify queries inside loops (same fingerprint, multiple executions)
- [ ] Calculate confidence score (avoid false positives)
- [ ] Generate N+1 warnings with locations
- [ ] Suggest fixes (includes, preload, eager_load)
- [ ] Reference Rust implementation in `../caboose/src/query/`

#### Query Data Models
- [ ] Extend models to include Query, QueryAnalysis
- [ ] Add request-scoped query grouping
- [ ] Store query fingerprints
- [ ] Track duplicate query counts
- [ ] Store N+1 warnings per request

#### Wails API
- [ ] Expose `GetQueryAnalysis()` method
- [ ] Expose `GetRequestDetails(requestID string)` method
- [ ] Emit query analysis events to frontend

#### Testing
- [ ] Unit tests for SQL fingerprinting
- [ ] Test N+1 detection with sample queries
- [ ] Test query grouping by request
- [ ] Integration test with Rails sample app
- [ ] Validate against known N+1 scenarios

**Deliverables:**
- Query fingerprinting working
- N+1 detection functional with low false positives
- Request-scoped query analysis
- API methods exposing query data to frontend

---

## Sprint 6: Query Analysis UI (Week 13-14)

**Goal**: Build query analysis panel with visualizations

### Tasks

#### Query Panel Component
- [ ] Create `frontend/src/components/queries/QueryPanel.tsx`
- [ ] Display list of requests with query metrics
- [ ] Show total queries, total time, N+1 warnings per request
- [ ] Color-code requests (green <5 queries, yellow 5-20, red >20)
- [ ] Click request to see query details

#### Query Detail View
- [ ] Create `frontend/src/components/queries/QueryDetail.tsx`
- [ ] Display all queries for selected request
- [ ] Show SQL with syntax highlighting
- [ ] Display execution time per query
- [ ] Highlight duplicate queries
- [ ] Show N+1 warnings with suggestions
- [ ] Display query fingerprints

#### Query Visualization
- [ ] Create `frontend/src/components/queries/QueryChart.tsx`
- [ ] Request timeline showing query execution
- [ ] Bar chart: queries per request
- [ ] Histogram: query duration distribution
- [ ] Use recharts for visualizations

#### Query Store
- [ ] Create Zustand store for query analysis
- [ ] Load query data from backend
- [ ] Track selected request
- [ ] Store N+1 warnings

#### UI Integration
- [ ] Add query panel to main layout (new tab or panel)
- [ ] Add keyboard shortcut to switch to queries view
- [ ] Add query count to status bar
- [ ] Show N+1 warning badge in UI

**Deliverables:**
- Query analysis panel fully functional
- Request list with metrics
- Query detail view with SQL highlighting
- N+1 warnings prominently displayed
- Visual charts for query analysis

---

## Sprint 7: Exception Tracking (Week 15-16)

**Goal**: Track and display exceptions from Rails logs

### Tasks

#### Exception Parser
- [ ] Extend Rails parser to detect exceptions
- [ ] Parse exception type and message
- [ ] Extract stack trace from logs
- [ ] Group exceptions by fingerprint (class + location)
- [ ] Track first and last occurrence
- [ ] Count occurrences per exception

#### Exception Models
- [ ] Create models for Exception, StackFrame
- [ ] Store exception metadata (type, message, trace)
- [ ] Group similar exceptions
- [ ] Track exception severity (error, fatal)

#### Backend API
- [ ] Create `internal/core/exception/tracker.go`
- [ ] Expose `GetExceptions()` method
- [ ] Expose `GetExceptionDetail(id string)` method
- [ ] Emit `exception:new` events to frontend

#### Exception UI
- [ ] Create `frontend/src/components/exceptions/ExceptionList.tsx`
- [ ] Display exception list sorted by frequency
- [ ] Show exception type, message, count
- [ ] Click to see full stack trace
- [ ] Create `frontend/src/components/exceptions/ExceptionDetail.tsx`
- [ ] Display full stack trace with file:line links
- [ ] Show request context where exception occurred

#### Store Integration
- [ ] Create Zustand store for exceptions
- [ ] Listen to `exception:new` events
- [ ] Track exception counts
- [ ] Store exception details

**Deliverables:**
- Exception tracking working from Rails logs
- Exception list with grouping and frequency
- Exception detail view with stack traces
- Real-time exception notifications

---

## Sprint 8: Test Integration & DAP Debugger (Week 17-18)

**Goal**: Integrate Rails test frameworks and DAP debugging

### Tasks

#### Test Runner Detection
- [ ] Create `internal/plugins/rails/test.go`
- [ ] Detect RSpec (check for spec/ directory, .rspec file)
- [ ] Detect Minitest (check for test/ directory)
- [ ] Parse test output from logs
- [ ] Track test run status (running, passed, failed)
- [ ] Count total tests, passed, failed
- [ ] Identify slow tests (>1s)

#### Test UI
- [ ] Create `frontend/src/components/tests/TestPanel.tsx`
- [ ] Display test run status
- [ ] Show passed/failed counts
- [ ] List failed tests with error messages
- [ ] Show slow tests with duration
- [ ] Add re-run button for failed tests

#### DAP Debugger Integration
- [ ] Create `internal/core/debugger/dap.go`
- [ ] Implement DAP protocol client
- [ ] Support connecting to debug-ide (Ruby debugger)
- [ ] Breakpoint management (set, remove, list)
- [ ] Step controls (step in, step over, step out, continue)
- [ ] Variable inspection
- [ ] Call stack navigation

#### Debug Panel UI
- [ ] Create `frontend/src/components/debug/DebugPanel.tsx`
- [ ] Integrate Monaco Editor for source viewing
- [ ] Show current file with line highlighting
- [ ] Breakpoint toggles in gutter
- [ ] Variable inspection panel
- [ ] Call stack panel
- [ ] Step control buttons

#### Rails Debug Configuration
- [ ] Create `internal/plugins/rails/debug.go`
- [ ] Configure debug-ide connection
- [ ] Set up debugger port (default 12345)
- [ ] Auto-detect if debugger is running
- [ ] Document Rails debugging setup in README

**Deliverables:**
- Test framework detection working
- Test results displayed in UI
- DAP debugger client functional
- Debug panel with Monaco Editor
- Rails debugging working end-to-end

---

## Sprint 9: Database Health & Command Palette (Week 19-20)

**Goal**: Add database health monitoring and command palette

### Tasks

#### Database Health
- [ ] Create `internal/core/database/health.go`
- [ ] Calculate health score (0-100) based on metrics
- [ ] Detect slow queries (>100ms threshold)
- [ ] Track SELECT * usage
- [ ] Detect missing indexes on foreign keys
- [ ] Count total queries, slow queries
- [ ] Generate recommendations

#### Health Dashboard
- [ ] Create `frontend/src/components/database/HealthDashboard.tsx`
- [ ] Display health score with gauge visualization
- [ ] Show slow query list
- [ ] Display recommendations
- [ ] Show database statistics
- [ ] Color-code health (green >80, yellow 50-80, red <50)

#### Command Palette
- [ ] Create `frontend/src/components/common/CommandPalette.tsx`
- [ ] Use cmdk library
- [ ] Implement fuzzy search
- [ ] Add commands: Switch view, restart process, clear logs, etc.
- [ ] Keyboard shortcut (Cmd/Ctrl + K)
- [ ] Show recent commands
- [ ] Command history

#### Additional Themes
- [ ] Add Tokyo Night theme
- [ ] Add Dracula theme
- [ ] Add Nord theme
- [ ] Add Solarized theme
- [ ] Add Catppuccin theme
- [ ] Add theme picker to settings

**Deliverables:**
- Database health monitoring functional
- Health dashboard with recommendations
- Command palette with fuzzy search
- 6 themes available
- Theme switching working

---

## Sprint 10: Polish & MVP Release (Week 21-22)

**Goal**: Performance optimization, documentation, and v1.0 release

### Tasks

#### Performance Optimization
- [ ] Profile application (CPU, memory)
- [ ] Optimize log buffer (circular buffer, limit growth)
- [ ] Optimize frontend rendering (React.memo, useMemo)
- [ ] Reduce bundle size (code splitting, tree shaking)
- [ ] Test with 10,000+ log lines
- [ ] Ensure startup time <1s
- [ ] Ensure memory usage <200MB baseline

#### Documentation
- [ ] Complete README.md with setup instructions
- [ ] Write user guide (docs/USER_GUIDE.md)
- [ ] Document .caboose.toml configuration
- [ ] Create Rails setup guide
- [ ] Add screenshots to README
- [ ] Write CONTRIBUTING.md
- [ ] Document plugin API for future frameworks

#### Testing & QA
- [ ] Comprehensive integration tests
- [ ] Test on macOS (Intel + Apple Silicon)
- [ ] Test on Linux (Ubuntu, Fedora)
- [ ] Test on Windows WSL2
- [ ] Fix critical bugs
- [ ] User acceptance testing

#### Build & Release
- [ ] Set up Wails build for all platforms
- [ ] Create installers (dmg for macOS, AppImage for Linux, exe for Windows)
- [ ] Set up GitHub releases
- [ ] Tag v1.0.0
- [ ] Publish release notes
- [ ] Share on Reddit, Twitter, Hacker News

**Deliverables:**
- v1.0 MVP Released
- Fully functional for Rails development
- Documentation complete
- Multi-platform builds available
- Performance targets met

---

## Future Sprints (Post-MVP)

### Sprint 11: Django Plugin (Week 23-25)

**Goal**: Add Django framework support

#### Tasks
- [ ] Create `internal/plugins/django/` directory
- [ ] Implement Django plugin (detect manage.py, settings.py)
- [ ] Parse Django log format
- [ ] Parse Django ORM query logs (DEBUG=True)
- [ ] Implement N+1 detection for Django ORM
- [ ] Detect select_related/prefetch_related opportunities
- [ ] Support pytest integration
- [ ] Configure Python DAP (debugpy)
- [ ] Test with sample Django app
- [ ] Update README with Django support

**Deliverables:**
- Django plugin fully functional
- All core features working with Django
- Documentation updated

---

### Sprint 12: Laravel Plugin (Week 26-28)

**Goal**: Add Laravel framework support

#### Tasks
- [ ] Create `internal/plugins/laravel/` directory
- [ ] Implement Laravel plugin (detect composer.json, artisan)
- [ ] Parse Laravel log format (Monolog)
- [ ] Parse Eloquent query logs
- [ ] Implement N+1 detection for Eloquent
- [ ] Detect missing eager loading
- [ ] Support PHPUnit integration
- [ ] Configure Xdebug DAP
- [ ] Test with sample Laravel app
- [ ] Update README with Laravel support

**Deliverables:**
- Laravel plugin fully functional
- All core features working with Laravel
- Documentation updated

---

### Sprint 13: FastAPI Plugin (Week 29-30)

**Goal**: Add FastAPI framework support

#### Tasks
- [ ] Create `internal/plugins/fastapi/` directory
- [ ] Implement FastAPI plugin (detect requirements.txt, main.py)
- [ ] Parse Uvicorn log format
- [ ] Parse SQLAlchemy query logs
- [ ] Support async query detection
- [ ] Implement pytest integration
- [ ] Configure Python DAP (reuse from Django)
- [ ] Test with sample FastAPI app
- [ ] Update README with FastAPI support

**Deliverables:**
- FastAPI plugin fully functional
- Async query handling working
- Documentation updated

---

### Sprint 14+: Additional Frameworks & Features

**Future Framework Support:**
- [ ] NestJS plugin (TypeORM, Node.js DAP)
- [ ] Next.js plugin (API routes, Prisma support)
- [ ] Express.js plugin (generic Node.js)
- [ ] Phoenix plugin (Ecto, Elixir)

**Advanced Features:**
- [ ] Git integration (branch display, commit info)
- [ ] Multiple window/tab support
- [ ] Export capabilities (PDF reports, CSV data)
- [ ] Performance baselines per git commit
- [ ] Trend analysis and regression detection
- [ ] Plugin marketplace for community plugins

---

## Development Workflow

### Daily Development
```bash
# Development mode with hot reload
wails dev

# Run tests
go test ./...

# Frontend tests
cd frontend && npm test

# Lint
golangci-lint run
cd frontend && npm run lint
```

### Building
```bash
# Build for current platform
wails build

# Build for specific platform
wails build -platform darwin/amd64
wails build -platform darwin/arm64
wails build -platform linux/amd64
wails build -platform windows/amd64
```

---

## Success Criteria

### v1.0 (Rails MVP)
- ✅ Process management working
- ✅ Real-time log viewer (10K+ lines)
- ✅ Rails log parsing
- ✅ Query analysis with N+1 detection
- ✅ Exception tracking
- ✅ Test integration (RSpec/Minitest)
- ✅ DAP debugging
- ✅ Database health monitoring
- ✅ <1s startup time
- ✅ <200MB memory usage
- ✅ Multi-platform builds

### v2.0 (Multi-Framework)
- ✅ Django support
- ✅ Laravel support
- ✅ FastAPI support
- ✅ Framework auto-detection >95% accurate
- ✅ 5+ frameworks fully supported

---

## Notes

**Architecture Philosophy:**
- Write shared code first, framework-specific second
- Every Rails feature should inform the plugin interface
- Design for 10 frameworks, build for 1 at a time
- Test plugin abstraction early and often

**Reference Implementation:**
- Use `../caboose/` (Rust TUI) as reference for algorithms
- Reuse SQL fingerprinting logic
- Adapt N+1 detection patterns
- Leverage existing log parsing knowledge

**Plugin Development:**
- Each plugin should be <500 lines
- Shared code in `internal/core/`
- Framework-specific in `internal/plugins/{framework}/`
- Clear separation enables easy maintenance

---

*Last Updated: 2025-12-21*
*Sprint Plan Version: 1.0*
*Current Focus: Rails-first implementation with multi-framework architecture*
