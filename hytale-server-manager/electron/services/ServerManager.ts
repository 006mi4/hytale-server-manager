import { spawn, ChildProcess } from 'child_process';
import { createSocket } from 'dgram';
import fs from 'fs';
import path from 'path';
import { DatabaseService } from './DatabaseService';

export type ServerStatus = 'offline' | 'starting' | 'online' | 'stopping' | 'crashed';

export interface ServerRecord {
  id: number;
  name: string;
  port: number;
  path: string;
  jvm_xms: string;
  jvm_xmx: string;
  auto_update_mode: string;
  created_at: string;
  last_started_at: string | null;
}

interface RunningServer {
  process: ChildProcess;
  status: ServerStatus;
  consoleBuffer: string[];
  consoleListeners: Set<(line: string) => void>;
  stopTimer?: ReturnType<typeof setTimeout>;
  killTimer?: ReturnType<typeof setTimeout>;
}

const MAX_SERVERS = 100;
const BASE_PORT = 5520;
const CONSOLE_BUFFER_SIZE = 5000;
const ALLOWED_UPDATE_FIELDS = new Set(['port', 'jvm_xms', 'jvm_xmx', 'auto_update_mode']);

export class ServerManager {
  private db: DatabaseService;
  private serversDir: string;
  private running = new Map<number, RunningServer>();

  private statusListeners = new Map<number, Set<(status: ServerStatus) => void>>();

  constructor(db: DatabaseService, serversDir: string) {
    this.db = db;
    this.serversDir = serversDir;
  }

  // -------------------------------------------------------------------------
  // Status management
  // -------------------------------------------------------------------------

  onStatusChange(id: number, callback: (status: ServerStatus) => void): () => void {
    if (!this.statusListeners.has(id)) {
      this.statusListeners.set(id, new Set());
    }
    this.statusListeners.get(id)!.add(callback);
    return () => this.statusListeners.get(id)?.delete(callback);
  }

  private setStatus(id: number, status: ServerStatus) {
    const running = this.running.get(id);
    if (running) running.status = status;
    this.statusListeners.get(id)?.forEach(cb => cb(status));
  }

  getStatus(id: number): ServerStatus {
    return this.running.get(id)?.status ?? 'offline';
  }

  // -------------------------------------------------------------------------
  // Port helpers
  // -------------------------------------------------------------------------

  private getUsedPorts(): Set<number> {
    const rows = this.db.query<{ port: number }>('SELECT port FROM servers');
    return new Set(rows.map(r => r.port));
  }

