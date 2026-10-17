import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const AuthContext = createContext();

/**
 * Server-backed admin auth.
 *
 * The password is NEVER compared in the browser. login() POSTs to
 * /api/admin-login, which verifies against the server-side ADMIN_PASSWORD
 * env var and sets an httpOnly session cookie. isAdmin is restored on
 * mount via /api/admin-check.
 */
export const AuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [lockedUntil, setLockedUntil] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin-check', { credentials: 'include' });
        const json = await res.json();
        setIsAdmin(!!json.authenticated);
      } catch {
        // Fail closed: stay logged out if the check can't run.
      }
      setChecking(false);
    })();
  }, []);

  const login = useCallback(
    async (password) => {
      if (Date.now() < lockedUntil) {
        return {
          ok: false,
          locked: true,
          retryAfterSec: Math.ceil((lockedUntil - Date.now()) / 1000),
        };
      }
      try {
        const res = await fetch('/api/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ password }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.ok) {
          setIsAdmin(true);
          setLockedUntil(0);
          return { ok: true };
        }
        if (res.status === 429) {
          const retry = json.retryAfterSec || 900;
          setLockedUntil(Date.now() + retry * 1000);
          return { ok: false, locked: true, retryAfterSec: retry };
        }
        return { ok: false, error: json.error || 'Incorrect password.' };
      } catch {
        return { ok: false, error: 'Login failed. Check your connection and try again.' };
      }
    },
    [lockedUntil]
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/admin-logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Ignore network errors on logout; clear local state regardless.
    }
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
