# 🚀 Quick Start Guide - Desktop App

Get your desktop app up and running in 5 minutes!

## 📋 Prerequisites

- Node.js 18+ installed
- Your backend and frontend already working (web version)
- `.env` files configured in backend/ and frontend/ (if needed)

## 🔍 Quick Check (Optional but Recommended)

See what ports your desktop app will use:

```bash
cd desktop
npm install  # if not already done
npm run check-ports
```

This reads your `.env` files and shows the detected configuration!

## 🏃 3 Simple Steps

### Step 1: Install Desktop Dependencies

```bash
cd desktop
npm install
```

This installs Electron and the build tools (~200 MB).

### Step 2: Build Your Desktop App

```bash
npm run build
```

This will:
1. ✅ Build your backend (NestJS)
2. ✅ Build your frontend (React/Vite)
3. ✅ Package everything into a desktop app

**⏱️ Takes:** ~2-5 minutes depending on your machine

### Step 3: Find & Run Your App

**Windows:**
```
desktop/dist/DB Manager Setup 1.0.0.exe
```
Double-click to install and run!

**Linux:**
```bash
desktop/dist/DB-Manager-1.0.0.AppImage
chmod +x desktop/dist/DB-Manager-1.0.0.AppImage
./desktop/dist/DB-Manager-1.0.0.AppImage
```

**macOS:**
```
desktop/dist/DB Manager-1.0.0.dmg
```
Double-click, drag to Applications folder!

---

## 🎉 That's It!

You now have a standalone desktop application that:
- ✅ Runs without `npm run dev`
- ✅ No terminal needed
- ✅ Works offline
- ✅ Single-click to launch

---

## 🧪 Want to Test First? (Development Mode)

If you want to test before building:

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend  
cd frontend
npm run dev

# Terminal 3 - Electron
cd desktop
npm run dev
```

This opens Electron pointing to your dev servers. Perfect for testing!

---

## 🐛 Troubleshooting

**"Cannot find module"**
```bash
cd desktop
npm install
```

**"Port 3000 already in use"**
- Stop your backend dev server first
- Or just do a production build (it handles the port automatically)

**"Backend dist not found"**
```bash
cd backend
npm run build
```

**"Frontend dist not found"**
```bash
cd frontend
npm run build
```

---

## 📤 Share Your App

After building, find the installer in `desktop/dist/`:

- **Windows**: `DB Manager Setup 1.0.0.exe` (~80-100 MB)
- **Linux**: `DB-Manager-1.0.0.AppImage` (~80-100 MB)
- **macOS**: `DB Manager-1.0.0.dmg` (~80-100 MB)

Just send this file to anyone - they can install and run your app!

---

## 🎨 Next Steps

1. **Custom Icon**: Add your icons to `desktop/assets/`
2. **App Name**: Change in `desktop/package.json` → `productName`
3. **Version**: Update `version` field in `desktop/package.json`

See the full README.md for more options!

---

**Questions?** Check `desktop/README.md` or the `INTEGRATION_NOTES.md` file!

