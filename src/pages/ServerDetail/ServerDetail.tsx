import React, { CSSProperties, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ServerWithStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { theme } from '../../styles/theme';
import { ConsoleTab } from './ConsoleTab';
import { ConfigTab } from './ConfigTab';
import { WhitelistTab } from './WhitelistTab';
import { BansTab } from './BansTab';
import { PermissionsTab } from './PermissionsTab';

type Tab = 'console' | 'config' | 'whitelist' | 'bans' | 'permissions';

export const ServerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const serverId = parseInt(id ?? '0', 10);

  const [server, setServer] = useState<ServerWithStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('console');

  useEffect(() => {
    window.electronAPI.servers.list().then(servers => {
      const found = servers.find(s => s.id === serverId);
      setServer(found ?? null);
      setLoading(false);
    });

    const unsub = window.electronAPI.servers.onStatusChange((sId, status) => {
      if (sId === serverId) setServer(prev => prev ? { ...prev, status } : prev);
    });
    return unsub;
  }, [serverId]);

  const handleStart = () => window.electronAPI.servers.start(serverId);
  const handleStop = () => window.electronAPI.servers.stop(serverId);
  const handleRestart = () => window.electronAPI.servers.restart(serverId);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'console', label: t('server.console') },
    { key: 'config', label: t('server.config') },
    { key: 'whitelist', label: t('server.whitelist') },
    { key: 'bans', label: t('server.bans') },
    { key: 'permissions', label: t('server.permissions') },
  ];

  const containerStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '24px',
    gap: '0',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  };

  const backBtnStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: theme.text.secondary,
    cursor: 'pointer',
    fontSize: '20px',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    WebkitAppRegion: 'no-drag',
    borderRadius: theme.radius,
    transition: 'color 0.15s',
  } as CSSProperties;

  const serverNameStyle: CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: theme.text.primary,
    flex: 1,
  };

  const actionGroupStyle: CSSProperties = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  };

  const tabBarStyle: CSSProperties = {
    display: 'flex',
    gap: '2px',
    borderBottom: `1px solid rgba(255,255,255,0.08)`,
    marginBottom: '16px',
    flexShrink: 0,
  };

  const tabBtnStyle = (active: boolean): CSSProperties => ({
    background: 'transparent',
    border: 'none',
    borderBottom: active ? `2px solid ${theme.accent.primary}` : '2px solid transparent',
    color: active ? theme.text.primary : theme.text.secondary,
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: active ? 600 : 500,
    padding: '8px 16px',
    marginBottom: '-1px',
    transition: 'color 0.15s, border-color 0.15s',
    WebkitAppRegion: 'no-drag',
  } as CSSProperties);

  const tabContentStyle: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    minHeight: 0,
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Spinner size={36} /></div>;
  }

  if (!server) {
    return (
      <div style={{ padding: '40px', color: theme.text.secondary, textAlign: 'center' }}>
        Server not found.{' '}
        <button style={{ color: theme.accent.primary, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isRunning = server.status === 'online' || server.status === 'starting';

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button style={backBtnStyle} onClick={() => navigate('/dashboard')} title="Back">
          &#8592;
        </button>
        <span style={serverNameStyle}>{server.name}</span>
        <StatusBadge status={server.status} />
        <div style={actionGroupStyle}>
          <Button
            variant="primary"
            size="sm"
            onClick={handleStart}
            disabled={isRunning}
          >
            {t('server.start')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleStop}
            disabled={!isRunning}
          >
            {t('server.stop')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRestart}
            disabled={!isRunning}
          >
            {t('server.restart')}
          </Button>
        </div>
      </div>

      <div style={tabBarStyle}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            style={tabBtnStyle(activeTab === tab.key)}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={tabContentStyle}>
        {activeTab === 'console' && <ConsoleTab serverId={serverId} />}
        {activeTab === 'config' && <ConfigTab serverId={serverId} />}
        {activeTab === 'whitelist' && <WhitelistTab serverId={serverId} />}
        {activeTab === 'bans' && <BansTab serverId={serverId} />}
        {activeTab === 'permissions' && <PermissionsTab serverId={serverId} />}
      </div>
    </div>
  );
};
