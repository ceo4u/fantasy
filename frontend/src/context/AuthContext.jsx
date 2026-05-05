import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

const SESSION_KEY   = 'admin_token';
const SESSION_TIME  = 'admin_login_time';
const MAX_AGE_MS    = 60 * 60 * 1000; // 60 minutes

export function AuthProvider({ children }) {
  const [isAdmin,  setIsAdmin]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const timerRef = useRef(null);

  // ── Clear everything ──────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_TIME);
    setIsAdmin(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // ── Schedule auto-logout 60 min after login ───────────────────────────────
  const scheduleAutoLogout = useCallback((loginTimeMs) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const remaining = loginTimeMs + MAX_AGE_MS - Date.now();
    if (remaining <= 0) { logout(); return; }
    timerRef.current = setTimeout(() => {
      logout();
      // Optional: show a small notification by dispatching a custom event
      window.dispatchEvent(new CustomEvent('auth:session_expired'));
    }, remaining);
  }, [logout]);

  // ── Verify stored token on mount ──────────────────────────────────────────
  useEffect(() => {
    async function verify() {
      const token     = localStorage.getItem(SESSION_KEY);
      const loginTime = parseInt(localStorage.getItem(SESSION_TIME) || '0', 10);

      if (!token) { setLoading(false); return; }

      // Check age client-side first
      if (Date.now() - loginTime > MAX_AGE_MS) {
        logout();
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.post('/auth/verify', { token });
        if (data.valid) {
          setIsAdmin(true);
          scheduleAutoLogout(loginTime);
        } else {
          logout();
        }
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    }

    verify();

    window.addEventListener('auth:logout', logout);
    return () => {
      window.removeEventListener('auth:logout', logout);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [logout, scheduleAutoLogout]);

  // ── Login ─────────────────────────────────────────────────────────────────
  async function login(username, password) {
    const { data } = await api.post('/auth/login', { username, password });
    const now = Date.now();
    localStorage.setItem(SESSION_KEY,  data.token);
    localStorage.setItem(SESSION_TIME, String(now));
    setIsAdmin(true);
    scheduleAutoLogout(now);
    return data;
  }

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
