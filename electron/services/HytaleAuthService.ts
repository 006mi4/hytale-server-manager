import { net } from 'electron';
import { DatabaseService } from './DatabaseService';
import log from 'electron-log';
import fs from 'fs';
import path from 'path';

const OAUTH_BASE = 'https://oauth.accounts.hytale.com';
const CLIENT_ID = 'hytale-downloader';
const SCOPES = 'openid offline auth:downloader';
const DEVICE_AUTH_URL = `${OAUTH_BASE}/oauth2/device/auth`;
const TOKEN_URL = `${OAUTH_BASE}/oauth2/token`;
const VERIFY_URL = `${OAUTH_BASE}/oauth2/device/verify`;

interface DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface StoredCredentials {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  branch: string;
}

export class HytaleAuthService {
  private db: DatabaseService;
  private credentials: StoredCredentials | null = null;

  constructor(db: DatabaseService) {
    this.db = db;
    this.loadCredentials();
  }

  getAuthStatus(): { authenticated: boolean; username: string | null } {
    if (this.credentials && this.credentials.refresh_token) {
      return { authenticated: true, username: null };
    }
    return { authenticated: false, username: null };
  }

  getAccessToken(): string | null {
    return this.credentials?.access_token ?? null;
  }

  async startDeviceAuth(): Promise<{
    userCode: string;
    verifyUrl: string;
    verifyUrlComplete: string;
    deviceCode: string;
    expiresIn: number;
    interval: number;
  }> {
    log.info('Starting OAuth2 Device Authorization flow');
    const body = `client_id=${encodeURIComponent(CLIENT_ID)}&scope=${encodeURIComponent(SCOPES)}`;
    const response = await this.httpPost(DEVICE_AUTH_URL, body, 'application/x-www-form-urlencoded');
    const data: DeviceAuthResponse = JSON.parse(response);
    log.info('Device auth: user_code =', data.user_code);

    return {
      userCode: data.user_code,
      verifyUrl: data.verification_uri || VERIFY_URL,
      verifyUrlComplete: data.verification_uri_complete || `${VERIFY_URL}?user_code=${data.user_code}`,
      deviceCode: data.device_code,
      expiresIn: data.expires_in,
      interval: data.interval || 5,
    };
  }

  async pollForToken(deviceCode: string, interval: number, expiresIn: number): Promise<StoredCredentials> {
    const deadline = Date.now() + expiresIn * 1000;
    const pollMs = Math.max(interval, 5) * 1000;

    while (Date.now() < deadline) {
      await this.sleep(pollMs);

      const body = [
        'grant_type=urn:ietf:params:oauth:grant-type:device_code',
        `device_code=${encodeURIComponent(deviceCode)}`,
        `client_id=${encodeURIComponent(CLIENT_ID)}`,
      ].join('&');

      try {
        const response = await this.httpPost(TOKEN_URL, body, 'application/x-www-form-urlencoded');
        const data: TokenResponse = JSON.parse(response);

        if (data.access_token) {
          const creds: StoredCredentials = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
            branch: 'release',
          };
          this.credentials = creds;
          this.saveCredentials(creds);
          log.info('OAuth2 authentication successful');
          return creds;
        }
      } catch (err: any) {
        if (err.responseBody) {
          try {
            const errData = JSON.parse(err.responseBody);
            if (errData.error === 'authorization_pending') continue;
            if (errData.error === 'slow_down') { await this.sleep(5000); continue; }
            if (errData.error === 'expired_token' || errData.error === 'access_denied') {
              throw new Error(`Authorization failed: ${errData.error_description || errData.error}`);
            }
          } catch (pe) {
            if (pe instanceof Error && pe.message.startsWith('Authorization')) throw pe;
          }
        }
        log.warn('Token poll error, retrying...', err.message);
      }
    }
    throw new Error('Device authorization timed out. Please try again.');
  }

  async refreshAccessToken(): Promise<StoredCredentials> {
    if (!this.credentials?.refresh_token) {
      throw new Error('No refresh token. Please authenticate first.');
    }
    log.info('Refreshing access token');
    const body = [
      'grant_type=refresh_token',
      `refresh_token=${encodeURIComponent(this.credentials.refresh_token)}`,
      `client_id=${encodeURIComponent(CLIENT_ID)}`,
    ].join('&');

    const response = await this.httpPost(TOKEN_URL, body, 'application/x-www-form-urlencoded');
    const data: TokenResponse = JSON.parse(response);
    const creds: StoredCredentials = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || this.credentials.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      branch: this.credentials.branch,
    };
    this.credentials = creds;
    this.saveCredentials(creds);
    log.info('Token refreshed');
    return creds;
  }

  async ensureValidToken(): Promise<string> {
    if (!this.credentials) throw new Error('Not authenticated.');
    if (this.credentials.expires_at < Math.floor(Date.now() / 1000) + 300) {
      await this.refreshAccessToken();
    }
    return this.credentials.access_token;
  }

  /** Write credentials in the format the hytale-downloader expects */
  writeCredentialsFile(dir: string): void {
    if (!this.credentials) return;
    const credPath = path.join(dir, '.hytale-downloader-credentials.json');
    fs.writeFileSync(credPath, JSON.stringify(this.credentials, null, 2));
    log.info('Wrote credentials to', credPath);
  }

  private loadCredentials(): void {
    const row = this.db.get<{ access_token: string }>('SELECT * FROM hytale_auth ORDER BY id DESC LIMIT 1');
    if (row) {
      try {
        this.credentials = JSON.parse(row.access_token);
      } catch {
        this.credentials = null;
      }
    }
  }

  private saveCredentials(creds: StoredCredentials): void {
    this.db.run('DELETE FROM hytale_auth');
    this.db.run(
      'INSERT INTO hytale_auth (access_token, refresh_token, expires_at, hytale_username) VALUES (?, ?, ?, ?)',
      [JSON.stringify(creds), creds.refresh_token, new Date(creds.expires_at * 1000).toISOString(), null]
    );
  }

  private httpPost(url: string, body: string, contentType: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const request = net.request({ method: 'POST', url });
      request.setHeader('Content-Type', contentType);
      let responseBody = '';
      let statusCode = 0;
      request.on('response', (response) => {
        statusCode = response.statusCode;
        response.on('data', (chunk: Buffer) => { responseBody += chunk.toString(); });
        response.on('end', () => {
          if (statusCode >= 200 && statusCode < 300) { resolve(responseBody); }
          else { const e: any = new Error(`HTTP ${statusCode}`); e.statusCode = statusCode; e.responseBody = responseBody; reject(e); }
        });
      });
      request.on('error', reject);
      request.write(body);
      request.end();
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
