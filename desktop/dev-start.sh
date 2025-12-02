#!/bin/bash

# Development startup script for DB Manager Desktop
# This script helps you run all components needed for desktop development

echo "🚀 Starting DB Manager Desktop in Development Mode"
echo ""

# Check if in desktop directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the desktop/ directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing desktop dependencies..."
    npm install
fi

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check if backend is running
if ! check_port 3000; then
    echo "⚠️  Backend is not running on port 3000"
    echo "   Please start it in another terminal:"
    echo "   cd ../backend && npm run start:dev"
    echo ""
    read -p "Press Enter when backend is ready..."
fi

# Check if frontend is running
if ! check_port 5173; then
    echo "⚠️  Frontend is not running on port 5173"
    echo "   Please start it in another terminal:"
    echo "   cd ../frontend && npm run dev"
    echo ""
    read -p "Press Enter when frontend is ready..."
fi

echo "✅ Starting Electron..."
npm run dev



