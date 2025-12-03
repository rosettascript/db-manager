// CRITICAL: Set temp directory BEFORE requiring electron!
// Chromium initializes as soon as electron is required and tries to access /tmp
const path = require('path');
const fs = require('fs');
const os = require('os');

// Use a predictable path in user's home directory (before we have access to app.getPath)
const homeDir = os.homedir();
const customTempDir = path.join(homeDir, '.config', 'db-manager-desktop', 'tmp');
if (!fs.existsSync(customTempDir)) {
  fs.mkdirSync(customTempDir, { recursive: true });
}
process.env.TMPDIR = customTempDir;
process.env.TEMP = customTempDir;
process.env.TMP = customTempDir;
console.log('📁 Custom temp directory set (BEFORE Electron):', customTempDir);

// NOW we can safely require electron
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn, fork } = require('child_process');
const http = require('http');
const express = require('express');

let mainWindow;
let backendProcess;
let frontendServer;
const isDev = process.argv.includes('--dev');
const FRONTEND_SERVER_PORT = 8888; // Local HTTP server for frontend files

// Minimal flags - only what's absolutely necessary
function setupElectronFlags() {
  if (!isDev) {
    try {
      // Only set no-sandbox - that's it!
      app.commandLine.appendSwitch('no-sandbox');
      // Disable /dev/shm usage to avoid Chromium shared memory errors
      app.commandLine.appendSwitch('disable-dev-shm-usage');
      
      console.log('🔓 Sandbox disabled for packaged app');
    } catch (error) {
      console.warn('⚠️  Could not set Electron flags:', error.message);
    }
  }
}

// Backend server port - will be read from .env
let BACKEND_PORT = null;

/**
 * Read port from backend .env file
 */
function getBackendPort() {
  // Try multiple possible locations for .env
  const possiblePaths = isDev
    ? [path.join(__dirname, '..', 'backend', '.env')]
    : [path.join(process.resourcesPath, 'app', 'backend', '.env')];
  
  for (const envPath of possiblePaths) {
    console.log(`🔍 Looking for backend .env at: ${envPath}`);
    
    try {
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const portMatch = envContent.match(/^PORT=(\d+)/m);
        if (portMatch && portMatch[1]) {
          const port = parseInt(portMatch[1], 10);
          console.log(`✅ Found PORT=${port} in backend/.env`);
          return port;
        } else {
          console.log(`⚠️  No PORT found in .env at ${envPath}`);
        }
      }
    } catch (error) {
      console.warn(`❌ Could not read .env at ${envPath}:`, error.message);
    }
  }
  
  console.log(`⚠️  backend/.env not found in any location`);
  // Fallback: default from backend/src/main.ts
  console.log(`ℹ️  Using backend default PORT=3000`);
  return 3000;
}

/**
 * Read frontend port from .env file
 */
function getFrontendPort() {
  const frontendPath = path.join(__dirname, '..', 'frontend');
  const envPath = path.join(frontendPath, '.env');
  
  console.log(`🔍 Looking for frontend .env at: ${envPath}`);
  
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const portMatch = envContent.match(/^VITE_PORT=(\d+)/m);
      if (portMatch && portMatch[1]) {
        const port = parseInt(portMatch[1], 10);
        console.log(`✅ Found VITE_PORT=${port} in frontend/.env`);
        return port;
      } else {
        console.log(`⚠️  No VITE_PORT found in frontend/.env, checking vite.config default...`);
      }
    } else {
      console.log(`⚠️  frontend/.env not found at ${envPath}`);
    }
  } catch (error) {
    console.warn('❌ Could not read frontend .env file:', error.message);
  }
  
  // Fallback: default from vite.config.ts
  console.log(`ℹ️  Using vite.config.ts default PORT=8080`);
  return 8080;
}

/**
 * Start the NestJS backend server (in-process)
 */
