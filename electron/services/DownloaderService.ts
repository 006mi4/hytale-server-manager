import { spawn } from 'child_process';
import { BrowserWindow, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { createWriteStream } from 'fs';
import log from 'electron-log';
import { HytaleAuthService } from './HytaleAuthService';

const DOWNLOADER_URL = 'https://downloader.hytale.com/hytale-downloader.zip';

export class DownloaderService {
  private toolsDir: string;
  private serversDir: string;
  private hytaleAuth: HytaleAuthService;

  constructor(toolsDir: string, serversDir: string, hytaleAuth: HytaleAuthService) {
    this.toolsDir = toolsDir;
    this.serversDir = serversDir;
    this.hytaleAuth = hytaleAuth;
  }

  hasServerFiles(): boolean {
    return fs.existsSync(path.join(this.serversDir, '_shared', 'Server', 'HytaleServer.jar'));
  }

  hasToolInstalled(): boolean {
    return fs.existsSync(this.getDownloaderPath());
  }

  async downloadTool(mainWindow: BrowserWindow): Promise<void> {
    fs.mkdirSync(this.toolsDir, { recursive: true });
    const zipPath = path.join(this.toolsDir, 'hytale-downloader.zip');

    log.info('Downloading hytale-downloader from', DOWNLOADER_URL);
    mainWindow.webContents.send('downloader:progress', { percent: 0, stage: 'downloading-tool' });

    await new Promise<void>((resolve, reject) => {
      const request = net.request(DOWNLOADER_URL);
      const file = createWriteStream(zipPath);
      let receivedBytes = 0;
      let totalBytes = 0;

      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }
        const contentLength = response.headers['content-length'];
        if (contentLength) {
          totalBytes = parseInt(Array.isArray(contentLength) ? contentLength[0] : contentLength, 10);
        }
        response.on('data', (chunk: Buffer) => {
          file.write(chunk);
          receivedBytes += chunk.length;
          if (totalBytes > 0) {
            const percent = Math.round((receivedBytes / totalBytes) * 100);
            mainWindow.webContents.send('downloader:progress', { percent, stage: 'downloading-tool' });
          }
        });
        response.on('end', () => {
          file.end(() => {
            log.info('hytale-downloader.zip downloaded:', receivedBytes, 'bytes');
            resolve();
          });
        });
        response.on('error', (err: Error) => { file.close(); reject(err); });
      });
      request.on('error', (err: Error) => { file.close(); reject(err); });
      request.end();
    });

    log.info('Extracting hytale-downloader.zip');
    mainWindow.webContents.send('downloader:progress', { percent: 100, stage: 'extracting-tool' });
    await this.extractZip(zipPath, this.toolsDir);

    if (process.platform !== 'win32') {
      const binPath = this.getDownloaderPath();
      if (fs.existsSync(binPath)) fs.chmodSync(binPath, 0o755);
    }

    fs.unlinkSync(zipPath);
    log.info('hytale-downloader ready');
  }

  /**
   * Download server files. Assumes OAuth2 auth is already done via HytaleAuthService.
   * Writes the credentials file so the downloader can use them directly.
   */
  async downloadServer(mainWindow: BrowserWindow): Promise<void> {
    if (!this.hasToolInstalled()) {
      await this.downloadTool(mainWindow);
    }
    if (!this.hasToolInstalled()) {
      throw new Error('hytale-downloader not found at: ' + this.getDownloaderPath());
    }

    // Ensure token is valid and write credentials for the downloader
    await this.hytaleAuth.ensureValidToken();
    const sharedDir = path.join(this.serversDir, '_shared');
    fs.mkdirSync(sharedDir, { recursive: true });
    this.hytaleAuth.writeCredentialsFile(sharedDir);

    const downloaderPath = this.getDownloaderPath();
    log.info('Running hytale-downloader in', sharedDir);

    mainWindow.webContents.send('downloader:progress', { percent: 0, stage: 'downloading-server' });

    return new Promise((resolve, reject) => {
      const child = spawn(downloaderPath, ['-skip-update-check'], {
        cwd: sharedDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let fullOutput = '';

      const handleOutput = (data: Buffer) => {
        const output = data.toString();
        fullOutput += output;
        log.info('[hytale-downloader]', output.trim());

        const progressMatch = output.match(/(\d+(?:\.\d+)?)%/);
        if (progressMatch) {
          mainWindow.webContents.send('downloader:progress', {
            percent: Math.round(parseFloat(progressMatch[1])),
            stage: 'downloading-server',
          });
        }
      };

      child.stdout.on('data', handleOutput);
      child.stderr.on('data', handleOutput);

      child.on('close', async (code) => {
        if (code === 0) {
          log.info('Download complete, extracting game files...');
          mainWindow.webContents.send('downloader:progress', { percent: 95, stage: 'extracting-server' });
          try {
            await this.extractGameFiles(sharedDir);
            mainWindow.webContents.send('downloader:progress', { percent: 100, stage: 'done' });
            resolve();
          } catch (extractErr) {
            log.error('Failed to extract game files:', extractErr);
            reject(new Error(`Download succeeded but extraction failed: ${extractErr}`));
          }
        } else {
          log.error('hytale-downloader exited with code', code, '\nOutput:', fullOutput);
          reject(new Error(`Download failed (exit code ${code}). Check logs for details.`));
        }
      });

      child.on('error', (err) => {
        log.error('Failed to start hytale-downloader:', err);
        reject(err);
      });
    });
  }

  /**
   * Find the downloaded game zip in sharedDir and extract it.
   * The downloader creates a file like "2026.03.26-89796e57b.zip" containing
   * Server/, Assets.zip, start.sh, start.bat
   */
  private async extractGameFiles(sharedDir: string): Promise<void> {
    // Find the game zip (newest .zip that isn't hytale-downloader.zip or credentials)
    const files = fs.readdirSync(sharedDir).filter(f =>
      f.endsWith('.zip') && !f.startsWith('hytale-downloader') && f !== 'Assets.zip'
    );
    if (files.length === 0) {
      throw new Error('No game zip found in ' + sharedDir);
    }
    // Sort by modification time, newest first
    files.sort((a, b) => {
      const statA = fs.statSync(path.join(sharedDir, a));
      const statB = fs.statSync(path.join(sharedDir, b));
      return statB.mtimeMs - statA.mtimeMs;
    });
    const gameZip = path.join(sharedDir, files[0]);
    log.info('Extracting game zip:', gameZip);

    await this.extractZip(gameZip, sharedDir);

    // Verify extraction
    const jarPath = path.join(sharedDir, 'Server', 'HytaleServer.jar');
    if (!fs.existsSync(jarPath)) {
      throw new Error('Extraction completed but HytaleServer.jar not found');
    }

    // Clean up the zip to save disk space
    fs.unlinkSync(gameZip);
    log.info('Game files extracted successfully. HytaleServer.jar found.');
  }

  private getDownloaderPath(): string {
    const name = process.platform === 'win32' ? 'hytale-downloader-windows-amd64.exe' : 'hytale-downloader-linux-amd64';
    return path.join(this.toolsDir, name);
  }

  private async extractZip(zipPath: string, destDir: string): Promise<void> {
    const unzip = require('unzip-stream');
    return new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzip.Extract({ path: destDir }))
        .on('close', resolve)
        .on('error', reject);
    });
  }
}
