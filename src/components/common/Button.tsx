import React, { CSSProperties, ButtonHTMLAttributes } from 'react';
import { theme } from '../../styles/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, CSSProperties> = {
  primary: {
    background: theme.accent.primary,
    color: '#fff',
    border: 'none',
  },
  secondary: {
    background: theme.bg.surface,
    color: theme.text.primary,
    border: `1px solid rgba(255,255,255,0.15)`,
  },
  danger: {
    background: theme.status.error,
    color: '#fff',
    border: 'none',
  },
  ghost: {
    background: 'transparent',
    color: theme.text.primary,
    border: `1px solid rgba(255,255,255,0.15)`,
  },
};

const sizeStyles: Record<Size, CSSProperties> = {
  sm: { padding: '4px 10px', fontSize: '12px' },
  md: { padding: '8px 16px', fontSize: '14px' },
  lg: { padding: '12px 24px', fontSize: '16px' },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  style,
  disabled,
  children,
  ...rest
}) => {
  const base: CSSProperties = {
    borderRadius: theme.radius,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    transition: 'opacity 0.15s, background 0.15s',
    opacity: disabled ? 0.5 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    WebkitAppRegion: 'no-drag',
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  } as CSSProperties;

  return (
    <button style={base} disabled={disabled} {...rest}>
      {children}
    </button>
  );
};
