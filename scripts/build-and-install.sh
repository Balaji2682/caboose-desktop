#!/bin/bash
# Caboose Desktop - Quick Build and Install Script

set -e

echo "=========================================="
echo "Caboose Desktop - Build & Install"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v go &> /dev/null; then
    echo -e "${RED}✗ Go is not installed${NC}"
    echo "Please install Go from https://go.dev/dl/"
    exit 1
fi
echo -e "${GREEN}✓ Go $(go version | cut -d' ' -f3)${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

if ! command -v wails &> /dev/null; then
    echo -e "${RED}✗ Wails CLI is not installed${NC}"
    echo "Installing Wails CLI..."
    go install github.com/wailsapp/wails/v2/cmd/wails@latest
    export PATH=$PATH:$(go env GOPATH)/bin
fi
echo -e "${GREEN}✓ Wails $(wails version | head -1)${NC}"

echo ""
echo -e "${BLUE}Installing dependencies...${NC}"

# Install Go dependencies
echo "→ Installing Go modules..."
go mod download

# Install frontend dependencies
echo "→ Installing npm packages..."
cd frontend
npm install
cd ..

echo ""
echo -e "${BLUE}Building application...${NC}"

# Build production version
wails build

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Build successful!${NC}"
    echo ""
    echo -e "${BLUE}Installing application...${NC}"

    # Run platform-specific installation
    OS="$(uname -s)"
    case "${OS}" in
        Linux*)
            ./scripts/install-linux.sh
            ;;
        Darwin*)
            echo "Copying to /Applications..."
            cp -r "build/bin/Caboose Desktop.app" /Applications/
            echo -e "${GREEN}✓ Installed to /Applications/${NC}"
            ;;
        *)
            echo -e "${YELLOW}Unknown OS: ${OS}${NC}"
            echo "Please install manually from build/bin/"
            ;;
    esac
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================="
echo "Installation Complete!"
echo "==========================================${NC}"
echo ""
echo "You can now run Caboose Desktop from your application menu"
echo "or by typing: caboose-desktop"
