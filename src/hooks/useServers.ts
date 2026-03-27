import { useState, useEffect, useCallback } from 'react';
import type { ServerWithStatus, ServerStatus } from '../types';

export function useServers() {
  const [servers, setServers] = useState<ServerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await window.electronAPI.servers.list();
      setServers(list);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const unsubStatus = window.electronAPI.servers.onStatusChange((serverId: number, status: ServerStatus) => {
      setServers(prev =>
        prev.map(s => s.id === serverId ? { ...s, status } : s)
      );
    });

    return () => {
      unsubStatus();
    };
  }, [load]);

  const createServer = useCallback(async (name: string) => {
    const server = await window.electronAPI.servers.create(name);
    const withStatus: ServerWithStatus = { ...server, status: 'offline' };
    setServers(prev => [...prev, withStatus]);
    return withStatus;
  }, []);

  const deleteServer = useCallback(async (id: number) => {
    await window.electronAPI.servers.delete(id);
    setServers(prev => prev.filter(s => s.id !== id));
  }, []);

  const startServer = useCallback(async (id: number) => {
    await window.electronAPI.servers.start(id);
  }, []);

  const stopServer = useCallback(async (id: number) => {
    await window.electronAPI.servers.stop(id);
  }, []);

  return { servers, loading, error, createServer, deleteServer, startServer, stopServer, reload: load };
}
