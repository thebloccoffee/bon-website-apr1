import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { adminApi } from '@/api/adminClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  // Until the server has answered, we do not know — render neither the login
  // form nor the studio, or the page flickers on every refresh.
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .session()
      .then(({ authed }) => !cancelled && setIsAdmin(!!authed))
      .catch(() => !cancelled && setIsAdmin(false))
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Throws with the server's message (wrong password, rate limited) so the
  // form can show why it failed.
  const login = useCallback(async (password) => {
    await adminApi.login(password);
    setIsAdmin(true);
  }, []);

  const logout = useCallback(async () => {
    await adminApi.logout().catch(() => {});
    setIsAdmin(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAdmin, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
