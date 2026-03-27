import React, { CSSProperties, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { theme } from '../../styles/theme';

interface JavaStepProps {
  onNext: () => void;
}

type JavaCheckResult = { found: boolean; version: number | null; supported: boolean };

export const JavaStep: React.FC<JavaStepProps> = ({ onNext }) => {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<JavaCheckResult | null>(null);

  const check = async () => {
    setChecking(true);
    setResult(null);
    try {
      const res = await window.electronAPI.java.check();
      setResult(res);
    } catch {
      setResult({ found: false, version: null, supported: false });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { check(); }, []);

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '16px 0',
  };

  const statusBoxStyle = (ok: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    borderRadius: theme.radius,
    background: ok ? `${theme.status.success}18` : `${theme.status.error}18`,
    border: `1px solid ${ok ? theme.status.success : theme.status.error}66`,
    width: '100%',
  });

  const iconStyle = (ok: boolean): CSSProperties => ({
    fontSize: '22px',
    color: ok ? theme.status.success : theme.status.error,
    flexShrink: 0,
  });

  const textStyle: CSSProperties = {
    flex: 1,
    fontSize: '14px',
    color: theme.text.primary,
  };

  const hintStyle: CSSProperties = {
    fontSize: '12px',
    color: theme.text.secondary,
    marginTop: '4px',
  };

  const linkStyle: CSSProperties = {
    color: theme.accent.primary,
    textDecoration: 'none',
  };

  return (
    <div style={containerStyle}>
      {checking && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Spinner size={32} />
          <span style={{ color: theme.text.secondary, fontSize: '14px' }}>Checking Java...</span>
        </div>
      )}

      {!checking && result && (
        <>
          <div style={statusBoxStyle(result.found && result.supported)}>
            <span style={iconStyle(result.found && result.supported)}>
              {result.found && result.supported ? '✓' : '✗'}
            </span>
            <div style={textStyle}>
              {result.found && result.supported ? (
                <div>{t('setup.javaFound', { version: result.version })}</div>
              ) : (
                <>
                  <div>{t('setup.javaNotFound')}</div>
                  <div style={hintStyle}>
                    {t('setup.javaInstallHint')}{' '}
                    <a href="https://adoptium.net" target="_blank" rel="noreferrer" style={linkStyle}>
                      adoptium.net
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <Button variant="secondary" onClick={check} style={{ flex: 1, justifyContent: 'center' }}>
              {t('setup.recheck')}
            </Button>
            {result.found && result.supported && (
              <Button variant="primary" onClick={onNext} style={{ flex: 1, justifyContent: 'center' }}>
                {t('setup.next')}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
