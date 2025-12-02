# Changelog

All notable changes to DB Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-02

### Added
- **Desktop Application**: Full Electron-based desktop application for Linux
  - Packaged as .deb (Debian/Ubuntu) and AppImage
  - Automatic backend server startup
  - Integrated frontend with native window chrome
  - System tray integration ready
- **Backend Port Auto-detection**: Frontend automatically detects backend port in Electron
- **HashRouter Implementation**: Switched from BrowserRouter to HashRouter for file:// protocol compatibility
- **Custom Temp Directory**: Electron uses app-specific temp directory to avoid system /tmp issues

### Fixed
- **Electron Renderer White Screen**: Fixed AppArmor `unprivileged_userns` blocking Electron renderer
  - Solution: Added `--no-sandbox` wrapper script
  - Fixed `/dev/shm` shared memory access issues
  - Fixed TMPDIR environment variable initialization before Electron loads
- **File Protocol Routing**: HashRouter enables proper routing with `file://` protocol in packaged apps
- **Backend Connection**: Dynamic port resolution from .env file (port 6969)
- **Web Security**: Disabled webSecurity for file:// protocol in Electron
- **ASAR Packaging**: Disabled asar to allow direct file access during development

### Changed
- Router changed from `BrowserRouter` to `HashRouter` for Electron compatibility
- Frontend API config now dynamically fetches backend port via IPC in Electron
- Simplified Electron command-line flags to minimal set for stability

### Technical Details
- **Platform**: Linux (Ubuntu/Debian)
- **Electron Version**: 28.1.0
- **Backend Port**: 6969 (configurable via .env)
- **Frontend**: React 18 with Vite bundler
- **Backend**: NestJS with PostgreSQL support

### Known Issues
- `/tmp` shared memory warnings appear in console (harmless)
- RPM packaging fails (deb and AppImage work correctly)
- DevTools can be opened with F12 if needed for debugging

### Installation
```bash
# Install the .deb package
sudo dpkg -i db-manager-desktop_1.0.0_amd64.deb

# Or use the AppImage
chmod +x DBManager-1.0.0.AppImage
./DBManager-1.0.0.AppImage
```

### Running from Source
```bash
# Development mode
cd desktop
npm run dev

# Build
npm run build:linux
```

---

[1.0.0]: https://github.com/rosettascript/db-manager/releases/tag/v1.0.0

