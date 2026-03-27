import React, { CSSProperties, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../hooks/useSettings';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Spinner } from '../../components/common/Spinner';
import { theme } from '../../styles/theme';
import i18n from '../../i18n';

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { settings, loading, update } = useSettings();

  const [language, setLanguage] = useState('en');
  const [javaPath, setJavaPath] = useState('');
  const [defaultXms, setDefaultXms] = useState('512M');
  const [defaultXmx, setDefaultXmx] = useState('2G');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setLanguage(settings.language ?? 'en');
      setJavaPath(settings.javaPath ?? '');
      setDefaultXms(settings.defaultXms ?? '512M');
      setDefaultXmx(settings.defaultXmx ?? '2G');
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await update({ language, javaPath, defaultXms, defaultXmx });
      await i18n.changeLanguage(language);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const containerStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  };

  const titleStyle: CSSProperties = {
    fontSize: '22px',
    fontWeight: 700,
    color: theme.text.primary,
    marginBottom: '28px',
  };

  const formStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    maxWidth: '480px',
  };

  const sectionStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const sectionTitleStyle: CSSProperties = {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: theme.text.secondary,
    paddingBottom: '8px',
    borderBottom: `1px solid rgba(255,255,255,0.06)`,
  };

  const labelStyle: CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: theme.text.secondary,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '6px',
  };

  const selectStyle: CSSProperties = {
    background: theme.bg.surface,
    border: `1px solid rgba(255,255,255,0.12)`,
    borderRadius: theme.radius,
    color: theme.text.primary,
    fontSize: '14px',
    padding: '9px 12px',
    outline: 'none',
    width: '100%',
    WebkitAppRegion: 'no-drag',
  } as CSSProperties;

  const memRowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Spinner size={32} /></div>;
  }

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>{t('settings.title')}</h1>

      <form style={formStyle} onSubmit={handleSave}>
        {/* Language section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>{t('settings.language')}</div>
          <div>
            <label style={labelStyle}>{t('settings.language')}</label>
            <select
              style={selectStyle}
              value={language}
              onChange={e => setLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>

        {/* Java section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>{t('settings.javaPath')}</div>
          <Input
            label={t('settings.javaPath')}
            value={javaPath}
            onChange={e => setJavaPath(e.target.value)}
            placeholder="e.g. C:\Program Files\Java\jdk-25\bin\java.exe"
          />
        </div>

        {/* Memory section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>{t('settings.defaultMemory')}</div>
          <div style={memRowStyle}>
            <Input
              label="Default Xms"
              value={defaultXms}
              onChange={e => setDefaultXms(e.target.value)}
              placeholder="512M"
            />
            <Input
              label="Default Xmx"
              value={defaultXmx}
              onChange={e => setDefaultXmx(e.target.value)}
              placeholder="2G"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? '...' : t('settings.save')}
          </Button>
          {saved && (
            <span style={{ fontSize: '13px', color: theme.status.success }}>
              ✓ {t('common.success')}
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
