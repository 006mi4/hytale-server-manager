import React, { CSSProperties, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Spinner } from './components/common/Spinner';
import { Login } from './pages/Login/Login';
import { SetupWizard } from './pages/SetupWizard/SetupWizard';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { ServerDetail } from './pages/ServerDetail/ServerDetail';
import { Settings } from './pages/Settings/Settings';
import { ServerAuthPopup } from './components/ServerAuthPopup';
import { theme } from './styles/theme';
import i18n from './i18n';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mainStyle: CSSProperties = {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    paddingTop: '40px', // TopBar height
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <>
      <TopBar />
      <div style={mainStyle}>
        <Sidebar />
        <main style={contentStyle}>
          {children}
        </main>
      </div>
    </>
  );
};

const AppRoutes: React.FC = () => {
  const { loading, authenticated, needsSetup } = useAuth();

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${theme.bg.primary} 0%, ${theme.bg.secondary} 100%)`,
      }}>
        <Spinner size={40} />
      </div>
    );
  }

  if (needsSetup) {
    return (
      <Routes>
        <Route path="/setup/*" element={<SetupWizard />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  if (!authenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/server/:id" element={<ServerDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
};

export default function App() {
  useEffect(() => {
    window.electronAPI.settings.get().then((s) => {
      if (s?.language) {
        i18n.changeLanguage(s.language);
      }
    }).catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ServerAuthPopup />
      </AuthProvider>
    </BrowserRouter>
  );
}
