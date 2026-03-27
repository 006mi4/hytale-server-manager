import { ipcMain } from 'electron';
import { ServerManager } from '../services/ServerManager';
import fs from 'fs';
import path from 'path';

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
  ipcMain.handle('servers:getConsoleBuffer', (_e, id: number) => manager.getConsoleBuffer(id));
  ipcMain.handle('servers:getConfig', (_e, id: number) => {
    const server = manager.getServerById(id);
    if (!server) throw new Error('Server not found');
    const configPath = path.join(server.path, 'Server', 'config.json');
    let diskConfig: any = {};
    if (fs.existsSync(configPath)) {
      diskConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    return {
      port: server.port, jvm_xms: server.jvm_xms, jvm_xmx: server.jvm_xmx,
      auto_update_mode: diskConfig?.Update?.AutoApplyMode ?? server.auto_update_mode,
      pvp_enabled: false, fall_damage: true, view_distance: 12,
      max_players: diskConfig?.MaxPlayers ?? 20,
      whitelist_enabled: diskConfig?.WhitelistEnabled ?? false,
      backup_enabled: false, backup_frequency: 30,
    };
  });
  ipcMain.handle('servers:updateConfig', (_e, id: number, config: Record<string, unknown>) => {
    const server = manager.getServerById(id);
    if (!server) throw new Error('Server not found');
    for (const field of ['port', 'jvm_xms', 'jvm_xmx', 'auto_update_mode']) {
      if (config[field] !== undefined) manager.updateServerField(id, field, config[field] as string | number);
    }
    if (config.jvm_xms !== undefined || config.jvm_xmx !== undefined) {
      const s = manager.getServerById(id)!;
      fs.writeFileSync(path.join(s.path, 'jvm.options'), `-Xms${s.jvm_xms}\n-Xmx${s.jvm_xmx}\n`);
    }
    const configPath = path.join(server.path, 'Server', 'config.json');
    let diskConfig: any = {};
    if (fs.existsSync(configPath)) diskConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (config.auto_update_mode !== undefined) {
      diskConfig.Update = diskConfig.Update || {};
      diskConfig.Update.AutoApplyMode = config.auto_update_mode;
    }
    fs.writeFileSync(configPath, JSON.stringify(diskConfig, null, 2));
  });
}
