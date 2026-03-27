import React, { CSSProperties } from 'react';
import { theme } from '../../styles/theme';
import type { ServerStatus } from '../../types';

interface StatusBadgeProps {
  status: ServerStatus;
}

const statusColors: Record<ServerStatus, string> = {
  online: theme.status.success,
  offline: theme.text.secondary,
  starting: theme.accent.secondary,
  stopping: theme.status.warning,
  crashed: theme.status.error,
};

const statusLabels: Record<ServerStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  starting: 'Starting',
  stopping: 'Stopping',
  crashed: 'Crashed',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const color = statusColors[status];
  const isPulsing = status === 'starting' || status === 'stopping';

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };

  const dotStyle: CSSProperties = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
    animation: isPulsing ? 'pulse 1.4s ease-in-out infinite' : undefined,
  };

  const labelStyle: CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color,
    letterSpacing: '0.04em',
  };

  return (
    <span style={containerStyle}>
      <span style={dotStyle} />
      <span style={labelStyle}>{statusLabels[status]}</span>
    </span>
  );
};
