import { ipcMain, BrowserWindow } from 'electron';
import { HytaleAuthService } from '../services/HytaleAuthService';

export function registerHytaleHandlers(hytaleAuth: HytaleAuthService, getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('hytale:getAuthStatus', () => hytaleAuth.getAuthStatus());

  ipcMain.handle('hytale:startDeviceAuth', async () => {
    const auth = await hytaleAuth.startDeviceAuth();
    return {
      userCode: auth.userCode,
      verifyUrl: auth.verifyUrl,
      verifyUrlComplete: auth.verifyUrlComplete,
      deviceCode: auth.deviceCode,
      expiresIn: auth.expiresIn,
      interval: auth.interval,
    };
  });

  ipcMain.handle('hytale:pollForToken', async (_e, deviceCode: string, interval: number, expiresIn: number) => {
    const creds = await hytaleAuth.pollForToken(deviceCode, interval, expiresIn);
    getMainWindow()?.webContents.send('hytale:authComplete');
    return creds;
  });

  ipcMain.handle('hytale:refreshToken', () => hytaleAuth.refreshAccessToken());
  ipcMain.handle('hytale:ensureValidToken', () => hytaleAuth.ensureValidToken());
}
