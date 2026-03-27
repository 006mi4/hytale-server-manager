import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI.settings.get().then(s => {
      setSettings(s);
      setLoading(false);
    }).catch(err => {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      setLoading(false);
    });
  }, []);

  const update = useCallback(async (partial: Partial<AppSettings>) => {
    await window.electronAPI.settings.update(partial);
    setSettings(prev => prev ? { ...prev, ...partial } : prev);
  }, []);

  return { settings, loading, error, update };
}
