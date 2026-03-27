import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { DatabaseService } from './services/DatabaseService';
import { AuthService } from './services/AuthService';
import { ServerManager } from './services/ServerManager';
import { JavaService } from './services/JavaService';
import { registerAuthHandlers } from './ipc/auth-handlers';
import { registerServerHandlers } from './ipc/server-handlers';
import { registerSettingsHandlers } from './ipc/settings-handlers';
import { registerUpdateHandlers } from './ipc/update-handlers';
import { registerHytaleHandlers } from './ipc/hytale-handlers';
import { registerDownloaderHandlers } from './ipc/downloader-handlers';

const dataDir = path.join(app.getPath('userData'), 'data');
const serversDir = path.join(app.getPath('userData'), 'servers');

let mainWindow: BrowserWindow | null = null;
let db: DatabaseService;
let manager: ServerManager;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a2e',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  // Initialise services
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  db = new DatabaseService(dataDir, migrationsDir);

  // Integrity check on startup
  if (!db.checkIntegrity()) {
    console.error('Database integrity check failed');
  }

  const auth = new AuthService(db);
  manager = new ServerManager(db, serversDir);

  // Register IPC handlers
  registerAuthHandlers(auth);
  registerServerHandlers(manager);
  registerSettingsHandlers(db);
  registerUpdateHandlers();
  registerHytaleHandlers();
  registerDownloaderHandlers(serversDir);

  // java:check handler
  ipcMain.handle('java:check', async () => {
    const result = await JavaService.checkJava();
    return { found: result.found, version: result.version, supported: result.supported };
  });

  // window control handlers
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  // Forward console output and status changes to renderer
  const originalListServers = manager.listServers.bind(manager);
  // Wire up console output forwarding for running servers
  // We intercept startServer by wrapping status changes
  const originalOnConsoleOutput = manager.onConsoleOutput.bind(manager);
  const originalOnStatusChange = manager.onStatusChange.bind(manager);

  // Patch manager to forward events to renderer after window is created
  const _origStart = manager.startServer.bind(manager);
  manager.startServer = (id: number, javaPath?: string) => {
    _origStart(id, javaPath);
    // After starting, subscribe to console output and status changes for this server
    originalOnConsoleOutput(id, (line: string) => {
      mainWindow?.webContents.send('servers:consoleOutput', id, line);
    });
    originalOnStatusChange(id, (status) => {
      mainWindow?.webContents.send('servers:statusChange', id, status);
    });
  };

  createWindow();
});

app.on('before-quit', () => {
  manager?.stopAll();
  db?.close();
});

app.on('window-all-closed', () => app.quit());
