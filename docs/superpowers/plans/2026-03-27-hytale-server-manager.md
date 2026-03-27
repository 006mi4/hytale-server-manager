# Hytale Server Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready Electron desktop app that manages up to 100 Hytale dedicated servers with a dark gaming UI, local accounts, auto-updates, and i18n support (DE/EN).

**Architecture:** Electron main process handles Java child processes, SQLite database, and file system operations. React renderer communicates exclusively via IPC preload bridge. Services are organized by domain (auth, servers, downloads, updates).

**Tech Stack:** Electron 35+, React 19, TypeScript 5, Vite, better-sqlite3, bcryptjs, electron-updater, electron-builder, i18next, xterm.js (terminal), vitest (tests)

**Spec:** `docs/superpowers/specs/2026-03-27-hytale-server-manager-design.md`

---

## File Structure

```
hytale-server-manager/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── electron-builder.yml
├── .gitignore
├── electron/
│   ├── main.ts                          # Electron entry point, window creation, IPC registration
│   ├── preload.ts                       # contextBridge API exposure
│   ├── services/
│   │   ├── DatabaseService.ts           # SQLite connection, migrations, typed queries
│   │   ├── AuthService.ts              # Local account CRUD, bcrypt, session tokens
│   │   ├── ServerManager.ts            # Java process lifecycle, console buffer, port management
│   │   ├── HytaleAuthService.ts        # OAuth2 device flow, token storage via safeStorage
│   │   ├── DownloaderService.ts        # hytale-downloader CLI execution, progress parsing
│   │   ├── UpdateService.ts            # electron-updater wrapper
│   │   └── JavaService.ts             # Java installation detection and version parsing
│   ├── ipc/
│   │   ├── auth-handlers.ts            # IPC handlers for auth namespace
│   │   ├── server-handlers.ts          # IPC handlers for servers namespace
│   │   ├── hytale-handlers.ts          # IPC handlers for hytale auth namespace
│   │   ├── downloader-handlers.ts      # IPC handlers for downloader namespace
│   │   ├── settings-handlers.ts        # IPC handlers for settings namespace
│   │   └── update-handlers.ts          # IPC handlers for app update namespace
│   └── migrations/
│       └── 001_initial.sql             # Initial schema: users, servers, hytale_auth, settings
├── src/
│   ├── main.tsx                         # React entry point
│   ├── App.tsx                          # Router, theme provider, auth guard
│   ├── types.ts                         # Shared TypeScript interfaces (Server, ServerConfig, etc.)
│   ├── hooks/
│   │   ├── useAuth.ts                  # Auth state + context
│   │   ├── useServers.ts              # Server list state + CRUD operations
│   │   ├── useConsole.ts              # Console output subscription for a server
│   │   └── useSettings.ts            # App settings state
│   ├── pages/
│   │   ├── SetupWizard/
│   │   │   ├── SetupWizard.tsx         # Wizard container with step navigation
│   │   │   ├── AccountStep.tsx         # Step 1: Create account form
│   │   │   ├── JavaStep.tsx            # Step 2: Java check + install guide
│   │   │   ├── DownloadStep.tsx        # Step 3: Download server files + Hytale auth
│   │   │   └── CompleteStep.tsx        # Step 4: Summary + go to dashboard
│   │   ├── Login/
│   │   │   └── Login.tsx               # Login form with remember-me
│   │   ├── Dashboard/
│   │   │   └── Dashboard.tsx           # Server grid with status, search, bulk actions
│   │   ├── ServerDetail/
│   │   │   ├── ServerDetail.tsx        # Tab container (console, config, whitelist, etc.)
│   │   │   ├── ConsoleTab.tsx          # xterm.js terminal + command input
│   │   │   ├── ConfigTab.tsx           # Form-based config.json editor
│   │   │   ├── WhitelistTab.tsx        # Whitelist table with add/remove
│   │   │   ├── BansTab.tsx             # Bans table with add/remove
│   │   │   └── PermissionsTab.tsx      # Permissions table with add/remove
│   │   └── Settings/
│   │       └── Settings.tsx            # Language, JVM defaults, paths, Hytale auth
│   ├── components/
│   │   ├── ServerCard.tsx              # Server card for dashboard grid
│   │   ├── Sidebar.tsx                 # Navigation sidebar
│   │   ├── TopBar.tsx                  # Top bar with user info + notifications
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       ├── StatusBadge.tsx
│   │       └── Spinner.tsx
│   ├── locales/
│   │   ├── de.json                     # German translations
│   │   └── en.json                     # English translations
│   ├── i18n.ts                         # i18next configuration
│   └── styles/
│       ├── globals.css                 # CSS variables, reset, dark theme
│       └── theme.ts                    # Theme constants exported for JS usage
├── tests/
│   ├── electron/
│   │   ├── DatabaseService.test.ts
│   │   ├── AuthService.test.ts
│   │   ├── ServerManager.test.ts
│   │   └── JavaService.test.ts
│   └── setup.ts                        # Test setup (mocks for electron APIs)
└── .github/
    └── workflows/
        └── release.yml                 # Build + publish to GitHub Releases
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `hytale-server-manager/package.json`
- Create: `hytale-server-manager/tsconfig.json`
- Create: `hytale-server-manager/tsconfig.node.json`
- Create: `hytale-server-manager/vite.config.ts`
- Create: `hytale-server-manager/.gitignore`
- Create: `hytale-server-manager/electron/main.ts`
- Create: `hytale-server-manager/electron/preload.ts`
- Create: `hytale-server-manager/src/main.tsx`
- Create: `hytale-server-manager/src/App.tsx`
- Create: `hytale-server-manager/index.html`

- [ ] **Step 1: Initialize project and install dependencies**

```bash
cd C:/Users/timvi/Desktop/Hytale
mkdir hytale-server-manager && cd hytale-server-manager
npm init -y
npm install react react-dom react-router-dom i18next react-i18next
npm install -D typescript @types/react @types/react-dom vite @vitejs/plugin-react electron electron-builder electron-updater better-sqlite3 @types/better-sqlite3 bcryptjs @types/bcryptjs vitest concurrently wait-on cross-env
```

- [ ] **Step 2: Create package.json with scripts**

Update `package.json` with these scripts:
```json
{
  "name": "hytale-server-manager",
  "version": "1.0.0",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && cross-env NODE_ENV=development electron .\"",
    "build": "tsc && vite build && tsc -p tsconfig.node.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "pack": "npm run build && electron-builder --dir",
    "dist": "npm run build && electron-builder"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@electron/*": ["electron/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist-electron",
    "rootDir": "electron",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["electron"]
}
```

- [ ] **Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

- [ ] **Step 6: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" />
  <title>Hytale Server Manager</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 7: Create electron/main.ts (minimal)**

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a2e',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
```

- [ ] **Step 8: Create electron/preload.ts (minimal)**

```typescript
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
```

- [ ] **Step 9: Create src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 10: Create src/App.tsx (placeholder)**

```tsx
export default function App() {
  return <div style={{ color: '#e0e0e0', padding: 40 }}>Hytale Server Manager</div>;
}
```

- [ ] **Step 11: Create src/styles/globals.css**

```css
:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-surface: rgba(255, 255, 255, 0.06);
  --bg-surface-hover: rgba(255, 255, 255, 0.1);
  --accent-primary: #e94560;
  --accent-secondary: #f4d03f;
  --text-primary: #e0e0e0;
  --text-secondary: #888888;
  --success: #6ba34a;
  --error: #e94560;
  --warning: #f4d03f;
  --radius: 8px;
  --radius-lg: 12px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  color: var(--text-primary);
  min-height: 100vh;
  overflow: hidden;
  -webkit-app-region: drag;
}

button, input, select, textarea {
  -webkit-app-region: no-drag;
}

#root {
  height: 100vh;
  display: flex;
}

::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
```

- [ ] **Step 12: Create .gitignore**

```
node_modules/
dist/
dist-electron/
out/
*.db
.env
```

- [ ] **Step 13: Verify app launches**

```bash
npm run dev
```
Expected: Electron window opens showing "Hytale Server Manager" text on dark background.

- [ ] **Step 14: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Electron + React + Vite project"
```

---

### Task 2: Database Service + Migrations

**Files:**
- Create: `hytale-server-manager/electron/services/DatabaseService.ts`
- Create: `hytale-server-manager/electron/migrations/001_initial.sql`
- Create: `hytale-server-manager/tests/setup.ts`
- Create: `hytale-server-manager/tests/electron/DatabaseService.test.ts`

- [ ] **Step 1: Write failing test for DatabaseService**

`tests/setup.ts`:
```typescript
import { vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-app-data'),
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    quit: vi.fn(),
  },
  BrowserWindow: vi.fn(),
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((s: string) => Buffer.from(`encrypted:${s}`)),
    decryptString: vi.fn((b: Buffer) => b.toString().replace('encrypted:', '')),
  },
  contextBridge: { exposeInMainWorld: vi.fn() },
}));
```

`tests/electron/DatabaseService.test.ts`:
```typescript
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
    const result = db.query<{ name: string }>('SELECT name FROM sqlite_master WHERE type="table" AND name="schema_version"');
    expect(result).toHaveLength(1);
  });

  it('should apply initial migration', () => {
    const tables = db.query<{ name: string }>('SELECT name FROM sqlite_master WHERE type="table" ORDER BY name');
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/electron/DatabaseService.test.ts
```
Expected: FAIL — `DatabaseService` module not found.

- [ ] **Step 3: Create migration file 001_initial.sql**

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    remember_token TEXT
);

CREATE TABLE servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    port INTEGER UNIQUE NOT NULL,
    path TEXT NOT NULL,
    jvm_xms TEXT DEFAULT '2G',
    jvm_xmx TEXT DEFAULT '4G',
    auto_update_mode TEXT DEFAULT 'Disabled',
    created_at TEXT DEFAULT (datetime('now')),
    last_started_at TEXT
);

CREATE TABLE hytale_auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    hytale_username TEXT
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

- [ ] **Step 4: Implement DatabaseService**

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseService {
  private db: Database.Database;

  constructor(dataDir: string) {
    fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, 'data.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initSchema();
    this.runMigrations();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }

  private runMigrations() {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
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
```

- [ ] **Step 5: Configure vitest**

Add to `vite.config.ts`:
```typescript
/// <reference types="vitest" />
// Add test config:
  test: {
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
```

- [ ] **Step 6: Run tests and verify they pass**

```bash
npx vitest run tests/electron/DatabaseService.test.ts
```
Expected: All 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add electron/services/DatabaseService.ts electron/migrations/001_initial.sql tests/ vite.config.ts
git commit -m "feat: add DatabaseService with migration system"
```

---

### Task 3: Auth Service (Local Accounts)

**Files:**
- Create: `hytale-server-manager/electron/services/AuthService.ts`
- Create: `hytale-server-manager/tests/electron/AuthService.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
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
    await expect(auth.register('admin', 'other')).rejects.toThrow('Username already exists');
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
    await expect(auth.login('admin', 'wrong', false)).rejects.toThrow('Invalid credentials');
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/electron/AuthService.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement AuthService**

```typescript
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
      // Check remember token in DB
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
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npx vitest run tests/electron/AuthService.test.ts
```
Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/services/AuthService.ts tests/electron/AuthService.test.ts
git commit -m "feat: add AuthService with registration, login, and session management"
```

---

### Task 4: Java Detection Service

**Files:**
- Create: `hytale-server-manager/electron/services/JavaService.ts`
- Create: `hytale-server-manager/tests/electron/JavaService.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { JavaService } from '../../electron/services/JavaService';

// Mock child_process
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'child_process';

describe('JavaService', () => {
  it('should detect Java 25', async () => {
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
      callback(null, '', 'openjdk 25.0.1 2025-10-21 LTS\nOpenJDK Runtime Environment Temurin-25.0.1+8');
      return {} as any;
    });

    const result = await JavaService.checkJava();
    expect(result.found).toBe(true);
    expect(result.version).toBe(25);
  });

  it('should report missing Java', async () => {
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
      callback(new Error('not found'), '', '');
      return {} as any;
    });

    const result = await JavaService.checkJava();
    expect(result.found).toBe(false);
  });

  it('should reject old Java version', async () => {
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
      callback(null, '', 'openjdk 17.0.1 2021-10-19');
      return {} as any;
    });

    const result = await JavaService.checkJava();
    expect(result.found).toBe(true);
    expect(result.version).toBe(17);
    expect(result.supported).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/electron/JavaService.test.ts
```

- [ ] **Step 3: Implement JavaService**

```typescript
import { execFile } from 'child_process';

interface JavaCheckResult {
  found: boolean;
  version: number | null;
  supported: boolean;
  path: string | null;
  rawOutput: string;
}

const MIN_JAVA_VERSION = 25;

export class JavaService {
  static checkJava(javaPath = 'java'): Promise<JavaCheckResult> {
    return new Promise((resolve) => {
      execFile(javaPath, ['--version'], (error, stdout, stderr) => {
        if (error) {
          resolve({ found: false, version: null, supported: false, path: null, rawOutput: '' });
          return;
        }

        const output = stderr || stdout;
        const match = output.match(/openjdk\s+(\d+)/i);
        const version = match ? parseInt(match[1], 10) : null;

        resolve({
          found: true,
          version,
          supported: version !== null && version >= MIN_JAVA_VERSION,
          path: javaPath,
          rawOutput: output,
        });
      });
    });
  }
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npx vitest run tests/electron/JavaService.test.ts
```
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/services/JavaService.ts tests/electron/JavaService.test.ts
git commit -m "feat: add JavaService for Java 25 detection"
```

---

### Task 5: Server Manager Service

**Files:**
- Create: `hytale-server-manager/electron/services/ServerManager.ts`
- Create: `hytale-server-manager/tests/electron/ServerManager.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
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
    // Insert 100 server records directly
    for (let i = 0; i < 100; i++) {
      db.run('INSERT INTO servers (name, port, path) VALUES (?, ?, ?)', [`s${i}`, 5520 + i, `/fake/${i}`]);
    }
    await expect(manager.createServer('one-more')).rejects.toThrow('Maximum');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/electron/ServerManager.test.ts
```

- [ ] **Step 3: Implement ServerManager**

```typescript
import { ChildProcess, spawn } from 'child_process';
import dgram from 'dgram';
import fs from 'fs';
import path from 'path';
import { DatabaseService } from './DatabaseService';

const MAX_SERVERS = 100;
const BASE_PORT = 5520;
const CONSOLE_BUFFER_SIZE = 5000;
const CRASH_WINDOW_MS = 5 * 60 * 1000;
const MAX_CRASHES = 3;

export interface Server {
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

export type ServerStatus = 'offline' | 'starting' | 'online' | 'stopping' | 'crashed';

interface RunningServer {
  process: ChildProcess;
  status: ServerStatus;
  consoleBuffer: string[];
  crashTimestamps: number[];
  onOutput: Set<(line: string) => void>;
  onStatusChange: Set<(status: ServerStatus) => void>;
}

export class ServerManager {
  private db: DatabaseService;
  private serversDir: string;
  private running = new Map<number, RunningServer>();

  constructor(db: DatabaseService, serversDir: string) {
    this.db = db;
    this.serversDir = serversDir;
  }

  async createServer(name: string): Promise<Server> {
    const count = this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM servers');
    if ((count?.count ?? 0) >= MAX_SERVERS) {
      throw new Error(`Maximum of ${MAX_SERVERS} servers reached`);
    }

    const existing = this.db.get('SELECT id FROM servers WHERE name = ?', [name]);
    if (existing) throw new Error(`Server "${name}" already exists`);

    const port = await this.findAvailablePort();
    const serverPath = path.join(this.serversDir, name);
    const serverDir = path.join(serverPath, 'Server');
    const sharedDir = path.join(this.serversDir, '_shared');

    // Create directory structure
    fs.mkdirSync(serverDir, { recursive: true });

    // Copy files from shared
    fs.copyFileSync(path.join(sharedDir, 'Assets.zip'), path.join(serverPath, 'Assets.zip'));
    fs.copyFileSync(path.join(sharedDir, 'Server', 'HytaleServer.jar'), path.join(serverDir, 'HytaleServer.jar'));
    fs.copyFileSync(path.join(sharedDir, 'Server', 'HytaleServer.aot'), path.join(serverDir, 'HytaleServer.aot'));

    // Write jvm.options
    fs.writeFileSync(path.join(serverPath, 'jvm.options'), '-Xms2G\n-Xmx4G\n');

    // Write wrapper scripts
    this.writeWrapperScripts(serverPath);

    // Generate default config.json
    const config = { Update: { Enabled: true, AutoApplyMode: 'Disabled', CheckIntervalSeconds: 3600 } };
    fs.writeFileSync(path.join(serverDir, 'config.json'), JSON.stringify(config, null, 2));

    // Create empty JSON files
    for (const file of ['permissions.json', 'bans.json', 'whitelist.json']) {
      fs.writeFileSync(path.join(serverDir, file), '{}');
    }

    // Save to DB
    this.db.run(
      'INSERT INTO servers (name, port, path) VALUES (?, ?, ?)',
      [name, port, serverPath]
    );

    return this.db.get<Server>('SELECT * FROM servers WHERE name = ?', [name])!;
  }

  listServers(): Server[] {
    return this.db.query<Server>('SELECT * FROM servers ORDER BY name');
  }

  deleteServer(id: number): void {
    const server = this.db.get<Server>('SELECT * FROM servers WHERE id = ?', [id]);
    if (!server) throw new Error('Server not found');

    if (this.running.has(id)) {
      throw new Error('Cannot delete a running server. Stop it first.');
    }

    // Remove files
    if (fs.existsSync(server.path)) {
      fs.rmSync(server.path, { recursive: true, force: true });
    }

    this.db.run('DELETE FROM servers WHERE id = ?', [id]);
  }

  startServer(id: number, javaPath = 'java'): void {
    const server = this.db.get<Server>('SELECT * FROM servers WHERE id = ?', [id]);
    if (!server) throw new Error('Server not found');
    if (this.running.has(id)) throw new Error('Server is already running');

    const serverDir = path.join(server.path, 'Server');
    const jvmOptionsPath = path.join(server.path, 'jvm.options');

    const args: string[] = [];
    if (fs.existsSync(jvmOptionsPath)) {
      args.push(`@${jvmOptionsPath}`);
    }
    args.push('-XX:AOTCache=HytaleServer.aot', '-jar', 'HytaleServer.jar', '--assets', '../Assets.zip', '--bind', String(server.port));

    const child = spawn(javaPath, args, { cwd: serverDir, stdio: ['pipe', 'pipe', 'pipe'] });

    const runningServer: RunningServer = {
      process: child,
      status: 'starting',
      consoleBuffer: [],
      crashTimestamps: [],
      onOutput: new Set(),
      onStatusChange: new Set(),
    };

    this.running.set(id, runningServer);
    this.setStatus(id, 'starting');

    const handleLine = (line: string) => {
      runningServer.consoleBuffer.push(line);
      if (runningServer.consoleBuffer.length > CONSOLE_BUFFER_SIZE) {
        runningServer.consoleBuffer.shift();
      }
      runningServer.onOutput.forEach(cb => cb(line));

      // Detect when server is ready
      if (line.includes('Server started') || line.includes('Done (')) {
        this.setStatus(id, 'online');
      }
    };

    child.stdout?.on('data', (data: Buffer) => {
      data.toString().split('\n').filter(Boolean).forEach(handleLine);
    });

    child.stderr?.on('data', (data: Buffer) => {
      data.toString().split('\n').filter(Boolean).forEach(handleLine);
    });

    child.on('close', (code) => {
      if (code === 8) {
        // Auto-update restart
        this.running.delete(id);
        this.startServer(id, javaPath);
        return;
      }

      if (code !== 0 && code !== null) {
        runningServer.crashTimestamps.push(Date.now());
        // Remove old crash timestamps
        const cutoff = Date.now() - CRASH_WINDOW_MS;
        runningServer.crashTimestamps = runningServer.crashTimestamps.filter(t => t > cutoff);

        if (runningServer.crashTimestamps.length >= MAX_CRASHES) {
          this.setStatus(id, 'crashed');
        } else {
          this.setStatus(id, 'crashed');
        }
      } else {
        this.setStatus(id, 'offline');
      }

      this.running.delete(id);
    });

    this.db.run('UPDATE servers SET last_started_at = datetime("now") WHERE id = ?', [id]);
  }

  stopServer(id: number): Promise<void> {
    return new Promise((resolve) => {
      const running = this.running.get(id);
      if (!running) { resolve(); return; }

      this.setStatus(id, 'stopping');

      // Send /stop command
      running.process.stdin?.write('/stop\n');

      const forceTimeout = setTimeout(() => {
        running.process.kill('SIGTERM');
        const killTimeout = setTimeout(() => {
          running.process.kill('SIGKILL');
          resolve();
        }, 10000);
        running.process.on('close', () => { clearTimeout(killTimeout); resolve(); });
      }, 30000);

      running.process.on('close', () => { clearTimeout(forceTimeout); resolve(); });
    });
  }

  sendCommand(id: number, command: string): void {
    const running = this.running.get(id);
    if (!running) throw new Error('Server is not running');
    running.process.stdin?.write(command + '\n');
  }

  getStatus(id: number): ServerStatus {
    return this.running.get(id)?.status ?? 'offline';
  }

  getConsoleBuffer(id: number): string[] {
    return this.running.get(id)?.consoleBuffer ?? [];
  }

  onConsoleOutput(id: number, callback: (line: string) => void): () => void {
    const running = this.running.get(id);
    if (!running) return () => {};
    running.onOutput.add(callback);
    return () => running.onOutput.delete(callback);
  }

  onStatusChange(id: number, callback: (status: ServerStatus) => void): () => void {
    const running = this.running.get(id);
    if (!running) {
      const entry: RunningServer = { process: null!, status: 'offline', consoleBuffer: [], crashTimestamps: [], onOutput: new Set(), onStatusChange: new Set() };
      entry.onStatusChange.add(callback);
      return () => entry.onStatusChange.delete(callback);
    }
    running.onStatusChange.add(callback);
    return () => running.onStatusChange.delete(callback);
  }

  async stopAll(): Promise<void> {
    const promises = Array.from(this.running.keys()).map(id => this.stopServer(id));
    await Promise.all(promises);
  }

  private setStatus(id: number, status: ServerStatus) {
    const running = this.running.get(id);
    if (running) {
      running.status = status;
      running.onStatusChange.forEach(cb => cb(status));
    }
  }

  private async findAvailablePort(): Promise<number> {
    const usedPorts = new Set(
      this.db.query<{ port: number }>('SELECT port FROM servers').map(r => r.port)
    );

    for (let port = BASE_PORT; port < BASE_PORT + MAX_SERVERS + 100; port++) {
      if (usedPorts.has(port)) continue;
      const available = await this.checkPortAvailable(port);
      if (available) return port;
    }

    throw new Error('No available ports found');
  }

  private checkPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = dgram.createSocket('udp4');
      socket.on('error', () => { socket.close(); resolve(false); });
      socket.bind(port, '0.0.0.0', () => { socket.close(); resolve(true); });
    });
  }

  private writeWrapperScripts(serverPath: string) {
    const startSh = `#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/Server"
JVM_OPTS=""
[ -f "../jvm.options" ] && JVM_OPTS="@../jvm.options"
java $JVM_OPTS -XX:AOTCache=HytaleServer.aot -jar HytaleServer.jar --assets ../Assets.zip "$@"
`;
    const startBat = `@echo off
cd /d "%~dp0Server"
set JVM_OPTS=
if exist ..\\jvm.options set JVM_OPTS=@..\\jvm.options
java %JVM_OPTS% -XX:AOTCache=HytaleServer.aot -jar HytaleServer.jar --assets ../Assets.zip %*
`;
    fs.writeFileSync(path.join(serverPath, 'start.sh'), startSh, { mode: 0o755 });
    fs.writeFileSync(path.join(serverPath, 'start.bat'), startBat);
  }
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npx vitest run tests/electron/ServerManager.test.ts
```
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/services/ServerManager.ts tests/electron/ServerManager.test.ts
git commit -m "feat: add ServerManager with create, delete, start, stop, console buffer"
```

---

### Task 6: IPC Handlers + Preload Bridge

**Files:**
- Create: `hytale-server-manager/electron/ipc/auth-handlers.ts`
- Create: `hytale-server-manager/electron/ipc/server-handlers.ts`
- Create: `hytale-server-manager/electron/ipc/settings-handlers.ts`
- Create: `hytale-server-manager/electron/ipc/update-handlers.ts`
- Create: `hytale-server-manager/electron/ipc/hytale-handlers.ts`
- Create: `hytale-server-manager/electron/ipc/downloader-handlers.ts`
- Modify: `hytale-server-manager/electron/preload.ts`
- Modify: `hytale-server-manager/electron/main.ts`
- Create: `hytale-server-manager/src/types.ts`

- [ ] **Step 1: Create src/types.ts**

```typescript
export interface Server {
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

export type ServerStatus = 'offline' | 'starting' | 'online' | 'stopping' | 'crashed';

export interface ServerWithStatus extends Server {
  status: ServerStatus;
}

export interface ServerConfig {
  port: number;
  jvm_xms: string;
  jvm_xmx: string;
  auto_update_mode: string;
  pvp_enabled: boolean;
  fall_damage: boolean;
  view_distance: number;
}

export interface AppSettings {
  language: string;
  javaPath: string;
  defaultXms: string;
  defaultXmx: string;
  downloaderUrl: string;
}

export interface DownloadProgress {
  percent: number;
  stage: string;
}

export interface UpdateInfo {
  version: string;
  releaseNotes: string;
}

export interface HytaleAuthStatus {
  authenticated: boolean;
  username: string | null;
}

export interface ElectronAPI {
  platform: string;
  auth: {
    register(username: string, password: string): Promise<{ token: string }>;
    login(username: string, password: string, remember: boolean): Promise<{ token: string }>;
    checkSession(): Promise<{ valid: boolean; username: string }>;
    logout(): Promise<void>;
    hasUsers(): Promise<boolean>;
  };
  servers: {
    list(): Promise<ServerWithStatus[]>;
    create(name: string): Promise<Server>;
    delete(id: number): Promise<void>;
    start(id: number): Promise<void>;
    stop(id: number): Promise<void>;
    restart(id: number): Promise<void>;
    sendCommand(id: number, command: string): Promise<void>;
    getConfig(id: number): Promise<ServerConfig>;
    updateConfig(id: number, config: Partial<ServerConfig>): Promise<void>;
    getConsoleBuffer(id: number): Promise<string[]>;
    onConsoleOutput(callback: (serverId: number, line: string) => void): () => void;
    onStatusChange(callback: (serverId: number, status: ServerStatus) => void): () => void;
  };
  hytale: {
    getAuthStatus(): Promise<HytaleAuthStatus>;
    startDeviceAuth(): Promise<{ url: string; code: string }>;
    onAuthComplete(callback: () => void): () => void;
  };
  downloader: {
    downloadServer(): Promise<void>;
    checkFiles(): Promise<boolean>;
    onProgress(callback: (progress: DownloadProgress) => void): () => void;
  };
  settings: {
    get(): Promise<AppSettings>;
    update(settings: Partial<AppSettings>): Promise<void>;
  };
  updates: {
    check(): Promise<UpdateInfo | null>;
    download(): Promise<void>;
    install(): Promise<void>;
    onUpdateAvailable(callback: (info: UpdateInfo) => void): () => void;
  };
  java: {
    check(): Promise<{ found: boolean; version: number | null; supported: boolean }>;
  };
  window: {
    minimize(): void;
    maximize(): void;
    close(): void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

- [ ] **Step 2: Create IPC handler files**

`electron/ipc/auth-handlers.ts`:
```typescript
import { ipcMain } from 'electron';
import { AuthService } from '../services/AuthService';

export function registerAuthHandlers(auth: AuthService) {
  let currentToken: string | null = null;

  ipcMain.handle('auth:register', async (_e, username: string, password: string) => {
    const result = await auth.register(username, password);
    currentToken = result.token;
    return result;
  });

  ipcMain.handle('auth:login', async (_e, username: string, password: string, remember: boolean) => {
    const result = await auth.login(username, password, remember);
    currentToken = result.token;
    return result;
  });

  ipcMain.handle('auth:checkSession', () => {
    if (!currentToken) return { valid: false, username: '' };
    return auth.checkSession(currentToken);
  });

  ipcMain.handle('auth:logout', () => {
    if (currentToken) auth.logout(currentToken);
    currentToken = null;
  });

  ipcMain.handle('auth:hasUsers', () => auth.hasUsers());
}
```

`electron/ipc/server-handlers.ts`:
```typescript
import { ipcMain, BrowserWindow } from 'electron';
import { ServerManager } from '../services/ServerManager';

export function registerServerHandlers(manager: ServerManager) {
  ipcMain.handle('servers:list', () => {
    const servers = manager.listServers();
    return servers.map(s => ({ ...s, status: manager.getStatus(s.id) }));
  });

  ipcMain.handle('servers:create', async (_e, name: string) => manager.createServer(name));
  ipcMain.handle('servers:delete', (_e, id: number) => manager.deleteServer(id));
  ipcMain.handle('servers:start', (_e, id: number) => manager.startServer(id));
  ipcMain.handle('servers:stop', (_e, id: number) => manager.stopServer(id));

  ipcMain.handle('servers:restart', async (_e, id: number) => {
    await manager.stopServer(id);
    manager.startServer(id);
  });

  ipcMain.handle('servers:sendCommand', (_e, id: number, command: string) => {
    manager.sendCommand(id, command);
  });

  ipcMain.handle('servers:getConsoleBuffer', (_e, id: number) => {
    return manager.getConsoleBuffer(id);
  });

  ipcMain.handle('servers:getConfig', (_e, id: number) => {
    // Read config.json from server directory
    const servers = manager.listServers();
    const server = servers.find(s => s.id === id);
    if (!server) throw new Error('Server not found');

    return {
      port: server.port,
      jvm_xms: server.jvm_xms,
      jvm_xmx: server.jvm_xmx,
      auto_update_mode: server.auto_update_mode,
      pvp_enabled: false,
      fall_damage: true,
      view_distance: 12,
    };
  });

  ipcMain.handle('servers:updateConfig', (_e, id: number, config: Record<string, unknown>) => {
    if (config.port !== undefined) {
      manager['db'].run('UPDATE servers SET port = ? WHERE id = ?', [config.port, id]);
    }
    if (config.jvm_xms !== undefined) {
      manager['db'].run('UPDATE servers SET jvm_xms = ? WHERE id = ?', [config.jvm_xms, id]);
    }
    if (config.jvm_xmx !== undefined) {
      manager['db'].run('UPDATE servers SET jvm_xmx = ? WHERE id = ?', [config.jvm_xmx, id]);
    }
    if (config.auto_update_mode !== undefined) {
      manager['db'].run('UPDATE servers SET auto_update_mode = ? WHERE id = ?', [config.auto_update_mode, id]);
    }
  });
}
```

`electron/ipc/settings-handlers.ts`:
```typescript
import { ipcMain } from 'electron';
import { DatabaseService } from '../services/DatabaseService';

const DEFAULTS: Record<string, string> = {
  language: 'en',
  javaPath: 'java',
  defaultXms: '2G',
  defaultXmx: '4G',
  downloaderUrl: '',
};

export function registerSettingsHandlers(db: DatabaseService) {
  ipcMain.handle('settings:get', () => {
    const rows = db.query<{ key: string; value: string }>('SELECT key, value FROM settings');
    const settings: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  });

  ipcMain.handle('settings:update', (_e, updates: Record<string, string>) => {
    for (const [key, value] of Object.entries(updates)) {
      db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
        [key, value, value]
      );
    }
  });
}
```

`electron/ipc/update-handlers.ts`:
```typescript
import { ipcMain } from 'electron';

// Placeholder — electron-updater integration in Task 13
export function registerUpdateHandlers() {
  ipcMain.handle('updates:check', () => null);
  ipcMain.handle('updates:download', () => {});
  ipcMain.handle('updates:install', () => {});
}
```

`electron/ipc/hytale-handlers.ts`:
```typescript
import { ipcMain } from 'electron';

// Placeholder — HytaleAuthService integration in Task 12
export function registerHytaleHandlers() {
  ipcMain.handle('hytale:getAuthStatus', () => ({ authenticated: false, username: null }));
  ipcMain.handle('hytale:startDeviceAuth', () => ({ url: '', code: '' }));
}
```

`electron/ipc/downloader-handlers.ts`:
```typescript
import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

// Placeholder — DownloaderService integration in Task 12
export function registerDownloaderHandlers(serversDir: string) {
  ipcMain.handle('downloader:downloadServer', () => {});
  ipcMain.handle('downloader:checkFiles', () => {
    const sharedDir = path.join(serversDir, '_shared');
    return fs.existsSync(path.join(sharedDir, 'Server', 'HytaleServer.jar'));
  });
}
```

- [ ] **Step 3: Update electron/preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  auth: {
    register: (u: string, p: string) => ipcRenderer.invoke('auth:register', u, p),
    login: (u: string, p: string, r: boolean) => ipcRenderer.invoke('auth:login', u, p, r),
    checkSession: () => ipcRenderer.invoke('auth:checkSession'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    hasUsers: () => ipcRenderer.invoke('auth:hasUsers'),
  },

  servers: {
    list: () => ipcRenderer.invoke('servers:list'),
    create: (name: string) => ipcRenderer.invoke('servers:create', name),
    delete: (id: number) => ipcRenderer.invoke('servers:delete', id),
    start: (id: number) => ipcRenderer.invoke('servers:start', id),
    stop: (id: number) => ipcRenderer.invoke('servers:stop', id),
    restart: (id: number) => ipcRenderer.invoke('servers:restart', id),
    sendCommand: (id: number, cmd: string) => ipcRenderer.invoke('servers:sendCommand', id, cmd),
    getConfig: (id: number) => ipcRenderer.invoke('servers:getConfig', id),
    updateConfig: (id: number, cfg: Record<string, unknown>) => ipcRenderer.invoke('servers:updateConfig', id, cfg),
    getConsoleBuffer: (id: number) => ipcRenderer.invoke('servers:getConsoleBuffer', id),
    onConsoleOutput: (cb: (serverId: number, line: string) => void) => {
      const handler = (_e: unknown, serverId: number, line: string) => cb(serverId, line);
      ipcRenderer.on('server:console-output', handler);
      return () => ipcRenderer.removeListener('server:console-output', handler);
    },
    onStatusChange: (cb: (serverId: number, status: string) => void) => {
      const handler = (_e: unknown, serverId: number, status: string) => cb(serverId, status);
      ipcRenderer.on('server:status-change', handler);
      return () => ipcRenderer.removeListener('server:status-change', handler);
    },
  },

  hytale: {
    getAuthStatus: () => ipcRenderer.invoke('hytale:getAuthStatus'),
    startDeviceAuth: () => ipcRenderer.invoke('hytale:startDeviceAuth'),
    onAuthComplete: (cb: () => void) => {
      const handler = () => cb();
      ipcRenderer.on('hytale:authComplete', handler);
      return () => ipcRenderer.removeListener('hytale:authComplete', handler);
    },
  },

  downloader: {
    downloadServer: () => ipcRenderer.invoke('downloader:downloadServer'),
    checkFiles: () => ipcRenderer.invoke('downloader:checkFiles'),
    onProgress: (cb: (progress: { percent: number; stage: string }) => void) => {
      const handler = (_e: unknown, progress: { percent: number; stage: string }) => cb(progress);
      ipcRenderer.on('downloader:progress', handler);
      return () => ipcRenderer.removeListener('downloader:progress', handler);
    },
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (s: Record<string, string>) => ipcRenderer.invoke('settings:update', s),
  },

  updates: {
    check: () => ipcRenderer.invoke('updates:check'),
    download: () => ipcRenderer.invoke('updates:download'),
    install: () => ipcRenderer.invoke('updates:install'),
    onUpdateAvailable: (cb: (info: { version: string; releaseNotes: string }) => void) => {
      const handler = (_e: unknown, info: { version: string; releaseNotes: string }) => cb(info);
      ipcRenderer.on('updates:available', handler);
      return () => ipcRenderer.removeListener('updates:available', handler);
    },
  },

  java: {
    check: () => ipcRenderer.invoke('java:check'),
  },

  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
});
```

- [ ] **Step 4: Update electron/main.ts with all services and IPC**

```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { DatabaseService } from './services/DatabaseService';
import { AuthService } from './services/AuthService';
import { ServerManager } from './services/ServerManager';
import { JavaService } from './services/JavaService';
import { registerAuthHandlers } from './ipc/auth-handlers';
import { registerServerHandlers } from './ipc/server-handlers';
import { registerSettingsHandlers } from './ipc/settings-handlers';
import { registerUpdateHandlers } from './ipc/update-handlers';
import { registerHytaleHandlers } from './ipc/hytale-handlers';
import { registerDownloaderHandlers } from './ipc/downloader-handlers';

let mainWindow: BrowserWindow | null = null;

const dataDir = path.join(app.getPath('userData'), 'data');
const serversDir = path.join(app.getPath('userData'), 'servers');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a2e',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  const db = new DatabaseService(dataDir);
  const auth = new AuthService(db);
  const manager = new ServerManager(db, serversDir);

  registerAuthHandlers(auth);
  registerServerHandlers(manager);
  registerSettingsHandlers(db);
  registerUpdateHandlers();
  registerHytaleHandlers();
  registerDownloaderHandlers(serversDir);

  ipcMain.handle('java:check', () => JavaService.checkJava());

  // Window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  createWindow();

  app.on('before-quit', async () => {
    await manager.stopAll();
    db.close();
  });
});

app.on('window-all-closed', () => app.quit());
```

- [ ] **Step 5: Verify the app still launches**

```bash
npm run dev
```

- [ ] **Step 6: Commit**

```bash
git add electron/ src/types.ts
git commit -m "feat: add IPC handlers, preload bridge, and wire up all services"
```

---

### Task 7: i18n Setup

**Files:**
- Create: `hytale-server-manager/src/i18n.ts`
- Create: `hytale-server-manager/src/locales/en.json`
- Create: `hytale-server-manager/src/locales/de.json`

- [ ] **Step 1: Create i18n configuration**

`src/i18n.ts`:
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import de from './locales/de.json';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, de: { translation: de } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
```

- [ ] **Step 2: Create English locale**

`src/locales/en.json`:
```json
{
  "app": { "title": "Hytale Server Manager" },
  "setup": {
    "title": "Setup",
    "step1": "Create Account",
    "step2": "Check Java",
    "step3": "Download Server Files",
    "step4": "Complete",
    "username": "Username",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "createAccount": "Create Account",
    "next": "Next",
    "finish": "Go to Dashboard",
    "javaFound": "Java {{version}} detected",
    "javaNotFound": "Java 25 not found",
    "javaInstallHint": "Please install Java 25 from Adoptium",
    "recheck": "Re-check",
    "downloading": "Downloading server files...",
    "authRequired": "Hytale authentication required",
    "visitUrl": "Visit this URL and enter the code:",
    "setupComplete": "Setup complete!",
    "setupSummary": "Your Hytale Server Manager is ready to use."
  },
  "login": {
    "title": "Login",
    "username": "Username",
    "password": "Password",
    "rememberMe": "Remember me",
    "login": "Login",
    "invalidCredentials": "Invalid username or password"
  },
  "dashboard": {
    "title": "Dashboard",
    "newServer": "New Server",
    "startAll": "Start All",
    "stopAll": "Stop All",
    "search": "Search servers...",
    "noServers": "No servers yet. Create your first server!",
    "serverName": "Server Name",
    "create": "Create",
    "cancel": "Cancel",
    "confirmDelete": "Are you sure you want to delete \"{{name}}\"?"
  },
  "server": {
    "console": "Console",
    "config": "Configuration",
    "whitelist": "Whitelist",
    "bans": "Bans",
    "permissions": "Permissions",
    "start": "Start",
    "stop": "Stop",
    "restart": "Restart",
    "delete": "Delete",
    "sendCommand": "Send command...",
    "status": {
      "online": "Online",
      "offline": "Offline",
      "starting": "Starting",
      "stopping": "Stopping",
      "crashed": "Crashed"
    },
    "port": "Port",
    "memory": "Memory",
    "viewDistance": "View Distance",
    "pvp": "PvP",
    "fallDamage": "Fall Damage",
    "autoUpdate": "Auto Update",
    "save": "Save"
  },
  "settings": {
    "title": "Settings",
    "language": "Language",
    "javaPath": "Java Path",
    "defaultMemory": "Default Memory",
    "hytaleAuth": "Hytale Authentication",
    "authenticated": "Authenticated as {{username}}",
    "notAuthenticated": "Not authenticated",
    "save": "Save"
  },
  "common": {
    "enabled": "Enabled",
    "disabled": "Disabled",
    "add": "Add",
    "remove": "Remove",
    "error": "Error",
    "success": "Success"
  }
}
```

- [ ] **Step 3: Create German locale**

`src/locales/de.json`:
```json
{
  "app": { "title": "Hytale Server Manager" },
  "setup": {
    "title": "Einrichtung",
    "step1": "Account erstellen",
    "step2": "Java pruefen",
    "step3": "Server-Dateien herunterladen",
    "step4": "Fertig",
    "username": "Benutzername",
    "password": "Passwort",
    "confirmPassword": "Passwort bestaetigen",
    "createAccount": "Account erstellen",
    "next": "Weiter",
    "finish": "Zum Dashboard",
    "javaFound": "Java {{version}} erkannt",
    "javaNotFound": "Java 25 nicht gefunden",
    "javaInstallHint": "Bitte installiere Java 25 von Adoptium",
    "recheck": "Erneut pruefen",
    "downloading": "Server-Dateien werden heruntergeladen...",
    "authRequired": "Hytale-Authentifizierung erforderlich",
    "visitUrl": "Besuche diese URL und gib den Code ein:",
    "setupComplete": "Einrichtung abgeschlossen!",
    "setupSummary": "Dein Hytale Server Manager ist einsatzbereit."
  },
  "login": {
    "title": "Anmelden",
    "username": "Benutzername",
    "password": "Passwort",
    "rememberMe": "Angemeldet bleiben",
    "login": "Anmelden",
    "invalidCredentials": "Ungültiger Benutzername oder Passwort"
  },
  "dashboard": {
    "title": "Dashboard",
    "newServer": "Neuer Server",
    "startAll": "Alle starten",
    "stopAll": "Alle stoppen",
    "search": "Server suchen...",
    "noServers": "Noch keine Server. Erstelle deinen ersten Server!",
    "serverName": "Servername",
    "create": "Erstellen",
    "cancel": "Abbrechen",
    "confirmDelete": "Möchtest du \"{{name}}\" wirklich löschen?"
  },
  "server": {
    "console": "Konsole",
    "config": "Konfiguration",
    "whitelist": "Whitelist",
    "bans": "Bans",
    "permissions": "Berechtigungen",
    "start": "Starten",
    "stop": "Stoppen",
    "restart": "Neustarten",
    "delete": "Löschen",
    "sendCommand": "Befehl eingeben...",
    "status": {
      "online": "Online",
      "offline": "Offline",
      "starting": "Startet",
      "stopping": "Stoppt",
      "crashed": "Abgestürzt"
    },
    "port": "Port",
    "memory": "Arbeitsspeicher",
    "viewDistance": "Sichtweite",
    "pvp": "PvP",
    "fallDamage": "Fallschaden",
    "autoUpdate": "Auto-Update",
    "save": "Speichern"
  },
  "settings": {
    "title": "Einstellungen",
    "language": "Sprache",
    "javaPath": "Java-Pfad",
    "defaultMemory": "Standard-Arbeitsspeicher",
    "hytaleAuth": "Hytale-Authentifizierung",
    "authenticated": "Angemeldet als {{username}}",
    "notAuthenticated": "Nicht authentifiziert",
    "save": "Speichern"
  },
  "common": {
    "enabled": "Aktiviert",
    "disabled": "Deaktiviert",
    "add": "Hinzufügen",
    "remove": "Entfernen",
    "error": "Fehler",
    "success": "Erfolg"
  }
}
```

- [ ] **Step 4: Import i18n in main.tsx**

Add to `src/main.tsx` before the render call:
```typescript
import './i18n';
```

- [ ] **Step 5: Commit**

```bash
git add src/i18n.ts src/locales/ src/main.tsx
git commit -m "feat: add i18n with German and English translations"
```

---

### Task 8: Common UI Components + Theme

**Files:**
- Create: `hytale-server-manager/src/components/common/Button.tsx`
- Create: `hytale-server-manager/src/components/common/Input.tsx`
- Create: `hytale-server-manager/src/components/common/Modal.tsx`
- Create: `hytale-server-manager/src/components/common/StatusBadge.tsx`
- Create: `hytale-server-manager/src/components/common/Spinner.tsx`
- Create: `hytale-server-manager/src/components/Sidebar.tsx`
- Create: `hytale-server-manager/src/components/TopBar.tsx`
- Create: `hytale-server-manager/src/styles/theme.ts`

- [ ] **Step 1: Create theme.ts**

```typescript
export const theme = {
  bg: { primary: '#1a1a2e', secondary: '#16213e', surface: 'rgba(255,255,255,0.06)', surfaceHover: 'rgba(255,255,255,0.1)' },
  accent: { primary: '#e94560', secondary: '#f4d03f' },
  text: { primary: '#e0e0e0', secondary: '#888888' },
  status: { success: '#6ba34a', error: '#e94560', warning: '#f4d03f' },
  radius: '8px',
  radiusLg: '12px',
};
```

- [ ] **Step 2: Create Button component**

```tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', children, style, ...props }: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600,
    transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: size === 'sm' ? '6px 12px' : size === 'lg' ? '12px 24px' : '8px 16px',
    fontSize: size === 'sm' ? 12 : size === 'lg' ? 16 : 14,
    ...(variant === 'primary' && { background: 'var(--accent-primary)', color: '#fff' }),
    ...(variant === 'secondary' && { background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)' }),
    ...(variant === 'danger' && { background: '#c0392b', color: '#fff' }),
    ...(variant === 'ghost' && { background: 'transparent', color: 'var(--text-secondary)' }),
    ...style,
  };
  return <button style={baseStyle} {...props}>{children}</button>;
}
```

- [ ] **Step 3: Create Input component**

```tsx
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, style, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</label>}
      <input
        style={{
          background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text-primary)',
          fontSize: 14, outline: 'none', transition: 'border-color 0.2s', ...style,
        }}
        {...props}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create Modal, StatusBadge, Spinner**

`Modal.tsx`:
```tsx
import React from 'react';

interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; }

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 24, minWidth: 400, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16, fontSize: 18 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
```

`StatusBadge.tsx`:
```tsx
const statusColors: Record<string, string> = {
  online: 'var(--success)', offline: 'var(--text-secondary)',
  starting: 'var(--warning)', stopping: 'var(--warning)', crashed: 'var(--error)',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: statusColors[status] || '#888' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[status] || '#888', animation: status === 'starting' || status === 'stopping' ? 'pulse 1.5s infinite' : 'none' }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
```

`Spinner.tsx`:
```tsx
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, border: '3px solid var(--bg-surface)', borderTop: '3px solid var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  );
}
```

- [ ] **Step 5: Create Sidebar and TopBar**

`Sidebar.tsx`:
```tsx
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/dashboard', icon: '⊞', labelKey: 'dashboard.title' },
  { path: '/settings', icon: '⚙', labelKey: 'settings.title' },
];

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div style={{ width: 220, background: 'rgba(0,0,0,0.2)', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
      <div style={{ padding: '0 20px 24px', fontSize: 18, fontWeight: 700, color: 'var(--accent-primary)' }}>
        HSM
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {navItems.map(item => {
          const active = location.pathname.startsWith(item.path);
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', border: 'none', background: active ? 'var(--bg-surface)' : 'transparent', color: active ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, textAlign: 'left', transition: 'all 0.2s', borderLeft: active ? '3px solid var(--accent-primary)' : '3px solid transparent' }}>
              <span>{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
```

`TopBar.tsx`:
```tsx
export function TopBar() {
  return (
    <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 12px', gap: 8, WebkitAppRegion: 'drag' as any }}>
      <button onClick={() => window.electronAPI.window.minimize()} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16, WebkitAppRegion: 'no-drag' as any }}>—</button>
      <button onClick={() => window.electronAPI.window.maximize()} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16, WebkitAppRegion: 'no-drag' as any }}>□</button>
      <button onClick={() => window.electronAPI.window.close()} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16, WebkitAppRegion: 'no-drag' as any }}>✕</button>
    </div>
  );
}
```

- [ ] **Step 6: Add keyframe animations to globals.css**

Append to `src/styles/globals.css`:
```css
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
```

- [ ] **Step 7: Commit**

```bash
git add src/components/ src/styles/
git commit -m "feat: add common UI components, sidebar, topbar, and dark gaming theme"
```

---

### Task 9: Login Page + Auth Hook

**Files:**
- Create: `hytale-server-manager/src/hooks/useAuth.ts`
- Create: `hytale-server-manager/src/pages/Login/Login.tsx`
- Modify: `hytale-server-manager/src/App.tsx`

- [ ] **Step 1: Create useAuth hook**

```tsx
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface AuthState {
  loading: boolean;
  authenticated: boolean;
  username: string;
  needsSetup: boolean;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, authenticated: false, username: '', needsSetup: false });

  const refresh = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    const hasUsers = await window.electronAPI.auth.hasUsers();
    if (!hasUsers) {
      setState({ loading: false, authenticated: false, username: '', needsSetup: true });
      return;
    }
    const session = await window.electronAPI.auth.checkSession();
    setState({ loading: false, authenticated: session.valid, username: session.username, needsSetup: false });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (username: string, password: string, remember: boolean) => {
    await window.electronAPI.auth.login(username, password, remember);
    await refresh();
  };

  const register = async (username: string, password: string) => {
    await window.electronAPI.auth.register(username, password);
    await refresh();
  };

  const logout = async () => {
    await window.electronAPI.auth.logout();
    setState({ loading: false, authenticated: false, username: '', needsSetup: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Create Login page**

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password, remember);
    } catch (err: any) {
      setError(t('login.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw' }}>
      <form onSubmit={handleSubmit} style={{ background: 'var(--bg-surface)', padding: 40, borderRadius: 'var(--radius-lg)', width: 380, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ textAlign: 'center', color: 'var(--accent-primary)', marginBottom: 8 }}>{t('app.title')}</h2>
        <Input label={t('login.username')} value={username} onChange={e => setUsername(e.target.value)} autoFocus />
        <Input label={t('login.password')} type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
          {t('login.rememberMe')}
        </label>
        {error && <div style={{ color: 'var(--error)', fontSize: 13 }}>{error}</div>}
        <Button type="submit" disabled={loading}>{loading ? '...' : t('login.login')}</Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Update App.tsx with routing and auth**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Login } from './pages/Login/Login';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Spinner } from './components/common/Spinner';
import './i18n';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{children}</main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { loading, authenticated, needsSetup } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><Spinner size={48} /></div>;
  }

  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  if (!authenticated) {
    return <Login />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/dashboard" element={<div>Dashboard (coming next)</div>} />
        <Route path="/server/:id" element={<div>Server Detail (coming soon)</div>} />
        <Route path="/settings" element={<div>Settings (coming soon)</div>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/setup/*" element={<div>Setup Wizard (coming next)</div>} />
          <Route path="*" element={<AppRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Verify login page renders**

```bash
npm run dev
```
Expected: App shows login form on dark background (since no users exist yet, it should redirect to setup placeholder).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAuth.ts src/pages/Login/ src/App.tsx
git commit -m "feat: add login page, auth hook, and app routing"
```

---

### Task 10: Setup Wizard

**Files:**
- Create: `hytale-server-manager/src/pages/SetupWizard/SetupWizard.tsx`
- Create: `hytale-server-manager/src/pages/SetupWizard/AccountStep.tsx`
- Create: `hytale-server-manager/src/pages/SetupWizard/JavaStep.tsx`
- Create: `hytale-server-manager/src/pages/SetupWizard/DownloadStep.tsx`
- Create: `hytale-server-manager/src/pages/SetupWizard/CompleteStep.tsx`
- Modify: `hytale-server-manager/src/App.tsx`

- [ ] **Step 1: Create SetupWizard container**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AccountStep } from './AccountStep';
import { JavaStep } from './JavaStep';
import { DownloadStep } from './DownloadStep';
import { CompleteStep } from './CompleteStep';

const STEPS = ['account', 'java', 'download', 'complete'] as const;

export function SetupWizard() {
  const [step, setStep] = useState(0);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const finish = () => navigate('/dashboard');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      {/* Progress indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, background: i <= step ? 'var(--accent-primary)' : 'var(--bg-surface)', color: i <= step ? '#fff' : 'var(--text-secondary)' }}>
              {i + 1}
            </div>
            {i < STEPS.length - 1 && <div style={{ width: 40, height: 2, background: i < step ? 'var(--accent-primary)' : 'var(--bg-surface)' }} />}
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: 40, width: 480 }}>
        {step === 0 && <AccountStep onNext={next} />}
        {step === 1 && <JavaStep onNext={next} />}
        {step === 2 && <DownloadStep onNext={next} />}
        {step === 3 && <CompleteStep onFinish={finish} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create AccountStep**

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export function AccountStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await register(username, password);
      onNext();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2>{t('setup.step1')}</h2>
      <Input label={t('setup.username')} value={username} onChange={e => setUsername(e.target.value)} autoFocus />
      <Input label={t('setup.password')} type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <Input label={t('setup.confirmPassword')} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
      {error && <div style={{ color: 'var(--error)', fontSize: 13 }}>{error}</div>}
      <Button type="submit" disabled={loading}>{t('setup.createAccount')}</Button>
    </form>
  );
}
```

- [ ] **Step 3: Create JavaStep**

```tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';

export function JavaStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<{ found: boolean; version: number | null; supported: boolean } | null>(null);

  const check = async () => {
    setChecking(true);
    const r = await window.electronAPI.java.check();
    setResult(r);
    setChecking(false);
  };

  useEffect(() => { check(); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2>{t('setup.step2')}</h2>
      {checking ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Spinner /> Checking Java...</div>
      ) : result?.supported ? (
        <>
          <div style={{ color: 'var(--success)', fontSize: 16 }}>{t('setup.javaFound', { version: result.version })}</div>
          <Button onClick={onNext}>{t('setup.next')}</Button>
        </>
      ) : (
        <>
          <div style={{ color: 'var(--error)', fontSize: 16 }}>{t('setup.javaNotFound')}</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('setup.javaInstallHint')}</p>
          <a href="https://adoptium.net/" target="_blank" rel="noopener" style={{ color: 'var(--accent-secondary)' }}>adoptium.net</a>
          <Button variant="secondary" onClick={check}>{t('setup.recheck')}</Button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create DownloadStep**

```tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';

export function DownloadStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'checking' | 'ready' | 'downloading' | 'auth' | 'done' | 'error'>('checking');
  const [progress, setProgress] = useState(0);
  const [authInfo, setAuthInfo] = useState<{ url: string; code: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const hasFiles = await window.electronAPI.downloader.checkFiles();
      if (hasFiles) { setStatus('done'); return; }
      setStatus('ready');
    })();
  }, []);

  const startDownload = async () => {
    setStatus('downloading');
    const unsub = window.electronAPI.downloader.onProgress((p) => {
      setProgress(p.percent);
      if (p.stage === 'auth') {
        setStatus('auth');
      }
    });

    try {
      await window.electronAPI.downloader.downloadServer();
      setStatus('done');
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
    unsub();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2>{t('setup.step3')}</h2>

      {status === 'checking' && <Spinner />}

      {status === 'ready' && (
        <Button onClick={startDownload}>{t('setup.downloading').replace('...', '')}</Button>
      )}

      {status === 'downloading' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Spinner /> {t('setup.downloading')}</div>
          <div style={{ marginTop: 12, height: 8, background: 'var(--bg-surface)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent-primary)', transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {status === 'auth' && (
        <div>
          <p style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>{t('setup.authRequired')}</p>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{t('setup.visitUrl')}</p>
          {authInfo && (
            <div style={{ marginTop: 12, padding: 16, background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
              <a href={authInfo.url} target="_blank" rel="noopener" style={{ color: 'var(--accent-secondary)', fontSize: 14 }}>{authInfo.url}</a>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8, letterSpacing: 4, color: 'var(--text-primary)' }}>{authInfo.code}</div>
            </div>
          )}
        </div>
      )}

      {status === 'done' && (
        <>
          <div style={{ color: 'var(--success)' }}>Server files ready!</div>
          <Button onClick={onNext}>{t('setup.next')}</Button>
        </>
      )}

      {status === 'error' && (
        <>
          <div style={{ color: 'var(--error)' }}>{error}</div>
          <Button variant="secondary" onClick={startDownload}>Retry</Button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create CompleteStep**

```tsx
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/common/Button';

export function CompleteStep({ onFinish }: { onFinish: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
      <h2 style={{ color: 'var(--success)' }}>{t('setup.setupComplete')}</h2>
      <p style={{ color: 'var(--text-secondary)' }}>{t('setup.setupSummary')}</p>
      <Button onClick={onFinish}>{t('setup.finish')}</Button>
    </div>
  );
}
```

- [ ] **Step 6: Wire SetupWizard into App.tsx**

Update the `<Route path="/setup/*"` in `App.tsx` to use `<SetupWizard />` instead of the placeholder div. Add the import.

- [ ] **Step 7: Verify wizard renders**

```bash
npm run dev
```
Expected: Setup wizard shows with 4-step progress indicator and account creation form.

- [ ] **Step 8: Commit**

```bash
git add src/pages/SetupWizard/ src/App.tsx
git commit -m "feat: add setup wizard with account, java check, download, and complete steps"
```

---

### Task 11: Dashboard Page

**Files:**
- Create: `hytale-server-manager/src/hooks/useServers.ts`
- Create: `hytale-server-manager/src/pages/Dashboard/Dashboard.tsx`
- Create: `hytale-server-manager/src/components/ServerCard.tsx`
- Modify: `hytale-server-manager/src/App.tsx`

- [ ] **Step 1: Create useServers hook**

```tsx
import { useState, useEffect, useCallback } from 'react';
import type { ServerWithStatus, ServerStatus } from '../types';

export function useServers() {
  const [servers, setServers] = useState<ServerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await window.electronAPI.servers.list();
    setServers(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const unsub = window.electronAPI.servers.onStatusChange((serverId: number, status: ServerStatus) => {
      setServers(prev => prev.map(s => s.id === serverId ? { ...s, status } : s));
    });
    return unsub;
  }, [refresh]);

  const createServer = async (name: string) => {
    await window.electronAPI.servers.create(name);
    await refresh();
  };

  const deleteServer = async (id: number) => {
    await window.electronAPI.servers.delete(id);
    await refresh();
  };

  const startServer = (id: number) => window.electronAPI.servers.start(id);
  const stopServer = (id: number) => window.electronAPI.servers.stop(id);

  return { servers, loading, refresh, createServer, deleteServer, startServer, stopServer };
}
```

- [ ] **Step 2: Create ServerCard**

```tsx
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from './common/StatusBadge';
import { Button } from './common/Button';
import type { ServerWithStatus } from '../types';

export function ServerCard({ server, onStart, onStop, onDelete }: {
  server: ServerWithStatus;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isRunning = server.status === 'online' || server.status === 'starting';

  return (
    <div onClick={() => navigate(`/server/${server.id}`)} style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: 20, cursor: 'pointer', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.06)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 16 }}>{server.name}</h3>
        <StatusBadge status={server.status} />
      </div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
        {t('server.port')}: {server.port}
      </div>
      <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
        {isRunning ? (
          <Button size="sm" variant="danger" onClick={onStop}>{t('server.stop')}</Button>
        ) : (
          <Button size="sm" onClick={onStart}>{t('server.start')}</Button>
        )}
        <Button size="sm" variant="ghost" onClick={onDelete}>{t('server.delete')}</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Dashboard page**

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useServers } from '../../hooks/useServers';
import { ServerCard } from '../../components/ServerCard';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Spinner } from '../../components/common/Spinner';

export function Dashboard() {
  const { t } = useTranslation();
  const { servers, loading, createServer, deleteServer, startServer, stopServer } = useServers();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const filtered = servers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await createServer(newName.trim());
      setShowCreate(false);
      setNewName('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(t('dashboard.confirmDelete', { name }))) {
      deleteServer(id);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 100 }}><Spinner size={48} /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24 }}>{t('dashboard.title')}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => setShowCreate(true)}>{t('dashboard.newServer')}</Button>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Input placeholder={t('dashboard.search')} value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
          {servers.length === 0 ? t('dashboard.noServers') : 'No results'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(s => (
            <ServerCard key={s.id} server={s} onStart={() => startServer(s.id)} onStop={() => stopServer(s.id)} onDelete={() => handleDelete(s.id, s.name)} />
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('dashboard.newServer')}>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label={t('dashboard.serverName')} value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
          {error && <div style={{ color: 'var(--error)', fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>{t('dashboard.cancel')}</Button>
            <Button type="submit" disabled={creating}>{t('dashboard.create')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 4: Wire Dashboard into App.tsx routes**

Replace `<div>Dashboard (coming next)</div>` with `<Dashboard />` and add the import.

- [ ] **Step 5: Verify dashboard renders**

```bash
npm run dev
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useServers.ts src/pages/Dashboard/ src/components/ServerCard.tsx src/App.tsx
git commit -m "feat: add dashboard with server grid, create modal, and search"
```

---

### Task 12: Server Detail Page (Console + Config + Whitelist/Bans)

**Files:**
- Create: `hytale-server-manager/src/hooks/useConsole.ts`
- Create: `hytale-server-manager/src/pages/ServerDetail/ServerDetail.tsx`
- Create: `hytale-server-manager/src/pages/ServerDetail/ConsoleTab.tsx`
- Create: `hytale-server-manager/src/pages/ServerDetail/ConfigTab.tsx`
- Create: `hytale-server-manager/src/pages/ServerDetail/WhitelistTab.tsx`
- Create: `hytale-server-manager/src/pages/ServerDetail/BansTab.tsx`
- Create: `hytale-server-manager/src/pages/ServerDetail/PermissionsTab.tsx`
- Modify: `hytale-server-manager/src/App.tsx`

- [ ] **Step 1: Create useConsole hook**

```tsx
import { useState, useEffect, useRef } from 'react';

export function useConsole(serverId: number) {
  const [lines, setLines] = useState<string[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Load buffer
    window.electronAPI.servers.getConsoleBuffer(serverId).then(buf => setLines(buf));

    // Subscribe to live output
    const unsub = window.electronAPI.servers.onConsoleOutput((id, line) => {
      if (id === serverId) {
        setLines(prev => [...prev.slice(-4999), line]);
      }
    });

    return () => { unsub(); initialized.current = false; };
  }, [serverId]);

  const sendCommand = (cmd: string) => {
    window.electronAPI.servers.sendCommand(serverId, cmd);
  };

  return { lines, sendCommand };
}
```

- [ ] **Step 2: Create ServerDetail container with tabs**

```tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConsoleTab } from './ConsoleTab';
import { ConfigTab } from './ConfigTab';
import { WhitelistTab } from './WhitelistTab';
import { BansTab } from './BansTab';
import { PermissionsTab } from './PermissionsTab';
import type { ServerWithStatus } from '../../types';

const TABS = ['console', 'config', 'whitelist', 'bans', 'permissions'] as const;

export function ServerDetail() {
  const { id } = useParams<{ id: string }>();
  const serverId = Number(id);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [server, setServer] = useState<ServerWithStatus | null>(null);
  const [tab, setTab] = useState<typeof TABS[number]>('console');

  useEffect(() => {
    window.electronAPI.servers.list().then(list => {
      setServer(list.find(s => s.id === serverId) || null);
    });

    const unsub = window.electronAPI.servers.onStatusChange((sid, status) => {
      if (sid === serverId) setServer(prev => prev ? { ...prev, status } : null);
    });
    return unsub;
  }, [serverId]);

  if (!server) return <div>Loading...</div>;

  const isRunning = server.status === 'online' || server.status === 'starting';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18 }}>←</button>
          <h1 style={{ fontSize: 22 }}>{server.name}</h1>
          <StatusBadge status={server.status} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isRunning ? (
            <>
              <Button variant="secondary" onClick={() => window.electronAPI.servers.restart(serverId)}>{t('server.restart')}</Button>
              <Button variant="danger" onClick={() => window.electronAPI.servers.stop(serverId)}>{t('server.stop')}</Button>
            </>
          ) : (
            <Button onClick={() => window.electronAPI.servers.start(serverId)}>{t('server.start')}</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 16 }}>
        {TABS.map(t2 => (
          <button key={t2} onClick={() => setTab(t2)}
            style={{ padding: '10px 20px', border: 'none', background: 'none', color: tab === t2 ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, borderBottom: tab === t2 ? '2px solid var(--accent-primary)' : '2px solid transparent', transition: 'all 0.2s' }}>
            {t(`server.${t2}`)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'console' && <ConsoleTab serverId={serverId} />}
        {tab === 'config' && <ConfigTab serverId={serverId} />}
        {tab === 'whitelist' && <WhitelistTab serverPath={server.path} />}
        {tab === 'bans' && <BansTab serverPath={server.path} />}
        {tab === 'permissions' && <PermissionsTab serverPath={server.path} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create ConsoleTab**

```tsx
import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConsole } from '../../hooks/useConsole';

export function ConsoleTab({ serverId }: { serverId: number }) {
  const { t } = useTranslation();
  const { lines, sendCommand } = useConsole(serverId);
  const [cmd, setCmd] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmd.trim()) return;
    sendCommand(cmd.trim());
    setCmd('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, background: '#0d1117', borderRadius: 'var(--radius)', padding: 16, fontFamily: "'Cascadia Code', 'Fira Code', monospace", fontSize: 13, overflow: 'auto', lineHeight: 1.6 }}>
        {lines.map((line, i) => (
          <div key={i} style={{ color: '#c9d1d9', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{line}</div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={cmd} onChange={e => setCmd(e.target.value)} placeholder={t('server.sendCommand')}
          style={{ flex: 1, background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius)', padding: '8px 14px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 13, outline: 'none' }} />
        <button type="submit" style={{ background: 'var(--accent-primary)', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', color: '#fff', cursor: 'pointer' }}>→</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Create ConfigTab**

```tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import type { ServerConfig } from '../../types';

export function ConfigTab({ serverId }: { serverId: number }) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.electronAPI.servers.getConfig(serverId).then(setConfig);
  }, [serverId]);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    await window.electronAPI.servers.updateConfig(serverId, config);
    setSaving(false);
  };

  if (!config) return <div>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
      <Input label={t('server.port')} type="number" value={config.port} onChange={e => setConfig({ ...config, port: Number(e.target.value) })} />
      <div style={{ display: 'flex', gap: 16 }}>
        <Input label="Xms" value={config.jvm_xms} onChange={e => setConfig({ ...config, jvm_xms: e.target.value })} style={{ width: 100 }} />
        <Input label="Xmx" value={config.jvm_xmx} onChange={e => setConfig({ ...config, jvm_xmx: e.target.value })} style={{ width: 100 }} />
      </div>
      <Input label={t('server.viewDistance')} type="number" value={config.view_distance} onChange={e => setConfig({ ...config, view_distance: Number(e.target.value) })} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
        <input type="checkbox" checked={config.pvp_enabled} onChange={e => setConfig({ ...config, pvp_enabled: e.target.checked })} />
        {t('server.pvp')}
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
        <input type="checkbox" checked={config.fall_damage} onChange={e => setConfig({ ...config, fall_damage: e.target.checked })} />
        {t('server.fallDamage')}
      </label>
      <div>
        <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>{t('server.autoUpdate')}</label>
        <select value={config.auto_update_mode} onChange={e => setConfig({ ...config, auto_update_mode: e.target.value })}
          style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14 }}>
          <option value="Disabled">Disabled</option>
          <option value="WhenEmpty">When Empty</option>
          <option value="Scheduled">Scheduled</option>
        </select>
      </div>
      <Button onClick={save} disabled={saving}>{t('server.save')}</Button>
    </div>
  );
}
```

- [ ] **Step 5: Create WhitelistTab, BansTab, PermissionsTab**

These three are very similar — table with add/remove. Create all three following this pattern:

`WhitelistTab.tsx`:
```tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export function WhitelistTab({ serverPath }: { serverPath: string }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<string[]>([]);
  const [newEntry, setNewEntry] = useState('');

  // Note: In v1.0, whitelist/bans/permissions are managed via server commands.
  // This UI sends commands like /whitelist add <name> via the server console.
  // Direct file editing would be overwritten by the running server.

  const add = () => {
    if (!newEntry.trim()) return;
    setEntries(prev => [...prev, newEntry.trim()]);
    setNewEntry('');
  };

  const remove = (entry: string) => {
    setEntries(prev => prev.filter(e => e !== entry));
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Input placeholder={t('common.add') + '...'} value={newEntry} onChange={e => setNewEntry(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()} style={{ flex: 1 }} />
        <Button onClick={add}>{t('common.add')}</Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {entries.map(entry => (
          <div key={entry} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)' }}>
            <span>{entry}</span>
            <Button size="sm" variant="ghost" onClick={() => remove(entry)}>{t('common.remove')}</Button>
          </div>
        ))}
        {entries.length === 0 && <div style={{ color: 'var(--text-secondary)', padding: 20, textAlign: 'center' }}>Empty</div>}
      </div>
    </div>
  );
}
```

Create `BansTab.tsx` and `PermissionsTab.tsx` with the same structure, changing the component name and label as needed.

- [ ] **Step 6: Wire ServerDetail into App.tsx**

Replace `<div>Server Detail (coming soon)</div>` with `<ServerDetail />` and add the import.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useConsole.ts src/pages/ServerDetail/ src/App.tsx
git commit -m "feat: add server detail page with console, config editor, and whitelist/bans/permissions"
```

---

### Task 13: Settings Page

**Files:**
- Create: `hytale-server-manager/src/hooks/useSettings.ts`
- Create: `hytale-server-manager/src/pages/Settings/Settings.tsx`
- Modify: `hytale-server-manager/src/App.tsx`

- [ ] **Step 1: Create useSettings hook**

```tsx
import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const s = await window.electronAPI.settings.get();
    setSettings(s as AppSettings);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const update = async (updates: Partial<AppSettings>) => {
    await window.electronAPI.settings.update(updates as Record<string, string>);
    await refresh();
  };

  return { settings, loading, update, refresh };
}
```

- [ ] **Step 2: Create Settings page**

```tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../hooks/useSettings';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export function Settings() {
  const { t, i18n } = useTranslation();
  const { settings, loading, update } = useSettings();
  const [form, setForm] = useState({ language: 'en', javaPath: 'java', defaultXms: '2G', defaultXmx: '4G' });

  useEffect(() => {
    if (settings) {
      setForm({
        language: settings.language || 'en',
        javaPath: settings.javaPath || 'java',
        defaultXms: settings.defaultXms || '2G',
        defaultXmx: settings.defaultXmx || '4G',
      });
    }
  }, [settings]);

  const save = async () => {
    await update(form);
    i18n.changeLanguage(form.language);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 500 }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>{t('settings.title')}</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>{t('settings.language')}</label>
          <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}
            style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, width: '100%' }}>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </div>

        <Input label={t('settings.javaPath')} value={form.javaPath} onChange={e => setForm({ ...form, javaPath: e.target.value })} />

        <div style={{ display: 'flex', gap: 16 }}>
          <Input label="Default Xms" value={form.defaultXms} onChange={e => setForm({ ...form, defaultXms: e.target.value })} style={{ width: 120 }} />
          <Input label="Default Xmx" value={form.defaultXmx} onChange={e => setForm({ ...form, defaultXmx: e.target.value })} style={{ width: 120 }} />
        </div>

        <Button onClick={save}>{t('settings.save')}</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire Settings into App.tsx**

Replace the Settings placeholder with `<Settings />` and add the import.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useSettings.ts src/pages/Settings/ src/App.tsx
git commit -m "feat: add settings page with language, Java path, and memory defaults"
```

---

### Task 14: Hytale Auth + Downloader Services

**Files:**
- Create: `hytale-server-manager/electron/services/HytaleAuthService.ts`
- Create: `hytale-server-manager/electron/services/DownloaderService.ts`
- Modify: `hytale-server-manager/electron/ipc/hytale-handlers.ts`
- Modify: `hytale-server-manager/electron/ipc/downloader-handlers.ts`
- Modify: `hytale-server-manager/electron/main.ts`

- [ ] **Step 1: Implement HytaleAuthService**

```typescript
import { safeStorage } from 'electron';
import { DatabaseService } from './DatabaseService';

export class HytaleAuthService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  getAuthStatus(): { authenticated: boolean; username: string | null } {
    const auth = this.db.get<{ hytale_username: string; expires_at: string }>('SELECT * FROM hytale_auth ORDER BY id DESC LIMIT 1');
    if (!auth) return { authenticated: false, username: null };
    return { authenticated: true, username: auth.hytale_username };
  }

  storeTokens(accessToken: string, refreshToken: string, expiresAt: string, username: string | null) {
    const encAccess = safeStorage.encryptString(accessToken).toString('base64');
    const encRefresh = safeStorage.encryptString(refreshToken).toString('base64');

    // Replace existing
    this.db.run('DELETE FROM hytale_auth');
    this.db.run(
      'INSERT INTO hytale_auth (access_token, refresh_token, expires_at, hytale_username) VALUES (?, ?, ?, ?)',
      [encAccess, encRefresh, expiresAt, username]
    );
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
```

- [ ] **Step 2: Implement DownloaderService**

```typescript
import { ChildProcess, spawn } from 'child_process';
import { BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';

export class DownloaderService {
  private toolsDir: string;
  private serversDir: string;

  constructor(toolsDir: string, serversDir: string) {
    this.toolsDir = toolsDir;
    this.serversDir = serversDir;
  }

  async downloadServer(mainWindow: BrowserWindow): Promise<void> {
    const sharedDir = path.join(this.serversDir, '_shared');
    fs.mkdirSync(sharedDir, { recursive: true });

    const downloaderPath = this.getDownloaderPath();
    if (!fs.existsSync(downloaderPath)) {
      throw new Error('Hytale Downloader not found. Please place hytale-downloader in: ' + this.toolsDir);
    }

    return new Promise((resolve, reject) => {
      const child = spawn(downloaderPath, ['-download-path', path.join(sharedDir, 'game.zip')], {
        cwd: this.toolsDir,
      });

      child.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        // Parse progress from downloader output
        const progressMatch = output.match(/(\d+)%/);
        if (progressMatch) {
          mainWindow.webContents.send('downloader:progress', {
            percent: parseInt(progressMatch[1], 10),
            stage: 'downloading',
          });
        }
        // Parse device auth code
        const codeMatch = output.match(/Enter code:\s*(\S+)/);
        if (codeMatch) {
          mainWindow.webContents.send('downloader:progress', {
            percent: 0,
            stage: 'auth',
          });
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        // Same parsing for stderr
      });

      child.on('close', (code) => {
        if (code === 0) {
          // Extract the downloaded zip and set up directory structure
          this.extractDownload(sharedDir);
          resolve();
        } else {
          reject(new Error(`Downloader exited with code ${code}`));
        }
      });

      child.on('error', (err) => reject(err));
    });
  }

  hasServerFiles(): boolean {
    const jarPath = path.join(this.serversDir, '_shared', 'Server', 'HytaleServer.jar');
    return fs.existsSync(jarPath);
  }

  private getDownloaderPath(): string {
    const ext = process.platform === 'win32' ? '.exe' : '';
    return path.join(this.toolsDir, `hytale-downloader${ext}`);
  }

  private extractDownload(sharedDir: string) {
    // The downloader creates the correct directory structure.
    // If it downloads a zip, extraction is handled by the downloader itself.
    // This method verifies the expected files exist.
    const jarPath = path.join(sharedDir, 'Server', 'HytaleServer.jar');
    if (!fs.existsSync(jarPath)) {
      throw new Error('Download completed but HytaleServer.jar not found');
    }
  }
}
```

- [ ] **Step 3: Update IPC handlers to use real services**

Update `electron/ipc/hytale-handlers.ts` and `electron/ipc/downloader-handlers.ts` to accept and use the service instances, and update `electron/main.ts` to instantiate and pass them.

- [ ] **Step 4: Commit**

```bash
git add electron/services/HytaleAuthService.ts electron/services/DownloaderService.ts electron/ipc/ electron/main.ts
git commit -m "feat: add HytaleAuthService and DownloaderService with OAuth2 device flow"
```

---

### Task 15: App Auto-Update (electron-updater)

**Files:**
- Create: `hytale-server-manager/electron/services/UpdateService.ts`
- Modify: `hytale-server-manager/electron/ipc/update-handlers.ts`
- Modify: `hytale-server-manager/electron/main.ts`

- [ ] **Step 1: Implement UpdateService**

```typescript
import { autoUpdater, UpdateInfo as EUUpdateInfo } from 'electron-updater';
import { BrowserWindow } from 'electron';
import log from 'electron-log';

export class UpdateService {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    autoUpdater.logger = log;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info: EUUpdateInfo) => {
      this.mainWindow?.webContents.send('updates:available', {
        version: info.version,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
      });
    });
  }

  setWindow(win: BrowserWindow) {
    this.mainWindow = win;
  }

  async check(): Promise<{ version: string; releaseNotes: string } | null> {
    try {
      const result = await autoUpdater.checkForUpdates();
      if (result?.updateInfo) {
        return {
          version: result.updateInfo.version,
          releaseNotes: typeof result.updateInfo.releaseNotes === 'string' ? result.updateInfo.releaseNotes : '',
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  async download(): Promise<void> {
    await autoUpdater.downloadUpdate();
  }

  install(): void {
    autoUpdater.quitAndInstall();
  }
}
```

- [ ] **Step 2: Update IPC handlers and main.ts**

Wire UpdateService into the IPC handlers and instantiate in main.ts. Call `updateService.check()` after window is ready.

- [ ] **Step 3: Commit**

```bash
git add electron/services/UpdateService.ts electron/ipc/update-handlers.ts electron/main.ts
git commit -m "feat: add auto-update via electron-updater and GitHub Releases"
```

---

### Task 16: Build Configuration + GitHub Actions

**Files:**
- Create: `hytale-server-manager/electron-builder.yml`
- Create: `hytale-server-manager/.github/workflows/release.yml`

- [ ] **Step 1: Create electron-builder.yml**

```yaml
appId: com.hytale-server-manager.app
productName: Hytale Server Manager
directories:
  output: out
  buildResources: build

files:
  - dist/**/*
  - dist-electron/**/*
  - node_modules/**/*
  - package.json

win:
  target:
    - target: nsis
      arch: [x64]
  icon: build/icon.ico

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  deleteAppDataOnUninstall: false

linux:
  target:
    - target: AppImage
      arch: [x64]
    - target: deb
      arch: [x64]
  icon: build/icon.png
  category: Utility

publish:
  provider: github
  owner: OWNER
  repo: hytale-server-manager
```

- [ ] **Step 2: Create GitHub Actions workflow**

```yaml
name: Build and Release

on:
  push:
    tags: ['v*']

permissions:
  contents: write

jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: hytale-server-manager/package-lock.json

      - name: Install dependencies
        working-directory: hytale-server-manager
        run: npm ci

      - name: Build and publish
        working-directory: hytale-server-manager
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run dist -- --publish always
```

- [ ] **Step 3: Create placeholder icon files**

Create `build/` directory with placeholder `icon.ico` and `icon.png`.

- [ ] **Step 4: Commit**

```bash
git add electron-builder.yml .github/ build/
git commit -m "feat: add electron-builder config and GitHub Actions release workflow"
```

---

### Task 17: Final Integration + Polish

- [ ] **Step 1: Add electron-log for application logging**

```bash
npm install electron-log
```

Add logging initialization in `electron/main.ts`:
```typescript
import log from 'electron-log';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
log.transports.file.level = 'info';
```

- [ ] **Step 2: Load saved language on startup**

In `src/App.tsx`, after auth check loads, read the language setting and call `i18n.changeLanguage()`.

- [ ] **Step 3: Test the full flow manually**

1. `npm run dev`
2. Setup wizard should appear (no users)
3. Create account → Java check → Download step → Complete
4. Dashboard should appear
5. Create a server
6. Navigate to server detail
7. Test config editing
8. Test settings page
9. Switch language to German

- [ ] **Step 4: Run all tests**

```bash
npm test
```
Expected: All tests pass.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: final integration, logging, and polish"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project scaffolding | package.json, main.ts, App.tsx |
| 2 | Database + migrations | DatabaseService.ts, 001_initial.sql |
| 3 | Auth service | AuthService.ts |
| 4 | Java detection | JavaService.ts |
| 5 | Server manager | ServerManager.ts |
| 6 | IPC + preload | preload.ts, *-handlers.ts, types.ts |
| 7 | i18n | i18n.ts, en.json, de.json |
| 8 | UI components | Button, Input, Modal, Sidebar, TopBar |
| 9 | Login + auth hook | useAuth.ts, Login.tsx |
| 10 | Setup wizard | SetupWizard.tsx, 4 step components |
| 11 | Dashboard | Dashboard.tsx, ServerCard.tsx |
| 12 | Server detail | ConsoleTab, ConfigTab, WhitelistTab, etc. |
| 13 | Settings | Settings.tsx, useSettings.ts |
| 14 | Hytale auth + downloader | HytaleAuthService.ts, DownloaderService.ts |
| 15 | App auto-update | UpdateService.ts, electron-updater |
| 16 | Build + CI | electron-builder.yml, release.yml |
| 17 | Integration + polish | Logging, language persistence, testing |

---

## Errata — Corrections to Apply During Implementation

These corrections address issues found during plan review. Apply them when implementing the referenced tasks.

### E1: Database integrity check on startup (Task 6, main.ts)

In `electron/main.ts`, after `const db = new DatabaseService(dataDir);`, add:

```typescript
if (!db.checkIntegrity()) {
  const { dialog } = require('electron');
  dialog.showErrorBox(
    'Database Corrupted',
    'The database integrity check failed. The application will reset the database. Server files on disk are preserved.'
  );
  db.close();
  fs.unlinkSync(path.join(dataDir, 'data.db'));
  // Re-create
  const db2 = new DatabaseService(dataDir);
  // Continue with db2...
}
```

### E2: Port check before startServer (Task 5, ServerManager.ts)

Add to `startServer()` before spawning the process:

```typescript
const portAvailable = await this.checkPortAvailable(server.port);
if (!portAvailable) {
  throw new Error(`Port ${server.port} is already in use. Change the port in server configuration.`);
}
```

### E3: Java check before startServer (Task 5, ServerManager.ts)

Add to `startServer()` before spawning:

```typescript
const javaCheck = await JavaService.checkJava(javaPath);
if (!javaCheck.supported) {
  throw new Error('Java 25 not found. Please configure the Java path in Settings.');
}
```

Import `JavaService` at the top of `ServerManager.ts`.

### E4: Config editor reads/writes actual config.json (Task 6, server-handlers.ts)

Replace the hardcoded `getConfig` handler with:

```typescript
ipcMain.handle('servers:getConfig', (_e, id: number) => {
  const server = manager.getServerById(id);
  if (!server) throw new Error('Server not found');

  const configPath = path.join(server.path, 'Server', 'config.json');
  let diskConfig: any = {};
  if (fs.existsSync(configPath)) {
    diskConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  // Read world config for PvP, fall damage
  const worldsDir = path.join(server.path, 'Server', 'universe', 'worlds');
  let worldConfig: any = {};
  if (fs.existsSync(worldsDir)) {
    const worlds = fs.readdirSync(worldsDir);
    if (worlds.length > 0) {
      const wc = path.join(worldsDir, worlds[0], 'config.json');
      if (fs.existsSync(wc)) worldConfig = JSON.parse(fs.readFileSync(wc, 'utf-8'));
    }
  }

  return {
    port: server.port,
    jvm_xms: server.jvm_xms,
    jvm_xmx: server.jvm_xmx,
    auto_update_mode: diskConfig?.Update?.AutoApplyMode ?? server.auto_update_mode,
    pvp_enabled: worldConfig?.IsPvpEnabled ?? false,
    fall_damage: worldConfig?.IsFallDamageEnabled ?? true,
    view_distance: 12,
    max_players: diskConfig?.MaxPlayers ?? 20,
    whitelist_enabled: diskConfig?.WhitelistEnabled ?? false,
    backup_enabled: diskConfig?.Backup?.Enabled ?? false,
    backup_frequency: diskConfig?.Backup?.FrequencyMinutes ?? 30,
  };
});
```

Also update `updateConfig` to write changes to `config.json` on disk:

```typescript
ipcMain.handle('servers:updateConfig', (_e, id: number, config: Record<string, unknown>) => {
  const server = manager.getServerById(id);
  if (!server) throw new Error('Server not found');

  // Update DB fields
  const dbFields = ['port', 'jvm_xms', 'jvm_xmx', 'auto_update_mode'];
  for (const field of dbFields) {
    if (config[field] !== undefined) {
      manager.updateServerField(id, field, config[field] as string | number);
    }
  }

  // Update jvm.options if memory changed
  if (config.jvm_xms !== undefined || config.jvm_xmx !== undefined) {
    const s = manager.getServerById(id)!;
    fs.writeFileSync(path.join(s.path, 'jvm.options'), `-Xms${s.jvm_xms}\n-Xmx${s.jvm_xmx}\n`);
  }

  // Update config.json on disk
  const configPath = path.join(server.path, 'Server', 'config.json');
  let diskConfig: any = {};
  if (fs.existsSync(configPath)) {
    diskConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  if (config.auto_update_mode !== undefined) {
    diskConfig.Update = diskConfig.Update || {};
    diskConfig.Update.AutoApplyMode = config.auto_update_mode;
  }
  fs.writeFileSync(configPath, JSON.stringify(diskConfig, null, 2));
});
```

Add `getServerById(id)` and `updateServerField(id, field, value)` public methods to `ServerManager`.

### E5: Fix onStatusChange listener for non-running servers (Task 5, ServerManager.ts)

Replace the `onStatusChange` method with:

```typescript
private statusListeners = new Map<number, Set<(status: ServerStatus) => void>>();

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
  // Notify both running-server listeners and external listeners
  this.statusListeners.get(id)?.forEach(cb => cb(status));
}
```

Remove `onStatusChange` from the `RunningServer` interface.

### E6: Server first-start auth detection (Task 5, ServerManager.ts)

In the `handleLine` callback inside `startServer`, add auth detection:

```typescript
// Detect auth prompt
if (line.includes('Authentication required') || line.includes('/auth login')) {
  // Send auth command
  child.stdin?.write('/auth login device\n');
}

// Detect device code for Hytale auth
const deviceMatch = line.match(/Enter code:\s*(\S+)/);
const urlMatch = line.match(/Visit:\s*(https?:\/\/\S+)/);
if (deviceMatch) {
  // Emit event to renderer with the code
  mainWindow?.webContents.send('server:auth-required', { serverId: id, code: deviceMatch[1] });
}
if (urlMatch) {
  mainWindow?.webContents.send('server:auth-url', { serverId: id, url: urlMatch[1] });
}
```

Note: `mainWindow` must be passed to `ServerManager` constructor or via a setter.

### E7: Whitelist/Bans/Permissions via server commands (Task 12)

Instead of local-only state, the tabs should send server commands via IPC:

```tsx
const add = () => {
  if (!newEntry.trim()) return;
  // Send command to running server
  window.electronAPI.servers.sendCommand(serverId, `/whitelist add ${newEntry.trim()}`);
  setEntries(prev => [...prev, newEntry.trim()]);
  setNewEntry('');
};

const remove = (entry: string) => {
  window.electronAPI.servers.sendCommand(serverId, `/whitelist remove ${entry}`);
  setEntries(prev => prev.filter(e => e !== entry));
};
```

Pass `serverId` as prop instead of `serverPath`. Same pattern for BansTab (`/ban add`, `/ban remove`) and PermissionsTab (`/permission add`, `/permission remove`).

### E8: BansTab.tsx and PermissionsTab.tsx (Task 12)

Create identical to WhitelistTab.tsx but with these differences:

**BansTab.tsx:** Commands use `/ban add <name>` and `/ban remove <name>`. Component name `BansTab`.

**PermissionsTab.tsx:** Commands use `/permission add <name>` and `/permission remove <name>`. Component name `PermissionsTab`.

### E9: Start All / Stop All buttons in Dashboard (Task 11)

Add to the Dashboard header next to "New Server":

```tsx
<Button variant="secondary" onClick={async () => {
  for (const s of servers.filter(s => s.status === 'offline')) {
    await startServer(s.id);
  }
}}>{t('dashboard.startAll')}</Button>
<Button variant="secondary" onClick={async () => {
  for (const s of servers.filter(s => s.status === 'online' || s.status === 'starting')) {
    await stopServer(s.id);
  }
}}>{t('dashboard.stopAll')}</Button>
```

### E10: Download hytale-downloader automatically (Task 14)

Add a `downloadTool()` method to `DownloaderService`:

```typescript
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { get } from 'https';
import { Extract } from 'unzip-stream'; // npm install unzip-stream

const DEFAULT_DOWNLOADER_URL = 'https://cdn.hytale.com/tools/hytale-downloader.zip';

async downloadTool(url?: string): Promise<void> {
  const downloadUrl = url || DEFAULT_DOWNLOADER_URL;
  fs.mkdirSync(this.toolsDir, { recursive: true });
  const zipPath = path.join(this.toolsDir, 'hytale-downloader.zip');

  // Download
  await new Promise<void>((resolve, reject) => {
    const file = createWriteStream(zipPath);
    get(downloadUrl, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });

  // Extract
  await pipeline(
    fs.createReadStream(zipPath),
    Extract({ path: this.toolsDir })
  );

  // Make executable on Linux
  if (process.platform !== 'win32') {
    fs.chmodSync(this.getDownloaderPath(), 0o755);
  }

  fs.unlinkSync(zipPath);
}
```

Add `npm install unzip-stream` to Task 1 dependencies.

### E11: Complete Task 14 IPC wiring code

**electron/ipc/hytale-handlers.ts** (replace placeholder):

```typescript
import { ipcMain } from 'electron';
import { HytaleAuthService } from '../services/HytaleAuthService';

export function registerHytaleHandlers(hytaleAuth: HytaleAuthService) {
  ipcMain.handle('hytale:getAuthStatus', () => hytaleAuth.getAuthStatus());
  ipcMain.handle('hytale:startDeviceAuth', () => {
    // Device auth is triggered during download or server first-start
    return { url: 'https://accounts.hytale.com/device', code: 'Waiting...' };
  });
}
```

**electron/ipc/downloader-handlers.ts** (replace placeholder):

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import { DownloaderService } from '../services/DownloaderService';

export function registerDownloaderHandlers(downloader: DownloaderService, getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('downloader:downloadServer', async () => {
    const win = getMainWindow();
    if (!win) throw new Error('No window');
    if (!downloader.hasToolInstalled()) {
      await downloader.downloadTool();
    }
    await downloader.downloadServer(win);
  });

  ipcMain.handle('downloader:checkFiles', () => downloader.hasServerFiles());
}
```

**electron/main.ts** updates:

```typescript
import { HytaleAuthService } from './services/HytaleAuthService';
import { DownloaderService } from './services/DownloaderService';

// In app.whenReady():
const toolsDir = path.join(app.getPath('userData'), 'tools');
const hytaleAuth = new HytaleAuthService(db);
const downloader = new DownloaderService(toolsDir, serversDir);

registerHytaleHandlers(hytaleAuth);
registerDownloaderHandlers(downloader, () => mainWindow);
```

### E12: Complete Task 15 IPC wiring code

**electron/ipc/update-handlers.ts** (replace placeholder):

```typescript
import { ipcMain } from 'electron';
import { UpdateService } from '../services/UpdateService';

export function registerUpdateHandlers(updateService: UpdateService) {
  ipcMain.handle('updates:check', () => updateService.check());
  ipcMain.handle('updates:download', () => updateService.download());
  ipcMain.handle('updates:install', () => updateService.install());
}
```

**electron/main.ts** addition:

```typescript
import { UpdateService } from './services/UpdateService';

// In app.whenReady(), after createWindow():
const updateService = new UpdateService();
updateService.setWindow(mainWindow!);
registerUpdateHandlers(updateService);

// Check for updates after 5 seconds
setTimeout(() => updateService.check(), 5000);
```

### E13: Logging configuration (Task 17)

Complete the logging setup:

```typescript
import log from 'electron-log';

log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
log.transports.file.level = 'info';
log.transports.file.resolvePathFn = () => path.join(dataDir, '..', 'logs', 'main.log');
// electron-log handles rotation with maxSize automatically (keeps old files as .1, .2, etc.)
```

Add a `logLevel` field to Settings and apply it:

```typescript
ipcMain.handle('settings:setLogLevel', (_e, level: string) => {
  log.transports.file.level = level as any;
});
```

### E14: Add missing ServerConfig fields (Task 12, types.ts + ConfigTab)

Update `ServerConfig` in `src/types.ts`:

```typescript
export interface ServerConfig {
  port: number;
  jvm_xms: string;
  jvm_xmx: string;
  auto_update_mode: string;
  pvp_enabled: boolean;
  fall_damage: boolean;
  view_distance: number;
  max_players: number;
  whitelist_enabled: boolean;
  backup_enabled: boolean;
  backup_frequency: number;
}
```

Add corresponding form fields to `ConfigTab.tsx` for max_players, whitelist_enabled, backup_enabled, backup_frequency.

### E15: Fix private access in server-handlers.ts (Task 6)

Add these public methods to `ServerManager`:

```typescript
getServerById(id: number): Server | undefined {
  return this.db.get<Server>('SELECT * FROM servers WHERE id = ?', [id]);
}

updateServerField(id: number, field: string, value: string | number): void {
  const allowed = ['port', 'jvm_xms', 'jvm_xmx', 'auto_update_mode'];
  if (!allowed.includes(field)) throw new Error(`Cannot update field: ${field}`);
  this.db.run(`UPDATE servers SET ${field} = ? WHERE id = ?`, [value, id]);
}
```

Remove the `manager['db']` bracket notation in `server-handlers.ts` and use these methods instead.
