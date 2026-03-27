import React, { CSSProperties } from 'react';
import { theme } from '../../styles/theme';

interface SpinnerProps {
  size?: number;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 24 }) => {
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    border: `3px solid rgba(255,255,255,0.12)`,
    borderTopColor: theme.accent.primary,
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
    flexShrink: 0,
  };

  return <span style={style} />;
};
