# DB Manager - Desktop Application

This folder contains the Electron-based desktop application version of DB Manager.

## 📦 What This Does

Packages your existing web application (frontend + backend) into a standalone desktop application for:
- **Windows** (.exe, portable)
- **macOS** (.dmg, .app)
- **Linux** (.AppImage, .deb, .rpm)

## 🚀 Quick Start

### Check Your Port Configuration

Before building, check what ports will be used:

```bash
cd desktop
npm run check-ports
```

This shows the detected backend and frontend ports from your `.env` files.

### Development Mode

1. **Install dependencies:**
   ```bash
   cd desktop
   npm install
   ```

2. **Start backend and frontend in dev mode:**
   ```bash
   # Terminal 1 - Backend
   cd ../backend
   npm run start:dev

   # Terminal 2 - Frontend
   cd ../frontend
   npm run dev

   # Terminal 3 - Electron
   cd desktop
   npm run dev
   ```

   This will open the Electron app pointing to your running dev servers.

### Production Build

1. **Build all components:**
   ```bash
   cd desktop
   npm install  # if not already done
   npm run build
   ```

   This will:
   - Build the backend (NestJS)
   - Build the frontend (Vite/React)
   - Package everything into a desktop app

2. **Platform-specific builds:**
   ```bash
   npm run build:win    # Windows
   npm run build:mac    # macOS
   npm run build:linux  # Linux
   ```

3. **Find your application:**
   - Built apps will be in `desktop/dist/`
   - Installer files (.exe, .dmg, .AppImage, etc.)
   - Portable versions (no install needed)

## 📁 File Structure

```
desktop/
├── main.js           # Electron main process
├── preload.js        # Preload script (security bridge)
├── package.json      # Desktop app config + build settings
├── assets/           # App icons (add your own!)
│   ├── icon.png      # Linux icon (512x512)
│   ├── icon.ico      # Windows icon
│   └── icon.icns     # macOS icon
└── dist/             # Built applications (after build)
```

## 🎨 Adding Custom Icons

Replace the placeholder icons in `desktop/assets/`:

- **icon.png** - 512x512 PNG for Linux
- **icon.ico** - Windows icon (multiple sizes)
- **icon.icns** - macOS icon bundle

Tools to create icons:
- [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder)
- Online: [icoconvert.com](https://icoconvert.com/)

## 🔧 How It Works

1. **Electron Main Process** (`main.js`):
   - Reads your backend's `.env` file to detect the PORT
   - Starts the NestJS backend as a child process
   - Creates the application window
   - Manages app lifecycle
   - Handles data storage in app directory

2. **Frontend**:
   - Your React app runs in the Electron window
   - Communicates with the embedded backend via HTTP
   - No code changes needed!

3. **Backend**:
   - NestJS server runs in the background
   - Database files stored in app data directory
   - Automatically starts/stops with the app

## 📊 App Data Location

The desktop app stores data in OS-specific directories:

- **Windows**: `%APPDATA%/db-manager-desktop/`
- **macOS**: `~/Library/Application Support/db-manager-desktop/`
- **Linux**: `~/.config/db-manager-desktop/`

This includes:
- Database connections
- Query history
- Saved queries
- App settings

**Note:** Port configuration is read from `backend/.env` - see [PORT_CONFIGURATION.md](./PORT_CONFIGURATION.md)

## 🐛 Debugging

### View Logs

**Development:**
- Electron DevTools are open by default
- Backend logs appear in the terminal

**Production:**
- Windows: Check `%APPDATA%/db-manager-desktop/logs/`
- macOS: Check Console.app
- Linux: Run from terminal to see logs

### Common Issues

**Port already in use:**
- The app automatically reads your backend's PORT from `.env`
- Make sure that port isn't occupied by another service
- Check `backend/.env` to see which port is configured

**Backend won't start:**
- Check that backend builds successfully: `cd ../backend && npm run build`
- Verify `backend/dist/` exists

**Frontend is blank:**
- Check that frontend builds successfully: `cd ../frontend && npm run build`
- Verify `frontend/dist/` exists

## 🔒 Security Notes

- All database credentials are stored locally on the user's machine
- No external servers or cloud dependencies
- Same encryption as the web version (AES-256-CBC)

## 📦 Distribution

### File Sizes (Approximate)
- **Windows installer**: ~80-100 MB
- **macOS DMG**: ~80-100 MB
- **Linux AppImage**: ~80-100 MB

### Distribution Options

1. **Direct Download**:
   - Upload built files to your website/GitHub releases
   - Users download and install

2. **Auto-updates** (Optional):
   - Configure electron-updater
   - Host releases on GitHub
   - Apps auto-update when new versions available

3. **App Stores** (Optional):
   - Windows Store
   - Mac App Store (requires Apple Developer account)
   - Snap Store (Linux)

## 🚀 Publishing

### GitHub Releases (Recommended)

1. Create a GitHub release
2. Upload the built installers from `desktop/dist/`
3. Users download the appropriate version for their OS

### Manual Distribution

Simply share the installer files:
- **Windows**: `DB Manager Setup x.x.x.exe`
- **macOS**: `DB Manager-x.x.x.dmg`
- **Linux**: `DB-Manager-x.x.x.AppImage`

## 💡 Tips

- **Dev Mode**: Use `npm run dev` for faster development
- **Clean Build**: Delete `dist/` folder before building
- **Update Electron**: Keep Electron updated for security
- **Test**: Test the built app before distributing!

## 🔄 Updates

To update the desktop app with changes from web app:

1. Make changes to `frontend/` or `backend/`
2. Rebuild: `cd desktop && npm run build`
3. Test the new build
4. Distribute the new version

No changes needed in the `desktop/` folder unless you're modifying Electron-specific features!

---

**Need help?** Check the main project README or open an issue!

