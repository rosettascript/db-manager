# Desktop Integration Notes

This document explains how the desktop version integrates with your existing backend and frontend code.

## 🔄 Backend Integration

### Environment Detection

The desktop app sets `ELECTRON_APP=true` environment variable when running the backend. You can use this to detect when running in desktop mode:

```typescript
const isElectron = process.env.ELECTRON_APP === 'true';
```

### Database Path Override

The desktop app overrides the database storage path to use the app data directory:

**Environment Variable:** `DATABASE_PATH`

**Current backend code** uses:
```typescript
// backend/src/connections/connections.repository.ts
private readonly filePath = path.join(__dirname, '..', '..', 'database', 'connections.json');
```

**Recommended change** for desktop compatibility:
```typescript
private readonly filePath = path.join(
  process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'database'),
  'connections.json'
);
```

### Files That Store Data

Update these files to respect `DATABASE_PATH`:

1. **connections.repository.ts** - Database connections
2. **query-history.repository.ts** - Query history
3. **query-snippets.repository.ts** - Query snippets  
4. **saved-queries files** - Any saved queries

### Example Update

```typescript
// Before
private readonly filePath = path.join(__dirname, '..', '..', 'database', 'connections.json');

// After (desktop-compatible)
private readonly basePath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'database');
private readonly filePath = path.join(this.basePath, 'connections.json');
```

## 🎨 Frontend Integration

### Electron Detection

The preload script exposes `window.electronAPI`:

```typescript
// Check if running in Electron
if (window.electronAPI?.isElectron) {
  console.log('Running in desktop app!');
}
```

### Potential Enhancements

You could add desktop-specific features:

```typescript
// In your React components
const isDesktop = (window as any).electronAPI?.isElectron;

if (isDesktop) {
  // Show desktop-specific UI
  // Enable file system features
  // etc.
}
```

### API URL

No changes needed! The frontend continues to call `http://localhost:3000/api` - the embedded backend handles it.

## 🔐 Security Considerations

### Same Security Model

- Desktop app uses the same encryption for passwords (AES-256-CBC)
- Encryption key still comes from `.env` or environment variables
- All data stored locally on user's machine

### Encryption Key

**Option 1: Bundled Key (Simple)**
```bash
# In desktop/main.js, set before starting backend:
env.ENCRYPTION_KEY = 'your-key-here'
```

**Option 2: User-provided Key (More Secure)**
- Prompt user for encryption key on first run
- Store in electron-store (encrypted)
- Load on startup

**Option 3: Generated Key (Automatic)**
- Generate unique key on first run
- Store securely
- Transparent to user

## 📦 Build Process

The build process:

1. **Builds backend**: `cd ../backend && npm run build` → `backend/dist/`
2. **Builds frontend**: `cd ../frontend && npm run build` → `frontend/dist/`
3. **Packages both** with Electron into a single executable

## 🗂️ File System Structure (Desktop App)

When installed, users get:

```
Application Files/
├── DB Manager.exe (or .app, .AppImage)
└── resources/
    ├── app/
    │   ├── backend/dist/     # Your NestJS app
    │   └── frontend/dist/    # Your React app
    └── database/             # Initial DB structure (copied to user data)

User Data Directory/
└── db-manager-desktop/
    ├── database/
    │   ├── connections.json
    │   └── query-history/
    └── logs/
```

## 🚀 No Changes Required (Current State)

The desktop app works **right now** with your existing code! The integration notes above are **optional enhancements**.

### Why It Works As-Is

1. Backend defaults to `./database/` folder (created automatically)
2. Frontend talks to localhost:3000 (works in Electron)
3. All features work identically to web version

### Recommended Updates

Only needed if you want:
- ✅ Persistent data across app updates
- ✅ OS-standard data locations
- ✅ Multi-user support on same machine
- ✅ Cleaner uninstalls (data in separate location)

## 🔧 Optional Backend Changes

If you want to support desktop mode better, here's a helper:

```typescript
// backend/src/common/utils/paths.util.ts
import * as path from 'path';

export function getDataPath(...segments: string[]): string {
  const basePath = process.env.DATABASE_PATH || 
                   path.join(__dirname, '..', '..', 'database');
  return path.join(basePath, ...segments);
}

// Usage:
// private readonly filePath = getDataPath('connections.json');
// private readonly queryHistoryPath = getDataPath('query-history');
```

## 🎯 Summary

- ✅ **Desktop app works NOW** - no changes required
- 📈 **Optional improvements** - better data handling
- 🔄 **100% compatible** - web version unaffected
- 🚀 **Easy distribution** - single file install

---

Questions? Check the main desktop/README.md or ask!



