import React, { CSSProperties, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { theme } from '../../styles/theme';

interface DownloadStepProps {
  onNext: () => void;
}

type Stage = 'checking' | 'ready' | 'downloading' | 'auth' | 'done' | 'error';

export const DownloadStep: React.FC<DownloadStepProps> = ({ onNext }) => {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>('checking');
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const unsub = window.electronAPI.downloader.onProgress(p => {
      setProgress(p.percent);
      setStageLabel(p.stage);
      if (p.percent >= 100) setStage('done');
    });
    return unsub;
  }, []);

  const startDownload = async () => {
    setStage('downloading');
    setProgress(0);
    setErrorMsg('');
    try {
      // Check if Hytale auth is needed
      const authStatus = await window.electronAPI.hytale.getAuthStatus();
      if (!authStatus.authenticated) {
        setStage('auth');
        const { url, code } = await window.electronAPI.hytale.startDeviceAuth();
        setAuthUrl(url);
        setAuthCode(code);
        const unsub = window.electronAPI.hytale.onAuthComplete(() => {
          unsub();
          setStage('downloading');
          window.electronAPI.downloader.downloadServer().catch((err: unknown) => {
            setErrorMsg(err instanceof Error ? err.message : 'Download failed');
            setStage('error');
          });
        });
      } else {
        await window.electronAPI.downloader.downloadServer();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Download failed');
      setStage('error');
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const ok = await window.electronAPI.downloader.checkFiles();
        if (ok) { setStage('done'); setProgress(100); }
        else setStage('ready');
      } catch {
        setStage('ready');
      }
    })();
  }, []);

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  };

  const progressBarOuter: CSSProperties = {
    width: '100%',
    height: '8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  };

  const progressBarInner: CSSProperties = {
    height: '100%',
    width: `${progress}%`,
    background: `linear-gradient(90deg, ${theme.accent.primary}, ${theme.accent.secondary})`,
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  };

  const authBoxStyle: CSSProperties = {
    background: theme.bg.surface,
    border: `1px solid rgba(255,255,255,0.15)`,
    borderRadius: theme.radius,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    alignItems: 'center',
  };

  const codeStyle: CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '28px',
    fontWeight: 700,
    color: theme.accent.secondary,
    letterSpacing: '0.15em',
    background: 'rgba(244,208,63,0.1)',
    padding: '8px 20px',
    borderRadius: theme.radius,
  };

  const statusTextStyle: CSSProperties = {
    fontSize: '14px',
    color: theme.text.secondary,
    textAlign: 'center',
  };

  const errorStyle: CSSProperties = {
    background: `${theme.status.error}22`,
    border: `1px solid ${theme.status.error}66`,
    borderRadius: theme.radius,
    padding: '12px 16px',
    color: theme.status.error,
    fontSize: '13px',
  };

  const successStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    color: theme.status.success,
  };

  return (
    <div style={containerStyle}>
      {stage === 'checking' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <Spinner size={32} />
        </div>
      )}

      {stage === 'ready' && (
        <>
          <p style={statusTextStyle}>{t('setup.downloading')}</p>
          <Button variant="primary" onClick={startDownload} style={{ justifyContent: 'center' }}>
            {t('setup.next')}
          </Button>
        </>
      )}

      {stage === 'downloading' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Spinner size={18} />
            <span style={{ fontSize: '14px', color: theme.text.secondary }}>
              {stageLabel || t('setup.downloading')}
            </span>
          </div>
          <div style={progressBarOuter}>
            <div style={progressBarInner} />
          </div>
          <span style={{ fontSize: '12px', color: theme.text.secondary, textAlign: 'right' }}>
            {Math.round(progress)}%
          </span>
        </>
      )}

      {stage === 'auth' && (
        <div style={authBoxStyle}>
          <p style={{ fontSize: '14px', color: theme.text.primary, fontWeight: 600 }}>
            {t('setup.authRequired')}
          </p>
          <p style={statusTextStyle}>{t('setup.visitUrl')}</p>
          <a
            href={authUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: theme.accent.primary, fontSize: '13px', wordBreak: 'break-all' }}
          >
            {authUrl}
          </a>
          <div style={codeStyle}>{authCode}</div>
        </div>
      )}

      {stage === 'done' && (
        <div style={successStyle}>
          <span style={{ fontSize: '36px' }}>✓</span>
          <span style={{ fontSize: '16px', fontWeight: 600 }}>Server files ready!</span>
          <Button variant="primary" onClick={onNext} style={{ justifyContent: 'center' }}>
            {t('setup.next')}
          </Button>
        </div>
      )}

      {stage === 'error' && (
        <>
          <div style={errorStyle}>{errorMsg || t('common.error')}</div>
          <Button variant="secondary" onClick={startDownload} style={{ justifyContent: 'center' }}>
            Retry
          </Button>
        </>
      )}
    </div>
  );
};
