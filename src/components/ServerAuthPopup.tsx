import React, { CSSProperties, useEffect, useState } from 'react';
import { Button } from './common/Button';
import { Spinner } from './common/Spinner';
import { theme } from '../styles/theme';

interface AuthData {
  serverId: number;
  code: string;
  url: string;
}

export const ServerAuthPopup: React.FC = () => {
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const api = window.electronAPI as any;
    if (!api.onServerAuthRequired) return;

    const unsubAuth = api.onServerAuthRequired((data: AuthData) => {
      setAuthData(data);
      setSuccess(false);
    });

    const unsubSuccess = api.onServerAuthSuccess(() => {
      setSuccess(true);
      setTimeout(() => {
        setAuthData(null);
        setSuccess(false);
      }, 3000);
    });

    return () => { unsubAuth(); unsubSuccess(); };
  }, []);

  if (!authData) return null;

  const overlayStyle: CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  const popupStyle: CSSProperties = {
    background: `linear-gradient(135deg, ${theme.bg.primary}, ${theme.bg.secondary})`,
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: theme.radiusLg, padding: '32px',
    minWidth: '420px', maxWidth: '500px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  };

  const titleStyle: CSSProperties = {
    fontSize: '18px', fontWeight: 700, color: theme.text.primary,
  };

  const subtitleStyle: CSSProperties = {
    fontSize: '14px', color: theme.text.secondary, textAlign: 'center', lineHeight: 1.5,
  };

  const codeStyle: CSSProperties = {
    fontFamily: 'monospace', fontSize: '36px', fontWeight: 700,
    color: theme.accent.secondary, letterSpacing: '0.15em',
    background: 'rgba(244,208,63,0.1)', padding: '14px 32px',
    borderRadius: theme.radius, userSelect: 'all', cursor: 'text',
    border: '1px solid rgba(244,208,63,0.2)',
  };

  const linkStyle: CSSProperties = {
    color: theme.accent.primary, fontSize: '14px',
    textDecoration: 'underline', wordBreak: 'break-all',
    padding: '8px 16px', background: 'rgba(233,69,96,0.08)',
    borderRadius: theme.radius, cursor: 'pointer',
  };

  const waitingStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '10px',
    color: theme.text.secondary, fontSize: '13px',
  };

  const successStyle: CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
  };

  if (success) {
    return (
      <div style={overlayStyle}>
        <div style={popupStyle}>
          <div style={successStyle}>
            <span style={{ fontSize: '48px', color: theme.status.success }}>✓</span>
            <span style={{ fontSize: '18px', fontWeight: 600, color: theme.status.success }}>
              Server authenticated!
            </span>
            <span style={{ fontSize: '13px', color: theme.text.secondary }}>
              Players can now connect.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={popupStyle}>
        <div style={{ fontSize: '32px' }}>🔐</div>
        <div style={titleStyle}>Server Authentication Required</div>
        <div style={subtitleStyle}>
          Your Hytale server needs to be verified. Open the link below and enter the code to authenticate.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
          <div style={{ ...linkStyle, flex: 1, textAlign: 'center' }}>{authData.url}</div>
          <Button variant="secondary" size="sm" onClick={() => {
            navigator.clipboard.writeText(authData.url);
          }}>Copy</Button>
          <Button variant="primary" size="sm" onClick={() => {
            window.open(authData.url, '_blank');
          }}>Open</Button>
        </div>

        <div style={{ fontSize: '12px', color: theme.text.secondary }}>Authorization Code:</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={codeStyle}>{authData.code}</div>
          <Button variant="secondary" size="sm" onClick={() => {
            navigator.clipboard.writeText(authData.code);
          }}>Copy</Button>
        </div>

        <div style={waitingStyle}>
          <Spinner size={14} />
          <span>Waiting for authorization...</span>
        </div>

        <Button variant="ghost" size="sm" onClick={() => setAuthData(null)}
          style={{ fontSize: '12px', marginTop: '4px' }}>
          Dismiss (server will run unauthenticated)
        </Button>
      </div>
    </div>
  );
};
