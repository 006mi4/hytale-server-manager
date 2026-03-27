import { ipcMain } from 'electron';
import { UpdateService } from '../services/UpdateService';

export function registerUpdateHandlers(updateService: UpdateService) {
  ipcMain.handle('updates:check', () => updateService.check());
  ipcMain.handle('updates:download', () => updateService.download());
  ipcMain.handle('updates:install', () => updateService.install());
}
