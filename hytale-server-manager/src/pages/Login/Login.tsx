import React, { CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { theme } from '../../styles/theme';

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password, remember);
    } catch {
      setError(t('login.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const pageStyle: CSSProperties = {
    width: '100%',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(135deg, ${theme.bg.primary} 0%, ${theme.bg.secondary} 100%)`,
    WebkitAppRegion: 'no-drag',
  } as CSSProperties;

  const cardStyle: CSSProperties = {
    background: theme.bg.secondary,
    border: `1px solid rgba(255,255,255,0.1)`,
    borderRadius: theme.radiusLg,
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  };

  const titleStyle: CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: theme.text.primary,
    marginBottom: '8px',
    textAlign: 'center',
  };

  const subtitleStyle: CSSProperties = {
    fontSize: '13px',
    color: theme.text.secondary,
    textAlign: 'center',
    marginBottom: '32px',
  };

  const accentStyle: CSSProperties = {
    color: theme.accent.primary,
    fontWeight: 700,
  };

  const formStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const errorStyle: CSSProperties = {
    background: `${theme.status.error}22`,
    border: `1px solid ${theme.status.error}66`,
    borderRadius: theme.radius,
    padding: '10px 14px',
    color: theme.status.error,
    fontSize: '13px',
  };

  const rememberStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: theme.text.secondary,
    WebkitAppRegion: 'no-drag',
  } as CSSProperties;

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={titleStyle}>
          <span style={accentStyle}>Hytale</span> Server Manager
        </div>
        <div style={subtitleStyle}>{t('login.title')}</div>

        <form style={formStyle} onSubmit={handleSubmit}>
          <Input
            label={t('login.username')}
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
          <Input
            label={t('login.password')}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <label style={rememberStyle}>
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              style={{ accentColor: theme.accent.primary }}
            />
            {t('login.rememberMe')}
          </label>

          {error && <div style={errorStyle}>{error}</div>}

          <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? '...' : t('login.login')}
          </Button>
        </form>
      </div>
    </div>
  );
};
