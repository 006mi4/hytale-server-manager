import React, { CSSProperties, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { theme } from '../../styles/theme';

interface DownloadStepProps {
  onNext: () => void;
}

type Stage =
  | 'checking'
  | 'auth-start'       // requesting device code from Hytale
  | 'auth-waiting'     // showing code, waiting for user to authorize
  | 'auth-success'     // user authorized, token received
  | 'downloading-tool' // downloading hytale-downloader.zip
  | 'extracting-tool'  // extracting zip
  | 'downloading-server' // downloading game files
  | 'done'
  | 'error';

export const DownloadStep: React.FC<DownloadStepProps> = ({ onNext }) => {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>('checking');
  const [progress, setProgress] = useState(0);
  const [authUrl, setAuthUrl] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const running = useRef(false);

  // Listen for download progress events
  useEffect(() => {
    const unsub = window.electronAPI.downloader.onProgress((p: any) => {
      setProgress(p.percent);
      if (p.stage === 'downloading-tool') setStage('downloading-tool');
      else if (p.stage === 'extracting-tool') setStage('extracting-tool');
      else if (p.stage === 'downloading-server') setStage('downloading-server');
      else if (p.stage === 'done') { setStage('done'); setProgress(100); }
    });
    return unsub;
  }, []);

  // Start the full flow on mount
  useEffect(() => {
    startFlow();
  }, []);

  const startFlow = async () => {
    if (running.current) return;
    running.current = true;
    setErrorMsg('');

    try {
      // Check if server files already exist
      const hasFiles = await window.electronAPI.downloader.checkFiles();
      if (hasFiles) {
        setStage('done');
        setProgress(100);
        running.current = false;
        return;
      }

      // Check if already authenticated
      const authStatus = await window.electronAPI.hytale.getAuthStatus();
      if (!authStatus.authenticated) {
        // Start OAuth2 Device Flow
        setStage('auth-start');
        const auth = await window.electronAPI.hytale.startDeviceAuth();
        setAuthUrl(auth.verifyUrlComplete || auth.verifyUrl);
        setAuthCode(auth.userCode);
        setStage('auth-waiting');

        // Poll for token (this blocks until user authorizes or timeout)
        await (window.electronAPI.hytale as any).pollForToken(auth.deviceCode, auth.interval, auth.expiresIn);
        setStage('auth-success');
      }

      // Auth done — now download server files (tool + game files)
      await window.electronAPI.downloader.downloadServer();
      setStage('done');
      setProgress(100);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred');
      setStage('error');
    } finally {
      running.current = false;
    }
  };

  const retry = () => {
    running.current = false;
    startFlow();
  };

  const getStageText = (): string => {
    switch (stage) {
      case 'checking': return 'Checking...';
      case 'auth-start': return 'Connecting to Hytale...';
      case 'downloading-tool': return 'Downloading Hytale Downloader...';
      case 'extracting-tool': return 'Extracting...';
      case 'downloading-server': return 'Downloading server files...';
      case 'auth-success': return 'Authenticated! Starting download...';
      default: return '';
    }
  };

  const containerStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '20px' };
  const progressBarOuter: CSSProperties = { width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' };
  const progressBarInner: CSSProperties = { height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${theme.accent.primary}, ${theme.accent.secondary})`, borderRadius: '4px', transition: 'width 0.3s ease' };

  const authBoxStyle: CSSProperties = {
    background: theme.bg.surface, border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: theme.radiusLg, padding: '28px',
    display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
  };

  const codeStyle: CSSProperties = {
    fontFamily: 'monospace', fontSize: '32px', fontWeight: 700,
    color: theme.accent.secondary, letterSpacing: '0.15em',
    background: 'rgba(244,208,63,0.1)', padding: '12px 28px', borderRadius: theme.radius,
    userSelect: 'all', cursor: 'text',
  };

  const errorStyle: CSSProperties = {
    background: `${theme.status.error}22`, border: `1px solid ${theme.status.error}66`,
    borderRadius: theme.radius, padding: '12px 16px', color: theme.status.error, fontSize: '13px',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  };

  const isDownloading = stage === 'downloading-tool' || stage === 'extracting-tool' || stage === 'downloading-server' || stage === 'auth-success';

  return (
    <div style={containerStyle}>
      {/* Loading / connecting */}
      {(stage === 'checking' || stage === 'auth-start') && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '24px 0' }}>
          <Spinner size={24} />
          <span style={{ fontSize: '14px', color: theme.text.secondary }}>{getStageText()}</span>
        </div>
      )}

      {/* OAuth2 Device Auth */}
      {stage === 'auth-waiting' && (
        <div style={authBoxStyle}>
          <p style={{ fontSize: '16px', color: theme.text.primary, fontWeight: 600 }}>
            {t('setup.authRequired')}
          </p>
          <p style={{ fontSize: '14px', color: theme.text.secondary, textAlign: 'center', lineHeight: 1.5 }}>
            Open the link below in your browser and log in with your Hytale account:
          </p>
          <a
            href={authUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              color: theme.accent.primary, fontSize: '14px', wordBreak: 'break-all',
              textDecoration: 'underline', padding: '8px 16px',
              background: 'rgba(233,69,96,0.1)', borderRadius: theme.radius,
            }}
          >
            {authUrl}
          </a>
          <p style={{ fontSize: '13px', color: theme.text.secondary, marginTop: '4px' }}>
            Authorization code:
          </p>
          <div style={codeStyle}>{authCode}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.text.secondary, fontSize: '13px', marginTop: '8px' }}>
            <Spinner size={14} />
            <span>Waiting for authorization...</span>
          </div>
        </div>
      )}

      {/* Download progress */}
      {isDownloading && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Spinner size={18} />
            <span style={{ fontSize: '14px', color: theme.text.secondary }}>{getStageText()}</span>
          </div>
          <div style={progressBarOuter}>
            <div style={progressBarInner} />
          </div>
          <span style={{ fontSize: '12px', color: theme.text.secondary, textAlign: 'right' }}>
            {Math.round(progress)}%
          </span>
        </>
      )}

      {/* Done */}
      {stage === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '36px', color: theme.status.success }}>✓</span>
          <span style={{ fontSize: '16px', fontWeight: 600, color: theme.status.success }}>Server files ready!</span>
          <Button variant="primary" onClick={onNext} style={{ justifyContent: 'center', marginTop: '8px' }}>
            {t('setup.next')}
          </Button>
        </div>
      )}

      {/* Error */}
      {stage === 'error' && (
        <>
          <div style={errorStyle}>{errorMsg}</div>
          <Button variant="secondary" onClick={retry} style={{ justifyContent: 'center' }}>
            Retry
          </Button>
        </>
      )}
    </div>
  );
};
