import React, { createContext, useState, useContext, useCallback } from 'react';

const AuthContext = createContext();

const SESSION_KEY = 'admin_authed';
const ATTEMPTS_KEY = 'admin_login_attempts';
const LOCKOUT_KEY = 'admin_login_lockout_until';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// NOTE ON SECURITY: the admin password is compared client-side against
// import.meta.env.VITE_ADMIN_PASSWORD, which is baked into the public JS
// bundle at build time. Anyone can read it from the shipped code, so this
// gate is obfuscation, not authentication. The rate limiting below only
// slows down guessing; it does not fix that. The real fix is a
// server-side check (e.g. a /api/admin-login endpoint that sets an
// httpOnly session cookie). Flagged for the site owner.

function readAttempts() {
  try {
    const raw = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '[]');
    const now = Date.now();
    return Array.isArray(raw) ? raw.filter((t) => now - t < LOCKOUT_MS) : [];
  } catch {
    return [];
  }
}

function getLockoutRemainingMs() {
  try {
    const until = Number(localStorage.getItem(LOCKOUT_KEY) || 0);
    return Math.max(0, until - Date.now());
  } catch {
    return 0;
  }
}

function recordFailedAttempt() {
  const attempts = readAttempts();
  attempts.push(Date.now());
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
    if (attempts.length >= MAX_ATTEMPTS) {
      localStorage.setItem(LOCKOUT_KEY, String(Date.now() + LOCKOUT_MS));
    }
  } catch {
    // storage unavailable — fail open on tracking, the password gate still applies
  }
  return attempts.length;
}

function clearAttempts() {
  try {
    localStorage.removeItem(ATTEMPTS_KEY);
    localStorage.removeItem(LOCKOUT_KEY);
  } catch {
    // ignore
  }
}

export const AuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });

  const lockoutRemainingMs = useCallback(() => getLockoutRemainingMs(), []);

  const login = useCallback((password) => {
    const remaining = getLockoutRemainingMs();
    if (remaining > 0) {
      return { ok: false, locked: true, remainingMs: remaining, attemptsLeft: 0 };
    }
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    if (password === adminPassword) {
      clearAttempts();
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        // ignore
      }
      setIsAdmin(true);
      return { ok: true, locked: false, remainingMs: 0, attemptsLeft: MAX_ATTEMPTS };
    }
    const count = recordFailedAttempt();
    const lockedMs = getLockoutRemainingMs();
    return {
      ok: false,
      locked: lockedMs > 0,
      remainingMs: lockedMs,
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - count),
    };
  }, []);

  const logout = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout, lockoutRemainingMs }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
