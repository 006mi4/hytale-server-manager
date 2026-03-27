import React, { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { theme } from '../../styles/theme';

export const CompleteStep: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '24px 0',
    textAlign: 'center',
  };

  const iconStyle: CSSProperties = {
    fontSize: '56px',
    lineHeight: 1,
    filter: 'drop-shadow(0 0 20px rgba(107,163,74,0.5))',
  };

  const titleStyle: CSSProperties = {
    fontSize: '22px',
    fontWeight: 700,
    color: theme.text.primary,
  };

  const subtitleStyle: CSSProperties = {
    fontSize: '14px',
    color: theme.text.secondary,
    maxWidth: '320px',
  };

  return (
    <div style={containerStyle}>
      <div style={iconStyle}>✓</div>
      <div style={titleStyle}>{t('setup.setupComplete')}</div>
      <div style={subtitleStyle}>{t('setup.setupSummary')}</div>
      <Button
        variant="primary"
        size="lg"
        onClick={() => navigate('/dashboard')}
        style={{ marginTop: '8px', justifyContent: 'center', minWidth: '200px' }}
      >
        {t('setup.finish')}
      </Button>
    </div>
  );
};
