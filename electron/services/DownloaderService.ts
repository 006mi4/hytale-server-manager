import { spawn } from 'child_process';
import { BrowserWindow, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createUnzip } from 'zlib';
import log from 'electron-log';

const DOWNLOADER_URL = 'https://downloader.hytale.com/hytale-downloader.zip';

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

  async downloadTool(mainWindow: BrowserWindow): Promise<void> {
    fs.mkdirSync(this.toolsDir, { recursive: true });
    const zipPath = path.join(this.toolsDir, 'hytale-downloader.zip');

    log.info('Downloading hytale-downloader from', DOWNLOADER_URL);
    mainWindow.webContents.send('downloader:progress', { percent: 0, stage: 'downloading-tool' });

    // Download the zip using Electron's net module (handles HTTPS properly)
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
            const percent = Math.round((receivedBytes / totalBytes) * 50); // 0-50% for tool download
            mainWindow.webContents.send('downloader:progress', { percent, stage: 'downloading-tool' });
          }
        });

        response.on('end', () => {
          file.end(() => {
            log.info('hytale-downloader.zip downloaded:', receivedBytes, 'bytes');
            resolve();
          });
        });

        response.on('error', (err: Error) => {
          file.close();
          reject(err);
        });
      });

      request.on('error', (err: Error) => {
        file.close();
        reject(err);
      });

      request.end();
    });

    // Extract the zip
    log.info('Extracting hytale-downloader.zip to', this.toolsDir);
    mainWindow.webContents.send('downloader:progress', { percent: 50, stage: 'extracting-tool' });

    await this.extractZip(zipPath, this.toolsDir);

    // Make executable on Linux
    if (process.platform !== 'win32') {
      const binPath = this.getDownloaderPath();
      if (fs.existsSync(binPath)) {
        fs.chmodSync(binPath, 0o755);
      }
    }

    // Clean up zip
    fs.unlinkSync(zipPath);
    log.info('hytale-downloader extracted successfully');
  }

  async downloadServer(mainWindow: BrowserWindow): Promise<void> {
    // Step 1: Download the tool if not present
    if (!this.hasToolInstalled()) {
      await this.downloadTool(mainWindow);
    }

    if (!this.hasToolInstalled()) {
      throw new Error('Failed to install hytale-downloader. Binary not found at: ' + this.getDownloaderPath());
    }

    // Step 2: Run the downloader
    const sharedDir = path.join(this.serversDir, '_shared');
    fs.mkdirSync(sharedDir, { recursive: true });

    const downloaderPath = this.getDownloaderPath();
    log.info('Running hytale-downloader from', downloaderPath);

    return new Promise((resolve, reject) => {
      const child = spawn(downloaderPath, [], {
        cwd: sharedDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let fullOutput = '';

      const handleOutput = (data: Buffer) => {
        const output = data.toString();
        fullOutput += output;
        log.info('[hytale-downloader]', output.trim());

        // Parse progress percentage
        const progressMatch = output.match(/(\d+(?:\.\d+)?)%/);
        if (progressMatch) {
          const percent = 50 + Math.round(parseFloat(progressMatch[1]) * 0.5); // 50-100%
          mainWindow.webContents.send('downloader:progress', { percent, stage: 'downloading-server' });
        }

        // Parse OAuth2 device auth - look for the code and URL
        const codeMatch = output.match(/Enter code:\s*([A-Z0-9-]+)/i);
        const urlMatch = output.match(/Visit:\s*(https?:\/\/[^\s]+)/i);
        const orUrlMatch = output.match(/Or visit:\s*(https?:\/\/[^\s]+)/i);

        if (codeMatch) {
          const code = codeMatch[1];
          const url = urlMatch ? urlMatch[1] : 'https://accounts.hytale.com/device';
          const directUrl = orUrlMatch ? orUrlMatch[1] : undefined;
          mainWindow.webContents.send('downloader:progress', {
            percent: 0,
            stage: 'auth',
            authCode: code,
            authUrl: url,
            authDirectUrl: directUrl,
          });
        }

        // Auth success
        if (output.includes('Authentication successful')) {
          mainWindow.webContents.send('downloader:progress', { percent: 50, stage: 'downloading-server' });
        }
      };

      child.stdout.on('data', handleOutput);
      child.stderr.on('data', handleOutput);

      child.on('close', (code) => {
        if (code === 0) {
          log.info('hytale-downloader completed successfully');
          mainWindow.webContents.send('downloader:progress', { percent: 100, stage: 'done' });
          resolve();
        } else {
          log.error('hytale-downloader exited with code', code);
          log.error('Full output:', fullOutput);
          reject(new Error(`hytale-downloader exited with code ${code}. Check logs for details.`));
        }
      });

      child.on('error', (err) => {
        log.error('Failed to start hytale-downloader:', err);
        reject(err);
      });
    });
  }

  private getDownloaderPath(): string {
    const ext = process.platform === 'win32' ? '.exe' : '';
    return path.join(this.toolsDir, `hytale-downloader${ext}`);
  }

  private async extractZip(zipPath: string, destDir: string): Promise<void> {
    // Use unzip-stream for proper zip extraction
    const unzip = require('unzip-stream');
    return new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzip.Extract({ path: destDir }))
        .on('close', resolve)
        .on('error', reject);
    });
  }
}
