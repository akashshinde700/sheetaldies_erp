import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Use sessionStorage instead of localStorage to limit XSS exposure.
  // User data (including role) is validated server-side; this is only for UI state.
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('erp_user')); } catch { return null; }
  });
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    const refreshUserSession = async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (mounted && data?.data) {
          sessionStorage.setItem('erp_user', JSON.stringify(data.data));
          setUser(data.data);
        }
      } catch {
        if (mounted) {
          sessionStorage.removeItem('erp_user');
          setUser(null);
        }
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    };

    refreshUserSession();
    return () => { mounted = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    sessionStorage.setItem('erp_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const loginWithOtp = useCallback(async (email, otp) => {
    const { data } = await api.post('/auth/verify-otp', { email, otp });
    sessionStorage.setItem('erp_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const requestOtp = useCallback(async (email) => {
    await api.post('/auth/request-otp', { email });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // ignore logout failures; clear local state anyway
    }
    sessionStorage.removeItem('erp_user');
    setUser(null);
  }, []);

  const isAdmin    = user?.role === 'ADMIN';
  const isManager  = ['ADMIN','MANAGER'].includes(user?.role);
  const isOperator = ['ADMIN','MANAGER','OPERATOR'].includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, initializing, login, loginWithOtp, requestOtp, logout, isAdmin, isManager, isOperator }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
