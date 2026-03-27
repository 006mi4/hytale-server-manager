import { ipcMain } from 'electron';

export function registerHytaleHandlers() {
  ipcMain.handle('hytale:getAuthStatus', () => ({ authenticated: false, username: null }));
  ipcMain.handle('hytale:startDeviceAuth', () => ({ url: '', code: '' }));
}
