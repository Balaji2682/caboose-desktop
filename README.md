# Caboose Desktop

A native cross-platform desktop application for Rails and frontend development monitoring and debugging, built with **Wails (Go + React)**.

## Overview

Caboose Desktop is the GUI counterpart to the Caboose TUI, providing a polished, consumer-grade desktop experience with advanced features like resizable panels, multiple windows/tabs, visual debugging with source code viewer, and rich data visualizations.

## Technology Stack

- **Backend**: Go (v1.21+)
- **Frontend**: React 18 + TypeScript
- **Framework**: Wails v2
- **UI Libraries**:
  - @tanstack/react-virtual (virtual scrolling)
  - react-resizable-panels (resizable layouts)
  - @monaco-editor/react (code editor)
  - recharts (charts)
  - cmdk (command palette)
  - zustand (state management)

## Features

### Core Capabilities (Replicated from TUI)

1. **Process Management**
   - PTY-based process spawning
   - Auto-restart with exponential backoff
   - Real-time status monitoring
   - Per-process configuration

2. **Log Viewer**
   - Virtual scrolling (10,000+ lines)
   - Syntax highlighting (SQL, HTTP, errors)
   - Real-time streaming
   - Search and filtering
   - Process-based filtering
   - Horizontal scrolling for long lines

3. **Query Analysis**
   - SQL fingerprinting
   - N+1 query detection
   - Request-scoped query grouping
   - Performance metrics
   - Query recommendations

4. **Database Health**
   - Health score (0-100)
   - Slow query tracking (>100ms)
   - Missing index hints
   - SELECT * usage detection
   - Table access statistics

5. **Exception Tracking**
   - Exception grouping by fingerprint
   - Severity classification
   - Backtrace viewing
   - Occurrence tracking
   - Time-based analysis

6. **Test Results**
   - Framework detection (RSpec, Minitest, Test::Unit)
   - Live test run tracking
   - Slow test identification
   - Debugger status (Pry/Byebug/Debug)

7. **Interactive Debugger**
   - DAP protocol integration
   - Breakpoint management
   - Step controls (in, over, out, continue)
   - Variable inspection
   - Call stack navigation

8. **Command Palette**
   - Fuzzy command search
   - Keyboard shortcuts
   - Command history
   - Autocomplete

9. **Theming**
   - 6 built-in themes (Material, Dracula, Nord, Tokyo Night, Solarized, Catppuccin)
   - Runtime theme switching
   - Consistent styling

### Advanced GUI Features (Beyond TUI)

1. **Resizable Panels**
   - Drag-to-resize splitters
   - Minimum panel sizes
   - Collapsible panels
   - Layout persistence

2. **Multiple Windows/Tabs**
   - Tab bar for views
   - Separate debug window
   - Draggable tabs

3. **Visual Debugging**
   - Source code viewer (Monaco Editor)
   - Inline breakpoint toggles
   - Syntax highlighting for Ruby
   - Current line highlighting

4. **Rich Data Visualization**
   - Response time histograms
   - Query duration charts
   - Memory/CPU graphs
   - Health score gauges
   - Trend sparklines

5. **Full Mouse Support**
   - Click navigation
   - Context menus
   - Drag-and-drop
   - Scroll gestures

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Wails Application                         │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ Log Viewer  │ │Query Panel  │ │Debug Panel  │               │
│  │ (Virtual)   │ │(Charts)     │ │(Monaco)     │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│                     Wails Bindings                               │
│  Backend (Go)                                                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │Process Mgr  │ │Log Parser   │ │Query Analyzer│              │
│  │(PTY)        │ │(Rails)      │ │(N+1)         │              │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Development

- **Go**: 1.21 or later
- **Node.js**: 18 or later
- **Wails CLI**: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

### Platform-Specific

**Windows:**
- WebView2 runtime (auto-installs on Windows 10/11)

**macOS:**
- Xcode Command Line Tools
- WKWebView (built into macOS)

**Linux:**
- WebKitGTK (Ubuntu/Debian: `sudo apt install libwebkit2gtk-4.0-dev`)

## Project Structure

```
caboose-desktop/
├── main.go                 # Wails app entry point
├── app.go                  # Main app struct with bindings
├── internal/
│   ├── process/            # PTY process management
│   │   └── manager.go
│   ├── parser/             # Rails log parsing
│   │   └── rails.go
│   ├── query/              # SQL fingerprinting, N+1 detection
│   │   └── analyzer.go
│   ├── debugger/           # DAP protocol client
│   │   └── dap.go
│   ├── exception/          # Exception tracking
│   │   └── tracker.go
│   ├── config/             # TOML config management
│   │   └── config.go
│   └── git/                # Git status
│       └── info.go
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── logs/
│   │   │   ├── queries/
│   │   │   ├── debug/
│   │   │   ├── exceptions/
│   │   │   └── common/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── themes/
│   └── package.json
├── wails.json
├── go.mod
├── README.md
└── TODO.md
```

## Getting Started

### Installation

1. **Install Wails CLI:**
   ```bash
   go install github.com/wailsapp/wails/v2/cmd/wails@latest
   ```

2. **Clone the repository:**
   ```bash
   cd /home/balaji/workspace/personal/dev-tool/caboose-desktop
   ```

