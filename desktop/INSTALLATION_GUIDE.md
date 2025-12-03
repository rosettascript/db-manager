# DB Manager Desktop - Installation & Deployment Guide

## Date: December 3, 2025

## Table of Contents
1. [Overview](#overview)
2. [The White Screen Issue & Solution](#the-white-screen-issue--solution)
3. [Installation Methods](#installation-methods)
4. [System Integration](#system-integration)
5. [Building from Source](#building-from-source)
6. [Troubleshooting](#troubleshooting)

---

## Overview

DB Manager Desktop is an Electron-based desktop application for PostgreSQL database management and visualization. This guide documents the complete installation process and solutions to known issues.

### Key Features
- ✅ Database connection management
- ✅ Interactive ER diagrams
- ✅ Query builder with syntax highlighting
- ✅ Schema visualization
- ✅ Table viewer and data browser
- ✅ Index recommendations
- ✅ Export functionality (SQL, JSON, CSV, PNG)

---

## The White Screen Issue & Solution

### Problem Discovered
During deployment testing, the `.deb` package installation resulted in a **white screen** due to Chromium shared memory errors on certain Linux configurations.

**Error Messages:**
```
Creating shared memory in /tmp/.org.chromium.Chromium.* failed: No such process (3)
Unable to access(W_OK|X_OK) /tmp: No such process (3)
FATAL: This is frequently caused by incorrect permissions on /dev/shm
```

**Root Cause:**
- System-level restrictions on `/tmp` and `/dev/shm` access
- Chromium unable to create shared memory regions
- Renderer process fails to start
- Result: White screen, application crashes

### The Solution: Use AppImage Format

**Why AppImage Works:**
- ✅ Self-contained and portable
- ✅ Bypasses system-level permission issues
- ✅ No installation required
- ✅ Works on any Linux distribution
- ✅ FUSE mounting avoids `/tmp` restrictions

**Recommended Format:** AppImage  
**Status:** ✅ Fully Working

---

## Installation Methods

### Method 1: AppImage (Recommended) ⭐

#### Quick Start
```bash
# 1. Make executable
chmod +x DBManager-1.0.0.AppImage

# 2. Run
./DBManager-1.0.0.AppImage --no-sandbox
```

#### System Integration (Appears in Applications Menu)

**Step 1: Move to Applications folder**
```bash
mkdir -p ~/Applications
cp DBManager-1.0.0.AppImage ~/Applications/DBManager.AppImage
chmod +x ~/Applications/DBManager.AppImage
```

**Step 2: Create desktop entry**
```bash
nano ~/.local/share/applications/db-manager.desktop
```

**Paste this content:**
```ini
[Desktop Entry]
Type=Application
Name=DB Manager
Comment=Database Management and Visualization Tool
Exec=/home/YOUR_USERNAME/Applications/DBManager.AppImage --no-sandbox
Icon=database
Terminal=false
Categories=Development;Database;Utility;
Keywords=database;postgresql;mysql;sql;visualization;
StartupNotify=true
StartupWMClass=DB Manager
```

**Step 3: Update desktop database**
```bash
chmod +x ~/.local/share/applications/db-manager.desktop
update-desktop-database ~/.local/share/applications/
```

**Done!** DB Manager now appears in your Applications Menu.

---

### Method 2: .deb Package (Not Recommended)

⚠️ **Warning:** The `.deb` package may not work on systems with Chromium shared memory restrictions.

```bash
sudo dpkg -i db-manager-desktop_1.0.0_amd64.deb
```

**If you encounter white screen issues:**
1. Uninstall the `.deb` package
2. Use the AppImage instead

**To uninstall:**
```bash
sudo apt remove --purge db-manager-desktop -y
sudo rm -rf /opt/DBManager
```

---

### Method 3: Using the Launcher Script

A convenience script is provided in the desktop folder:

```bash
cd desktop/
./launch-db-manager.sh
```

This script automatically launches the AppImage from the `dist/` folder.

---

## System Integration

### What Gets Installed (AppImage + Desktop Entry)

**Files Created:**
```
~/Applications/DBManager.AppImage          # The application
~/.local/share/applications/db-manager.desktop  # Menu entry
~/.config/db-manager-desktop/               # User data
~/.config/db-manager-desktop/database/      # Database files
~/.config/db-manager-desktop/tmp/           # Temp files
```

**System Integration:**
- ✅ Appears in Applications Menu
- ✅ Can be pinned to taskbar/favorites
- ✅ Can be searched via app launcher
- ✅ Desktop notifications work
- ✅ File associations (optional)

### Removing the Application

```bash
# Remove AppImage
rm ~/Applications/DBManager.AppImage

# Remove desktop entry
rm ~/.local/share/applications/db-manager.desktop

# Update desktop database
update-desktop-database ~/.local/share/applications/

# Optional: Remove user data
rm -rf ~/.config/db-manager-desktop/
```

---

## Building from Source

### Prerequisites
```bash
# Install Node.js (v18+)
# Install npm
# Clone the repository
```

### Build Steps

**1. Install dependencies:**
```bash
# Backend
cd backend/
npm install

# Frontend
cd ../frontend/
npm install

# Desktop
cd ../desktop/
npm install
```

**2. Build the application:**
```bash
cd desktop/
npm run build
```

This creates three formats in `dist/`:
- `DBManager-1.0.0.AppImage` ⭐ Recommended
- `db-manager-desktop_1.0.0_amd64.deb`
- `db-manager-desktop-1.0.0.x86_64.rpm`

### Build Configuration

**Key Files:**
- `desktop/main.js` - Electron main process
- `desktop/preload.js` - IPC bridge
- `desktop/package.json` - Build configuration

**Important Settings in `main.js`:**
```javascript
// Electron flags for compatibility
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-dev-shm-usage');

// Frontend HTTP server (NOT file:// protocol)
const FRONTEND_SERVER_PORT = 8888;

// Backend API port (from .env)
const BACKEND_PORT = 6969;
```

---

## Troubleshooting

### White Screen Issue

**Symptom:** Window opens but shows only white screen

**Solution:** Use AppImage instead of `.deb` package

**Why:** System-level Chromium shared memory restrictions

### Port Already in Use

**Symptom:** Error: `EADDRINUSE: address already in use`

**Solution:**
```bash
# Check what's using the ports
sudo lsof -i :8888
sudo lsof -i :6969

# Kill existing processes
pkill -f "DBManager\|db-manager"
```

### DevTools Won't Open

**Solution:** Launch with debug flag
```bash
DEBUG_DESKTOP=true ~/Applications/DBManager.AppImage --no-sandbox
```

### Application Won't Start

**Check permissions:**
```bash
chmod +x ~/Applications/DBManager.AppImage
```

**Check dependencies:**
```bash
# FUSE is required for AppImage
sudo apt install fuse libfuse2
```

**View detailed logs:**
```bash
~/Applications/DBManager.AppImage --no-sandbox 2>&1 | tee db-manager.log
```

### Backend Connection Errors

**Verify backend is running:**
```bash
curl http://localhost:6969/api/health
```

**Check backend .env file:**
```bash
# Should be in the mounted location:
# /tmp/.mount_DBMan*/resources/app/backend/.env
```

### Frontend Not Loading

**Test frontend server:**
```bash
curl http://localhost:8888
```

**Expected:** HTML response with React app

---

## Technical Architecture

### How It Works

```
┌─────────────────────────────────────┐
│     Electron Main Process           │
│  (desktop/main.js)                  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Express HTTP Server          │  │
│  │  Port: 8888                   │  │
│  │  Serves: frontend/dist/       │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  NestJS Backend               │  │
│  │  Port: 6969                   │  │
│  │  API: /api/*                  │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  BrowserWindow                │  │
│  │  Loads: http://localhost:8888 │  │
│  │  (NOT file://)                │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Why HTTP Instead of file://

**Problem with file:// protocol:**
- ❌ React Router doesn't work
- ❌ CORS restrictions
- ❌ Module imports fail
- ❌ Modern web APIs limited

**Solution: Local HTTP server:**
- ✅ Full browser API support
- ✅ React Router works
- ✅ No CORS issues
- ✅ html-to-image works (for exports)

---

## Deployment Checklist

### For End Users

- [ ] Download `DBManager-1.0.0.AppImage`
- [ ] Make executable: `chmod +x`
- [ ] Move to `~/Applications/`
- [ ] Create desktop entry
- [ ] Update desktop database
- [ ] Launch from Applications Menu

### For Developers

- [ ] Clone repository
- [ ] Install dependencies (backend, frontend, desktop)
- [ ] Create `.env` files
- [ ] Build backend: `cd backend && npm run build`
- [ ] Build frontend: `cd frontend && npm run build`
- [ ] Build desktop: `cd desktop && npm run build`
- [ ] Test AppImage: `./dist/DBManager-1.0.0.AppImage --no-sandbox`
- [ ] Create release

---

## Version Information

- **Version:** 1.0.0
- **Electron:** 28.1.0
- **Node.js:** v18+
- **Build System:** electron-builder 24.13.3
- **Supported Platforms:** Linux (Ubuntu, Debian, Fedora, etc.)

---

## Support & Resources

### Files in This Repository

- `INSTALLATION_GUIDE.md` - This file
- `WORKING_SOLUTION.md` - Detailed technical solution
- `WHITE_SCREEN_COMPLETE_FIX.md` - White screen issue deep dive
- `launch-db-manager.sh` - Convenience launcher script
- `README.md` - Project overview

### Quick Links

- AppImage location: `desktop/dist/DBManager-1.0.0.AppImage`
- Build command: `npm run build` (in desktop folder)
- Launcher script: `desktop/launch-db-manager.sh`

---

## Summary

✅ **Recommended Installation:** AppImage with desktop integration  
✅ **Working Status:** Fully functional  
✅ **Known Issues:** Resolved (use AppImage, not .deb)  
✅ **System Integration:** Complete  

The AppImage format provides the best compatibility and user experience for DB Manager Desktop on Linux systems.

---

*Last Updated: December 3, 2025*

