/**
 * @fileoverview Visits list page — filter, sort, paginate, create, edit, and delete visits.
 *
 * Fetches data from GET /api/visits with filter/sort/pagination query params.
 * Filters: date range (from–to), vet.
 * Opens VisitForm modal for creating new visits with appointment scheduling.
 * Opens VisitEditForm modal for editing existing visits (date, diagnosis, notes, vet).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import VisitsTable   from '@/components/tables/VisitsTable';
import VisitForm     from '@/components/forms/VisitForm';
import VisitEditForm from '@/components/forms/VisitEditForm';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIMIT = 10;

const SORT_OPTIONS = [
  { value: 'date:desc', label: 'Naujausias' },
  { value: 'date:asc',  label: 'Seniausias' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the correctly declined Lithuanian form of "vizitas" for a given count.
 *
 * @param {number} n
 * @returns {string}
 */
function visitWord(n) {
  if (n % 100 >= 11 && n % 100 <= 19) return 'vizitų';
  const last = n % 10;
  if (last === 1) return 'vizitas';
  if (last >= 2 && last <= 9) return 'vizitai';
  return 'vizitų';
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

/**
 * VisitsPage — lists all visits with toolbar (filters, sort, add button)
 * and pagination. Manages modal state for creating and editing visits.
 */
export default function VisitsPage() {
  const [visits, setVisits]             = useState([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [page, setPage]                 = useState(1);
  const [sort, setSort]                 = useState('date:desc');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [vetId, setVetId]               = useState('');
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [createOpen, setCreateOpen]     = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);

  // Vets list for filter dropdown
  const [vets, setVets] = useState([]);

  const [sortBy, order] = sort.split(':');

  // ── Load vets for filter ──────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/vets?limit=100&sortBy=name&order=asc')
      .then((r) => r.json())
      .then((d) => { if (d.success) setVets(d.data); })
      .catch(() => {});
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        sortBy,
        order,
        page:  String(page),
        limit: String(LIMIT),
      });
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo)   params.set('to', dateTo);
      if (vetId)    params.set('vetId', vetId);

      const res  = await fetch(`/api/visits?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Klaida gaunant duomenis');

      setVisits(data.data);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch {
      setError('Nepavyko įkelti vizitų. Patikrinkite ryšį ir bandykite dar kartą.');
    } finally {
      setLoading(false);
    }
  }, [sortBy, order, page, dateFrom, dateTo, vetId]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  // ── Filter handlers ───────────────────────────────────────────────────────

  function handleSort(val)     { setSort(val);     setPage(1); }
  function handleVet(val)      { setVetId(val);    setPage(1); }
  function handleDateFrom(val) { setDateFrom(val); setPage(1); }
  function handleDateTo(val)   { setDateTo(val);   setPage(1); }

  /**
   * Called when a sortable column header is clicked.
   * Toggles direction if the same field is active; switches to new field with
   * sensible default direction (desc for date, asc for price).
   *
   * @param {string} field
   */
  function handleSortColumn(field) {
    if (sortBy === field) {
      setSort(`${field}:${order === 'asc' ? 'desc' : 'asc'}`);
    } else {
      setSort(`${field}:${field === 'date' ? 'desc' : 'asc'}`);
    }
    setPage(1);
  }

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  /**
   * Called by VisitEditForm on submit. Sends PUT to update the visit.
   *
   * @param {object} formData
   */
  async function handleEditSave(formData) {
    const res  = await fetch(`/api/visits/${editingVisit.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(formData),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error ?? 'Nepavyko atnaujinti vizito');
    await fetchVisits();
  }

  /**
   * Deletes a visit by id.
   *
   * @param {number} id
   */
  async function handleDelete(id) {
    try {
      const res  = await fetch(`/api/visits/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Nepavyko ištrinti');
      if (visits.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await fetchVisits();
      }
    } catch (err) {
      alert(err.message ?? 'Nepavyko ištrinti vizito.');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ------------------------------------------------------------------ */}
      {/* Toolbar                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-end gap-3">

        {/* Date from */}
        <div className="min-w-[150px]">
          <label className="block text-xs text-gray-500 mb-1">Nuo</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateFrom(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Date to */}
        <div className="min-w-[150px]">
          <label className="block text-xs text-gray-500 mb-1">Iki</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateTo(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Vet filter */}
        <div className="min-w-[180px]">
          <label className="block text-xs text-gray-500 mb-1">Veterinaras</label>
          <select
            value={vetId}
            onChange={(e) => handleVet(e.target.value)}
            className="w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700"
          >
            <option value="">Visi</option>
            {vets.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.name ?? `${v.firstName} ${v.lastName}`}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Rūšiavimas</label>
          <select
            value={sort}
            onChange={(e) => handleSort(e.target.value)}
            className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        {/* Add visit button */}
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700
                     text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Naujas vizitas
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Table card                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Row count */}
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm text-gray-500">
            {loading ? 'Kraunama…' : `Rasta: ${total} ${visitWord(total)}`}
          </p>
        </div>

        {error ? (
          <div className="px-5 py-10 text-center text-red-500 text-sm">{error}</div>
        ) : loading ? (
          <div className="px-5 py-14 text-center text-gray-400 text-sm">Kraunama…</div>
        ) : (
          <VisitsTable
            visits={visits}
            onEdit={(visit) => setEditingVisit(visit)}
            onDelete={handleDelete}
            sortBy={sortBy}
            order={order}
            onSort={handleSortColumn}
          />
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pagination                                                          */}
      {/* ------------------------------------------------------------------ */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Puslapis {page} iš {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white
                         hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Ankstesnis
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white
                         hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Kitas →
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Create modal                                                        */}
      {/* ------------------------------------------------------------------ */}
      {createOpen && (
        <VisitForm
          onSave={fetchVisits}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Edit modal                                                          */}
      {/* ------------------------------------------------------------------ */}
      {editingVisit && (
        <VisitEditForm
          visit={editingVisit}
          onSave={handleEditSave}
          onClose={() => setEditingVisit(null)}
        />
      )}
    </div>
  );
}
