# Hytale Server Manager — Design Specification

## Overview

A desktop application for managing up to 100 Hytale dedicated servers. Built with Electron + React + SQLite. Runs on Windows (.exe) and Linux (.AppImage/.deb). Auto-updates via GitHub Releases.

The 100 server cap is a deliberate UX/resource constraint for v1.0. A single machine realistically cannot run more than ~20-30 servers simultaneously (each needs 2-4GB RAM). The limit exists to keep the UI manageable. The Hytale license allows up to 500 per account.

## Target Users

Server administrators who want a GUI to create, configure, start/stop, and monitor multiple Hytale servers without manual command-line work.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop Shell | Electron |
| Frontend | React + TypeScript |
| Styling | CSS Modules or Tailwind (Dark Gaming Theme) |
| Local Database | better-sqlite3 (unencrypted — sensitive tokens encrypted via electron.safeStorage) |
| i18n | i18next + react-i18next (DE + EN) |
| Auto-Update (App) | electron-updater + GitHub Releases |
| Build | electron-builder (Windows NSIS, Linux AppImage/deb) |
| CI/CD | GitHub Actions |

## Architecture

### Electron Main Process

Handles all system-level operations. The renderer never accesses Node APIs directly.

**Services:**

- **ServerManager** — Spawns/stops Java child processes, streams stdout/stderr over IPC, manages port allocation (5520+), writes stdin commands to server processes, detects exit code 8 for auto-update restarts.
- **AuthService** — Local account CRUD with bcrypt password hashing, JWT session tokens, remember-me via stored token.
- **HytaleAuthService** — Runs the Hytale OAuth2 Device Flow by executing `hytale-downloader` or parsing server console output for device codes. Stores access/refresh tokens encrypted via `electron.safeStorage` (DPAPI on Windows, libsecret on Linux).
- **DownloaderService** — Executes `hytale-downloader` CLI as child process, parses stdout for progress, reports to renderer.
- **DatabaseService** — Manages better-sqlite3 connection, runs migrations, provides typed query methods. Migrations are versioned SQL files (`migrations/001_initial.sql`, `002_add_field.sql`, etc.) applied sequentially on startup. A `schema_version` table tracks which migrations have been applied.
- **UpdateService** — Uses electron-updater to check GitHub Releases for app updates, notifies user, downloads and installs.

### React Renderer

Communicates exclusively via IPC (contextBridge + preload script).

**Pages:**

- **SetupWizard** — 4-step first-run wizard
- **LoginPage** — Username/password form with remember-me
- **Dashboard** — Server list with status, bulk actions, search filter
- **ServerDetail** — Live console, config editor, whitelist/bans/permissions, command input
- **Settings** — Language, JVM defaults, paths, Hytale auth status

### IPC Bridge

```
contextIsolation: true
nodeIntegration: false
```

Preload script exposes typed API:

```typescript
interface ElectronAPI {
  // Auth
  auth: {
    register(username: string, password: string): Promise<{ token: string }>
    login(username: string, password: string, remember: boolean): Promise<{ token: string }>
    checkSession(): Promise<{ valid: boolean; username: string }>
    logout(): Promise<void>
  }
  // Servers
  servers: {
    list(): Promise<Server[]>
    create(name: string): Promise<Server>
    delete(id: number): Promise<void>
    start(id: number): Promise<void>
    stop(id: number): Promise<void>
    restart(id: number): Promise<void>
    sendCommand(id: number, command: string): Promise<void>
    getConfig(id: number): Promise<ServerConfig>
    updateConfig(id: number, config: Partial<ServerConfig>): Promise<void>
    onConsoleOutput(id: number, callback: (line: string) => void): () => void
    onStatusChange(id: number, callback: (status: ServerStatus) => void): () => void
  }
  // Hytale Auth
  hytale: {
    getAuthStatus(): Promise<HytaleAuthStatus>
    startDeviceAuth(): Promise<{ url: string; code: string }>
    onAuthComplete(callback: () => void): () => void
  }
  // Downloads
  downloader: {
    downloadServer(): Promise<void>
    onProgress(callback: (progress: DownloadProgress) => void): () => void
  }
  // Settings
  settings: {
    get(): Promise<AppSettings>
    update(settings: Partial<AppSettings>): Promise<void>
  }
  // App Updates
  updates: {
    check(): Promise<UpdateInfo | null>
    download(): Promise<void>
    install(): Promise<void>
    onUpdateAvailable(callback: (info: UpdateInfo) => void): () => void
  }
}
```

### Security

