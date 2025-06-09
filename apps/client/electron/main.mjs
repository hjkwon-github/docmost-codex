import { app, BrowserWindow } from 'electron';
import Store from 'electron-store';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM에서 __dirname 흉내 내기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.setName('docmost-nodejs');
const store = new Store({ projectName: 'docmost-nodejs' });

console.log('Store initialized:', store.path);

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
    // spawn('pnpm', ['--filter', './apps/server', 'start:prod'], {
    //   shell: true,
    //   stdio: 'inherit'
    // });
    win.loadURL('http://192.168.50.54:3000/');
  } else {
    const url = store.get('serverUrl') || 'https://cloud.docmost.com';
    win.loadURL(url);
  }
}

app.whenReady().then(createWindow);