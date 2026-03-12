/**
 * @fileoverview AppShell — top-level layout wrapper driven by auth state.
 *
 * Renders Sidebar + Header + main area for authenticated users.
 * Renders bare children (no chrome) for the /login page.
 * Shows a loading screen while auth state is being determined.
 */

'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';

/**
 * AppShell component — conditionally renders the full layout or bare page.
 *
 * @param {{ children: React.ReactNode }} props
 */
export default function AppShell({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  // Show loading screen while initial auth check runs (prevents content flash)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-gray-400 text-sm">Kraunama...</span>
      </div>
    );
  }

  // Login page — render without any layout chrome
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Not authenticated — redirect is in flight, render nothing
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated — full layout: sidebar + header + main
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
