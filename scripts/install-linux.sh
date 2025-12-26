#!/bin/bash
# Caboose Desktop - Linux Installation Script

set -e

echo "=========================================="
echo "Caboose Desktop - Linux Installation"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root for system-wide install
INSTALL_DIR="/usr/local/bin"
ICON_DIR="/usr/local/share/icons"
DESKTOP_DIR="/usr/share/applications"

if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Not running as root. Installing for current user only.${NC}"
    INSTALL_DIR="$HOME/.local/bin"
    ICON_DIR="$HOME/.local/share/icons"
    DESKTOP_DIR="$HOME/.local/share/applications"
    mkdir -p "$INSTALL_DIR" "$ICON_DIR" "$DESKTOP_DIR"
fi

# Check if binary exists
BINARY_PATH="build/bin/caboose-desktop"
if [ ! -f "$BINARY_PATH" ]; then
    echo -e "${RED}Error: Binary not found at $BINARY_PATH${NC}"
    echo "Please run 'wails build' first"
    exit 1
fi

echo "Installing Caboose Desktop..."

# Install binary
echo "→ Installing binary to $INSTALL_DIR..."
cp "$BINARY_PATH" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/caboose-desktop"

# Create desktop entry
echo "→ Creating desktop entry..."
cat > "$DESKTOP_DIR/caboose-desktop.desktop" << EOF
[Desktop Entry]
Name=Caboose Desktop
Comment=Development toolkit for Rails and web applications
Exec=$INSTALL_DIR/caboose-desktop
Icon=caboose-desktop
Terminal=false
Type=Application
Categories=Development;IDE;
Keywords=rails;database;git;ssh;development;
StartupWMClass=caboose-desktop
EOF

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    echo "→ Updating desktop database..."
    if [ "$EUID" -eq 0 ]; then
        update-desktop-database /usr/share/applications/
    else
        update-desktop-database "$DESKTOP_DIR/"
    fi
fi

echo ""
echo -e "${GREEN}✓ Installation complete!${NC}"
echo ""
echo "Run Caboose Desktop with:"
echo "  $ caboose-desktop"
echo ""
echo "Or search for 'Caboose Desktop' in your application menu."
