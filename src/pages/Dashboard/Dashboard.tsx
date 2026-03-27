import React, { CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useServers } from '../../hooks/useServers';
import { ServerCard } from '../../components/ServerCard';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Spinner } from '../../components/common/Spinner';
import { theme } from '../../styles/theme';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { servers, loading, createServer, deleteServer, startServer, stopServer } = useServers();

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const filtered = servers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createServer(newName.trim());
      setNewName('');
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    const server = servers.find(s => s.id === id);
    if (!server) return;
    if (!window.confirm(t('dashboard.confirmDelete', { name: server.name }))) return;
    await deleteServer(id);
  };

  const handleStartAll = async () => {
    const offline = servers.filter(s => s.status === 'offline');
    await Promise.all(offline.map(s => startServer(s.id)));
  };

  const handleStopAll = async () => {
    const running = servers.filter(s => s.status === 'online' || s.status === 'starting');
    await Promise.all(running.map(s => stopServer(s.id)));
  };

  const containerStyle: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
  };

  const titleStyle: CSSProperties = {
    fontSize: '22px',
    fontWeight: 700,
    color: theme.text.primary,
  };

  const actionsStyle: CSSProperties = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  };

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  };

  const emptyStyle: CSSProperties = {
    textAlign: 'center',
    color: theme.text.secondary,
    fontSize: '15px',
    padding: '60px 20px',
  };

  const modalFormStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>{t('dashboard.title')}</h1>
        <div style={actionsStyle}>
          <Button variant="secondary" size="sm" onClick={handleStartAll}>
            {t('dashboard.startAll')}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleStopAll}>
            {t('dashboard.stopAll')}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            + {t('dashboard.newServer')}
          </Button>
        </div>
      </div>

      <div style={{ maxWidth: '400px' }}>
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('dashboard.search')}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Spinner size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={emptyStyle}>
          {search ? `No servers match "${search}"` : t('dashboard.noServers')}
        </div>
      ) : (
        <div style={gridStyle}>
          {filtered.map(server => (
            <ServerCard
              key={server.id}
              server={server}
              onStart={startServer}
              onStop={stopServer}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('dashboard.newServer')}>
        <form style={modalFormStyle} onSubmit={handleCreate}>
          <Input
            label={t('dashboard.serverName')}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            autoFocus
            required
          />
          {creating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: theme.text.secondary, fontSize: '13px' }}>
              <Spinner size={16} />
              <span>Creating server (copying files)...</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} disabled={creating}>
              {t('dashboard.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={creating || !newName.trim()}>
              {creating ? <><Spinner size={14} /> Creating...</> : t('dashboard.create')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
