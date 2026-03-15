import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ci_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ci_token');
    if (token) {
      authAPI.getMe()
        .then(res => setUser(res.data.user))
        .catch(() => { localStorage.removeItem('ci_token'); localStorage.removeItem('ci_user'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, user } = res.data;
    localStorage.setItem('ci_token', token);
    localStorage.setItem('ci_user', JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ci_token');
    localStorage.removeItem('ci_user');
    setUser(null);
  }, []);

  const isManager = user?.role === 'manager';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isManager }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
