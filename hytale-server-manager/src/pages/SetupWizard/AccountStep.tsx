import React, { CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { theme } from '../../styles/theme';

interface AccountStepProps {
  onNext: () => void;
}

export const AccountStep: React.FC<AccountStepProps> = ({ onNext }) => {
  const { t } = useTranslation();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(username, password);
      onNext();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
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

  return (
    <form style={formStyle} onSubmit={handleSubmit}>
      <Input
        label={t('setup.username')}
        value={username}
        onChange={e => setUsername(e.target.value)}
        autoComplete="username"
        autoFocus
        required
      />
      <Input
        label={t('setup.password')}
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        autoComplete="new-password"
        required
      />
      <Input
        label={t('setup.confirmPassword')}
        type="password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        autoComplete="new-password"
        required
      />

      {error && <div style={errorStyle}>{error}</div>}

      <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
        {loading ? '...' : t('setup.createAccount')}
      </Button>
    </form>
  );
};
