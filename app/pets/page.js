/**
 * @fileoverview Pets list page — search, filter by species, sort, paginate.
 *
 * Fetches from GET /api/pets with search/species/sortBy/order/page/limit params.
 * Opens PetForm modal for create and edit operations.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import PetsTable from '@/components/tables/PetsTable';
import PetForm   from '@/components/forms/PetForm';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIMIT = 10;

const SPECIES_FILTER = [
  { value: '',         label: 'Visos rūšys' },
  { value: 'Šuo',      label: 'Šuo'         },
  { value: 'Katė',     label: 'Katė'        },
  { value: 'Triušis',  label: 'Triušis'     },
  { value: 'Žiurkėnas',label: 'Žiurkėnas'  },
  { value: 'Papūga',   label: 'Papūga'      },
];

const SORT_OPTIONS = [
  { value: 'name:asc',  label: 'Vardas A–Z' },
  { value: 'name:desc', label: 'Vardas Z–A' },
  { value: 'date:desc', label: 'Naujausias' },
  { value: 'date:asc',  label: 'Seniausias' },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Returns the correctly declined Lithuanian form of "gyvūnas" for a given count.
 *
 * @param {number} n
 * @returns {string}
 */
function petWord(n) {
  if (n % 100 >= 11 && n % 100 <= 19) return 'gyvūnų';
  const last = n % 10;
  if (last === 1) return 'gyvūnas';
  if (last >= 2 && last <= 9) return 'gyvūnai';
  return 'gyvūnų';
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

/**
 * PetsPage — lists all pets with toolbar (search, species filter, sort, add button)
 * and pagination. Manages modal state for create/edit.
 */
export default function PetsPage() {
  const [pets, setPets]               = useState([]);
  const [total, setTotal]             = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [species, setSpecies]         = useState('');
  const [sort, setSort]               = useState('name:asc');
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingPet, setEditingPet]   = useState(null);

  const [sortBy, order] = sort.split(':');

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchPets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ sortBy, order, page: String(page), limit: String(LIMIT) });
      if (search)  params.set('search', search);
      if (species) params.set('species', species);

      const res  = await fetch(`/api/pets?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Klaida');

      setPets(data.data);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch {
      setError('Nepavyko įkelti gyvūnų. Patikrinkite ryšį ir bandykite dar kartą.');
    } finally {
      setLoading(false);
    }
  }, [search, species, sortBy, order, page]);

  useEffect(() => { fetchPets(); }, [fetchPets]);

  // ── Toolbar handlers ───────────────────────────────────────────────────────

  function handleSearch(val)  { setSearch(val);  setPage(1); }
  function handleSpecies(val) { setSpecies(val); setPage(1); }
  function handleSort(val)    { setSort(val);    setPage(1); }

  // ── Modal handlers ─────────────────────────────────────────────────────────

  function openCreate()      { setEditingPet(null); setModalOpen(true); }
  function openEdit(pet)     { setEditingPet(pet);  setModalOpen(true); }
  function closeModal()      { setModalOpen(false); setEditingPet(null); }

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  /**
   * Called by PetForm on submit. Throws on API failure.
   *
   * @param {object} formData
   */
  async function handleSave(formData) {
    if (editingPet) {
      const res  = await fetch(`/api/pets/${editingPet.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Nepavyko atnaujinti gyvūno');
    } else {
      const res  = await fetch('/api/pets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Nepavyko sukurti gyvūno');
    }
    await fetchPets();
  }

  /**
   * Deletes a pet. Confirmation is handled in PetsTable before calling here.
   *
   * @param {number} id
   */
  async function handleDelete(id) {
    try {
      const res  = await fetch(`/api/pets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Nepavyko ištrinti');
      if (pets.length === 1 && page > 1) setPage((p) => p - 1);
      else await fetchPets();
    } catch (err) {
      alert(err.message ?? 'Nepavyko ištrinti gyvūno.');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ------------------------------------------------------------------ */}
      {/* Toolbar                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Search */}
        <div className="relative min-w-[200px] max-w-xs flex-1">
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
            placeholder="Ieškoti pagal vardą…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Species filter */}
        <select
          value={species}
          onChange={(e) => handleSpecies(e.target.value)}
          className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-2
                     focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700"
        >
          {SPECIES_FILTER.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

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

        {/* Add pet button */}
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700
                     text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Pridėti gyvūną
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Table card                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm text-gray-500">
            {loading ? 'Kraunama…' : `Rasta: ${total} ${petWord(total)}`}
          </p>
        </div>

        {error ? (
          <div className="px-5 py-10 text-center text-red-500 text-sm">{error}</div>
        ) : loading ? (
          <div className="px-5 py-14 text-center text-gray-400 text-sm">Kraunama…</div>
        ) : (
          <PetsTable pets={pets} onEdit={openEdit} onDelete={handleDelete} />
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pagination                                                          */}
      {/* ------------------------------------------------------------------ */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Puslapis {page} iš {totalPages}</p>
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
      {/* Modal                                                               */}
      {/* ------------------------------------------------------------------ */}
      {modalOpen && (
        <PetForm pet={editingPet} onSave={handleSave} onClose={closeModal} />
      )}
    </div>
  );
}