async function startBackendServer() {
  try {
    // Read the port from .env file
    BACKEND_PORT = getBackendPort();
    
    let backendPath;
    if (isDev) {
      backendPath = path.join(__dirname, '..', 'backend');
    } else {
      // In packaged app, backend is in extraResources
      backendPath = path.join(process.resourcesPath, 'app', 'backend');
    }

    // Read existing .env file to preserve settings
    let envVars = {};
    const possibleEnvPaths = isDev
      ? [path.join(backendPath, '.env')]
      : [path.join(process.resourcesPath, 'app', 'backend', '.env')];
    
    for (const envPath of possibleEnvPaths) {
      if (fs.existsSync(envPath)) {
        console.log(`✅ Loading .env from: ${envPath}`);
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
          const match = line.match(/^([^#=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            envVars[key] = value;
          }
        });
        break;
      }
    }
    
    // Ensure database directory exists
    const databasePath = path.join(app.getPath('userData'), 'database');
    if (!fs.existsSync(databasePath)) {
      fs.mkdirSync(databasePath, { recursive: true });
      console.log(`✅ Created database directory: ${databasePath}`);
      
      // Copy initial database structure if available
      const sourcePath = isDev
        ? path.join(__dirname, '..', 'backend', 'database')
        : path.join(process.resourcesPath, 'database');
      
      if (fs.existsSync(sourcePath)) {
        console.log(`📋 Copying initial database files from: ${sourcePath}`);
        copyDirectory(sourcePath, databasePath);
      }
    }
    
    // Set environment variables for the backend
    const env = {
      ...process.env,
      ...envVars, // Include all vars from .env file
      PORT: BACKEND_PORT, // Use the detected port
      NODE_ENV: isDev ? 'development' : 'production',
      ELECTRON_APP: 'true',
      // Use app data directory for database files
      DATABASE_PATH: databasePath,
      // Override connection file path to use DATABASE_PATH
      CONNECTIONS_FILE_PATH: path.join(databasePath, 'connections.json')
    };


    console.log('🚀 Starting backend automatically...');
    console.log('Backend path:', backendPath);
    console.log('Database path:', env.DATABASE_PATH);
    
    // Use system Node.js to spawn backend
    const nodePath = '/usr/bin/node';
    const mainJsPath = path.join(backendPath, 'dist', 'main.js');
    
    return new Promise((resolve, reject) => {
      backendProcess = spawn(nodePath, [mainJsPath], {
        env,
        cwd: backendPath,
        stdio: 'ignore', // Ignore stdio to avoid pipe errors
        detached: false
      });

      backendProcess.on('error', (error) => {
        console.error('Failed to start backend:', error);
        reject(error);
      });

      // Give it a few seconds to start, then resolve
      setTimeout(() => {
        console.log('✅ Backend started!');
        resolve();
      }, 3000);
    });
  } catch (error) {
    console.error('❌ Backend startup failed:', error);
    throw error;
  }
}

/**
 * Copy directory recursively
 */
function copyDirectory(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const files = fs.readdirSync(source);
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
}

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Disable web security to allow file:// protocol to work fully
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'DB Manager',
    show: true, // Show immediately
  });

  // Remove menu bar
  mainWindow.setMenuBarVisibility(false);

  // Load the frontend via HTTP (not file://) so html-to-image works!
  let frontendPath;
  if (isDev) {
    // In development, check if Vite dev server is running
    const devServerPort = getFrontendPort();
    const builtFrontendPath = path.join(__dirname, '..', 'frontend', 'dist');
    
    // Try to use built frontend via local HTTP server
    if (fs.existsSync(builtFrontendPath)) {
      frontendPath = `http://localhost:${FRONTEND_SERVER_PORT}`;
      console.log('📦 Using built frontend via local HTTP server (for html-to-image compatibility)');
    } else {
      frontendPath = `http://localhost:${devServerPort}`;
      console.log('🔥 Using Vite dev server');
    }
  } else {
    // In packaged app, serve via local HTTP server too
    frontendPath = `http://localhost:${FRONTEND_SERVER_PORT}`;
  }

  console.log(`🌐 Loading frontend from: ${frontendPath}`);
  
  mainWindow.loadURL(frontendPath);

  // Open DevTools only in development mode
  if (isDev || process.env.DEBUG_DESKTOP) {
    mainWindow.webContents.openDevTools();
    console.log('🔍 DevTools opened for debugging');
  }
  
  
  
  
  // Handle file downloads
  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    // Get the default download path
    const downloadPath = path.join(app.getPath('downloads'), item.getFilename());
    
    console.log(`💾 Download started: ${item.getFilename()}`);
    
    // Set the save path
    item.setSavePath(downloadPath);
    
    item.on('updated', (event, state) => {
      if (state === 'interrupted') {
        console.log('❌ Download interrupted');
      } else if (state === 'progressing') {
        if (item.isPaused()) {
          console.log('⏸️  Download paused');
        } else {
          const percent = Math.round((item.getReceivedBytes() / item.getTotalBytes()) * 100);
          console.log(`📥 Downloaded ${percent}%`);
        }
      }
    });
    
    item.once('done', (event, state) => {
      if (state === 'completed') {
        console.log(`✅ Download completed: ${downloadPath}`);
      } else {
        console.log(`❌ Download failed: ${state}`);
      }
    });
  });

  // Log any console messages from the renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}]:`, message);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/33f2f112-059c-4e50-a06d-531fbaf44b2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:298',message:'Renderer console message',data:{level,message,line,sourceId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Check if backend is running (with retry logic)
 */
