import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServerManager } from '../../electron/services/ServerManager';
import { DatabaseService } from '../../electron/services/DatabaseService';
import fs from 'fs';
import path from 'path';
import os from 'os';

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    pid: 12345,
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    stdin: { write: vi.fn() },
    on: vi.fn(),
    kill: vi.fn(),
  })),
}));

vi.mock('dgram', () => ({
  createSocket: vi.fn(() => ({
    bind: vi.fn((_port: number, _addr: string, cb: () => void) => cb()),
    close: vi.fn(),
    on: vi.fn(),
  })),
}));

describe('ServerManager', () => {
  let db: DatabaseService;
  let manager: ServerManager;
  let testDir: string;
  let serversDir: string;
  let sharedDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hsm-test-'));
    serversDir = path.join(testDir, 'servers');
    sharedDir = path.join(serversDir, '_shared', 'Server');
    fs.mkdirSync(sharedDir, { recursive: true });
    fs.writeFileSync(path.join(serversDir, '_shared', 'Assets.zip'), 'fake');
    fs.writeFileSync(path.join(sharedDir, 'HytaleServer.jar'), 'fake');
    fs.writeFileSync(path.join(sharedDir, 'HytaleServer.aot'), 'fake');
    db = new DatabaseService(testDir);
    manager = new ServerManager(db, serversDir);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should create a server', async () => {
    const server = await manager.createServer('test-server');
    expect(server.name).toBe('test-server');
    expect(server.port).toBe(5520);
    expect(fs.existsSync(path.join(serversDir, 'test-server', 'Server', 'HytaleServer.jar'))).toBe(true);
  });

  it('should auto-increment port', async () => {
    await manager.createServer('server-1');
    const server2 = await manager.createServer('server-2');
    expect(server2.port).toBe(5521);
  });

  it('should list servers', async () => {
    await manager.createServer('server-1');
    await manager.createServer('server-2');
    const servers = manager.listServers();
    expect(servers).toHaveLength(2);
  });

  it('should delete a server', async () => {
    const server = await manager.createServer('test-server');
    manager.deleteServer(server.id);
    const servers = manager.listServers();
    expect(servers).toHaveLength(0);
    expect(fs.existsSync(path.join(serversDir, 'test-server'))).toBe(false);
  });

  it('should reject duplicate server names', async () => {
    await manager.createServer('test-server');
    await expect(manager.createServer('test-server')).rejects.toThrow('already exists');
  });

  it('should enforce 100 server limit', async () => {
    for (let i = 0; i < 100; i++) {
      db.run('INSERT INTO servers (name, port, path) VALUES (?, ?, ?)', [`s${i}`, 5520 + i, `/fake/${i}`]);
    }
    await expect(manager.createServer('one-more')).rejects.toThrow('Maximum');
  });
});
