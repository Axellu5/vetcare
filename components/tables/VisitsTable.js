/**
 * @fileoverview VisitsTable — renders a list of visit records in a table.
 *
 * Displays columns: Data, Gyvūnas, Savininkas, Veterinaras, Diagnozė, Paslaugos, Suma, Veiksmai.
 * "Data" is sortable by "date" and "Suma" is sortable by "price" — clicking these headers
 * triggers onSort with the corresponding field name. Sort direction is shown via ↑/↓ icons.
 * Each row has View, Edit, and Delete action buttons.
 */

'use client';

import Link from 'next/link';

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
 * Single visit row.
 *
 * @param {{ visit: object, onEdit: Function, onDelete: Function }} props
 */
function VisitRow({ visit, onEdit, onDelete }) {
  function handleDelete() {
    if (window.confirm(`Ar tikrai norite ištrinti vizitą #${visit.id}?\nBus pašalintos ir visos susijusios paslaugos.\nŠis veiksmas negrįžtamas.`)) {
      onDelete(visit.id);
    }
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{visit.date}</td>
      <td className="px-5 py-3.5 font-medium text-gray-800">{visit.petName ?? '—'}</td>
      <td className="px-5 py-3.5 text-gray-600">{visit.ownerFullName ?? '—'}</td>
      <td className="px-5 py-3.5 text-gray-600">{visit.vetFullName ?? '—'}</td>
      <td className="px-5 py-3.5 text-gray-600 max-w-[160px] truncate" title={visit.diagnosis}>
        {visit.diagnosis}
      </td>
      <td className="px-5 py-3.5 text-gray-600">{visit.services?.length ?? 0}</td>
      <td className="px-5 py-3.5 text-gray-700 font-medium whitespace-nowrap">
        {visit.totalCost != null ? `${Number(visit.totalCost).toFixed(2)} €` : '—'}
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/visits/${visit.id}`}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-800 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            Peržiūrėti
          </Link>
          <button
            onClick={() => onEdit(visit)}
            className="text-xs font-medium text-sky-600 hover:text-sky-800 px-2.5 py-1.5 rounded-lg hover:bg-sky-50 transition-colors"
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
 * VisitsTable component.
 *
 * @param {{
 *   visits:  object[],
 *   onEdit:  (visit: object) => void,
 *   onDelete: (id: number) => void,
 *   sortBy?: string,
 *   order?:  string,
 *   onSort?: (field: string) => void
 * }} props
 */
export default function VisitsTable({ visits, onEdit, onDelete, sortBy = '', order = 'asc', onSort = () => {} }) {
  if (visits.length === 0) {
    return (
      <div className="py-14 text-center text-gray-400 text-sm">
        Vizitų nerasta
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <SortableHeader label="Data"       field="date"  sortBy={sortBy} order={order} onSort={onSort} />
            {['Gyvūnas', 'Savininkas', 'Veterinaras', 'Diagnozė', 'Paslaugos'].map((col) => (
              <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {col}
              </th>
            ))}
            <SortableHeader label="Suma"       field="price" sortBy={sortBy} order={order} onSort={onSort} />
            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Veiksmai
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {visits.map((visit) => (
            <VisitRow key={visit.id} visit={visit} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
