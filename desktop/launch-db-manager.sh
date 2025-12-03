#!/bin/bash
# DB Manager Desktop Launcher
# This script launches the DB Manager desktop application using the AppImage

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPIMAGE="$SCRIPT_DIR/dist/DBManager-1.0.0.AppImage"

echo "🚀 Launching DB Manager Desktop..."

# Make sure it's executable
chmod +x "$APPIMAGE"

# Launch the AppImage with no-sandbox flag
"$APPIMAGE" --no-sandbox "$@" &

echo "✅ DB Manager launched!"
echo "💡 The application is running in the background."