  private async isPortFree(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const sock = createSocket('udp4');
      sock.bind(port, '0.0.0.0', () => {
        sock.close();
        resolve(true);
      });
      sock.on('error', () => resolve(false));
    });
  }

  private async findNextPort(): Promise<number> {
    const used = this.getUsedPorts();
    for (let port = BASE_PORT; port < BASE_PORT + MAX_SERVERS + 200; port++) {
      if (!used.has(port) && await this.isPortFree(port)) {
        return port;
      }
    }
    throw new Error('No free port found');
  }

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  async createServer(name: string): Promise<ServerRecord> {
    // Enforce limit
    const count = this.db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM servers');
    if (count && count.cnt >= MAX_SERVERS) {
      throw new Error(`Maximum of ${MAX_SERVERS} servers reached`);
    }

    // Check duplicate
    const existing = this.db.get<ServerRecord>('SELECT id FROM servers WHERE name = ?', [name]);
    if (existing) {
      throw new Error(`Server '${name}' already exists`);
    }

    const port = await this.findNextPort();
    const serverPath = path.join(this.serversDir, name);
    const serverBinPath = path.join(serverPath, 'Server');

    // Create directory structure
    fs.mkdirSync(serverBinPath, { recursive: true });

    // Copy shared files
    const sharedServerDir = path.join(this.serversDir, '_shared', 'Server');
    const sharedAssetsZip = path.join(this.serversDir, '_shared', 'Assets.zip');

    if (fs.existsSync(sharedServerDir)) {
      for (const file of fs.readdirSync(sharedServerDir)) {
        fs.copyFileSync(
          path.join(sharedServerDir, file),
          path.join(serverBinPath, file),
        );
      }
    }

    if (fs.existsSync(sharedAssetsZip)) {
      fs.copyFileSync(sharedAssetsZip, path.join(serverPath, 'Assets.zip'));
    }

    // Write jvm.options
    const jvmOptions = `-Xms2G\n-Xmx4G\n-XX:+UseG1GC\n`;
    fs.writeFileSync(path.join(serverPath, 'jvm.options'), jvmOptions, 'utf-8');

    // Write config.json
    const config = { port, name };
    fs.writeFileSync(path.join(serverPath, 'config.json'), JSON.stringify(config, null, 2), 'utf-8');

    // Write wrapper scripts (for manual use outside the Manager)
    const startSh = `#!/bin/bash\ncd "$(dirname "$0")"\njava $(cat jvm.options | tr '\\n' ' ') -jar Server/HytaleServer.jar\n`;
    fs.writeFileSync(path.join(serverPath, 'start.sh'), startSh, 'utf-8');

    const startBat = `@echo off\ncd /d "%~dp0"\njava -jar Server\\HytaleServer.jar\n`;
    fs.writeFileSync(path.join(serverPath, 'start.bat'), startBat, 'utf-8');

    // Insert DB record
    const result = this.db.run(
      'INSERT INTO servers (name, port, path) VALUES (?, ?, ?)',
      [name, port, serverPath],
    );

    return this.db.get<ServerRecord>('SELECT * FROM servers WHERE id = ?', [result.lastInsertRowid])!;
  }

  listServers(): ServerRecord[] {
    return this.db.query<ServerRecord>('SELECT * FROM servers ORDER BY id');
  }

  getServerById(id: number): ServerRecord | undefined {
    return this.db.get<ServerRecord>('SELECT * FROM servers WHERE id = ?', [id]);
  }

  updateServerField(id: number, field: string, value: string | number): void {
    if (!ALLOWED_UPDATE_FIELDS.has(field)) {
      throw new Error(`Field '${field}' is not allowed to be updated`);
    }
    this.db.run(`UPDATE servers SET ${field} = ? WHERE id = ?`, [value, id]);
  }

  deleteServer(id: number): void {
    if (this.running.has(id)) {
      throw new Error('Cannot delete a running server. Stop it first.');
    }

    const server = this.getServerById(id);
    if (!server) {
      throw new Error(`Server with id ${id} not found`);
    }

    // Remove filesystem
    if (fs.existsSync(server.path)) {
      fs.rmSync(server.path, { recursive: true, force: true });
    }

    this.db.run('DELETE FROM servers WHERE id = ?', [id]);
    this.statusListeners.delete(id);
  }

  // -------------------------------------------------------------------------
  // Process management
  // -------------------------------------------------------------------------

  startServer(id: number, javaPath: string = 'java'): void {
    if (this.running.has(id)) {
      return; // Already running
    }

    const server = this.getServerById(id);
    if (!server) throw new Error(`Server ${id} not found`);

    const jarPath = path.join(server.path, 'Server', 'HytaleServer.jar');
    const jvmOptsFile = path.join(server.path, 'jvm.options');

    let jvmArgs: string[] = [];
    if (fs.existsSync(jvmOptsFile)) {
      jvmArgs = fs.readFileSync(jvmOptsFile, 'utf-8')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#'));
    }

    const args = [...jvmArgs, '-jar', jarPath];
    const proc = spawn(javaPath, args, {
      cwd: server.path,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const runningServer: RunningServer = {
      process: proc,
      status: 'starting',
      consoleBuffer: [],
      consoleListeners: new Set(),
    };

    this.running.set(id, runningServer);
    this.setStatus(id, 'starting');

    const appendLine = (line: string) => {
      const buf = runningServer.consoleBuffer;
      buf.push(line);
      if (buf.length > CONSOLE_BUFFER_SIZE) {
        buf.splice(0, buf.length - CONSOLE_BUFFER_SIZE);
      }
      runningServer.consoleListeners.forEach(cb => cb(line));
    };

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      for (const line of text.split('\n')) {
        if (line.trim()) appendLine(line);
      }
      // Detect server online
      if (runningServer.status === 'starting' && text.includes('Done')) {
        this.setStatus(id, 'online');
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      for (const line of text.split('\n')) {
        if (line.trim()) appendLine(`[STDERR] ${line}`);
      }
    });

    proc.on('exit', (code: number | null) => {
      // Clear pending timers
      if (runningServer.stopTimer) clearTimeout(runningServer.stopTimer);
      if (runningServer.killTimer) clearTimeout(runningServer.killTimer);

      const wasStopping = runningServer.status === 'stopping';
      this.running.delete(id);

      // Exit code 8 = needs restart / update required
      if (code === 8) {
        this.setStatus(id, 'offline');
      } else if (!wasStopping && code !== 0 && code !== null) {
        this.setStatus(id, 'crashed');
      } else {
        this.setStatus(id, 'offline');
      }

      // Update last_started_at
      this.db.run('UPDATE servers SET last_started_at = datetime("now") WHERE id = ?', [id]);
    });
  }

  stopServer(id: number): void {
    const running = this.running.get(id);
    if (!running) return;

    this.setStatus(id, 'stopping');

    // Send graceful stop
    try {
      running.process.stdin?.write('/stop\n');
    } catch {
      // stdin may be closed
    }

    // After 30s send SIGTERM
    running.stopTimer = setTimeout(() => {
      try {
        running.process.kill('SIGTERM');
      } catch {
        // already dead
      }

      // After 10s more send SIGKILL
      running.killTimer = setTimeout(() => {
        try {
          running.process.kill('SIGKILL');
        } catch {
          // already dead
        }
      }, 10_000);
    }, 30_000);
  }

  sendCommand(id: number, command: string): void {
    const running = this.running.get(id);
    if (!running) throw new Error(`Server ${id} is not running`);
    running.process.stdin?.write(`${command}\n`);
  }

  // -------------------------------------------------------------------------
  // Console
  // -------------------------------------------------------------------------

  getConsoleBuffer(id: number): string[] {
    return [...(this.running.get(id)?.consoleBuffer ?? [])];
  }

  onConsoleOutput(id: number, cb: (line: string) => void): () => void {
    const running = this.running.get(id);
    if (!running) return () => {};
    running.consoleListeners.add(cb);
    return () => running.consoleListeners.delete(cb);
  }

  // -------------------------------------------------------------------------
  // Bulk operations
  // -------------------------------------------------------------------------

  stopAll(): void {
    for (const id of this.running.keys()) {
      this.stopServer(id);
    }
  }
}
