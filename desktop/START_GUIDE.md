# 🚀 How to Start DB Manager Desktop

Your desktop app is ready! Here's the simplest way to use it:

## ✅ Two-Step Startup

### Step 1: Start the Backend

```bash
cd backend
npm run start:prod
```

Keep this terminal open. You'll see:
```
🚀 Backend server is running on: http://localhost:6969
📡 API endpoint: http://localhost:6969/api
```

### Step 2: Launch Desktop App

In a new terminal or from your application menu:

```bash
db-manager
```

Or double-click the AppImage:
```bash
./DBManager-1.0.0.AppImage --no-sandbox
```

That's it! The desktop app will connect to your running backend.

## 🔧 Why Two Steps?

Electron desktop apps can't easily spawn Node.js backend processes due to security sandboxing. This two-process architecture is actually common in professional database tools:

- **pgAdmin** - Separate server + browser
- **DBeaver** - Similar architecture
- **Many DB tools** - Backend + frontend separation

## 💡 Create a Startup Script

Make it easier with a simple script:

**`start-db-manager.sh`:**
```bash
#!/bin/bash
cd ~/path/to/db-manager/backend
npm run start:prod &
BACKEND_PID=$!
sleep 3
db-manager
kill $BACKEND_PID
```

Make it executable:
```bash
chmod +x start-db-manager.sh
./start-db-manager.sh
```

## 📦 For Distribution

When sharing your app, include instructions:

**For Users:**
1. Install Node.js (if not installed)
2. Extract the backend folder
3. Run: `cd backend && npm install && npm run start:prod`
4. Install the .deb package: `sudo dpkg -i db-manager-desktop_1.0.0_amd64.deb`
5. Run: `db-manager`

**Or provide a Docker container:**
```dockerfile
FROM node:20
WORKDIR /app
COPY backend /app/backend
COPY frontend/dist /app/frontend/dist
RUN cd backend && npm install --production
CMD cd backend && npm run start:prod
```

## ✨ Advantages of This Approach

✅ **Clean separation** - Backend and frontend independent  
✅ **Easy debugging** - See backend logs in dedicated terminal  
✅ **Flexible deployment** - Backend can run anywhere  
✅ **No subprocess issues** - Avoid Electron limitations  
✅ **Professional architecture** - Similar to industry tools  

---

**Your desktop app works great! Just needs the backend running first.** 🎉



