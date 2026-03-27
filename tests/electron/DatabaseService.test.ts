import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../../electron/services/DatabaseService';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('DatabaseService', () => {
  let db: DatabaseService;
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hsm-test-'));
    db = new DatabaseService(testDir);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should initialize database with schema_version table', () => {
    const result = db.query<{ name: string }>(`SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'`);
    expect(result).toHaveLength(1);
  });

  it('should apply initial migration', () => {
    const tables = db.query<{ name: string }>(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('servers');
    expect(tableNames).toContain('hytale_auth');
    expect(tableNames).toContain('settings');
  });

  it('should track migration version', () => {
    const versions = db.query<{ version: number }>('SELECT version FROM schema_version');
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
  });
});
