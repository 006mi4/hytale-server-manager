import React, { CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { theme } from '../styles/theme';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: '🖥' },
  { label: 'Settings', path: '/settings', icon: '⚙' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const sidebarStyle: CSSProperties = {
    width: '220px',
    minWidth: '220px',
    background: theme.bg.secondary,
    borderRight: `1px solid rgba(255,255,255,0.06)`,
    display: 'flex',
    flexDirection: 'column',
    paddingTop: '48px', // room for topbar
    userSelect: 'none',
    WebkitAppRegion: 'no-drag',
  } as CSSProperties;

  const logoStyle: CSSProperties = {
    padding: '0 20px 24px',
    borderBottom: `1px solid rgba(255,255,255,0.06)`,
    marginBottom: '12px',
  };

  const logoTextStyle: CSSProperties = {
    fontSize: '14px',
    fontWeight: 700,
    color: theme.accent.primary,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  };

  const navStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '0 12px',
    flex: 1,
  };

  return (
    <aside style={sidebarStyle}>
      <div style={logoStyle}>
        <span style={logoTextStyle}>Hytale SM</span>
      </div>
      <nav style={navStyle}>
        {navItems.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          const itemStyle: CSSProperties = {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: theme.radius,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: isActive ? 700 : 500,
            color: isActive ? theme.text.primary : theme.text.secondary,
            background: isActive ? theme.bg.surface : 'transparent',
            borderLeft: isActive ? `3px solid ${theme.accent.primary}` : '3px solid transparent',
            transition: 'background 0.15s, color 0.15s',
          };

          return (
            <div
              key={item.path}
              style={itemStyle}
              onClick={() => navigate(item.path)}
            >
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
