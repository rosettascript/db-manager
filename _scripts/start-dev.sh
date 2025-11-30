#!/bin/bash

# Script to run both backend and frontend in the background
# Usage: ./start-dev.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# PID files to track processes
BACKEND_PID_FILE="$SCRIPT_DIR/.backend.pid"
FRONTEND_PID_FILE="$SCRIPT_DIR/.frontend.pid"

# Log files
BACKEND_LOG="$SCRIPT_DIR/.backend.log"
FRONTEND_LOG="$SCRIPT_DIR/.frontend.log"

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if ps -p "$BACKEND_PID" > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping backend (PID: $BACKEND_PID)...${NC}"
            kill "$BACKEND_PID" 2>/dev/null || true
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping frontend (PID: $FRONTEND_PID)...${NC}"
            kill "$FRONTEND_PID" 2>/dev/null || true
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    echo -e "${GREEN}Cleanup complete.${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if directories exist
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Error: Backend directory not found at $BACKEND_DIR${NC}"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: Frontend directory not found at $FRONTEND_DIR${NC}"
    exit 1
fi

# Clean up any existing PID files
rm -f "$BACKEND_PID_FILE" "$FRONTEND_PID_FILE"
rm -f "$BACKEND_LOG" "$FRONTEND_LOG"

echo -e "${GREEN}Starting development servers...${NC}\n"

# Start backend
echo -e "${YELLOW}Starting backend...${NC}"
cd "$BACKEND_DIR"
npm run start:dev > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$BACKEND_PID_FILE"
echo -e "${GREEN}Backend started (PID: $BACKEND_PID)${NC}"
echo -e "  Logs: $BACKEND_LOG\n"

# Start frontend
echo -e "${YELLOW}Starting frontend...${NC}"
cd "$FRONTEND_DIR"
npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"
echo -e "${GREEN}Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "  Logs: $FRONTEND_LOG\n"

# Wait a moment for services to start
sleep 2

# Check if processes are still running
if ! ps -p "$BACKEND_PID" > /dev/null 2>&1; then
    echo -e "${RED}Error: Backend failed to start. Check $BACKEND_LOG for details.${NC}"
    cleanup
    exit 1
fi

if ! ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
    echo -e "${RED}Error: Frontend failed to start. Check $FRONTEND_LOG for details.${NC}"
    cleanup
    exit 1
fi

echo -e "${GREEN}Both services are running!${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both services${NC}\n"
echo -e "Backend logs: tail -f $BACKEND_LOG"
echo -e "Frontend logs: tail -f $FRONTEND_LOG\n"

# Wait for processes to finish (or user interrupt)
while true; do
    if ! ps -p "$BACKEND_PID" > /dev/null 2>&1; then
        echo -e "${RED}Backend process stopped unexpectedly${NC}"
        cleanup
        exit 1
    fi
    
    if ! ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
        echo -e "${RED}Frontend process stopped unexpectedly${NC}"
        cleanup
        exit 1
    fi
    
    sleep 1
done

