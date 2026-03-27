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
