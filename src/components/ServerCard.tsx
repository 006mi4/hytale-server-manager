import React, { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ServerWithStatus } from '../types';
import { StatusBadge } from './common/StatusBadge';
import { Button } from './common/Button';
import { theme } from '../styles/theme';

interface ServerCardProps {
  server: ServerWithStatus;
  onStart: (id: number) => void;
  onStop: (id: number) => void;
  onDelete: (id: number) => void;
}

export const ServerCard: React.FC<ServerCardProps> = ({ server, onStart, onStop, onDelete }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isRunning = server.status === 'online' || server.status === 'starting';

  const cardStyle: CSSProperties = {
    background: theme.bg.surface,
    border: `1px solid rgba(255,255,255,0.08)`,
    borderRadius: theme.radiusLg,
    padding: '20px',
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
  };

  const nameStyle: CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: theme.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  };

  const metaStyle: CSSProperties = {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: theme.text.secondary,
  };

  const metaItemStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  };

  const metaLabelStyle: CSSProperties = {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: theme.text.secondary,
    fontWeight: 600,
  };

  const metaValueStyle: CSSProperties = {
    fontSize: '13px',
    color: theme.text.primary,
    fontWeight: 500,
  };

  const actionsStyle: CSSProperties = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginTop: '4px',
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if a button was clicked
    if ((e.target as HTMLElement).closest('button')) return;
    navigate(`/server/${server.id}`);
  };

  return (
    <div style={cardStyle} onClick={handleCardClick}>
      <div style={headerStyle}>
        <span style={nameStyle}>{server.name}</span>
        <StatusBadge status={server.status} />
      </div>

      <div style={metaStyle}>
        <div style={metaItemStyle}>
          <span style={metaLabelStyle}>{t('server.port')}</span>
          <span style={metaValueStyle}>{server.port}</span>
        </div>
        <div style={metaItemStyle}>
          <span style={metaLabelStyle}>{t('server.memory')}</span>
          <span style={metaValueStyle}>{server.jvm_xms} / {server.jvm_xmx}</span>
        </div>
      </div>

      <div style={actionsStyle}>
        {!isRunning ? (
          <Button
            variant="primary"
            size="sm"
            onClick={e => { e.stopPropagation(); onStart(server.id); }}
            disabled={server.status === 'stopping'}
          >
            {t('server.start')}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={e => { e.stopPropagation(); onStop(server.id); }}
            disabled={server.status === 'stopping'}
          >
            {t('server.stop')}
          </Button>
        )}
        <Button
          variant="danger"
          size="sm"
          onClick={e => { e.stopPropagation(); onDelete(server.id); }}
          disabled={isRunning}
          style={{ marginLeft: 'auto' }}
        >
          {t('server.delete')}
        </Button>
      </div>
    </div>
  );
};
