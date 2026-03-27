import React, { CSSProperties } from 'react';
import { theme } from '../styles/theme';

export const TopBar: React.FC = () => {
  const barStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '40px',
    background: theme.bg.primary,
    borderBottom: `1px solid rgba(255,255,255,0.06)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
    WebkitAppRegion: 'drag',
  } as CSSProperties;

  const titleStyle: CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: theme.text.secondary,
    paddingLeft: '16px',
    letterSpacing: '0.04em',
  };

  const windowControlsStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    WebkitAppRegion: 'no-drag',
  } as CSSProperties;

  const btnBase: CSSProperties = {
    width: '46px',
    height: '40px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: theme.text.secondary,
    transition: 'background 0.15s, color 0.15s',
  };

  return (
    <div style={barStyle}>
      <span style={titleStyle}>Hytale Server Manager</span>
      <div style={windowControlsStyle}>
        <button
          style={btnBase}
          onClick={() => window.electronAPI.window.minimize()}
          title="Minimize"
        >
          &#x2212;
        </button>
        <button
          style={btnBase}
          onClick={() => window.electronAPI.window.maximize()}
          title="Maximize"
        >
          &#x25A1;
        </button>
        <button
          style={{ ...btnBase, color: theme.status.error }}
          onClick={() => window.electronAPI.window.close()}
          title="Close"
        >
          &#x2715;
        </button>
      </div>
    </div>
  );
};
