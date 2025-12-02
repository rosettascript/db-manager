const { app, BrowserWindow } = require('electron');

console.log('Electron app object:', typeof app);
console.log('Electron BrowserWindow:', typeof BrowserWindow);

app.whenReady().then(() => {
  console.log('Electron app is ready!');

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile('index.html');
});