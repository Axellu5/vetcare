/**
 * @fileoverview PetsTable — renders a list of pet records in a table.
 *
 * Columns: Vardas, Rūšis, Veislė, Amžius, Savininkas, Veiksmai.
 * "Vardas" is a sortable column — clicking it triggers onSort("name").
 * Sort direction is indicated by an up/down arrow next to the active column label.
 * Species displayed as colour-coded badges.
 * Clicking the pet name navigates to the detail page (/pets/:id).
 * Delete requests browser confirmation before calling onDelete.
 */

'use client';

import Link from 'next/link';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Tailwind badge colours per species value.
 * Falls back to gray for unknown species.
 */
const SPECIES_COLORS = {
  'Šuo':      'bg-blue-100 text-blue-700',
  'Katė':     'bg-purple-100 text-purple-700',
  'Triušis':  'bg-orange-100 text-orange-700',
  'Žiurkėnas':'bg-yellow-100 text-yellow-700',
  'Papūga':   'bg-emerald-100 text-emerald-700',
  'Kita':     'bg-gray-100 text-gray-600',
};

/** Maps raw gender values to Lithuanian display labels. */
const GENDER_LABELS = {
  male:   'Patinas',
  female: 'Patelė',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the species badge classes for a given species string.
 *
 * @param {string} species
 * @returns {string}
 */
function speciesCls(species) {
  return SPECIES_COLORS[species] ?? 'bg-gray-100 text-gray-600';
}

/**
 * Formats an age number into a human-readable Lithuanian string.
 *
 * @param {number|null} age
 * @returns {string}
 */
function formatAge(age) {
  if (age === null || age === undefined) return '—';
  if (age === 0) return '< 1 m.';
  if (age === 1) return '1 metai';
  if (age >= 2 && age <= 9) return `${age} metai`;
  return `${age} metų`;
}

// ---------------------------------------------------------------------------
// SortableHeader
// ---------------------------------------------------------------------------

/**
 * A table header cell that triggers sorting when clicked.
 * Shows ↑ (asc) or ↓ (desc) for the active column; neutral icon otherwise.
 *
 * @param {{ label: string, field: string, sortBy: string, order: string, onSort: Function }} props
 */
function SortableHeader({ label, field, sortBy, order, onSort }) {
  const active = sortBy === field;
  return (
    <th
      onClick={() => onSort(field)}
      className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide
        cursor-pointer select-none hover:text-gray-700 hover:bg-gray-100 transition-colors"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          order === 'asc'
            ? <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
            : <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
        ) : (
          <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>
        )}
      </span>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Single pet row.
 *
 * @param {{ pet: object, onEdit: Function, onDelete: Function }} props
 */
function PetRow({ pet, onEdit, onDelete }) {
  function handleDelete() {
    if (window.confirm(`Ar tikrai norite ištrinti „${pet.name}"?\nŠis veiksmas negrįžtamas.`)) {
      onDelete(pet.id);
    }
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">

      {/* Name — links to detail page */}
      <td className="px-5 py-3.5">
        <Link
          href={`/pets/${pet.id}`}
          className="font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
        >
          {pet.name}
        </Link>
      </td>

      {/* Species badge */}
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${speciesCls(pet.species)}`}>
          {pet.species || '—'}
        </span>
      </td>

      {/* Breed */}
      <td className="px-5 py-3.5 text-gray-600 text-sm">{pet.breed || '—'}</td>

      {/* Age */}
      <td className="px-5 py-3.5 text-gray-600 text-sm">{formatAge(pet.age)}</td>

      {/* Owner */}
      <td className="px-5 py-3.5 text-gray-600 text-sm">{pet.ownerFullName || '—'}</td>

      {/* Actions */}
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/pets/${pet.id}`}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Peržiūrėti
          </Link>
          <button
            onClick={() => onEdit(pet)}
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
// Main component
// ---------------------------------------------------------------------------

/**
 * PetsTable component.
 *
 * @param {{
 *   pets:    object[],
 *   onEdit:  (pet: object) => void,
 *   onDelete: (id: number) => void,
 *   sortBy?: string,
 *   order?:  string,
 *   onSort?: (field: string) => void
 * }} props
 */
export default function PetsTable({ pets, onEdit, onDelete, sortBy = '', order = 'asc', onSort = () => {} }) {
  if (pets.length === 0) {
    return (
      <div className="py-14 text-center text-gray-400 text-sm">
        Gyvūnų nerasta
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <SortableHeader label="Vardas" field="name" sortBy={sortBy} order={order} onSort={onSort} />
            {['Rūšis', 'Veislė', 'Amžius', 'Savininkas'].map((col) => (
              <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {col}
              </th>
            ))}
            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Veiksmai
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {pets.map((pet) => (
            <PetRow key={pet.id} pet={pet} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
