import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

export function registerDownloaderHandlers(serversDir: string) {
  ipcMain.handle('downloader:downloadServer', () => {});
  ipcMain.handle('downloader:checkFiles', () => {
    const sharedDir = path.join(serversDir, '_shared');
    return fs.existsSync(path.join(sharedDir, 'Server', 'HytaleServer.jar'));
  });
}
