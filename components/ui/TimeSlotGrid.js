/**
 * @fileoverview TimeSlotGrid — reusable 3×3 time-slot picker.
 *
 * Displays 9 daily time slots (09:00–17:00) as buttons.
 * Green = available, red = booked, dark green = selected (with checkmark).
 * Used by both VisitForm (create) and VisitEditForm (edit).
 */

'use client';

/**
 * @param {{
 *   slots: Array<{ time: string, available: boolean }>,
 *   selected: string,
 *   onSelect: (time: string) => void,
 *   loading: boolean
 * }} props
 */
export default function TimeSlotGrid({ slots, selected, onSelect, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-400">
        Tikrinami laisvi laikai…
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-400">
        Pasirinkite veterinarą ir datą
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {slots.map(({ time, available }) => {
        const isSelected = selected === time;
        let cls;

        if (isSelected) {
          cls = 'bg-emerald-700 text-white border-emerald-700 shadow-sm';
        } else if (available) {
          cls = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 cursor-pointer';
        } else {
          cls = 'bg-red-50 text-red-400 border-red-200 cursor-not-allowed opacity-70';
        }

        return (
          <button
            key={time}
            type="button"
            disabled={!available && !isSelected}
            onClick={() => (available || isSelected) && onSelect(time)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium border rounded-lg transition-all ${cls}`}
          >
            {isSelected && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {time}
          </button>
        );
      })}
    </div>
  );
}
