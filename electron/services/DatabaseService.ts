import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseService {
  private db: Database.Database;

  constructor(dataDir: string, migrationsDir?: string) {
    fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, 'data.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initSchema();
    this.runMigrations(migrationsDir ?? path.join(__dirname, '..', 'migrations'));
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }

  private runMigrations(migrationsDir: string) {
    if (!fs.existsSync(migrationsDir)) return;

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const applied = new Set(
      this.query<{ version: number }>('SELECT version FROM schema_version')
        .map(r => r.version)
    );

    for (const file of files) {
      const version = parseInt(file.split('_')[0], 10);
      if (applied.has(version)) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      this.db.exec(sql);
      this.db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(version);
    }
  }

  query<T = unknown>(sql: string, params: unknown[] = []): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  run(sql: string, params: unknown[] = []) {
    return this.db.prepare(sql).run(...params);
  }

  get<T = unknown>(sql: string, params: unknown[] = []): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  checkIntegrity(): boolean {
    const result = this.db.pragma('integrity_check') as { integrity_check: string }[];
    return result[0]?.integrity_check === 'ok';
  }

  close() {
    this.db.close();
  }
}
