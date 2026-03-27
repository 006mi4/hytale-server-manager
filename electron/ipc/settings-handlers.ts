import { ipcMain } from 'electron';
import { DatabaseService } from '../services/DatabaseService';

const DEFAULTS: Record<string, string> = {
  language: 'en', javaPath: 'java', defaultXms: '2G', defaultXmx: '4G', downloaderUrl: '',
};

export function registerSettingsHandlers(db: DatabaseService) {
  ipcMain.handle('settings:get', () => {
    const rows = db.query<{ key: string; value: string }>('SELECT key, value FROM settings');
    const settings: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) settings[row.key] = row.value;
    return settings;
  });
  ipcMain.handle('settings:update', (_e, updates: Record<string, string>) => {
    for (const [key, value] of Object.entries(updates)) {
      db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?', [key, value, value]);
    }
  });
}
