import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';

export class UpdateService {
  private mainWindow: BrowserWindow | null = null;
  constructor() {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-available', (info: any) => {
      this.mainWindow?.webContents.send('updates:available', {
        version: info.version,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
      });
    });
  }
  setWindow(win: BrowserWindow) { this.mainWindow = win; }
  async check() {
    try {
      const result = await autoUpdater.checkForUpdates();
      if (result?.updateInfo) return { version: result.updateInfo.version, releaseNotes: typeof result.updateInfo.releaseNotes === 'string' ? result.updateInfo.releaseNotes : '' };
      return null;
    } catch { return null; }
  }
  async download() { await autoUpdater.downloadUpdate(); }
  install() { autoUpdater.quitAndInstall(); }
}
