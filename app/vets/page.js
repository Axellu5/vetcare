/**
 * @fileoverview Vets list page — search, sort, paginate, create, edit and delete vets.
 *
 * Fetches data from GET /api/vets with search/sort/pagination query params.
 * Opens VetForm modal for create (no vet prop) and edit (vet prop set).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import VetForm from '@/components/forms/VetForm';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIMIT = 10;

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
 * Returns the correctly declined Lithuanian form of "veterinaras" for a given count.
 *
 * @param {number} n
 * @returns {string}
 */
function vetWord(n) {
  if (n % 100 >= 11 && n % 100 <= 19) return 'veterinarų';
  const last = n % 10;
  if (last === 1) return 'veterinaras';
  if (last >= 2 && last <= 9) return 'veterinarai';
  return 'veterinarų';
}

// ---------------------------------------------------------------------------
// Vet table row
// ---------------------------------------------------------------------------

/**
 * Single vet row.
 *
 * @param {{ vet: object, onEdit: Function, onDelete: Function }} props
 */
function VetRow({ vet, onEdit, onDelete }) {
  function handleDelete() {
    if (window.confirm(`Ar tikrai norite ištrinti „${vet.name}"?\nŠis veiksmas negrįžtamas.`)) {
      onDelete(vet.id);
    }
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Name + avatar */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-emerald-700">
              {vet.firstName?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          </div>
          <span className="font-medium text-gray-800">{vet.name}</span>
        </div>
      </td>
      <td className="px-5 py-3.5 text-gray-600 text-sm">{vet.specialty || '—'}</td>
      <td className="px-5 py-3.5 text-gray-600 text-sm">{vet.email || '—'}</td>
      <td className="px-5 py-3.5 text-gray-600 text-sm">{vet.phone || '—'}</td>
      <td className="px-5 py-3.5">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
          {vet.visitCount ?? 0}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEdit(vet)}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-800 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            Redaguoti
          </button>
          <button
            onClick={handleDelete}
            className="text-xs font-medium text-red-500 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            Ištrinti
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

/**
 * VetsPage — lists all vets with toolbar (search, sort, add button)
 * and pagination. Manages modal state for create/edit.
 */
export default function VetsPage() {
  const [vets, setVets]               = useState([]);
  const [total, setTotal]             = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [sort, setSort]               = useState('name:asc');
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingVet, setEditingVet]   = useState(null);

  const [sortBy, order] = sort.split(':');

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchVets = useCallback(async () => {
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
      const res  = await fetch(`/api/vets?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Klaida gaunant duomenis');
      setVets(data.data);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch {
      setError('Nepavyko įkelti veterinarų. Patikrinkite ryšį ir bandykite dar kartą.');
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, order, page]);

  useEffect(() => { fetchVets(); }, [fetchVets]);

  // ── Toolbar handlers ──────────────────────────────────────────────────────

  function handleSearch(val) { setSearch(val); setPage(1); }
  function handleSort(val)   { setSort(val);   setPage(1); }

  // ── Modal handlers ────────────────────────────────────────────────────────

  function openCreate()    { setEditingVet(null); setModalOpen(true);  }
  function openEdit(vet)   { setEditingVet(vet);  setModalOpen(true);  }
  function closeModal()    { setModalOpen(false);  setEditingVet(null); }

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  /**
   * Called by VetForm on submit. Throws on API error so the form can show it.
   *
   * @param {object} formData
   */
  async function handleSave(formData) {
    if (editingVet) {
      const res  = await fetch(`/api/vets/${editingVet.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Nepavyko atnaujinti veterinaro');
    } else {
      const res  = await fetch('/api/vets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Nepavyko sukurti veterinaro');
    }
    await fetchVets();
  }

  /**
   * Deletes a vet by id.
   *
   * @param {number} id
   */
  async function handleDelete(id) {
    try {
      const res  = await fetch(`/api/vets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Nepavyko ištrinti');
      if (vets.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await fetchVets();
      }
    } catch (err) {
      alert(err.message ?? 'Nepavyko ištrinti veterinaro.');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ------------------------------------------------------------------ */}
      {/* Toolbar                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Search */}
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
            placeholder="Ieškoti pagal vardą, specializaciją…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Sort */}
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

        {/* Add vet button */}
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700
                     text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Pridėti veterinarą
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Table card                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Row count */}
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm text-gray-500">
            {loading ? 'Kraunama…' : `Rasta: ${total} ${vetWord(total)}`}
          </p>
        </div>

        {error ? (
          <div className="px-5 py-10 text-center text-red-500 text-sm">{error}</div>
        ) : loading ? (
          <div className="px-5 py-14 text-center text-gray-400 text-sm">Kraunama…</div>
        ) : vets.length === 0 ? (
          <div className="py-14 text-center text-gray-400 text-sm">Veterinarų nerasta</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vardas ir pavardė</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Specializacija</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">El. paštas</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Telefonas</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vizitai</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Veiksmai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vets.map((vet) => (
                  <VetRow key={vet.id} vet={vet} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>
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
        <VetForm
          vet={editingVet}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
