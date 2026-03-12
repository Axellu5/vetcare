/**
 * @fileoverview VisitsTable — renders a list of visit records in a table.
 *
 * Displays columns: Data, Gyvūnas, Savininkas, Veterinaras, Diagnozė, Paslaugos, Suma, Veiksmai.
 * Each row has View, Edit, and Delete action buttons.
 */

'use client';

import Link from 'next/link';

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
 *   visits: object[],
 *   onEdit: (visit: object) => void,
 *   onDelete: (id: number) => void
 * }} props
 */
export default function VisitsTable({ visits, onEdit, onDelete }) {
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
            {['Data', 'Gyvūnas', 'Savininkas', 'Veterinaras', 'Diagnozė', 'Paslaugos', 'Suma', 'Veiksmai'].map((col, i) => (
              <th
                key={col}
                className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${
                  i === 7 ? 'text-right' : 'text-left'
                }`}
              >
                {col}
              </th>
            ))}
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
