import log from 'electron-log';
log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.file.level = 'info';

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { DatabaseService } from './services/DatabaseService';
import { AuthService } from './services/AuthService';
import { ServerManager } from './services/ServerManager';
import { JavaService } from './services/JavaService';
import { HytaleAuthService } from './services/HytaleAuthService';
import { DownloaderService } from './services/DownloaderService';
import { UpdateService } from './services/UpdateService';
import { registerAuthHandlers } from './ipc/auth-handlers';
import { registerServerHandlers } from './ipc/server-handlers';
import { registerSettingsHandlers } from './ipc/settings-handlers';
import { registerUpdateHandlers } from './ipc/update-handlers';
import { registerHytaleHandlers } from './ipc/hytale-handlers';
import { registerDownloaderHandlers } from './ipc/downloader-handlers';

const dataDir = path.join(app.getPath('userData'), 'data');
const serversDir = path.join(app.getPath('userData'), 'servers');
const toolsDir = path.join(app.getPath('userData'), 'tools');

let mainWindow: BrowserWindow | null = null;
let db: DatabaseService;
let manager: ServerManager;
let updateService: UpdateService;

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
  const migrationsDir = path.join(__dirname, 'migrations');
  db = new DatabaseService(dataDir, migrationsDir);

  // Integrity check on startup
  if (!db.checkIntegrity()) {
    log.error('Database integrity check failed');
  }

  const auth = new AuthService(db);
  manager = new ServerManager(db, serversDir);
  const hytaleAuth = new HytaleAuthService(db);
  const downloader = new DownloaderService(toolsDir, serversDir);
  updateService = new UpdateService();

  // Register IPC handlers
  registerAuthHandlers(auth);
  registerServerHandlers(manager);
  registerSettingsHandlers(db);
  registerUpdateHandlers(updateService);
  registerHytaleHandlers(hytaleAuth);
  registerDownloaderHandlers(downloader, () => mainWindow);

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

  updateService.setWindow(mainWindow!);
  setTimeout(() => updateService.check(), 5000);
});

app.on('before-quit', () => {
  manager?.stopAll();
  db?.close();
});

app.on('window-all-closed', () => app.quit());
