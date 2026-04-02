import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

const SESSION_KEY = 'admin_authed';

export const AuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');

  const login = (password) => {
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    if (password === adminPassword) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
