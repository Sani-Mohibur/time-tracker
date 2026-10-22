import fs from 'fs';
import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './database/client';
import { SessionService } from './services/session.service';
import { registerTaskIpc } from './ipc/task.ipc';
import { registerSessionIpc } from './ipc/session.ipc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let mainWindow: BrowserWindow | null = null;
const preloadCjs = path.join(__dirname, 'preload.cjs');
const preloadJs = path.join(__dirname, 'preload.js');
const preload = fs.existsSync(preloadCjs) ? preloadCjs : preloadJs;
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = path.join(process.env.DIST, 'index.html');

async function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Time Tracker',
    icon: path.join(process.env.VITE_PUBLIC!, 'icon.ico'),
    width: 1120,
    height: 780,
    minWidth: 850,
    minHeight: 600,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    autoHideMenuBar: true,
  });

  // Log any preload script loading errors
  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('[Main] Preload script error in', preloadPath, ':', error);
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (targetUrl.startsWith('https:') || targetUrl.startsWith('http:')) {
      shell.openExternal(targetUrl);
    }
    return { action: 'deny' };
  });

  if (url) {
    await mainWindow.loadURL(url);
  } else {
    await mainWindow.loadFile(indexHtml);
  }
}

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    console.log('[Main] Initializing database and services...');
    // 1. Initialize SQLite Database
    initDatabase();

    // 2. Perform startup session cleanup (close any dangling sessions from previous dates)
    SessionService.cleanUpStaleRunningSessions();

    // 3. Register IPC Handlers
    registerTaskIpc();
    registerSessionIpc();

    // 4. Set interval for automatic midnight rollover check
    setInterval(() => {
      SessionService.handleMidnightRollover();
    }, 30000); // Check every 30 seconds

    // 5. Create main window
    await createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
