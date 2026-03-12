/**
 * @fileoverview OwnersTable — renders a list of owner records in a table.
 *
 * Displays columns: Vardas ir pavardė, El. paštas, Telefonas, Gyvūnai, Veiksmai.
 * "Vardas ir pavardė" is a sortable column — clicking it triggers onSort("name").
 * Sort direction is indicated by an up/down arrow next to the active column label.
 * Each row has Edit and Delete action buttons.
 * Delete asks for browser confirmation before calling the onDelete callback.
 */

'use client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the correct Lithuanian suffix for "gyvūnas" based on count.
 *
 * @param {number} n
 * @returns {string}
 */
function petSuffix(n) {
  if (n % 100 >= 11 && n % 100 <= 19) return 'ų'; // 11–19: gyvūnų
  const last = n % 10;
  if (last === 1) return 'as';   // 1, 21, 31 …
  if (last >= 2 && last <= 9) return 'ai'; // 2–9, 22–29 …
  return 'ų';                    // 0, 10, 20 …
}

// ---------------------------------------------------------------------------
// SortableHeader
// ---------------------------------------------------------------------------

/**
 * A table header cell that can be clicked to sort by the given field.
 * Shows ↑ when active + asc, ↓ when active + desc, and a neutral icon otherwise.
 *
 * @param {{
 *   label:   string,
 *   field:   string,
 *   sortBy:  string,
 *   order:   string,
 *   onSort:  (field: string) => void,
 *   className?: string
 * }} props
 */
function SortableHeader({ label, field, sortBy, order, onSort, className = '' }) {
  const active = sortBy === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide
        cursor-pointer select-none hover:text-gray-700 hover:bg-gray-100 transition-colors ${className}`}
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
 * Single owner row.
 *
 * @param {{ owner: object, onEdit: Function, onDelete: Function }} props
 */
function OwnerRow({ owner, onEdit, onDelete }) {
  function handleDelete() {
    if (window.confirm(`Ar tikrai norite ištrinti „${owner.fullName}"?\nŠis veiksmas negrįžtamas.`)) {
      onDelete(owner.id);
    }
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">

      {/* Name + avatar */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-emerald-700">
              {owner.fullName?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          </div>
          <span className="font-medium text-gray-800">{owner.fullName}</span>
        </div>
      </td>

      {/* Email */}
      <td className="px-5 py-3.5 text-gray-600 text-sm">{owner.email || '—'}</td>

      {/* Phone */}
      <td className="px-5 py-3.5 text-gray-600 text-sm">{owner.phone || '—'}</td>

      {/* Pet count badge */}
      <td className="px-5 py-3.5">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
          {owner.petCount} gyvūn{petSuffix(owner.petCount)}
        </span>
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEdit(owner)}
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
 * OwnersTable component.
 *
 * @param {{
 *   owners:  object[],
 *   onEdit:  (owner: object) => void,
 *   onDelete: (id: number) => void,
 *   sortBy?: string,
 *   order?:  string,
 *   onSort?: (field: string) => void
 * }} props
 */
export default function OwnersTable({ owners, onEdit, onDelete, sortBy = '', order = 'asc', onSort = () => {} }) {
  if (owners.length === 0) {
    return (
      <div className="py-14 text-center text-gray-400 text-sm">
        Savininkų nerasta
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <SortableHeader label="Vardas ir pavardė" field="name" sortBy={sortBy} order={order} onSort={onSort} />
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              El. paštas
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Telefonas
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Gyvūnai
            </th>
            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Veiksmai
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {owners.map((owner) => (
            <OwnerRow
              key={owner.id}
              owner={owner}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
