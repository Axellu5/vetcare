/**
 * @fileoverview VisitEditForm — modal form for editing an existing visit.
 *
 * Allows changing: veterinarian, date, time slot, diagnosis, notes.
 * When vet or date changes, fetches available time slots from the API.
 * On mount, fetches the current appointment to show the existing time slot.
 * Shows read-only context: pet name, owner, current services + total cost.
 * onSave must throw on API failure so the error is shown inside the modal.
 */

'use client';

import { useState, useEffect } from 'react';
import TimeSlotGrid from '@/components/ui/TimeSlotGrid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * @param {string|undefined} error
 * @returns {string} Tailwind classes for input element.
 */
function inputCls(error) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
    focus:ring-emerald-500 focus:border-transparent transition-colors
    ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'}`;
}

/**
 * @param {{ label: string, error?: string, children: React.ReactNode }} props
 */
function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * VisitEditForm modal component.
 *
 * @param {{
 *   visit: object,
 *   onSave: (data: object) => Promise<void>,
 *   onClose: () => void
 * }} props
 */
export default function VisitEditForm({ visit, onSave, onClose }) {
  const [form, setForm]         = useState({ date: '', diagnosis: '', notes: '', vetId: '', timeSlot: '' });
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [apiError, setApiError] = useState('');
  const [vets, setVets]         = useState([]);
  const [vetsLoading, setVetsLoading] = useState(true);

  // Time slot state
  const [slots, setSlots]             = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [currentTimeSlot, setCurrentTimeSlot] = useState('');

  // Load vets for dropdown
  useEffect(() => {
    fetch('/api/vets?limit=100&sortBy=name&order=asc')
      .then((r) => r.json())
      .then((d) => { if (d.success) setVets(d.data); })
      .catch(() => {})
      .finally(() => setVetsLoading(false));
  }, []);

  // Fetch current appointment's time slot on mount
  useEffect(() => {
    if (!visit) return;
    fetch(`/api/appointments?petId=${visit.petId}&vetId=${visit.vetId}&from=${visit.date}&to=${visit.date}&limit=1`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.length > 0) {
          const slot = d.data[0].timeSlot;
          setCurrentTimeSlot(slot);
          setForm((prev) => ({ ...prev, timeSlot: slot }));
        }
      })
      .catch(() => {});
  }, [visit]);

  // Pre-fill fields from visit data
  useEffect(() => {
    if (visit) {
      setForm((prev) => ({
        date:      visit.date      ?? '',
        diagnosis: visit.diagnosis ?? '',
        notes:     visit.notes     ?? '',
        vetId:     String(visit.vetId ?? ''),
        timeSlot:  prev.timeSlot || '',
      }));
    }
    setErrors({});
    setApiError('');
  }, [visit]);

  // Fetch availability when vet or date changes
  useEffect(() => {
    if (!form.vetId || !form.date) {
      setSlots([]);
      return;
    }

    setSlotsLoading(true);
    fetch(`/api/appointments/availability?vetId=${form.vetId}&date=${form.date}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          let availSlots = data.data.slots;

          // Mark the current time slot as available (it belongs to this visit's appointment)
          const isOriginalDateTime =
            form.date === visit?.date && form.vetId === String(visit?.vetId);

          if (isOriginalDateTime && currentTimeSlot) {
            availSlots = availSlots.map((s) =>
              s.time === currentTimeSlot ? { ...s, available: true } : s
            );
          }

          setSlots(availSlots);
        } else {
          setSlots([]);
        }
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [form.vetId, form.date, currentTimeSlot, visit]);

  // Clear selected time slot when vet or date changes (unless it's the original combination)
  useEffect(() => {
    const isOriginal = form.date === visit?.date && form.vetId === String(visit?.vetId);
    if (!isOriginal) {
      setForm((prev) => ({ ...prev, timeSlot: '' }));
    }
  }, [form.vetId, form.date, visit]);

  /** Returns an updater function for a single form field. */
  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  function validate() {
    const errs = {};
    if (!form.date)              errs.date      = 'Data privaloma';
    if (!form.timeSlot)          errs.timeSlot  = 'Pasirinkite laiką';
    if (!form.diagnosis.trim())  errs.diagnosis = 'Diagnozė privaloma';
    if (!form.vetId)             errs.vetId     = 'Veterinaras privalomas';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      await onSave({
        date:      form.date,
        diagnosis: form.diagnosis.trim(),
        notes:     form.notes || null,
        vetId:     Number(form.vetId),
        timeSlot:  form.timeSlot,
      });
      onClose();
    } catch (err) {
      setApiError(err.message ?? 'Įvyko klaida. Bandykite dar kartą.');
    } finally {
      setSaving(false);
    }
  }

  const services = visit?.services ?? [];
  const totalCost = visit?.totalCost ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">Redaguoti vizitą</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Uždaryti"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

          {/* Read-only context */}
          <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Gyvūnas</span>
              <span className="text-sm font-medium text-gray-800">{visit?.petName ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Savininkas</span>
              <span className="text-sm font-medium text-gray-800">{visit?.ownerFullName ?? '—'}</span>
            </div>
            {services.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Paslaugos / Suma</span>
                <span className="text-sm font-medium text-emerald-700">
                  {services.length} paslaug. — {Number(totalCost).toFixed(2)} €
                </span>
              </div>
            )}
          </div>

          {/* Vet */}
          <Field label="Veterinaras *" error={errors.vetId}>
            <select
              value={form.vetId}
              onChange={set('vetId')}
              disabled={vetsLoading}
              className={inputCls(errors.vetId)}
            >
              <option value="">
                {vetsLoading ? 'Kraunama…' : 'Pasirinkti veterinarą…'}
              </option>
              {vets.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.name ?? `${v.firstName} ${v.lastName}`} — {v.specialty}
                </option>
              ))}
            </select>
          </Field>

          {/* Date */}
          <Field label="Data *" error={errors.date}>
            <input
              type="date"
              value={form.date}
              onChange={set('date')}
              className={inputCls(errors.date)}
            />
          </Field>

          {/* Time slot grid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Laikas *
            </label>
            <TimeSlotGrid
              slots={slots}
              selected={form.timeSlot}
              onSelect={(time) => {
                setForm((prev) => ({ ...prev, timeSlot: time }));
                setErrors((prev) => ({ ...prev, timeSlot: '' }));
              }}
              loading={slotsLoading}
            />
            {errors.timeSlot && (
              <p className="text-xs text-red-500 mt-1.5">{errors.timeSlot}</p>
            )}
          </div>

          {/* Diagnosis */}
          <Field label="Diagnozė *" error={errors.diagnosis}>
            <textarea
              value={form.diagnosis}
              onChange={set('diagnosis')}
              placeholder="Įveskite diagnozę…"
              rows={3}
              className={inputCls(errors.diagnosis)}
            />
          </Field>

          {/* Notes */}
          <Field label="Pastabos">
            <textarea
              value={form.notes}
              onChange={set('notes')}
              placeholder="Papildomos pastabos (neprivaloma)…"
              rows={2}
              className={inputCls()}
            />
          </Field>

          {/* API error */}
          {apiError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
              {apiError}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Atšaukti
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg transition-colors font-medium"
            >
              {saving ? 'Išsaugoma…' : 'Išsaugoti'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
