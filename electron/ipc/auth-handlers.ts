import { ipcMain } from 'electron';
import { AuthService } from '../services/AuthService';

export function registerAuthHandlers(auth: AuthService) {
  let currentToken: string | null = null;
  ipcMain.handle('auth:register', async (_e, username: string, password: string) => {
    const result = await auth.register(username, password);
    currentToken = result.token;
    return result;
  });
  ipcMain.handle('auth:login', async (_e, username: string, password: string, remember: boolean) => {
    const result = await auth.login(username, password, remember);
    currentToken = result.token;
    return result;
  });
  ipcMain.handle('auth:checkSession', () => {
    if (!currentToken) return { valid: false, username: '' };
    return auth.checkSession(currentToken);
  });
  ipcMain.handle('auth:logout', () => {
    if (currentToken) auth.logout(currentToken);
    currentToken = null;
  });
  ipcMain.handle('auth:hasUsers', () => auth.hasUsers());
}
