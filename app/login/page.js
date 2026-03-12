/**
 * @fileoverview Login page — entry point for VetCare admin authentication.
 *
 * Standalone page: no sidebar or navigation chrome.
 * Displays email + password form with emerald color scheme.
 * On success redirects to the dashboard (/).
 *
 * Default credentials: admin@vetcare.lt / admin123
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/authContext';

/**
 * LoginPage component.
 * Rendered at /login. AuthProvider handles the post-login redirect to /.
 */
export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const { login } = useAuth();

  /**
   * Submits credentials to AuthProvider.login and displays any error.
   *
   * @param {React.FormEvent} e
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
    // On success AuthProvider sets isAuthenticated = true → redirect fires automatically
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">

        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-full mb-4">
            <span className="text-2xl font-bold text-emerald-700">V</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">VetCare</h1>
          <p className="text-sm text-gray-500 mt-1">Klinikos valdymo sistema</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              El. paštas
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@vetcare.lt"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Password field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Slaptažodis
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400
                       text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Jungiamasi...' : 'Prisijungti'}
          </button>
        </form>
      </div>
    </div>
  );
}
