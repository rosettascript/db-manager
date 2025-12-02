#!/bin/bash

# Complete build script for DB Manager Desktop
# Builds backend, frontend, and packages desktop app

set -e  # Exit on any error

echo "🏗️  DB Manager Desktop - Complete Build"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${BLUE}📍 Project root: $PROJECT_ROOT${NC}"
echo ""

# Check if we're in the right directory
if [ ! -d "$PROJECT_ROOT/backend" ] || [ ! -d "$PROJECT_ROOT/frontend" ] || [ ! -d "$PROJECT_ROOT/desktop" ]; then
    echo -e "${RED}❌ Error: Cannot find backend, frontend, or desktop directories${NC}"
    echo "Please run this script from the desktop/ directory"
    exit 1
fi

# Function to check if command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 completed successfully${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Step 1: Build Backend
echo -e "${BLUE}📦 Step 1/4: Building Backend...${NC}"
cd "$PROJECT_ROOT/backend"
npm run build
check_status "Backend build"
echo ""

# Step 2: Build Frontend
echo -e "${BLUE}📦 Step 2/4: Building Frontend...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run build
check_status "Frontend build"
echo ""

# Step 3: Install Desktop Dependencies
echo -e "${BLUE}📦 Step 3/4: Installing Desktop Dependencies...${NC}"
cd "$PROJECT_ROOT/desktop"
if [ ! -d "node_modules" ]; then
    npm install
    check_status "Desktop dependencies installation"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi
echo ""

# Step 4: Build Desktop App
echo -e "${BLUE}📦 Step 4/4: Packaging Desktop Application...${NC}"
cd "$PROJECT_ROOT/desktop"

# Detect OS and build accordingly
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    npm run build:linux
elif [[ "$OSTYPE" == "darwin"* ]]; then
    npm run build:mac
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    npm run build:win
else
    # Build for all platforms
    npm run build
fi

check_status "Desktop app packaging"
echo ""

# Show results
echo -e "${GREEN}🎉 Build Complete!${NC}"
echo "========================================"
echo ""
echo "📦 Your desktop app is ready!"
echo ""
echo "📍 Location: $PROJECT_ROOT/desktop/dist/"
echo ""

# List the built files
if [ -d "$PROJECT_ROOT/desktop/dist" ]; then
    echo "📄 Built files:"
    ls -lh "$PROJECT_ROOT/desktop/dist" | grep -E '\.(exe|dmg|AppImage|deb|rpm)$' || echo "  (Building...)"
else
    echo "  dist/ folder will contain your installers"
fi

echo ""
echo -e "${GREEN}✨ Next steps:${NC}"
echo "  1. Find your installer in desktop/dist/"
echo "  2. Test it by running/installing"
echo "  3. Share it with users!"
echo ""



