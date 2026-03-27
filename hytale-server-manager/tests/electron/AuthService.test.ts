import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../../electron/services/AuthService';
import { DatabaseService } from '../../electron/services/DatabaseService';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('AuthService', () => {
  let db: DatabaseService;
  let auth: AuthService;
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hsm-test-'));
    db = new DatabaseService(testDir);
    auth = new AuthService(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should register a new user', async () => {
    const result = await auth.register('admin', 'password123');
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
  });

  it('should reject duplicate username', async () => {
    await auth.register('admin', 'password123');
    await expect(auth.register('admin', 'other12345')).rejects.toThrow('Username already exists');
  });

  it('should reject short username', async () => {
    await expect(auth.register('ab', 'password123')).rejects.toThrow('Username must be');
  });

  it('should reject short password', async () => {
    await expect(auth.register('admin', 'short')).rejects.toThrow('Password must be');
  });

  it('should login with correct credentials', async () => {
    await auth.register('admin', 'password123');
    const result = await auth.login('admin', 'password123', false);
    expect(result.token).toBeDefined();
  });

  it('should reject wrong password', async () => {
    await auth.register('admin', 'password123');
    await expect(auth.login('admin', 'wrong1234', false)).rejects.toThrow('Invalid credentials');
  });

  it('should validate a valid session token', async () => {
    const { token } = await auth.register('admin', 'password123');
    const session = auth.checkSession(token);
    expect(session.valid).toBe(true);
    expect(session.username).toBe('admin');
  });

  it('should store remember token when remember=true', async () => {
    await auth.register('admin', 'password123');
    const { token } = await auth.login('admin', 'password123', true);
    const session = auth.checkSession(token);
    expect(session.valid).toBe(true);
  });
});
