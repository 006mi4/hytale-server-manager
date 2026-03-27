import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { DatabaseService } from './DatabaseService';

interface User {
  id: number;
  username: string;
  password_hash: string;
  remember_token: string | null;
}

export class AuthService {
  private db: DatabaseService;
  private sessions = new Map<string, { username: string; expiresAt: number }>();

  constructor(db: DatabaseService) {
    this.db = db;
  }

  async register(username: string, password: string): Promise<{ token: string }> {
    if (username.length < 3 || username.length > 32 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username must be 3-32 alphanumeric characters or underscores');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    const existing = this.db.get<User>('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) throw new Error('Username already exists');
    const hash = await bcrypt.hash(password, 12);
    this.db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
    return { token: this.createSession(username) };
  }

  async login(username: string, password: string, remember: boolean): Promise<{ token: string }> {
    const user = this.db.get<User>('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) throw new Error('Invalid credentials');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new Error('Invalid credentials');
    const token = this.createSession(username);
    if (remember) {
      this.db.run('UPDATE users SET remember_token = ? WHERE id = ?', [token, user.id]);
    }
    return { token };
  }

  checkSession(token: string): { valid: boolean; username: string } {
    const session = this.sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      const user = this.db.get<User>('SELECT * FROM users WHERE remember_token = ?', [token]);
      if (user) {
        this.sessions.set(token, { username: user.username, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
        return { valid: true, username: user.username };
      }
      return { valid: false, username: '' };
    }
    return { valid: true, username: session.username };
  }

  logout(token: string): void {
    this.sessions.delete(token);
    this.db.run('UPDATE users SET remember_token = NULL WHERE remember_token = ?', [token]);
  }

  hasUsers(): boolean {
    const result = this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM users');
    return (result?.count ?? 0) > 0;
  }

  private createSession(username: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.sessions.set(token, { username, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    return token;
  }
}
