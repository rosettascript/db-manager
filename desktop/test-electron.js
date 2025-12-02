const { app, BrowserWindow } = require('electron');

console.log('Electron app object:', typeof app);
console.log('Electron app.whenReady:', typeof app.whenReady);

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

  win.loadFile('desktop/main.js');
});