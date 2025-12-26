# Caboose Desktop

A powerful, all-in-one development toolkit for Rails and web applications. Built with Wails (Go + React).

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go Version](https://img.shields.io/badge/go-1.21%2B-blue.svg)
![Node Version](https://img.shields.io/badge/node-18%2B-green.svg)

---

## ✨ Features

### 🔧 Process Management
- Start/stop/restart Rails servers, Sidekiq, and custom processes
- Real-time log streaming with syntax highlighting
- Auto-restart on crashes
- PTY support for interactive processes

### 🗄️ Database Tools
- Visual query console with syntax highlighting
- Real-time query analysis and N+1 detection
- Database health monitoring
- EXPLAIN plan visualization
- Connection pooling insights

### 🌿 Git Integration (IntelliJ-like)
- **Side-by-side diff viewer** with full file context
- **Change navigation** - Jump between changes (Ctrl+↑/↓)
- **File navigation** - Navigate between modified files (Alt+←/→)
- **Git blame** with author annotations
- **3-way conflict resolver** for merge conflicts
- Commit dialog with staging/unstaging
- Branch management

### 🖥️ SSH Management
- Save SSH server configurations
- One-click connections with SSH agent support
- Terminal emulation with full PTY support
- SSH tunneling (local/remote/dynamic SOCKS proxy)
- Connection health monitoring
- Session export (CSV/TXT)

### 🔴 Rails Integration
- Interactive Rails console with autocomplete
- Exception tracking with stack traces
- Performance metrics visualization
- Query optimization recommendations
- Request/response logging

### 🧪 Testing
- Test runner integration
- Real-time test output
- Failure tracking
- Coverage reports

### 📊 Metrics & Monitoring
- CPU and memory usage tracking
- Request/response time graphs
- Database query performance
- Real-time alerts

---

## 🚀 Quick Start

### One-Line Install

```bash
./scripts/build-and-install.sh
```

That's it! The script will:
1. ✓ Check prerequisites
2. ✓ Install dependencies
3. ✓ Build the application
4. ✓ Install to your system

### Manual Installation

```bash
# 1. Install prerequisites (see INSTALLATION.md)

# 2. Clone and build
git clone https://github.com/yourusername/caboose-desktop.git
cd caboose-desktop
wails build

# 3. Install
sudo ./scripts/install-linux.sh  # Linux
# OR
cp -r "build/bin/Caboose Desktop.app" /Applications/  # macOS
```

### Development Mode

```bash
wails dev
```

📖 **Full Installation Guide**: See [INSTALLATION.md](INSTALLATION.md)
⚡ **Quick Start Guide**: See [QUICKSTART.md](QUICKSTART.md)

---

## 📸 Screenshots

### Git Integration
```
┌──────────────────────────────────────────────────────────┐
│ ← 2/5 → | ↑ 3/12 ↓ | Blame                             │
├──────────────────────────────────────────────────────────┤
│  OLD (line 45)          │  NEW (line 45)                 │
│  - deleted line         │  + added line                  │
│    context line         │    context line                │
└──────────────────────────────────────────────────────────┘
```

### SSH Terminal
```
┌──────────────────────────────────────────────────────────┐
│ ubuntu@web-01:22  ● Connected  45ms  Tunnels: 2         │
├──────────────────────────────────────────────────────────┤
│ $ tail -f /var/log/nginx/access.log                     │
│ 192.168.1.1 - - [27/Dec/2025:12:00:00] "GET /"          │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 Use Cases

### For Rails Developers
- Monitor all processes (Rails, Sidekiq, etc.) in one place
- Debug N+1 queries in real-time
- Track exceptions with full stack traces
- Run Rails console without leaving the app

### For DevOps Engineers
- Manage SSH connections to multiple servers
- Create SSH tunnels for secure access
- Monitor server health and metrics
- Quick deployment workflow

### For Full-Stack Developers
- Git operations with IntelliJ-like UX
- Database query optimization
- Process log aggregation
- Performance monitoring

---

## 📋 Requirements

- **Go** 1.21 or later
- **Node.js** 18 or later
- **Wails CLI** 2.11.0 or later
- **Platform Dependencies**:
  - Linux: `libgtk-3-dev libwebkit2gtk-4.0-dev`
  - macOS: Xcode Command Line Tools
  - Windows: MinGW

See [INSTALLATION.md](INSTALLATION.md) for detailed requirements.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  Frontend (React)               │
│  ┌─────────┬──────────┬─────────┬────────────┐ │
│  │ Process │ Database │   Git   │    SSH     │ │
│  │  View   │   View   │  View   │    View    │ │
│  └─────────┴──────────┴─────────┴────────────┘ │
│         Zustand Stores + React Query            │
└─────────────────────────────────────────────────┘
                      ↕ Wails Bridge
┌─────────────────────────────────────────────────┐
│              Backend (Go)                       │
│  ┌──────────┬───────────┬─────────┬──────────┐ │
│  │ Process  │ Database  │   Git   │   SSH    │ │
│  │ Manager  │  Manager  │ Manager │ Manager  │ │
│  └──────────┴───────────┴─────────┴──────────┘ │
│        Plugin System • Security • Workers       │
└─────────────────────────────────────────────────┘
```

---

## ⌨️ Keyboard Shortcuts

### Navigation
| Action | Shortcut |
|--------|----------|
| Command Palette | ⌘K |
| Dashboard | ⌘1 |
| Processes | ⌘2 |
| Git | ⌘G |
| SSH | ⌘S |
| Settings | ⌘, |

### Git Operations
| Action | Shortcut |
|--------|----------|
| Next Change | Ctrl+Down |
| Previous Change | Ctrl+Up |
| Next File | Alt+Right |
| Previous File | Alt+Left |
| Commit | ⌘Enter |

See [QUICKSTART.md](QUICKSTART.md) for complete list.

---

## 🛠️ Development

### Project Structure

```
caboose-desktop/
├── app.go                    # Main application
├── frontend/                 # React/TypeScript UI
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── stores/          # State management
│   │   └── types/           # TypeScript types
├── internal/                # Go backend
│   ├── core/               # Core functionality
│   │   ├── git/           # Git operations
│   │   ├── ssh/           # SSH management
│   │   ├── database/      # Database tools
│   │   └── process/       # Process management
│   └── plugins/            # Framework plugins
└── scripts/                # Build/install scripts
```

### Running Tests

```bash
# Backend tests
go test ./...

# Frontend tests
cd frontend && npm test
```

### Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

---

## 📚 Documentation

- **[INSTALLATION.md](INSTALLATION.md)** - Complete installation guide
- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[FEATURES.md](FEATURES.md)** - Detailed feature list
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture
- **[IMPROVEMENTS.md](IMPROVEMENTS.md)** - Planned improvements

---

## 🐛 Troubleshooting

### Common Issues

**Build fails**: See [INSTALLATION.md#troubleshooting](INSTALLATION.md#troubleshooting)

**Can't connect to database**:
```bash
# Test connection manually
mysql -h localhost -u root -p database_name
```

**SSH not working**:
```bash
# Ensure SSH agent is running
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa
```

See [QUICKSTART.md#troubleshooting](QUICKSTART.md#troubleshooting) for more solutions.

---

## 🗺️ Roadmap

- [ ] PostgreSQL support
- [ ] SQLite support
- [ ] Git stash management
- [ ] SFTP file transfer
- [ ] Docker container management
- [ ] Kubernetes integration
- [ ] Plugin marketplace

See [IMPROVEMENTS.md](IMPROVEMENTS.md) for full roadmap.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with:
- [Wails](https://wails.io/) - Go + Web UI framework
- [React](https://react.dev/) - UI library
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [XTerm.js](https://xtermjs.org/) - Terminal emulation
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/caboose-desktop/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/caboose-desktop/discussions)
- **Email**: support@caboose-desktop.com

---

**Made with ❤️ for developers by developers**
