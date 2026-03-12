/**
 * @fileoverview PetsTable — renders a list of pet records in a table.
 *
 * Columns: Vardas, Rūšis, Veislė, Amžius, Savininkas, Veiksmai.
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
 *   pets: object[],
 *   onEdit: (pet: object) => void,
 *   onDelete: (id: number) => void
 * }} props
 */
export default function PetsTable({ pets, onEdit, onDelete }) {
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
            {['Vardas', 'Rūšis', 'Veislė', 'Amžius', 'Savininkas', 'Veiksmai'].map((col, i) => (
              <th
                key={col}
                className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide
                  ${i === 5 ? 'text-right' : 'text-left'}`}
              >
                {col}
              </th>
            ))}
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
