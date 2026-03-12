/**
 * @fileoverview Appointments page — calendar month view with day detail table.
 *
 * Displays current month as a calendar grid. Each day cell shows appointment count
 * and color coding (white = none, green = some available, red = fully booked).
 * Clicking a day shows that day's appointments in a table below.
 * Filter by vet via dropdown. "Naujas vizitas" button opens VisitForm modal.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import VisitForm from '@/components/forms/VisitForm';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_DAILY_SLOTS = 9; // 09:00–17:00

const WEEKDAY_LABELS = ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'];

const MONTH_NAMES = [
  'Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis',
  'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis',
];

const STATUS_LABELS = { scheduled: 'Suplanuota', completed: 'Baigta', cancelled: 'Atšaukta' };
const STATUS_COLORS = {
  scheduled: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-sky-100 text-sky-700',
  cancelled: 'bg-red-100 text-red-700',
};

// ---------------------------------------------------------------------------
// Calendar helpers
// ---------------------------------------------------------------------------

/**
 * Returns array of Date objects for every day in the given month/year.
 *
 * @param {number} year
 * @param {number} month - 0-based
 * @returns {Date[]}
 */
function getDaysInMonth(year, month) {
  const days = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/**
 * Formats a Date to "YYYY-MM-DD" using local time components.
 * Using toISOString() would convert to UTC first, shifting the date
 * by ±1 day depending on the user's timezone.
 *
 * @param {Date} d
 * @returns {string}
 */
function toDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns leading empty cells count for Monday-start week grid.
 *
 * @param {number} year
 * @param {number} month - 0-based
 * @returns {number}
 */
function getStartOffset(year, month) {
  const day = new Date(year, month, 1).getDay(); // 0=Sun
  return day === 0 ? 6 : day - 1; // Monday=0
}

// ---------------------------------------------------------------------------
// CalendarCell sub-component
// ---------------------------------------------------------------------------

/**
 * Single day cell in the calendar grid.
 *
 * @param {{
 *   date: Date,
 *   count: number,
 *   isToday: boolean,
 *   isSelected: boolean,
 *   onClick: () => void
 * }} props
 */
function CalendarCell({ date, count, isToday, isSelected, onClick }) {
  let bgCls;
  if (isSelected) {
    bgCls = 'bg-emerald-600 text-white ring-2 ring-emerald-600 ring-offset-1';
  } else if (count >= TOTAL_DAILY_SLOTS) {
    bgCls = 'bg-red-50 hover:bg-red-100 border-red-200';
  } else if (count > 0) {
    bgCls = 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200';
  } else {
    bgCls = 'bg-white hover:bg-gray-50 border-gray-100';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center p-2 min-h-[64px] rounded-lg border transition-all cursor-pointer ${bgCls}`}
    >
      <span className={`text-sm font-medium ${isSelected ? 'text-white' : isToday ? 'text-emerald-700 font-bold' : 'text-gray-700'}`}>
        {date.getDate()}
      </span>
      {count > 0 && (
        <span className={`text-[10px] font-semibold mt-0.5 ${
          isSelected ? 'text-emerald-100' : count >= TOTAL_DAILY_SLOTS ? 'text-red-500' : 'text-emerald-600'
        }`}>
          {count} reg.
        </span>
      )}
      {isToday && !isSelected && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

/**
 * AppointmentsPage — month calendar view with appointment details.
 */
export default function AppointmentsPage() {
  const today = new Date();
  const [year, setYear]                 = useState(today.getFullYear());
  const [month, setMonth]               = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toDateStr(today));
  const [vetId, setVetId]               = useState('');
  const [vets, setVets]                 = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modalOpen, setModalOpen]       = useState(false);

  // ── Load vets ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/vets?limit=100&sortBy=name&order=asc')
      .then((r) => r.json())
      .then((d) => { if (d.success) setVets(d.data); })
      .catch(() => {});
  }, []);

  // ── Fetch all appointments for the month ──────────────────────────────────

  const fetchMonth = useCallback(async () => {
    setLoading(true);
    try {
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const params = new URLSearchParams({ from, to, limit: '100' });
      if (vetId) params.set('vetId', vetId);

      const res  = await fetch(`/api/appointments?${params}`);
      const data = await res.json();
      setAppointments(data.success ? data.data : []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [year, month, vetId]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  // ── Group appointments by date ────────────────────────────────────────────

  const countByDate = useMemo(() => {
    const map = {};
    appointments.forEach((a) => {
      const d = a.date;
      map[d] = (map[d] || 0) + 1;
    });
    return map;
  }, [appointments]);

  // ── Appointments for the selected day ─────────────────────────────────────

  const dayAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === selectedDate);
  }, [appointments, selectedDate]);

  // ── Calendar grid ─────────────────────────────────────────────────────────

  const days = getDaysInMonth(year, month);
  const startOffset = getStartOffset(year, month);
  const todayStr = toDateStr(today);

  // ── Month navigation ──────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(toDateStr(today));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ------------------------------------------------------------------ */}
      {/* Toolbar                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
            aria-label="Ankstesnis mėnuo"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[140px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
            aria-label="Kitas mėnuo"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
          >
            Šiandien
          </button>
        </div>

        {/* Vet filter */}
        <div className="min-w-[180px]">
          <select
            value={vetId}
            onChange={(e) => setVetId(e.target.value)}
            className="w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700"
          >
            <option value="">Visi veterinarai</option>
            {vets.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.name ?? `${v.firstName} ${v.lastName}`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        {/* New visit button */}
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700
                     text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nauja registracija
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Legend                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-gray-200 bg-white" />
          Laisva
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-emerald-200 bg-emerald-50" />
          Yra laisvų
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-red-200 bg-red-50" />
          Pilnai užimta
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Calendar grid                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 uppercase py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            Kraunama…
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {/* Leading empty cells */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map((date) => {
              const ds = toDateStr(date);
              return (
                <CalendarCell
                  key={ds}
                  date={date}
                  count={countByDate[ds] || 0}
                  isToday={ds === todayStr}
                  isSelected={ds === selectedDate}
                  onClick={() => setSelectedDate(ds)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Selected day's appointments table                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">
            {selectedDate} — {dayAppointments.length > 0 ? `${dayAppointments.length} registracija(-os)` : 'Registracijų nėra'}
          </h2>
        </div>

        {dayAppointments.length === 0 ? (
          <div className="py-14 text-center text-gray-400 text-sm">
            Šiai dienai registracijų nėra
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Laikas', 'Gyvūnas', 'Savininkas', 'Veterinaras', 'Būsena', 'Pastabos'].map((col) => (
                    <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dayAppointments
                  .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
                  .map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-gray-700 font-medium whitespace-nowrap">{a.timeSlot}</td>
                      <td className="px-5 py-3.5 font-medium text-gray-800">{a.petName ?? '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600">{a.ownerFullName ?? '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600">{a.vetFullName ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[a.status] ?? a.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-sm max-w-[160px] truncate" title={a.notes ?? ''}>
                        {a.notes || '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Create modal                                                        */}
      {/* ------------------------------------------------------------------ */}
      {modalOpen && (
        <VisitForm
          onSave={fetchMonth}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
