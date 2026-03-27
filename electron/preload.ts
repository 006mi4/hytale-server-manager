import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  auth: {
    register: (username: string, password: string) =>
      ipcRenderer.invoke('auth:register', username, password),
    login: (username: string, password: string, remember: boolean) =>
      ipcRenderer.invoke('auth:login', username, password, remember),
    checkSession: () => ipcRenderer.invoke('auth:checkSession'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    hasUsers: () => ipcRenderer.invoke('auth:hasUsers'),
  },

  servers: {
    list: () => ipcRenderer.invoke('servers:list'),
    create: (name: string) => ipcRenderer.invoke('servers:create', name),
    delete: (id: number) => ipcRenderer.invoke('servers:delete', id),
    start: (id: number) => ipcRenderer.invoke('servers:start', id),
    stop: (id: number) => ipcRenderer.invoke('servers:stop', id),
    restart: (id: number) => ipcRenderer.invoke('servers:restart', id),
    sendCommand: (id: number, command: string) =>
      ipcRenderer.invoke('servers:sendCommand', id, command),
    getConfig: (id: number) => ipcRenderer.invoke('servers:getConfig', id),
    updateConfig: (id: number, config: object) =>
      ipcRenderer.invoke('servers:updateConfig', id, config),
    getConsoleBuffer: (id: number) => ipcRenderer.invoke('servers:getConsoleBuffer', id),
    onConsoleOutput: (callback: (serverId: number, line: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, serverId: number, line: string) =>
        callback(serverId, line);
      ipcRenderer.on('servers:consoleOutput', listener);
      return () => ipcRenderer.removeListener('servers:consoleOutput', listener);
    },
    onStatusChange: (callback: (serverId: number, status: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, serverId: number, status: string) =>
        callback(serverId, status);
      ipcRenderer.on('servers:statusChange', listener);
      return () => ipcRenderer.removeListener('servers:statusChange', listener);
    },
  },

  hytale: {
    getAuthStatus: () => ipcRenderer.invoke('hytale:getAuthStatus'),
    startDeviceAuth: () => ipcRenderer.invoke('hytale:startDeviceAuth'),
    pollForToken: (deviceCode: string, interval: number, expiresIn: number) =>
      ipcRenderer.invoke('hytale:pollForToken', deviceCode, interval, expiresIn),
    refreshToken: () => ipcRenderer.invoke('hytale:refreshToken'),
    onAuthComplete: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('hytale:authComplete', listener);
      return () => ipcRenderer.removeListener('hytale:authComplete', listener);
    },
  },

  downloader: {
    downloadServer: () => ipcRenderer.invoke('downloader:downloadServer'),
    checkFiles: () => ipcRenderer.invoke('downloader:checkFiles'),
    onProgress: (callback: (progress: { percent: number; stage: string }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, progress: { percent: number; stage: string }) =>
        callback(progress);
      ipcRenderer.on('downloader:progress', listener);
      return () => ipcRenderer.removeListener('downloader:progress', listener);
    },
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: object) => ipcRenderer.invoke('settings:update', settings),
  },

  updates: {
    check: () => ipcRenderer.invoke('updates:check'),
    download: () => ipcRenderer.invoke('updates:download'),
    install: () => ipcRenderer.invoke('updates:install'),
    onUpdateAvailable: (callback: (info: { version: string; releaseNotes: string }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, info: { version: string; releaseNotes: string }) =>
        callback(info);
      ipcRenderer.on('updates:available', listener);
      return () => ipcRenderer.removeListener('updates:available', listener);
    },
  },

  java: {
    check: () => ipcRenderer.invoke('java:check'),
  },

  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
});
