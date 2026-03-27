import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConsole } from '../../hooks/useConsole';
import { Button } from '../../components/common/Button';
import { theme } from '../../styles/theme';

interface ConsoleTabProps {
  serverId: number;
}

export const ConsoleTab: React.FC<ConsoleTabProps> = ({ serverId }) => {
  const { t } = useTranslation();
  const { lines, sendCommand } = useConsole(serverId);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lines]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    autoScroll.current = atBottom;
  };

  const handleSend = async () => {
    const cmd = input.trim();
    if (!cmd) return;
    setHistory(prev => [cmd, ...prev].slice(0, 100));
    setHistoryIdx(-1);
    setInput('');
    await sendCommand(cmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(next);
      setInput(history[next] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(historyIdx - 1, -1);
      setHistoryIdx(next);
      setInput(next === -1 ? '' : history[next] ?? '');
    }
  };

  const outerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  };

  const termStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    background: '#0d0d0d',
    fontFamily: '"Cascadia Code", "Fira Code", "Courier New", monospace',
    fontSize: '12px',
    lineHeight: '1.6',
    padding: '12px 16px',
    color: '#c8c8c8',
    borderRadius: `${theme.radius} ${theme.radius} 0 0`,
  };

  const lineStyle: CSSProperties = {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  };

  const inputRowStyle: CSSProperties = {
    display: 'flex',
    gap: '8px',
    padding: '8px',
    background: '#111',
    borderRadius: `0 0 ${theme.radius} ${theme.radius}`,
    borderTop: '1px solid rgba(255,255,255,0.08)',
  };

  const cmdInputStyle: CSSProperties = {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#e0e0e0',
    fontFamily: '"Cascadia Code", "Fira Code", "Courier New", monospace',
    fontSize: '12px',
    outline: 'none',
    padding: '4px 8px',
    WebkitAppRegion: 'no-drag',
  } as CSSProperties;

  return (
    <div style={outerStyle}>
      <div ref={containerRef} style={termStyle} onScroll={handleScroll}>
        {lines.map((line, i) => (
          <div key={i} style={lineStyle}>{line}</div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={inputRowStyle}>
        <span style={{ color: theme.accent.primary, fontFamily: 'monospace', fontSize: '12px', lineHeight: '28px', flexShrink: 0 }}>
          &gt;
        </span>
        <input
          style={cmdInputStyle}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('server.sendCommand')}
        />
        <Button variant="primary" size="sm" onClick={handleSend} disabled={!input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
};
