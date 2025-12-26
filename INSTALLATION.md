# Caboose Desktop - Installation Guide

Complete guide to building and installing Caboose Desktop on your local machine.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Building from Source](#building-from-source)
3. [Installation](#installation)
4. [Platform-Specific Instructions](#platform-specific-instructions)
5. [Development Setup](#development-setup)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

#### 1. **Go** (v1.21 or later)
```bash
# Check Go version
go version

# Install on Linux
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# Install on macOS (using Homebrew)
brew install go

# Install on Windows
# Download from https://go.dev/dl/
```

#### 2. **Node.js** (v18 or later) and npm
```bash
# Check versions
node --version
npm --version

# Install on Linux (using nvm - recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install on macOS (using Homebrew)
brew install node

# Install on Windows
# Download from https://nodejs.org/
```

#### 3. **Wails CLI** (v2.11.0 or later)
```bash
# Install Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Verify installation
wails version
```

#### 4. **Platform-Specific Dependencies**

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install -y \
  build-essential \
  libgtk-3-dev \
  libwebkit2gtk-4.0-dev \
  pkg-config
```

**Linux (Fedora/RHEL):**
```bash
sudo dnf install -y \
  gcc-c++ \
  gtk3-devel \
  webkit2gtk3-devel \
  pkg-config
```

**macOS:**
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

**Windows:**
```powershell
# Install chocolatey package manager first
# Then install dependencies
choco install mingw
```

#### 5. **Git** (for version control)
```bash
# Check Git version
git version

# Install if needed
# Linux: sudo apt install git
# macOS: brew install git
# Windows: choco install git
```

---

## Building from Source

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/caboose-desktop.git
cd caboose-desktop
```

### 2. Install Dependencies

```bash
# Install Go dependencies
go mod download

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Build the Application

#### Development Build (with DevTools)
```bash
# Build for development
wails dev

# This will:
# - Start a development server
# - Enable hot-reload for frontend
# - Open the application with DevTools
```

#### Production Build
```bash
# Build optimized production version
wails build

# Output location:
# - Linux: ./build/bin/caboose-desktop
# - macOS: ./build/bin/Caboose Desktop.app
# - Windows: ./build/bin/caboose-desktop.exe
```

#### Platform-Specific Builds
```bash
# Linux
wails build -platform linux/amd64

# macOS (requires macOS to build)
wails build -platform darwin/universal

# Windows (can cross-compile from Linux/macOS)
wails build -platform windows/amd64
```

#### Build Options
```bash
# Clean build (remove old artifacts)
wails build -clean

# Skip frontend build (if already built)
wails build -skipFrontend

# Build with custom flags
wails build -ldflags "-X main.version=1.0.0"

# Build without compression (faster build)
wails build -upx=false

# Verbose output
wails build -v 2
```

---

## Installation

### Linux

#### Method 1: Direct Installation (Recommended)
```bash
# Build the application
wails build

# Make executable
chmod +x build/bin/caboose-desktop

# Move to user binaries
sudo mv build/bin/caboose-desktop /usr/local/bin/

# Create desktop entry
cat > ~/.local/share/applications/caboose-desktop.desktop << EOF
[Desktop Entry]
Name=Caboose Desktop
Comment=Development toolkit for Rails applications
Exec=/usr/local/bin/caboose-desktop
Icon=/usr/local/share/icons/caboose-desktop.png
Terminal=false
Type=Application
Categories=Development;
EOF

# Update desktop database
update-desktop-database ~/.local/share/applications/
```

#### Method 2: Using Install Script
```bash
# Build
wails build

# Run install script
sudo ./scripts/install-linux.sh
```

### macOS

#### Method 1: Copy to Applications
```bash
# Build for macOS
wails build -platform darwin/universal

# Copy to Applications folder
cp -r "build/bin/Caboose Desktop.app" /Applications/

# Launch
open "/Applications/Caboose Desktop.app"
```

#### Method 2: Using Homebrew Cask (if published)
```bash
brew install --cask caboose-desktop
```

### Windows

#### Method 1: Direct Installation
```powershell
# Build the application
wails build -platform windows/amd64

# Copy to Program Files
Copy-Item "build\bin\caboose-desktop.exe" "C:\Program Files\Caboose Desktop\"

# Create shortcut on desktop
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$Home\Desktop\Caboose Desktop.lnk")
$Shortcut.TargetPath = "C:\Program Files\Caboose Desktop\caboose-desktop.exe"
$Shortcut.Save()
```

#### Method 2: Using Installer (if available)
```powershell
# Run the installer
.\caboose-desktop-installer.exe
```

---

## Platform-Specific Instructions

### Linux (WSL2)

If you're using WSL2, you'll need additional setup for GUI applications:

```bash
# Install WSLg (Windows 11) - should be pre-installed
# For Windows 10, you need an X server

# Install VcXsrv or XMing on Windows host
# Then in WSL:
export DISPLAY=:0

# Add to ~/.bashrc for persistence
echo 'export DISPLAY=:0' >> ~/.bashrc
```

### macOS Code Signing (Optional)

For distribution, you may want to sign the application:

```bash
# Sign the application
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: Your Name" \
  "build/bin/Caboose Desktop.app"

# Verify signature
codesign --verify --verbose "build/bin/Caboose Desktop.app"

# Create DMG for distribution
hdiutil create -volname "Caboose Desktop" \
  -srcfolder "build/bin/Caboose Desktop.app" \
  -ov -format UDZO caboose-desktop.dmg
```

### Windows Portable Version

Create a portable version that doesn't require installation:

```powershell
# After building, create a portable directory
mkdir caboose-desktop-portable
Copy-Item "build\bin\caboose-desktop.exe" caboose-desktop-portable\
Copy-Item "README.md" caboose-desktop-portable\

# Add a launcher script
@"
@echo off
start caboose-desktop.exe
"@ | Out-File -FilePath "caboose-desktop-portable\launch.bat" -Encoding ASCII

# Zip for distribution
Compress-Archive -Path caboose-desktop-portable -DestinationPath caboose-desktop-portable.zip
```

---

## Development Setup

### Setting Up for Development

```bash
# 1. Clone repository
git clone https://github.com/yourusername/caboose-desktop.git
cd caboose-desktop

# 2. Install dependencies
go mod download
cd frontend && npm install && cd ..

# 3. Run in development mode
wails dev
```

### Project Structure

```
caboose-desktop/
├── app.go                 # Main application entry
├── main.go               # Wails bootstrap
├── frontend/             # React/TypeScript frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── stores/      # Zustand state stores
│   │   ├── lib/         # Utilities
│   │   └── types/       # TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── internal/            # Go backend
│   ├── core/           # Core functionality
│   │   ├── git/       # Git operations
│   │   ├── ssh/       # SSH management
│   │   ├── database/  # Database tools
│   │   └── process/   # Process management
│   ├── models/         # Data models
│   └── plugins/        # Framework plugins
├── go.mod
├── go.sum
└── wails.json          # Wails configuration
```

### Running Tests

```bash
# Run Go tests
go test ./...

# Run frontend tests
cd frontend
npm test

# Run with coverage
go test -cover ./...
```

### Building for Distribution

```bash
# 1. Update version in wails.json
# 2. Build production version
wails build -clean

# 3. Test the build
./build/bin/caboose-desktop

# 4. Create release archives
# Linux
tar -czf caboose-desktop-linux-amd64.tar.gz -C build/bin caboose-desktop

# macOS
hdiutil create -volname "Caboose Desktop" \
  -srcfolder "build/bin/Caboose Desktop.app" \
  -ov -format UDZO caboose-desktop-darwin-universal.dmg

# Windows (from Linux/macOS)
zip -r caboose-desktop-windows-amd64.zip build/bin/caboose-desktop.exe
```

---

## Configuration

### First Run

On first run, Caboose Desktop will create a configuration file:

**Location:**
- Linux: `~/.config/caboose/.caboose.toml`
- macOS: `~/Library/Application Support/caboose/.caboose.toml`
- Windows: `%APPDATA%\caboose\.caboose.toml`

**Example Configuration:**
```toml
# Caboose Desktop Configuration

[database]
host = "localhost"
port = 3306
username = "root"
database = "myapp_development"

[ssh]
default_username = "ubuntu"
prefer_agent = true

[[ssh.servers]]
id = "prod-web-01"
name = "Production Web Server"
host = "web01.example.com"
port = 22
username = "deploy"
auth_method = "agent"
use_agent = true

[processes.web]
command = "rails"
args = ["server"]
working_dir = "/path/to/project"
auto_restart = true
```

### Environment Variables

Caboose Desktop respects these environment variables:

```bash
# Database connection
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=root
export DB_PASSWORD=secret

# SSH configuration
export SSH_AUTH_SOCK=/path/to/ssh-agent.sock

# Development
export CABOOSE_ENV=development
export CABOOSE_LOG_LEVEL=debug
```

---

## Troubleshooting

### Build Issues

#### "go: cannot find main module"
```bash
# Ensure you're in the project directory
cd /path/to/caboose-desktop

# Initialize go mod if needed
go mod init github.com/yourusername/caboose-desktop
go mod tidy
```

#### "wails: command not found"
```bash
# Ensure GOPATH/bin is in PATH
export PATH=$PATH:$(go env GOPATH)/bin

# Add to ~/.bashrc or ~/.zshrc
echo 'export PATH=$PATH:$(go env GOPATH)/bin' >> ~/.bashrc
source ~/.bashrc
```

#### Frontend build fails
```bash
# Clear npm cache
cd frontend
rm -rf node_modules package-lock.json
npm install

# Try with legacy peer deps
npm install --legacy-peer-deps
```

#### "pkg-config: command not found" (Linux)
```bash
# Ubuntu/Debian
sudo apt install pkg-config

# Fedora
sudo dnf install pkgconfig
```

### Runtime Issues

#### Application won't start
```bash
# Check for error logs
# Linux: ~/.local/share/caboose/logs/
# macOS: ~/Library/Logs/caboose/
# Windows: %LOCALAPPDATA%\caboose\logs\

# Run with debug output
CABOOSE_LOG_LEVEL=debug ./caboose-desktop
```

#### "Cannot connect to database"
```bash
# Verify database is running
mysql -h localhost -u root -p

# Check configuration file
cat ~/.config/caboose/.caboose.toml

# Test connection
mysql -h localhost -P 3306 -u root -p database_name
```

#### SSH connections fail
```bash
# Verify SSH agent is running
ssh-add -l

# Start SSH agent if needed
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa

# Test SSH connection manually
ssh user@host
```

#### Git operations fail
```bash
# Ensure git is installed
git --version

# Verify repository
cd /path/to/project
git status

# Check permissions
ls -la .git/
```

### Performance Issues

#### Slow startup
```bash
# Reduce log verbosity
export CABOOSE_LOG_LEVEL=warn

# Disable auto-refresh
# Edit config file and set:
# monitoring.auto_refresh = false
```

#### High memory usage
```bash
# Check process memory
ps aux | grep caboose-desktop

# Limit log buffer in config
# max_log_entries = 5000
```

### Platform-Specific Issues

#### Linux: Application doesn't appear in menu
```bash
# Rebuild desktop database
update-desktop-database ~/.local/share/applications/

# Refresh icon cache
gtk-update-icon-cache ~/.local/share/icons/
```

#### macOS: "App is damaged and can't be opened"
```bash
# Remove quarantine attribute
xattr -cr "/Applications/Caboose Desktop.app"
```

#### Windows: Firewall blocks network features
```powershell
# Add firewall exception
New-NetFirewallRule -DisplayName "Caboose Desktop" `
  -Direction Inbound -Program "C:\Path\To\caboose-desktop.exe" `
  -Action Allow
```

---

## Uninstallation

### Linux
```bash
# Remove binary
sudo rm /usr/local/bin/caboose-desktop

# Remove desktop entry
rm ~/.local/share/applications/caboose-desktop.desktop

# Remove configuration (optional)
rm -rf ~/.config/caboose/

# Remove data (optional)
rm -rf ~/.local/share/caboose/
```

### macOS
```bash
# Remove application
rm -rf "/Applications/Caboose Desktop.app"

# Remove configuration (optional)
rm -rf ~/Library/Application\ Support/caboose/

# Remove preferences (optional)
defaults delete com.caboose.desktop
```

### Windows
```powershell
# Remove program
Remove-Item "C:\Program Files\Caboose Desktop\" -Recurse

# Remove configuration (optional)
Remove-Item "$env:APPDATA\caboose\" -Recurse

# Remove from registry (if installer was used)
# Use Add/Remove Programs in Control Panel
```

---

## Getting Help

- **Documentation**: [GitHub Wiki](https://github.com/yourusername/caboose-desktop/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/caboose-desktop/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/caboose-desktop/discussions)

---

## License

Caboose Desktop is released under the MIT License. See [LICENSE](LICENSE) for details.
