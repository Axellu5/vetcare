/**
 * @fileoverview Dashboard page — main landing page after login.
 *
 * Displays four statistics cards, a recent visits table, an upcoming
 * appointments table, and quick-action buttons. All data is fetched
 * from the existing API routes on component mount.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

/** Lithuanian labels for appointment status values. */
const STATUS_LABELS = {
  scheduled: 'Suplanuota',
  completed: 'Baigta',
  cancelled: 'Atšaukta',
};

/** Tailwind badge classes per appointment status. */
const STATUS_COLORS = {
  scheduled: 'bg-emerald-100 text-emerald-700',
  completed:  'bg-sky-100 text-sky-700',
  cancelled:  'bg-red-100 text-red-700',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Statistics card shown in the top row.
 *
 * @param {{ title: string, value: number, icon: JSX.Element, accent: string }} props
 */
function StatCard({ title, value, icon, accent }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{title}</p>
      </div>
    </div>
  );
}

/**
 * Section card wrapper with heading and optional link.
 *
 * @param {{ title: string, linkHref?: string, linkLabel?: string, children: React.ReactNode }} props
 */
function SectionCard({ title, linkHref, linkLabel, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">{title}</h2>
        {linkHref && (
          <Link href={linkHref} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            {linkLabel} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Reusable table with header columns and rows.
 *
 * @param {{ cols: string[], rows: JSX.Element[], emptyMsg: string }} props
 */
function DataTable({ cols, rows, emptyMsg }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {cols.map((c) => (
              <th key={c} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.length > 0 ? rows : (
            <tr>
              <td colSpan={cols.length} className="px-5 py-8 text-center text-gray-400 text-sm">
                {emptyMsg}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

/**
 * DashboardPage — client component that fetches all dashboard data on mount.
 */
export default function DashboardPage() {
  const [stats, setStats] = useState({ owners: 0, pets: 0, todayAppts: 0, services: 0 });
  const [recentVisits, setRecentVisits]     = useState([]);
  const [upcomingAppts, setUpcomingAppts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // Fetch all data in parallel
        const [ownersRes, petsRes, apptTodayRes, servicesRes, visitsRes, apptsFutureRes] =
          await Promise.all([
            fetch('/api/owners?limit=1'),
            fetch('/api/pets?limit=1'),
            fetch(`/api/appointments?from=${today}&to=${today}&limit=100`),
            fetch('/api/services?limit=1'),
            fetch('/api/visits?limit=5&sortBy=date&order=desc'),
            fetch(`/api/appointments?from=${today}&status=scheduled&limit=5&sortBy=date&order=asc`),
          ]);

        const [owners, pets, apptToday, services, visits, appts] = await Promise.all([
          ownersRes.json(),
          petsRes.json(),
          apptTodayRes.json(),
          servicesRes.json(),
          visitsRes.json(),
          apptsFutureRes.json(),
        ]);

        setStats({
          owners:     owners.pagination?.total    ?? 0,
          pets:       pets.pagination?.total      ?? 0,
          todayAppts: apptToday.pagination?.total ?? 0,
          services:   services.pagination?.total  ?? 0,
        });

        setRecentVisits(visits.data   ?? []);
        setUpcomingAppts(appts.data   ?? []);
      } catch {
        setError('Nepavyko įkelti duomenų. Patikrinkite ryšį ir bandykite dar kartą.');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-gray-400 text-sm">Kraunama...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-red-600 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-7">

      {/* ------------------------------------------------------------------ */}
      {/* Statistics cards                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Savininkai"
          value={stats.owners}
          accent="bg-emerald-100"
          icon={
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          title="Gyvūnai"
          value={stats.pets}
          accent="bg-teal-100"
          icon={
            <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          }
        />
        <StatCard
          title="Šiandien registracijos"
          value={stats.todayAppts}
          accent="bg-green-100"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          title="Paslaugos"
          value={stats.services}
          accent="bg-cyan-100"
          icon={
            <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Recent visits + Upcoming appointments                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Recent visits */}
        <SectionCard title="Paskutiniai vizitai" linkHref="/visits" linkLabel="Visi vizitai">
          <DataTable
            cols={['Data', 'Gyvūnas', 'Savininkas', 'Veterinaras', 'Diagnozė']}
            emptyMsg="Vizitų dar nėra"
            rows={recentVisits.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{v.date}</td>
                <td className="px-5 py-3 font-medium text-gray-800">{v.petName ?? '—'}</td>
                <td className="px-5 py-3 text-gray-600">{v.ownerFullName ?? '—'}</td>
                <td className="px-5 py-3 text-gray-600">{v.vetFullName ?? '—'}</td>
                <td className="px-5 py-3 text-gray-600 max-w-[140px] truncate" title={v.diagnosis}>
                  {v.diagnosis}
                </td>
              </tr>
            ))}
          />
        </SectionCard>

        {/* Upcoming appointments */}
        <SectionCard title="Artėjančios registracijos" linkHref="/appointments" linkLabel="Visos registracijos">
          <DataTable
            cols={['Data', 'Laikas', 'Gyvūnas', 'Savininkas', 'Veterinaras', 'Būsena']}
            emptyMsg="Artėjančių registracijų nėra"
            rows={upcomingAppts.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{a.date}</td>
                <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{a.timeSlot}</td>
                <td className="px-5 py-3 font-medium text-gray-800">{a.petName ?? '—'}</td>
                <td className="px-5 py-3 text-gray-600">{a.ownerFullName ?? '—'}</td>
                <td className="px-5 py-3 text-gray-600">{a.vetFullName ?? '—'}</td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </td>
              </tr>
            ))}
          />
        </SectionCard>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Quick actions                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Greiti veiksmai</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/appointments"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nauja registracija
          </Link>
          <Link
            href="/pets"
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg border border-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Registruoti gyvūną
          </Link>
          <Link
            href="/owners"
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg border border-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Pridėti savininką
          </Link>
        </div>
      </div>

    </div>
  );
}
