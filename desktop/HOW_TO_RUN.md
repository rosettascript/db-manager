# 🚀 How to Run Your DB Manager Desktop App

You have successfully built your desktop application!

## ✅ What You Have

Location: `desktop/dist/`

- **`DB Manager-1.0.0.AppImage`** (100 MB) - Universal Linux app
- **`db-manager-desktop_1.0.0_amd64.deb`** (70 MB) - Debian/Ubuntu installer
- **`run-db-manager.sh`** - Helper script (recommended)

## 🚀 Running the App

### Option 1: Using the Helper Script (Recommended)

```bash
cd desktop/dist
./run-db-manager.sh
```

This automatically handles the sandbox flag.

### Option 2: Direct AppImage

```bash
cd desktop/dist
chmod +x "DB Manager-1.0.0.AppImage"
./"DB Manager-1.0.0.AppImage" --no-sandbox
```

**Note:** The `--no-sandbox` flag is required for AppImages.

### Option 3: Install the .deb Package

```bash
cd desktop/dist
sudo dpkg -i db-manager-desktop_1.0.0_amd64.deb

# Then run from anywhere:
db-manager-desktop
```

## 📊 What the App Does

When you run it:
1. ✅ Automatically starts the NestJS backend (Port 6969)
2. ✅ Opens Electron window with your React frontend
3. ✅ Connects to your PostgreSQL databases
4. ✅ Stores data in: `~/.config/db-manager-desktop/database/`

## ⚙️ Configuration

Your app automatically uses:
- **Backend Port:** 6969 (from `backend/.env`)
- **Encryption Key:** From `backend/.env`
- **All settings:** Preserved from your `.env` files

## 🐛 Troubleshooting

### "sandbox error"
→ Use `./run-db-manager.sh` or add `--no-sandbox` flag

### "Cannot find module"
→ Rebuild: `cd desktop && npm run build:linux`

### "Port already in use"
→ Check if port 6969 is free: `lsof -i :6969`

### Check what ports will be used:
```bash
cd desktop
npm run check-ports
```

## 🔄 Updating the App

Made changes to your code?

```bash
# 1. Make changes to backend/ or frontend/
# 2. Rebuild desktop app
cd desktop
npm run build:linux

# 3. Test the new build
cd dist
./run-db-manager.sh
```

## 📦 Sharing Your App

To share with others, send them:
- **`DB Manager-1.0.0.AppImage`** (no installation needed)
- **OR** `db-manager-desktop_1.0.0_amd64.deb` (for Debian/Ubuntu users)

They just need to:
1. Download the file
2. Make it executable: `chmod +x "DB Manager-1.0.0.AppImage"`
3. Run it: `./"DB Manager-1.0.0.AppImage" --no-sandbox`

## 🎨 Customization

### Change App Name/Version
Edit `desktop/package.json`:
```json
{
  "productName": "My Custom Name",
  "version": "2.0.0"
}
```

### Add Custom Icon
1. Place your icons in `desktop/assets/`:
   - `icon.png` (512x512)
   - `icon.ico` (Windows)
   - `icon.icns` (macOS)
2. Rebuild

### Change Ports
Edit your `.env` files:
- Backend: `backend/.env` → `PORT=XXXX`
- Frontend: `frontend/.env` → `VITE_PORT=YYYY`

## ✨ Features

Your desktop app includes:
- ✅ All web app features
- ✅ Offline capable
- ✅ Single executable
- ✅ Auto-starts backend
- ✅ Local data storage
- ✅ No browser needed

## 📝 Development vs Production

### Development Mode
```bash
# Terminal 1
cd backend && npm run start:dev

# Terminal 2
cd frontend && npm run dev

# Terminal 3
cd desktop && npm run dev
```

### Production Build
```bash
cd desktop
npm run build:linux
# App in: dist/DB Manager-1.0.0.AppImage
```

## 🆘 Need Help?

1. Check `desktop/README.md` for full documentation
2. Run `npm run check-ports` to verify configuration
3. Check the console output when running the app
4. Look at other docs in the `desktop/` folder

---

**Enjoy your desktop app!** 🎉



