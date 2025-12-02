#!/bin/bash
# Quick launcher for DB Manager Desktop (Development Mode)
# This is the most reliable way to run on your system

echo "🚀 Starting DB Manager Desktop..."
echo ""

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Start backend in background
echo "📡 Starting backend..."
cd "$SCRIPT_DIR/backend"
npm run start:prod > /tmp/dbmanager-backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
sleep 5
echo "✅ Backend started (PID: $BACKEND_PID)"

# Start desktop app
echo "🖥️  Launching desktop app..."
cd "$SCRIPT_DIR/desktop"
npm run dev

# When desktop app closes, kill backend
echo ""
echo "Stopping backend..."
kill $BACKEND_PID 2>/dev/null

echo "👋 DB Manager closed"


