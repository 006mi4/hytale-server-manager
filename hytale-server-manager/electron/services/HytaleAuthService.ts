import { safeStorage } from 'electron';
import { DatabaseService } from './DatabaseService';

export class HytaleAuthService {
  private db: DatabaseService;
  constructor(db: DatabaseService) { this.db = db; }

  getAuthStatus(): { authenticated: boolean; username: string | null } {
    const auth = this.db.get<{ hytale_username: string }>('SELECT * FROM hytale_auth ORDER BY id DESC LIMIT 1');
    if (!auth) return { authenticated: false, username: null };
    return { authenticated: true, username: auth.hytale_username };
  }

  storeTokens(accessToken: string, refreshToken: string, expiresAt: string, username: string | null) {
    const encAccess = safeStorage.encryptString(accessToken).toString('base64');
    const encRefresh = safeStorage.encryptString(refreshToken).toString('base64');
    this.db.run('DELETE FROM hytale_auth');
    this.db.run('INSERT INTO hytale_auth (access_token, refresh_token, expires_at, hytale_username) VALUES (?, ?, ?, ?)',
      [encAccess, encRefresh, expiresAt, username]);
  }

  getTokens(): { accessToken: string; refreshToken: string } | null {
    const auth = this.db.get<{ access_token: string; refresh_token: string }>('SELECT * FROM hytale_auth ORDER BY id DESC LIMIT 1');
    if (!auth) return null;
    return {
      accessToken: safeStorage.decryptString(Buffer.from(auth.access_token, 'base64')),
      refreshToken: safeStorage.decryptString(Buffer.from(auth.refresh_token, 'base64')),
    };
  }
}
