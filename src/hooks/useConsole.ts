import { useState, useEffect, useCallback, useRef } from 'react';

const MAX_LINES = 5000;

export function useConsole(serverId: number) {
  const [lines, setLines] = useState<string[]>([]);
  const bufferRef = useRef<string[]>([]);

  useEffect(() => {
    // Load initial buffer
    window.electronAPI.servers.getConsoleBuffer(serverId).then(buf => {
      const initial = buf.slice(-MAX_LINES);
      bufferRef.current = initial;
      setLines([...initial]);
    }).catch(() => {});

    // Subscribe to live output
    const unsub = window.electronAPI.servers.onConsoleOutput((id, line) => {
      if (id !== serverId) return;
      bufferRef.current = [...bufferRef.current, line].slice(-MAX_LINES);
      setLines([...bufferRef.current]);
    });

    return unsub;
  }, [serverId]);

  const sendCommand = useCallback(async (command: string) => {
    await window.electronAPI.servers.sendCommand(serverId, command);
  }, [serverId]);

  return { lines, sendCommand };
}
