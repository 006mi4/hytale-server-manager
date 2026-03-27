import React, { CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles/theme';
import { AccountStep } from './AccountStep';
import { JavaStep } from './JavaStep';
import { DownloadStep } from './DownloadStep';
import { CompleteStep } from './CompleteStep';

const TOTAL_STEPS = 4;

export const SetupWizard: React.FC = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const stepLabels = [
    t('setup.step1'),
    t('setup.step2'),
    t('setup.step3'),
    t('setup.step4'),
  ];

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));

  const pageStyle: CSSProperties = {
    width: '100%',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(135deg, ${theme.bg.primary} 0%, ${theme.bg.secondary} 100%)`,
    WebkitAppRegion: 'no-drag',
  } as CSSProperties;

  const cardStyle: CSSProperties = {
    background: theme.bg.secondary,
    border: `1px solid rgba(255,255,255,0.1)`,
    borderRadius: theme.radiusLg,
    padding: '40px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  };

  const titleStyle: CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: theme.text.primary,
    textAlign: 'center',
    marginBottom: '32px',
  };

  // Progress indicator
  const progressStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '36px',
    gap: '0',
  };

  const stepContent = [
    <AccountStep key="account" onNext={next} />,
    <JavaStep key="java" onNext={next} />,
    <DownloadStep key="download" onNext={next} />,
    <CompleteStep key="complete" />,
  ];

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={titleStyle}>
          <span style={{ color: theme.accent.primary }}>Hytale</span> {t('setup.title')}
        </div>

        {/* Step progress indicator */}
        <div style={progressStyle}>
          {stepLabels.map((label, i) => {
            const isCompleted = i < step;
            const isActive = i === step;
            const circleColor = isCompleted
              ? theme.status.success
              : isActive
              ? theme.accent.primary
              : 'rgba(255,255,255,0.15)';
            const textColor = isActive ? theme.text.primary : isCompleted ? theme.status.success : theme.text.secondary;

            const circleStyle: CSSProperties = {
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: circleColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              color: isCompleted || isActive ? '#fff' : theme.text.secondary,
              flexShrink: 0,
              transition: 'background 0.3s',
              position: 'relative',
              zIndex: 1,
            };

            const labelStyle: CSSProperties = {
              fontSize: '10px',
              color: textColor,
              textAlign: 'center',
              position: 'absolute',
              top: '36px',
              left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              fontWeight: isActive ? 600 : 400,
            };

            const connectorStyle: CSSProperties = {
              flex: 1,
              height: '2px',
              background: i < step ? theme.status.success : 'rgba(255,255,255,0.1)',
              transition: 'background 0.3s',
              margin: '0 -1px',
            };

            return (
              <React.Fragment key={i}>
                <div style={{ position: 'relative' }}>
                  <div style={circleStyle}>
                    {isCompleted ? '✓' : i + 1}
                  </div>
                  <span style={labelStyle}>{label}</span>
                </div>
                {i < TOTAL_STEPS - 1 && <div style={connectorStyle} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Extra space for step labels */}
        <div style={{ height: '20px' }} />

        {/* Step content */}
        <div style={{ color: theme.text.primary }}>
          {stepContent[step]}
        </div>
      </div>
    </div>
  );
};
