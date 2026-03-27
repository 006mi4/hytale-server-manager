import React, { CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { theme } from '../../styles/theme';

interface PermissionsTabProps {
  serverId: number;
}

export const PermissionsTab: React.FC<PermissionsTabProps> = ({ serverId }) => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const name = inputValue.trim();
    if (!name) return;
    setAdding(true);
    try {
      await window.electronAPI.servers.sendCommand(serverId, `/permission add ${name}`);
      setEntries(prev => [...prev, name]);
      setInputValue('');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (name: string) => {
    await window.electronAPI.servers.sendCommand(serverId, `/permission remove ${name}`);
    setEntries(prev => prev.filter(e => e !== name));
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const addRowStyle: CSSProperties = {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
    maxWidth: '400px',
  };

  const listStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  };

  const entryStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: theme.bg.surface,
    border: `1px solid rgba(255,255,255,0.08)`,
    borderRadius: theme.radius,
    fontSize: '14px',
    color: theme.text.primary,
  };

  const emptyStyle: CSSProperties = {
    color: theme.text.secondary,
    fontSize: '14px',
    textAlign: 'center',
    padding: '32px',
  };

  return (
    <div style={containerStyle}>
      <div style={addRowStyle}>
        <Input
          label={t('server.permissions')}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Player name"
        />
        <Button variant="primary" onClick={handleAdd} disabled={adding || !inputValue.trim()}>
          {t('common.add')}
        </Button>
      </div>

      <div style={listStyle}>
        {entries.length === 0 ? (
          <div style={emptyStyle}>No permissions</div>
        ) : (
          entries.map(name => (
            <div key={name} style={entryStyle}>
              <span>{name}</span>
              <Button variant="danger" size="sm" onClick={() => handleRemove(name)}>
                {t('common.remove')}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
