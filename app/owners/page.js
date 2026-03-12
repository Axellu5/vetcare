/**
 * @fileoverview Owners list page — search, sort, paginate, create and edit owners.
 *
 * Fetches data from GET /api/owners with search/sort/pagination query params.
 * Opens OwnerForm modal for create (no owner prop) and edit (owner prop set).
 * Calls PUT /api/owners/:id or POST /api/owners via handleSave.
 * Calls DELETE /api/owners/:id via handleDelete (confirmation in OwnersTable).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import OwnersTable from '@/components/tables/OwnersTable';
import OwnerForm   from '@/components/forms/OwnerForm';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIMIT = 10;

/** Sort select options — value encodes "sortBy:order" for easy splitting. */
const SORT_OPTIONS = [
  { value: 'name:asc',  label: 'Vardas A–Z'  },
  { value: 'name:desc', label: 'Vardas Z–A'  },
  { value: 'date:desc', label: 'Naujausias'  },
  { value: 'date:asc',  label: 'Seniausias'  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the correctly declined Lithuanian form of "savininkas" for a given count.
 *
 * @param {number} n
 * @returns {string}
 */
function ownerWord(n) {
  if (n % 100 >= 11 && n % 100 <= 19) return 'savininkų';
  const last = n % 10;
  if (last === 1) return 'savininkas';
  if (last >= 2 && last <= 9) return 'savininkai';
  return 'savininkų';
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

/**
 * OwnersPage — lists all owners with toolbar (search, sort, add button)
 * and pagination. Manages modal state for create/edit.
 */
export default function OwnersPage() {
  const [owners, setOwners]             = useState([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [page, setPage]                 = useState(1);
  const [search, setSearch]             = useState('');
  const [sort, setSort]                 = useState('name:asc');
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingOwner, setEditingOwner] = useState(null); // null = create mode

  const [sortBy, order] = sort.split(':');

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchOwners = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        search,
        sortBy,
        order,
        page:  String(page),
        limit: String(LIMIT),
      });
      const res  = await fetch(`/api/owners?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Klaida gaunant duomenis');
      setOwners(data.data);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch {
      setError('Nepavyko įkelti savininkų. Patikrinkite ryšį ir bandykite dar kartą.');
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, order, page]);

  useEffect(() => { fetchOwners(); }, [fetchOwners]);

  // ── Toolbar handlers ───────────────────────────────────────────────────────

  /** Updates search string and resets to first page. */
  function handleSearch(val) {
    setSearch(val);
    setPage(1);
  }

  /** Updates sort option and resets to first page. */
  function handleSort(val) {
    setSort(val);
    setPage(1);
  }

  // ── Modal handlers ─────────────────────────────────────────────────────────

  function openCreate()        { setEditingOwner(null);  setModalOpen(true);  }
  function openEdit(owner)     { setEditingOwner(owner); setModalOpen(true);  }
  function closeModal()        { setModalOpen(false);    setEditingOwner(null); }

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  /**
   * Called by OwnerForm on submit. Throws on API error so the form can show it.
   *
   * @param {object} formData - { firstName, lastName, phone, email, address }
   */
  async function handleSave(formData) {
    if (editingOwner) {
      const res  = await fetch(`/api/owners/${editingOwner.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Nepavyko atnaujinti savininko');
    } else {
      const res  = await fetch('/api/owners', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Nepavyko sukurti savininko');
    }
    await fetchOwners();
  }

  /**
   * Deletes an owner by id. Confirmation is handled in OwnersTable before calling here.
   *
   * @param {number} id
   */
  async function handleDelete(id) {
    try {
      const res  = await fetch(`/api/owners/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Nepavyko ištrinti');
      // If last item on page > 1, go back one page; otherwise refresh
      if (owners.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await fetchOwners();
      }
    } catch (err) {
      alert(err.message ?? 'Nepavyko ištrinti savininko.');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ------------------------------------------------------------------ */}
      {/* Toolbar                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Search input */}
        <div className="relative min-w-[220px] max-w-xs flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Ieškoti pagal vardą, el. paštą…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Sort select */}
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

        <div className="flex-1" />

        {/* Add owner button */}
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700
                     text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Pridėti savininką
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Table card                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Row count */}
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm text-gray-500">
            {loading ? 'Kraunama…' : `Rasta: ${total} ${ownerWord(total)}`}
          </p>
        </div>

        {error ? (
          <div className="px-5 py-10 text-center text-red-500 text-sm">{error}</div>
        ) : loading ? (
          <div className="px-5 py-14 text-center text-gray-400 text-sm">Kraunama…</div>
        ) : (
          <OwnersTable
            owners={owners}
            onEdit={openEdit}
            onDelete={handleDelete}
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
      {/* Create / Edit modal                                                 */}
      {/* ------------------------------------------------------------------ */}
      {modalOpen && (
        <OwnerForm
          owner={editingOwner}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
