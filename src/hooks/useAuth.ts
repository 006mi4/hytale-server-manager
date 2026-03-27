import { createContext, useContext, useState, useEffect, useCallback, ReactNode, createElement } from 'react';

interface AuthState {
  loading: boolean;
  authenticated: boolean;
  username: string | null;
  needsSetup: boolean;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    authenticated: false,
    username: null,
    needsSetup: false,
  });

  const refresh = useCallback(async () => {
    try {
      const session = await window.electronAPI.auth.checkSession();
      if (session.valid) {
        setState({ loading: false, authenticated: true, username: session.username, needsSetup: false });
      } else {
        setState({ loading: false, authenticated: false, username: null, needsSetup: false });
      }
    } catch {
      setState({ loading: false, authenticated: false, username: null, needsSetup: false });
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hasUsers = await window.electronAPI.auth.hasUsers();
        if (!hasUsers) {
          setState({ loading: false, authenticated: false, username: null, needsSetup: true });
        } else {
          await refresh();
        }
      } catch {
        setState({ loading: false, authenticated: false, username: null, needsSetup: false });
      }
    })();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string, remember: boolean) => {
    await window.electronAPI.auth.login(username, password, remember);
    setState({ loading: false, authenticated: true, username, needsSetup: false });
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    await window.electronAPI.auth.register(username, password);
    setState({ loading: false, authenticated: true, username, needsSetup: false });
  }, []);

  const logout = useCallback(async () => {
    await window.electronAPI.auth.logout();
    setState({ loading: false, authenticated: false, username: null, needsSetup: false });
  }, []);

  const value: AuthContextValue = { ...state, login, register, logout, refresh };

  return createElement(AuthContext.Provider, { value }, children);
}
