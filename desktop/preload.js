const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose protected methods that allow the renderer process to use
 * the ipcRenderer without exposing the entire object
 */
contextBridge.exposeInMainWorld('electronAPI', {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),
  isElectron: true
});

// Add a global flag to detect Electron environment
window.isElectron = true;



