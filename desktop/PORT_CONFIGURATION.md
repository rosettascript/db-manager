# 🔌 Port Configuration - Desktop App

The desktop app **automatically detects** the ports used by your backend and frontend!

## 🔍 Quick Check

Want to see what ports will be used? Run this:

```bash
cd desktop
npm run check-ports
```

This script reads your `.env` files and shows exactly what the desktop app will detect!

## 🎯 How It Works

### Backend Port

The desktop app reads your `backend/.env` file to find the PORT setting:

```bash
# backend/.env
PORT=3000  # ← Desktop app reads this automatically
```

**Default:** If no PORT is found, it uses `3000`

### Frontend Port (Dev Mode Only)

In development mode, the desktop app reads `frontend/.env` for VITE_PORT:

```bash
# frontend/.env (optional)
VITE_PORT=8080  # ← Desktop app reads this in dev mode
```

**Default:** If no VITE_PORT is found, it uses `8080` (your vite.config.ts default)

## 📝 Configuration

### Your Current Setup

Based on your `vite.config.ts`:
- **Frontend dev port:** `8080` (or `VITE_PORT` from env)
- **Backend port:** Whatever is in `backend/.env` (default: `3000`)

### No Changes Needed! ✅

The desktop app will:
1. Read `backend/.env` → find PORT
2. Start backend on that port
3. (Dev mode) Read `frontend/.env` → find VITE_PORT
4. Connect everything automatically

## 🧪 Testing Different Ports

### Change Backend Port

```bash
# backend/.env
PORT=5000  # Change this
```

Desktop app will automatically use port 5000!

### Change Frontend Port (Dev Only)

```bash
# frontend/.env
VITE_PORT=3001  # Change this
```

Desktop app dev mode will connect to port 3001!

## 🚀 Production Build

In production builds (the `.exe`, `.dmg`, `.AppImage`):
- Backend port: Read from bundled `.env` file
- Frontend: Bundled static files (no port needed)

The `.env` file is **included** in the build, so your port configuration travels with the app!

## 🔍 Troubleshooting

### "Backend won't start"

Check your `backend/.env` file:
```bash
cat backend/.env | grep PORT
```

Make sure the port isn't already in use:
```bash
# Linux/Mac
lsof -i :PORT_NUMBER

# Windows (PowerShell)
netstat -ano | findstr :PORT_NUMBER
```

### "Frontend won't load" (Dev Mode)

Make sure your frontend dev server is running:
```bash
cd frontend
npm run dev
```

Check it's running on the expected port (look for the URL in the terminal output).

### Custom Port Setup

If you want to use a specific port:

1. **Backend:**
   ```bash
   # backend/.env
   PORT=9999
   ```

2. **Frontend (dev):**
   ```bash
   # frontend/.env
   VITE_PORT=9998
   ```

3. Rebuild desktop app:
   ```bash
   cd desktop
   npm run build
   ```

## 💡 Best Practices

### For Development
- Use the same ports as your normal dev workflow
- Desktop app will detect them automatically
- No configuration needed!

### For Distribution
- Standard ports (3000, 8080, etc.) work fine
- The backend runs on `localhost` only (secure)
- Users won't see or need to know about ports

### Port Conflicts
- If the configured port is busy, the app will fail to start
- Solution: Close the conflicting service or change PORT in .env

## 📊 Port Detection Flow

```
Desktop App Starts
       ↓
Read backend/.env
       ↓
Extract PORT=XXXX
       ↓
Set BACKEND_PORT=XXXX
       ↓
Start Backend on PORT XXXX
       ↓
[Dev Mode Only]
Read frontend/.env
Extract VITE_PORT=YYYY
Connect to localhost:YYYY
       ↓
[Production Mode]
Load bundled frontend
(no port needed)
       ↓
App Ready! 🎉
```

## 🎓 Advanced: Override in Code

If you need to hardcode a port, edit `desktop/main.js`:

```javascript
// Find this function:
function getBackendPort() {
  // Add at the top to force a port:
  return 5000; // Force port 5000
  
  // Or keep the auto-detection...
}
```

But **auto-detection is recommended** - it respects your configuration!

---

## Summary

✅ Desktop app **automatically reads** your `.env` files  
✅ No manual port configuration needed  
✅ Works with any port you choose  
✅ Respects your existing development setup  

**Just make sure your `backend/.env` has the PORT setting, and you're good to go!** 🚀