- **contextIsolation: true** — Renderer cannot access Node.js
- **nodeIntegration: false** — No require() in renderer
- **Preload script** — Only exposes defined IPC methods
- **bcrypt** — Password hashing (cost factor 12)
- **Platform keychain for token encryption** — On Windows: DPAPI via `electron.safeStorage`. On Linux: libsecret/keyring via `electron.safeStorage`. Electron's `safeStorage` API encrypts/decrypts strings using the OS credential store. This avoids fragile machine-ID-based key derivation and survives OS reinstalls as long as the user profile exists.
- **No remote code execution** — No eval(), no remote module
- **CSP headers** — Restrict script/style sources

## Error Handling

**Download failures:**
- `hytale-downloader` failure: Show error message with stderr output, offer retry button. No resume — re-download from scratch (the downloader handles this internally).

**Server crashes:**
- If a server exits with non-zero code (not 8): mark as "Crashed" in UI, show last 50 lines of console output in a notification.
- Crash loop detection: if a server crashes 3 times within 5 minutes, stop auto-restarting and notify user.

**Port conflicts:**
- Before starting a server, check if the port is in use (UDP bind test). If occupied, show error and suggest next available port.

**Database corruption:**
- On startup, run `PRAGMA integrity_check`. If it fails, show error and offer to reset the database (losing accounts/server configs but preserving server files on disk).

**Java not found:**
- If `java --version` fails at server start, show error directing user to Settings → Java path configuration.

## Logging

- Application logs written to `<app-data>/logs/` using `electron-log`
- Log rotation: max 5 files, 5MB each
- Log levels: error, warn, info, debug (configurable in Settings, default: info)
- Server console output is also written to per-server log files: `servers/<name>/Server/logs/` (managed by Hytale server itself)

## Console Buffer

- Console output per server is held in a ring buffer of 5000 lines in memory
- When user navigates to ServerDetail, the buffer is sent to the renderer for display
- When user navigates away, the buffer continues filling in the main process
- Historical logs are available via Hytale's own `logs/` directory (not managed by the Manager)

## Setup Wizard

### Step 1: Create Account
- Username (3-32 chars, alphanumeric + underscore)
- Password (min 8 chars)
- Confirm password
- Stored locally in SQLite with bcrypt hash

**Rationale for local accounts:** The account system protects the Manager on shared machines (e.g., a dedicated server box with multiple admins). It prevents unauthorized users from starting/stopping servers or modifying configurations. Single-user machines benefit from the remember-me feature to skip login. The system is single-account in v1.0 (one admin per installation).

### Step 2: Check Java
- Run `java --version`, parse output for Java 25+
- If missing: show download link to Adoptium, instructions per OS
- Re-check button after user installs
- Store detected Java path in settings

### Step 3: Download Hytale Server Files
- Download `hytale-downloader.zip` from the official Hytale support page (URL hardcoded, with a Settings override if it changes). Contains binaries for both Linux and Windows.
- Extract to `<app-data>/tools/hytale-downloader/`
- Execute downloader — triggers OAuth2 Device Flow:
  1. Downloader outputs device code + URL
  2. Manager parses output, displays code + clickable link to user
  3. User authorizes in browser at `accounts.hytale.com/device`
  4. Downloader receives token, downloads server files
  5. Manager stores OAuth tokens (encrypted) for future downloads
- Download target: `<app-data>/servers/_shared/`
- Progress bar based on downloader output parsing
- Result: `Assets.zip` + `Server/` folder with HytaleServer.jar, HytaleServer.aot

### Step 4: Complete
- Summary of what was set up
- "Go to Dashboard" button

## Server Management

### Creating a Server

1. User clicks "New Server", enters a name
2. Manager creates directory structure:

```
<app-data>/servers/<server-name>/
├── Assets.zip          (file copy from _shared — no symlinks due to Windows permission requirements)
├── start.sh            (kept for manual use outside the Manager)
├── start.bat           (kept for manual use outside the Manager)
├── jvm.options
└── Server/
    ├── HytaleServer.jar   (copy from _shared)
    ├── HytaleServer.aot   (copy from _shared)
    ├── config.json        (generated with assigned port)
    ├── permissions.json
    ├── bans.json
    └── whitelist.json
```

3. Port auto-assigned: finds first available port starting at 5520, checks for conflicts with existing servers and OS port availability via a quick UDP bind test. User can override manually.
4. Default JVM args written to `jvm.options`: `-Xms2G` and `-Xmx4G` (one arg per line). User can edit via Settings or directly in the file.
5. Server record saved to SQLite

### Starting a Server

1. Manager spawns: `java @jvm.options -XX:AOTCache=HytaleServer.aot -jar HytaleServer.jar --assets ../Assets.zip --bind <port>`
2. Working directory: `servers/<server-name>/Server/`
3. Stdout/stderr piped to IPC → renderer console
4. On first start: Manager detects auth prompt, sends `/auth login device` via stdin, parses device code, shows to user. Each server authenticates using the same Hytale account — the OAuth2 Device Flow must be completed once per server process (Hytale binds auth to the running process, not a shared token file). The Manager guides the user through this for each new server on first start.
5. Manager tracks PID and status (starting/online/stopping/offline)

