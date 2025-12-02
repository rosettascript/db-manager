# Release Notes - v1.0.0

## 🎉 First Official Release!

We're excited to announce the first official release of **DB Manager** - a powerful PostgreSQL database management and visualization tool with a brand new **desktop application**!

## 🖥️ Desktop Application

The highlight of this release is the **Linux desktop application** that bundles everything you need into a single package.

### What's Included

- **Integrated Backend & Frontend**: No need to manually start servers
- **Native Desktop Experience**: Runs as a native Linux application
- **Portable**: All data stored in `~/.config/db-manager-desktop/`
- **Auto-start**: Backend automatically starts on port 6969
- **Easy Installation**: Available as .deb package or AppImage

### Installation

**Debian/Ubuntu:**
```bash
sudo dpkg -i db-manager-desktop_1.0.0_amd64.deb
db-manager
```

**AppImage (Universal):**
```bash
chmod +x DBManager-1.0.0.AppImage
./DBManager-1.0.0.AppImage
```

## 🔧 Technical Improvements

### Electron Fixes
- **HashRouter**: Switched from BrowserRouter to HashRouter for proper file:// protocol support
- **AppArmor Compatibility**: Added --no-sandbox wrapper to bypass Ubuntu's unprivileged_userns restrictions
- **Dynamic Backend Port**: Frontend auto-detects backend port via IPC
- **Custom Temp Directory**: Electron uses app-specific temp dir to avoid /tmp permission issues

### Frontend Enhancements
- Improved API configuration with runtime port detection
- Better error boundaries and error handling
- Optimized build with proper asset chunking

### Backend Stability
- Reliable auto-start in Electron environment
- Configurable port via .env (default: 6969)
- Proper database path resolution in packaged apps

## 📝 Known Issues

1. **Harmless /tmp Warnings**: You may see shared memory warnings in the terminal - these are harmless and don't affect functionality
2. **AppArmor Messages**: System logs may show AppArmor denials - these are bypassed by the --no-sandbox flag
3. **RPM Packaging**: RPM builds currently fail (use .deb or AppImage instead)

## 🐛 Bug Fixes

- Fixed white screen issue in packaged Electron app
- Fixed file:// protocol routing with HashRouter
- Fixed renderer process crashes due to AppArmor restrictions
- Fixed backend port mismatch between frontend and backend

## 📦 Downloads

- **Debian Package**: `db-manager-desktop_1.0.0_amd64.deb` (recommended for Ubuntu/Debian)
- **AppImage**: `DBManager-1.0.0.AppImage` (universal Linux)

## 🙏 Acknowledgments

Thanks to everyone who tested and provided feedback during development!

## 📚 Documentation

- [CHANGELOG.md](./CHANGELOG.md) - Full changelog
- [desktop/README.md](./desktop/README.md) - Desktop app documentation
- [_docs/](./docs/) - API and architecture documentation

---

**Full Changelog**: https://github.com/rosettascript/db-manager/commits/v1.0.0

