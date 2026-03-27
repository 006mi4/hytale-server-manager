import { ipcMain } from 'electron';

export function registerUpdateHandlers() {
  ipcMain.handle('updates:check', () => null);
  ipcMain.handle('updates:download', () => {});
  ipcMain.handle('updates:install', () => {});
}
