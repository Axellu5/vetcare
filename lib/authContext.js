/**
 * @fileoverview Auth context — manages authentication state across the app.
 *
 * Stores user and token in React state only (no localStorage).
 * Provides login/logout methods and redirect logic.
 * On login: calls /api/auth/login and saves token to React state.
 * On mount with an existing token: validates session via /api/auth/me.
 */

'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/** @type {React.Context} */
const AuthContext = createContext(null);

/**
 * AuthProvider wraps the app and provides auth state via React Context.
 *
 * Handles redirects:
 *  - Unauthenticated users not on /login are sent to /login.
 *  - Authenticated users on /login are sent to /.
 *
 * @param {{ children: React.ReactNode }} props
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  // Validate token against /api/auth/me whenever the token changes.
  // On fresh page load token is null so this immediately sets isLoading = false.
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  // Redirect unauthenticated users away from protected routes.
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }

    if (isAuthenticated && pathname === '/login') {
      router.push('/');
    }
  }, [isAuthenticated, pathname, isLoading, router]);

  /**
   * Logs in the user by calling POST /api/auth/login.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  const login = useCallback(async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        setIsAuthenticated(true);
        return { success: true };
      }

      return { success: false, error: data.error || 'Prisijungimas nepavyko' };
    } catch {
      return { success: false, error: 'Tinklo klaida. Bandykite dar kartą.' };
    }
  }, []);

  /**
   * Clears auth state and redirects to /login.
   */
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook for consuming the auth context.
 *
 * @returns {{
 *   user: object|null,
 *   token: string|null,
 *   isAuthenticated: boolean,
 *   isLoading: boolean,
 *   login: (email: string, password: string) => Promise<{ success: boolean, error?: string }>,
 *   logout: () => void
 * }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
