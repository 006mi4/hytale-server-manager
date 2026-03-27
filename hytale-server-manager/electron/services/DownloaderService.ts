import { ChildProcess, spawn } from 'child_process';
import { BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';

export class DownloaderService {
  private toolsDir: string;
  private serversDir: string;
  constructor(toolsDir: string, serversDir: string) {
    this.toolsDir = toolsDir;
    this.serversDir = serversDir;
  }

  hasServerFiles(): boolean {
    return fs.existsSync(path.join(this.serversDir, '_shared', 'Server', 'HytaleServer.jar'));
  }

  hasToolInstalled(): boolean {
    return fs.existsSync(this.getDownloaderPath());
  }

  async downloadServer(mainWindow: BrowserWindow): Promise<void> {
    const sharedDir = path.join(this.serversDir, '_shared');
    fs.mkdirSync(sharedDir, { recursive: true });
    const downloaderPath = this.getDownloaderPath();
    if (!fs.existsSync(downloaderPath)) {
      throw new Error('Hytale Downloader not found at: ' + this.toolsDir);
    }
    return new Promise((resolve, reject) => {
      const child = spawn(downloaderPath, ['-download-path', path.join(sharedDir, 'game.zip')], { cwd: this.toolsDir });
      child.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        const progressMatch = output.match(/(\d+)%/);
        if (progressMatch) {
          mainWindow.webContents.send('downloader:progress', { percent: parseInt(progressMatch[1], 10), stage: 'downloading' });
        }
        if (output.includes('Enter code:')) {
          mainWindow.webContents.send('downloader:progress', { percent: 0, stage: 'auth' });
        }
      });
      child.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        const progressMatch = output.match(/(\d+)%/);
        if (progressMatch) {
          mainWindow.webContents.send('downloader:progress', { percent: parseInt(progressMatch[1], 10), stage: 'downloading' });
        }
      });
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Downloader exited with code ${code}`));
      });
      child.on('error', reject);
    });
  }

  private getDownloaderPath(): string {
    const ext = process.platform === 'win32' ? '.exe' : '';
    return path.join(this.toolsDir, `hytale-downloader${ext}`);
  }
}
