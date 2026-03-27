import { ipcMain, BrowserWindow } from 'electron';
import { DownloaderService } from '../services/DownloaderService';

export function registerDownloaderHandlers(downloader: DownloaderService, getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('downloader:downloadServer', async () => {
    const win = getMainWindow();
    if (!win) throw new Error('No window');
    await downloader.downloadServer(win);
  });
  ipcMain.handle('downloader:checkFiles', () => downloader.hasServerFiles());
}
