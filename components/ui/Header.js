/**
 * @fileoverview Header — top navigation bar shown on all authenticated pages.
 *
 * Displays the current page title (derived from the pathname),
 * a global search input, and the logged-in user's name.
 */

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

/**
 * Maps route pathnames to Lithuanian page titles.
 * Dynamic segments (e.g. /owners/5) are resolved by matching the base segment.
 */
const PAGE_TITLES = {
  '/':             'Pagrindinis',
  '/owners':       'Savininkai',
  '/pets':         'Gyvūnai',
  '/visits':       'Vizitai',
  '/appointments': 'Registracijos',
  '/vets':         'Veterinarai',
};

/**
 * Returns the page title for the given pathname.
 * Falls back to the base segment match for dynamic routes (e.g. /owners/3 → 'Savininkai').
 *
 * @param {string} pathname
 * @returns {string}
 */
function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const base = '/' + pathname.split('/')[1];
  return PAGE_TITLES[base] ?? 'VetCare';
}

/**
 * Header component — sticky top bar with title, search, and user info.
 *
 * @returns {JSX.Element}
 */
export default function Header() {
  const pathname        = usePathname();
  const { user }        = useAuth();
  const [search, setSearch] = useState('');

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-6 sticky top-0 z-10">

      {/* Current page title */}
      <h1 className="text-lg font-semibold text-gray-900 shrink-0">
        {getPageTitle(pathname)}
      </h1>

      {/* Global search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ieškoti..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                       placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User badge */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-800">{user?.name ?? 'Admin'}</p>
          <p className="text-xs text-gray-400">Administratorius</p>
        </div>
        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white font-semibold text-xs">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
          </span>
        </div>
      </div>
    </header>
  );
}
