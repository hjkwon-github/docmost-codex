const { app, BrowserWindow } = require('electron');
const Store = require('electron-store');
const { spawn } = require('child_process');
const path = require('path');

const store = new Store();

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const mode = store.get('mode') || 'remote';

  if (mode === 'local') {
    spawn('pnpm', ['--filter', './apps/server', 'start:prod'], {
      shell: true,
      stdio: 'inherit'
    });
    win.loadURL('http://localhost:3000');
  } else {
    const url = store.get('serverUrl') || 'https://cloud.docmost.com';
    win.loadURL(url);
  }
}

app.whenReady().then(createWindow);
