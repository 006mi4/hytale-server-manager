import React, { CSSProperties, InputHTMLAttributes } from 'react';
import { theme } from '../../styles/theme';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, style, id, ...rest }) => {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
  };

  const labelStyle: CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: theme.text.secondary,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  };

  const inputStyle: CSSProperties = {
    background: theme.bg.surface,
    border: `1px solid rgba(255,255,255,0.12)`,
    borderRadius: theme.radius,
    color: theme.text.primary,
    fontSize: '14px',
    padding: '9px 12px',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s',
    WebkitAppRegion: 'no-drag',
    ...style,
  } as CSSProperties;

  return (
    <div style={containerStyle}>
      {label && <label htmlFor={inputId} style={labelStyle}>{label}</label>}
      <input id={inputId} style={inputStyle} {...rest} />
    </div>
  );
};