### Stopping a Server

1. Send `/stop` command via stdin (Hytale server's graceful shutdown command)
2. Wait up to 30 seconds for process exit
3. If still running: SIGTERM (Linux) / taskkill (Windows)
4. After 10 more seconds: SIGKILL / force kill

### Auto-Update Restart

- Manager monitors child process exit codes
- Exit code 8 → Hytale update applied → auto-restart the server
- Other non-zero exit codes → mark as crashed, notify user

### Server Configuration

Form-based editor for config.json fields:
- Server name, port (--bind)
- Max players
- View distance
- PvP enabled/disabled
- Fall damage
- Whitelist mode
- Update settings (AutoApplyMode, CheckIntervalSeconds, etc.)
- Backup settings (enabled, frequency, directory)

Whitelist/Bans/Permissions: Table UI with add/remove functionality.

## Dashboard

- Grid/list of all servers showing: name, status indicator (green/red/yellow), port
- Player count is not available in v1.0 (requires Nitrado:Query plugin or console output parsing — deferred to future version)
- Search/filter bar
- Bulk actions: Start All, Stop All
- "New Server" button
- Click server → navigate to ServerDetail

## Data Model

### SQLite Schema

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

## Auto-Updates (App)

### Build Pipeline (GitHub Actions)

- Trigger: push to `main` branch with version tag (`v*`)
- Matrix build: Windows (NSIS .exe) + Linux (AppImage + deb)
- Artifacts uploaded as GitHub Release assets
- `latest.yml` / `latest-linux.yml` generated by electron-builder

### Update Flow

1. App starts → UpdateService checks GitHub Releases in background
2. New version found → notification banner: "Update v1.2.0 available"
3. User clicks "Update" → download in background with progress
4. Download complete → "Restart to install" button
5. App restarts, installer applies update

## Hytale Server Auto-Updates

Leverages Hytale's built-in update system:

- Each server's config.json contains `Update` block
- Manager configures `AutoApplyMode` per user preference
- Wrapper scripts (start.sh/start.bat) handle exit code 8 restarts
- Manager's ServerManager service detects exit code 8 and re-spawns the process (Manager controls the lifecycle directly, bypassing wrapper scripts). Wrapper scripts are included in the server directory for users who want to run servers manually outside the Manager.

## Internationalization

- Framework: i18next + react-i18next
- Languages: German (de), English (en)
- Language files: `src/locales/de.json`, `src/locales/en.json`
- Selection: Setup wizard step or Settings page
- Stored in SQLite settings table

## UI Theme

**Dark Gaming Theme:**
- Background: `#1a1a2e` → `#16213e` gradient
- Cards/surfaces: `rgba(255,255,255,0.06)` on dark base
- Primary accent: `#e94560` (red/pink for actions)
- Secondary accent: `#f4d03f` (gold for highlights)
- Text: `#e0e0e0` (primary), `#888` (secondary)
- Success: `#6ba34a`, Error: `#e94560`, Warning: `#f4d03f`
- Border radius: 8-12px
- Font: System font stack (Inter if available)

## Folder Structure (App Source)

```
hytale-server-manager/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── services/
│   │   ├── ServerManager.ts
│   │   ├── AuthService.ts
│   │   ├── HytaleAuthService.ts
│   │   ├── DownloaderService.ts
│   │   ├── DatabaseService.ts
│   │   └── UpdateService.ts
│   └── ipc/
│       └── handlers.ts
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── pages/
│   │   ├── SetupWizard/
│   │   ├── Login/
│   │   ├── Dashboard/
│   │   ├── ServerDetail/
│   │   └── Settings/
│   ├── components/
│   │   ├── Console/
│   │   ├── ServerCard/
│   │   ├── ConfigEditor/
│   │   └── common/
│   ├── hooks/
│   ├── locales/
│   │   ├── de.json
│   │   └── en.json
│   └── styles/
├── package.json
├── electron-builder.yml
├── tsconfig.json
├── vite.config.ts
└── .github/
    └── workflows/
        └── release.yml
```

## v1.0 Feature Scope

**Included:**
- Setup wizard (account, Java check, Hytale download + auth)
- Local account system with login/remember-me
- Create/delete servers (up to 100)
- Start/stop/restart with live console
- Server config editor (form-based)
- Whitelist/bans/permissions management
- Send commands to server console
- Hytale server auto-updates (wrapper scripts + exit code 8)
- App auto-updates via GitHub Releases
- German + English language support
- Windows .exe + Linux AppImage/deb builds

**Excluded from v1.0 (future):**
- Mod management (install/remove mods)
- Backup management UI
- Server monitoring (CPU, RAM, player count graphs)
- Multiple Hytale accounts
- Server templates
- macOS support
