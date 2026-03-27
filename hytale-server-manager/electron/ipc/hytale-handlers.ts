import { ipcMain } from 'electron';
import { HytaleAuthService } from '../services/HytaleAuthService';

export function registerHytaleHandlers(hytaleAuth: HytaleAuthService) {
  ipcMain.handle('hytale:getAuthStatus', () => hytaleAuth.getAuthStatus());
  ipcMain.handle('hytale:startDeviceAuth', () => ({ url: 'https://accounts.hytale.com/device', code: 'Waiting...' }));
}