async function checkBackend(maxRetries = 3) {
  BACKEND_PORT = getBackendPort();
  const http = require('http');
  
  for (let i = 0; i < maxRetries; i++) {
    const isRunning = await new Promise((resolve) => {
      const req = http.get(`http://localhost:${BACKEND_PORT}/api/health`, (res) => {
        resolve(res.statusCode === 200);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
    });
    
    if (isRunning) {
      return true;
    }
    
    if (i < maxRetries - 1) {
      console.log(`⏳ Backend not ready yet, retrying in 2 seconds... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return false;
}

/**
 * Start local HTTP server for frontend files (so html-to-image works!)
 */
async function startFrontendServer() {
  return new Promise((resolve, reject) => {
    const app = express();
    
    // Determine frontend path
    let frontendDistPath;
    if (isDev) {
      frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
    } else {
      frontendDistPath = path.join(process.resourcesPath, 'app', 'frontend', 'dist');
    }
    
    console.log(`🌐 Frontend dist path: ${frontendDistPath}`);
    
    // Serve static files with proper MIME types
    app.use(express.static(frontendDistPath, {
      setHeaders: (res, filepath) => {
        if (filepath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (filepath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        } else if (filepath.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html');
        }
      }
    }));
    
    // SPA fallback - serve index.html for all other routes
    app.use((req, res) => {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
    
    frontendServer = app.listen(FRONTEND_SERVER_PORT, 'localhost', () => {
      console.log(`✅ Frontend server started on http://localhost:${FRONTEND_SERVER_PORT}`);
      resolve();
    });
    
    frontendServer.on('error', (error) => {
      console.error('❌ Frontend server error:', error);
      reject(error);
    });
  });
}

/**
 * Initialize the application
 */
async function initialize() {
  try {
    console.log('');
    console.log('🚀 ===============================================');
    console.log('🚀  DB Manager Desktop - Starting Application');
    console.log('🚀 ===============================================');
    console.log('');
    
    // Start frontend HTTP server (so html-to-image works!)
    console.log('🌐 Starting frontend HTTP server...');
    const frontendDistPath = isDev 
      ? path.join(__dirname, '..', 'frontend', 'dist')
      : path.join(process.resourcesPath, 'app', 'frontend', 'dist');
    
    if (fs.existsSync(frontendDistPath)) {
      try {
        await startFrontendServer();
      } catch (error) {
        console.error('⚠️  Frontend server issue:', error.message);
      }
    } else {
      console.log('⚠️  Frontend dist not found, assuming Vite dev server will be used');
    }
    
    // Always try to start backend - it's quick and handles existing instances
    console.log('🚀 Starting backend...');
    
    try {
      await startBackendServer();
      // Wait a bit longer for backend to be fully ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Backend ready!');
    } catch (error) {
      console.error('⚠️  Backend startup issue (continuing anyway):', error.message);
      // Continue anyway - backend might already be running
    }
    
    // Create the window
    createWindow();
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    dialog.showErrorBox(
      'Initialization Error',
      `Failed to start the application: ${error.message}`
    );
    app.quit();
  }
}

/**
 * Application lifecycle events
 */
app.whenReady().then(() => {
  setupElectronFlags();
  initialize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  
  // Kill backend process
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (e) {
      // Ignore errors
    }
  }
  
  // Close frontend server
  if (frontendServer) {
    try {
      frontendServer.close();
    } catch (e) {
      // Ignore errors
    }
  }
});

/**
 * IPC Handlers
 */
ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('get-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-backend-port', () => {
  return BACKEND_PORT;
});

ipcMain.handle('download-file', async (event, url, filename) => {
  try {
    console.log(`📥 Download requested: ${filename}`);
    
    // Use the main window to trigger download
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.downloadURL(url);
      return { success: true };
    }
    
    return { success: false, error: 'Window not available' };
  } catch (error) {
    console.error('Download error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-file', async (event, base64Data, filename) => {
  try {
    console.log(`💾 Saving file: ${filename}`);
    
    // Get Downloads folder path
    const downloadsPath = app.getPath('downloads');
    const filePath = path.join(downloadsPath, filename);
    
    // Extract base64 data (remove data URL prefix if present)
    let base64String = base64Data;
    if (base64Data.includes(',')) {
      base64String = base64Data.split(',')[1];
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64String, 'base64');
    
    // Write file to Downloads folder
    fs.writeFileSync(filePath, buffer);
    
    console.log(`✅ File saved successfully: ${filePath}`);
    return { success: true, path: filePath };
  } catch (error) {
    console.error('❌ Save file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('capture-screenshot', async (event, bounds) => {
  try {
    console.log(`📸 Capturing screenshot with bounds:`, bounds);
    
    if (!mainWindow || !mainWindow.webContents) {
      return { success: false, error: 'Window not available' };
    }
    
    // Capture specific region if bounds provided, otherwise full page  
    // capturePage automatically captures at the display's device pixel ratio (high DPI)
    let image;
    if (bounds && bounds.x !== undefined && bounds.y !== undefined && bounds.width > 0 && bounds.height > 0) {
      const rect = {
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height)
      };
      console.log(`📸 Capturing region:`, rect);
      console.log(`📸 Device pixel ratio:`, require('electron').screen.getPrimaryDisplay().scaleFactor);
      
      // Electron automatically captures at device pixel ratio (usually 1-2x on most displays)
      image = await mainWindow.webContents.capturePage(rect);
      console.log(`📸 Captured size:`, image.getSize());
    } else {
      console.log(`📐 Capturing entire page`);
      image = await mainWindow.webContents.capturePage();
    }
    
    const pngBuffer = image.toPNG();
    const base64 = pngBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;
    
    console.log(`✅ Screenshot captured: ${pngBuffer.length} bytes`);
    return { success: true, dataUrl };
  } catch (error) {
    console.error('❌ Screenshot capture error:', error);
    return { success: false, error: error.message };
  }
});