3. **Install dependencies:**
   ```bash
   # Go dependencies
   go mod download

   # Frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

### Development

```bash
# Run in development mode with hot reload
wails dev

# Build for production
wails build

# Build for specific platform
wails build -platform darwin/amd64   # macOS Intel
wails build -platform darwin/arm64   # macOS Apple Silicon
wails build -platform windows/amd64  # Windows
wails build -platform linux/amd64    # Linux
```

### Configuration

Caboose Desktop uses the same configuration format as Caboose TUI:

**`.caboose.toml`:**
```toml
[frontend]
path = "frontend"
dev_command = "npm run dev"
port = 5173

[rails]
port = 3000

[processes.web]
command = "bundle exec rails server -p 3000"
env = { RAILS_ENV = "development" }
auto_restart = true
debug_enabled = true
debug_port = 12345

[processes.worker]
command = "bundle exec sidekiq"
env = { RAILS_ENV = "development" }
```

## Go Backend API

### Exposed Methods

```go
// Process Management
GetProcesses() []ProcessInfo
StartProcess(name string) error
StopProcess(name string) error
RestartProcess(name string) error

// Log Management
GetLogs(filter LogFilter) []LogLine
ClearLogs() error
ExportLogs(path string) error

// Query Analysis
GetQueryAnalysis() QueryAnalysisResult
GetRequestDetails(id string) RequestDetail

// Debugging
ConnectDebugger(port int) error
SetBreakpoint(file string, line int) error
StepOver() error
StepInto() error
Continue() error
GetVariables() []Variable
```

### Events (Go → Frontend)

```go
runtime.EventsEmit(ctx, "log:new", logLine)
runtime.EventsEmit(ctx, "process:update", processInfo)
runtime.EventsEmit(ctx, "debugger:stopped", stopEvent)
runtime.EventsEmit(ctx, "exception:new", exception)
```

## Frontend Components

### Key Components

- **LogViewer.tsx**: Virtual scrolling log viewer with syntax highlighting
- **ProcessSidebar.tsx**: Process list with status indicators
- **QueryAnalysis.tsx**: Request list with N+1 warnings
- **QueryChart.tsx**: Duration histograms and visualizations
- **DebugPanel.tsx**: Debugging interface with source viewer
- **SourceViewer.tsx**: Monaco Editor integration
- **ExceptionTracker.tsx**: Exception list with grouping
- **CommandPalette.tsx**: Command palette with fuzzy search

### State Management

Uses Zustand for lightweight global state:

```typescript
interface AppStore {
  theme: Theme;
  logs: LogLine[];
  processes: ProcessInfo[];
  selectedView: ViewMode;
  // ...
}
```

## Implementation Timeline

**Phase 1**: Project Setup & Core Infrastructure (Week 1-2)
**Phase 2**: Log Viewer & Process Panel (Week 2-3)
**Phase 3**: Query Analysis & Database Health (Week 3-4)
**Phase 4**: Exception & Test Tracking (Week 4-5)
**Phase 5**: Debug Panel with Source Viewer (Week 5-6)
**Phase 6**: Command Palette & Themes (Week 6-7)
**Phase 7**: Polish & Platform Optimization (Week 7-8)

See [TODO.md](./TODO.md) for detailed task tracking.

## Platform-Specific Notes

### Windows

- Uses WebView2 (Edge-based) - ships with Windows 11, auto-installs on Windows 10
- Bundle includes WebView2 bootstrapper
- PTY via `creack/pty` uses ConPTY on Windows 10+

### macOS

- Uses WKWebView (built into macOS)
- Native menu bar integration available
- Code signing required for distribution
- Universal binary support (Intel + Apple Silicon)

### Linux

- Uses WebKitGTK
- Requires `libwebkit2gtk-4.0-dev` on Debian/Ubuntu
- AppImage or Flatpak for distribution
- Supports all major distros

## Performance Targets

1. **Log Viewer**: Handle 10,000+ lines at 60fps
2. **Bundle Size**: Under 20MB total
3. **Startup Time**: Under 1 second cold start
4. **Memory Usage**: Under 200MB baseline
5. **CPU Usage**: <5% idle, <20% under load

## Contributing

This is a companion project to [Caboose TUI](../caboose). Both projects share similar architecture and can reference each other's implementations.

**Porting Guidelines:**
- Reference Rust implementation in `../caboose/src/`
- Maintain API parity where possible
- Document differences in behavior
- Keep Go idiomatic (don't translate Rust patterns directly)

## Relationship to Caboose TUI

Caboose Desktop is a **separate project** that shares concepts with the TUI but has independent implementations:

- **TUI**: Terminal-based, Rust + Ratatui, keyboard-only, ASCII art
- **Desktop**: Native GUI, Go + React, mouse + keyboard, rich visualizations

Both projects:
- Use same `.caboose.toml` configuration format
- Support same features (processes, logs, queries, debugging)
- Can be used interchangeably on the same projects

## License

Same as Caboose TUI (check parent project for license)

## Support

For questions or issues:
- Check the [TODO.md](./TODO.md) for current development status
- Reference the TUI implementation: `../caboose/`
- Review Wails documentation: https://wails.io
