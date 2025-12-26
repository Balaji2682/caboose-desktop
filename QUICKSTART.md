# Caboose Desktop - Quick Start Guide

Get up and running with Caboose Desktop in minutes!

---

## One-Line Install (Recommended)

### Linux & macOS
```bash
./scripts/build-and-install.sh
```

This script will:
1. Check all prerequisites
2. Install missing dependencies
3. Build the application
4. Install it to your system

---

## Manual Installation

### Step 1: Install Prerequisites

**Required:**
- Go 1.21+ ([download](https://go.dev/dl/))
- Node.js 18+ ([download](https://nodejs.org/))
- Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

**Platform Dependencies:**

**Ubuntu/Debian:**
```bash
sudo apt install build-essential libgtk-3-dev libwebkit2gtk-4.0-dev pkg-config
```

**macOS:**
```bash
xcode-select --install
```

### Step 2: Build & Install

```bash
# Clone repository
git clone https://github.com/yourusername/caboose-desktop.git
cd caboose-desktop

# Install dependencies
go mod download
cd frontend && npm install && cd ..

# Build
wails build

# Install (Linux)
sudo ./scripts/install-linux.sh

# Install (macOS)
cp -r "build/bin/Caboose Desktop.app" /Applications/
```

### Step 3: Run

```bash
# Linux
caboose-desktop

# macOS
open "/Applications/Caboose Desktop.app"
```

---

## Development Mode

For development with hot-reload:

```bash
# Run in development mode
wails dev
```

This opens the app with:
- Live reload for frontend changes
- DevTools enabled
- Fast iteration

---

## First Run Setup

1. **Select Project Directory**
   - Click "Select Directory" or use File → Open Project
   - Choose your Rails/web application folder

2. **Configure Database** (optional)
   - Go to Settings → Database
   - Enter connection details
   - Test connection

3. **Add SSH Servers** (optional)
   - Go to SSH tab
   - Click "+ Add Server"
   - Fill in server details

4. **Start Using!**
   - View processes in Processes tab
   - Run Git operations in Git tab
   - Connect to SSH servers in SSH tab

---

## Common Tasks

### View Logs
```bash
# Linux
tail -f ~/.local/share/caboose/logs/app.log

# macOS
tail -f ~/Library/Logs/caboose/app.log
```

### Update Configuration
```bash
# Linux
nano ~/.config/caboose/.caboose.toml

# macOS
nano ~/Library/Application\ Support/caboose/.caboose.toml
```

### Rebuild After Changes
```bash
# Clean rebuild
wails build -clean

# Quick rebuild (skip if frontend unchanged)
wails build -skipFrontend
```

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Dashboard | ⌘1 |
| Processes | ⌘2 |
| Rails Console | ⌘3 |
| Query Console | ⌘4 |
| Query Analysis | ⌘5 |
| DB Health | ⌘6 |
| Tests | ⌘7 |
| Exceptions | ⌘8 |
| Metrics | ⌘9 |
| SSH | ⌘S |
| Git | ⌘G |
| Settings | ⌘, |
| Command Palette | ⌘K |

### Git Shortcuts
| Action | Shortcut |
|--------|----------|
| Previous Change | Ctrl+Up |
| Next Change | Ctrl+Down |
| Previous File | Alt+Left |
| Next File | Alt+Right |
| Commit | ⌘Enter |

---

## Troubleshooting

### Build Fails

**"wails: command not found"**
```bash
export PATH=$PATH:$(go env GOPATH)/bin
echo 'export PATH=$PATH:$(go env GOPATH)/bin' >> ~/.bashrc
```

**Frontend build errors**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
cd ..
wails build
```

### Can't Connect to Database

1. Check database is running:
   ```bash
   mysql -h localhost -u root -p
   ```

2. Verify connection in Settings → Database

3. Check firewall isn't blocking connection

### SSH Not Working

1. Ensure SSH agent is running:
   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_rsa
   ```

2. Test connection manually:
   ```bash
   ssh user@host
   ```

---

## Need Help?

- **Full Installation Guide**: See [INSTALLATION.md](INSTALLATION.md)
- **Documentation**: [GitHub Wiki](https://github.com/yourusername/caboose-desktop/wiki)
- **Report Issues**: [GitHub Issues](https://github.com/yourusername/caboose-desktop/issues)

---

## Next Steps

- Explore all features in the [Features Guide](FEATURES.md)
- Configure your workflow in [Settings]
- Check out [keyboard shortcuts](#keyboard-shortcuts)
- Join our [Discussions](https://github.com/yourusername/caboose-desktop/discussions)

Happy developing! 🚀
