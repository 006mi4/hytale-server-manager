export interface Server {
  id: number; name: string; port: number; path: string;
  jvm_xms: string; jvm_xmx: string; auto_update_mode: string;
  created_at: string; last_started_at: string | null;
}
export type ServerStatus = 'offline' | 'starting' | 'online' | 'stopping' | 'crashed';
export interface ServerWithStatus extends Server { status: ServerStatus; }
export interface ServerConfig {
  port: number; jvm_xms: string; jvm_xmx: string; auto_update_mode: string;
  pvp_enabled: boolean; fall_damage: boolean; view_distance: number;
  max_players: number; whitelist_enabled: boolean;
  backup_enabled: boolean; backup_frequency: number;
}
export interface AppSettings { language: string; javaPath: string; defaultXms: string; defaultXmx: string; downloaderUrl: string; }
export interface DownloadProgress { percent: number; stage: string; }
export interface UpdateInfo { version: string; releaseNotes: string; }
export interface HytaleAuthStatus { authenticated: boolean; username: string | null; }
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
  java: { check(): Promise<{ found: boolean; version: number | null; supported: boolean }>; };
  window: { minimize(): void; maximize(): void; close(): void; };
}
declare global { interface Window { electronAPI: ElectronAPI; } }
