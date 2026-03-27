import React, { CSSProperties, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { theme } from '../../styles/theme';

interface DownloadStepProps {
  onNext: () => void;
}

type Stage = 'checking' | 'downloading-tool' | 'extracting-tool' | 'auth' | 'downloading-server' | 'done' | 'error';

interface ProgressData {
  percent: number;
  stage: string;
  authCode?: string;
  authUrl?: string;
  authDirectUrl?: string;
}

export const DownloadStep: React.FC<DownloadStepProps> = ({ onNext }) => {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>('checking');
  const [progress, setProgress] = useState(0);
  const [authUrl, setAuthUrl] = useState('');
  const [authDirectUrl, setAuthDirectUrl] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const started = useRef(false);

  useEffect(() => {
    const unsub = window.electronAPI.downloader.onProgress((p: ProgressData) => {
      setProgress(p.percent);

      if (p.stage === 'downloading-tool') {
        setStage('downloading-tool');
      } else if (p.stage === 'extracting-tool') {
        setStage('extracting-tool');
      } else if (p.stage === 'auth') {
        setStage('auth');
        if (p.authCode) setAuthCode(p.authCode);
        if (p.authUrl) setAuthUrl(p.authUrl);
        if (p.authDirectUrl) setAuthDirectUrl(p.authDirectUrl);
      } else if (p.stage === 'downloading-server') {
        setStage('downloading-server');
      } else if (p.stage === 'done') {
        setStage('done');
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hasFiles = await window.electronAPI.downloader.checkFiles();
        if (hasFiles) {
          setStage('done');
          setProgress(100);
        } else {
          startDownload();
        }
      } catch {
        startDownload();
      }
    })();
  }, []);

  const startDownload = async () => {
    if (started.current) return;
    started.current = true;
    setStage('downloading-tool');
    setProgress(0);
    setErrorMsg('');
    try {
      await window.electronAPI.downloader.downloadServer();
      setStage('done');
      setProgress(100);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Download failed');
      setStage('error');
      started.current = false;
    }
  };

  const retry = () => {
    started.current = false;
    startDownload();
  };

  const getStageLabel = (): string => {
    switch (stage) {
      case 'downloading-tool': return 'Downloading Hytale Downloader...';
      case 'extracting-tool': return 'Extracting Hytale Downloader...';
      case 'downloading-server': return 'Downloading server files...';
      default: return t('setup.downloading');
    }
  };

  const containerStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '20px' };

  const progressBarOuter: CSSProperties = {
    width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px', overflow: 'hidden',
  };

  const progressBarInner: CSSProperties = {
    height: '100%', width: `${progress}%`,
    background: `linear-gradient(90deg, ${theme.accent.primary}, ${theme.accent.secondary})`,
    borderRadius: '4px', transition: 'width 0.3s ease',
  };

  const authBoxStyle: CSSProperties = {
    background: theme.bg.surface, border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: theme.radius, padding: '24px',
    display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
  };

  const codeStyle: CSSProperties = {
    fontFamily: 'monospace', fontSize: '32px', fontWeight: 700,
    color: theme.accent.secondary, letterSpacing: '0.15em',
    background: 'rgba(244,208,63,0.1)', padding: '12px 24px', borderRadius: theme.radius,
    userSelect: 'all',
  };

  const errorStyle: CSSProperties = {
    background: `${theme.status.error}22`, border: `1px solid ${theme.status.error}66`,
    borderRadius: theme.radius, padding: '12px 16px', color: theme.status.error, fontSize: '13px',
  };

  return (
    <div style={containerStyle}>
      {stage === 'checking' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <Spinner size={32} />
        </div>
      )}

      {(stage === 'downloading-tool' || stage === 'extracting-tool' || stage === 'downloading-server') && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Spinner size={18} />
            <span style={{ fontSize: '14px', color: theme.text.secondary }}>
              {getStageLabel()}
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
          <p style={{ fontSize: '16px', color: theme.text.primary, fontWeight: 600 }}>
            {t('setup.authRequired')}
          </p>
          <p style={{ fontSize: '14px', color: theme.text.secondary, textAlign: 'center' }}>
            {t('setup.visitUrl')}
          </p>
          <a
            href={authDirectUrl || authUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: theme.accent.primary, fontSize: '14px', wordBreak: 'break-all', textDecoration: 'underline' }}
          >
            {authUrl}
          </a>
          <div style={codeStyle}>{authCode}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.text.secondary, fontSize: '13px' }}>
            <Spinner size={14} />
            <span>Waiting for authorization...</span>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: theme.status.success }}>
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
          <Button variant="secondary" onClick={retry} style={{ justifyContent: 'center' }}>
            Retry
          </Button>
        </>
      )}
    </div>
  );
};
