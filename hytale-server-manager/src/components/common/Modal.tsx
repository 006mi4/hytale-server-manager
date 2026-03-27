import React, { CSSProperties } from 'react';
import { theme } from '../../styles/theme';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  if (!open) return null;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    WebkitAppRegion: 'no-drag',
  } as CSSProperties;

  const cardStyle: CSSProperties = {
    background: theme.bg.secondary,
    borderRadius: theme.radiusLg,
    border: `1px solid rgba(255,255,255,0.1)`,
    padding: '28px',
    minWidth: '360px',
    maxWidth: '540px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: title ? '20px' : 0,
  };

  const titleStyle: CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    color: theme.text.primary,
  };

  const closeStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: theme.text.secondary,
    cursor: 'pointer',
    fontSize: '20px',
    lineHeight: 1,
    padding: '2px 6px',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>
        {title && (
          <div style={headerStyle}>
            <span style={titleStyle}>{title}</span>
            <button style={closeStyle} onClick={onClose}>&times;</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
