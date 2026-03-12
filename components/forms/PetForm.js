/**
 * @fileoverview PetForm — modal form for creating or editing a pet.
 *
 * Fetches the owner list from GET /api/owners on mount for the owner dropdown.
 * Works in two modes:
 *   - Create: pet prop is null
 *   - Edit:   pet prop is a PetDTO
 *
 * Validates: name (required), ownerId (required).
 * onSave must throw on API failure so the error is shown inside the modal.
 */

'use client';

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPECIES_OPTIONS = ['Šuo', 'Katė', 'Triušis', 'Žiurkėnas', 'Papūga', 'Kita'];

const GENDER_OPTIONS = [
  { value: 'male',   label: 'Patinas' },
  { value: 'female', label: 'Patelė'  },
];

const EMPTY = { name: '', species: '', breed: '', birthDate: '', gender: '', ownerId: '' };

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
 * PetForm modal component.
 *
 * @param {{
 *   pet: object|null,
 *   onSave: (data: object) => Promise<void>,
 *   onClose: () => void
 * }} props
 */
export default function PetForm({ pet, onSave, onClose }) {
  const isEdit = !!pet;

  const [form, setForm]         = useState(EMPTY);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [apiError, setApiError] = useState('');
  const [owners, setOwners]     = useState([]);
  const [ownersLoading, setOwnersLoading] = useState(true);

  // Fetch owner list for dropdown
  useEffect(() => {
    fetch('/api/owners?limit=100&sortBy=name&order=asc')
      .then((r) => r.json())
      .then((d) => { if (d.success) setOwners(d.data); })
      .catch(() => {})
      .finally(() => setOwnersLoading(false));
  }, []);

  // Pre-fill fields in edit mode
  useEffect(() => {
    setForm(
      pet
        ? {
            name:      pet.name      ?? '',
            species:   pet.species   ?? '',
            breed:     pet.breed     ?? '',
            birthDate: pet.birthDate ?? '',
            gender:    pet.gender    ?? '',
            ownerId:   String(pet.ownerId ?? ''),
          }
        : EMPTY
    );
    setErrors({});
    setApiError('');
  }, [pet]);

  /** Returns an updater function for a single form field. */
  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name    = 'Vardas privalomas';
    if (!form.ownerId)     errs.ownerId = 'Savininkas privalomas';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      await onSave({ ...form, ownerId: Number(form.ownerId) });
      onClose();
    } catch (err) {
      setApiError(err.message ?? 'Įvyko klaida. Bandykite dar kartą.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">
            {isEdit ? 'Redaguoti gyvūną' : 'Pridėti gyvūną'}
          </h2>
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

          {/* Name */}
          <Field label="Vardas *" error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="Gyvūno vardas"
              className={inputCls(errors.name)}
            />
          </Field>

          {/* Species + Gender */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rūšis" error={errors.species}>
              <select value={form.species} onChange={set('species')} className={inputCls(errors.species)}>
                <option value="">Pasirinkti…</option>
                {SPECIES_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Lytis" error={errors.gender}>
              <select value={form.gender} onChange={set('gender')} className={inputCls(errors.gender)}>
                <option value="">Pasirinkti…</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Breed */}
          <Field label="Veislė" error={errors.breed}>
            <input
              type="text"
              value={form.breed}
              onChange={set('breed')}
              placeholder="Pvz. Labradoras, Siamų"
              className={inputCls(errors.breed)}
            />
          </Field>

          {/* Birth date */}
          <Field label="Gimimo data" error={errors.birthDate}>
            <input
              type="date"
              value={form.birthDate}
              onChange={set('birthDate')}
              max={(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })()}
              className={inputCls(errors.birthDate)}
            />
          </Field>

          {/* Owner dropdown */}
          <Field label="Savininkas *" error={errors.ownerId}>
            <select
              value={form.ownerId}
              onChange={set('ownerId')}
              disabled={ownersLoading}
              className={inputCls(errors.ownerId)}
            >
              <option value="">
                {ownersLoading ? 'Kraunama…' : 'Pasirinkti savininką…'}
              </option>
              {owners.map((o) => (
                <option key={o.id} value={String(o.id)}>{o.fullName}</option>
              ))}
            </select>
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
