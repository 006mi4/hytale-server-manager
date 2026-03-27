import React, { CSSProperties, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ServerConfig } from '../../types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Spinner } from '../../components/common/Spinner';
import { theme } from '../../styles/theme';

interface ConfigTabProps {
  serverId: number;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({ serverId }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.electronAPI.servers.getConfig(serverId).then(c => {
      setConfig(c);
      setLoading(false);
    });
  }, [serverId]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await window.electronAPI.servers.updateConfig(serverId, config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof ServerConfig, value: unknown) => {
    setConfig(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const containerStyle: CSSProperties = {
    overflowY: 'auto',
    padding: '4px 0',
  };

  const sectionStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  };

  const checkboxRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    background: theme.bg.surface,
    border: `1px solid rgba(255,255,255,0.08)`,
    borderRadius: theme.radius,
    cursor: 'pointer',
    fontSize: '14px',
    color: theme.text.primary,
    WebkitAppRegion: 'no-drag',
  } as CSSProperties;

  const labelStyle: CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: theme.text.secondary,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '6px',
  };

  const selectStyle: CSSProperties = {
    background: theme.bg.surface,
    border: `1px solid rgba(255,255,255,0.12)`,
    borderRadius: theme.radius,
    color: theme.text.primary,
    fontSize: '14px',
    padding: '9px 12px',
    outline: 'none',
    width: '100%',
    WebkitAppRegion: 'no-drag',
  } as CSSProperties;

  if (loading || !config) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner /></div>;
  }

  return (
    <div style={containerStyle}>
      <div style={sectionStyle}>
        <Input
          label={t('server.port')}
          type="number"
          value={config.port}
          onChange={e => update('port', parseInt(e.target.value, 10))}
          min={1024}
          max={65535}
        />
        <Input
          label={`${t('server.memory')} Xms`}
          value={config.jvm_xms}
          onChange={e => update('jvm_xms', e.target.value)}
          placeholder="512M"
        />
        <Input
          label={`${t('server.memory')} Xmx`}
          value={config.jvm_xmx}
          onChange={e => update('jvm_xmx', e.target.value)}
          placeholder="2G"
        />
        <Input
          label={t('server.viewDistance')}
          type="number"
          value={config.view_distance}
          onChange={e => update('view_distance', parseInt(e.target.value, 10))}
          min={2}
          max={32}
        />
        <Input
          label={t('server.maxPlayers')}
          type="number"
          value={config.max_players}
          onChange={e => update('max_players', parseInt(e.target.value, 10))}
          min={1}
          max={1000}
        />
        <Input
          label={t('server.backupFrequency')}
          type="number"
          value={config.backup_frequency}
          onChange={e => update('backup_frequency', parseInt(e.target.value, 10))}
          min={5}
        />
      </div>

      <div style={{ ...sectionStyle, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {/* PvP */}
        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={config.pvp_enabled}
            onChange={e => update('pvp_enabled', e.target.checked)}
            style={{ accentColor: theme.accent.primary }}
          />
          {t('server.pvp')}
        </label>
        {/* Fall Damage */}
        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={config.fall_damage}
            onChange={e => update('fall_damage', e.target.checked)}
            style={{ accentColor: theme.accent.primary }}
          />
          {t('server.fallDamage')}
        </label>
        {/* Whitelist */}
        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={config.whitelist_enabled}
            onChange={e => update('whitelist_enabled', e.target.checked)}
            style={{ accentColor: theme.accent.primary }}
          />
          {t('server.whitelistEnabled')}
        </label>
        {/* Backup */}
        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={config.backup_enabled}
            onChange={e => update('backup_enabled', e.target.checked)}
            style={{ accentColor: theme.accent.primary }}
          />
          {t('server.backupEnabled')}
        </label>
      </div>

      {/* Auto Update */}
      <div style={{ marginBottom: '24px', maxWidth: '280px' }}>
        <label style={labelStyle}>{t('server.autoUpdate')}</label>
        <select
          style={selectStyle}
          value={config.auto_update_mode}
          onChange={e => update('auto_update_mode', e.target.value)}
        >
          <option value="disabled">{t('common.disabled')}</option>
          <option value="when_empty">WhenEmpty</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? '...' : t('server.save')}
        </Button>
        {saved && (
          <span style={{ fontSize: '13px', color: theme.status.success }}>
            ✓ {t('common.success')}
          </span>
        )}
      </div>
    </div>
  );
};
