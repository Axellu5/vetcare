/**
 * @fileoverview VetForm — modal form for creating or editing a vet.
 *
 * Works in two modes:
 *   - Create: vet prop is null
 *   - Edit:   vet prop is a VetDTO
 *
 * Validates: firstName, lastName, email (required).
 * onSave must throw on API failure so the error is shown inside the modal.
 */

'use client';

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY = { firstName: '', lastName: '', specialty: '', phone: '', email: '' };

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
 * VetForm modal component.
 *
 * @param {{
 *   vet: object|null,
 *   onSave: (data: object) => Promise<void>,
 *   onClose: () => void
 * }} props
 */
export default function VetForm({ vet, onSave, onClose }) {
  const isEdit = !!vet;

  const [form, setForm]         = useState(EMPTY);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [apiError, setApiError] = useState('');

  // Pre-fill form fields when editing
  useEffect(() => {
    if (vet) {
      setForm({
        firstName: vet.firstName ?? '',
        lastName:  vet.lastName  ?? '',
        specialty: vet.specialty ?? '',
        phone:     vet.phone     ?? '',
        email:     vet.email     ?? '',
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
    setApiError('');
  }, [vet]);

  /** Returns an updater function for a single form field. */
  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  /**
   * Client-side validation.
   *
   * @returns {Record<string, string>}
   */
  function validate() {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'Vardas privalomas';
    if (!form.lastName.trim())  errs.lastName  = 'Pavardė privaloma';
    if (!form.email.trim())     errs.email     = 'El. paštas privalomas';
    else if (!form.email.includes('@')) errs.email = 'Neteisingas el. pašto formatas';
    return errs;
  }

  /**
   * Handles form submission.
   *
   * @param {React.FormEvent} e
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');

    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      await onSave(form);
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-base">
            {isEdit ? 'Redaguoti veterinarą' : 'Pridėti veterinarą'}
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

        {/* Body */}
        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">

          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vardas *" error={errors.firstName}>
              <input
                type="text"
                value={form.firstName}
                onChange={set('firstName')}
                placeholder="Vardas"
                className={inputCls(errors.firstName)}
              />
            </Field>
            <Field label="Pavardė *" error={errors.lastName}>
              <input
                type="text"
                value={form.lastName}
                onChange={set('lastName')}
                placeholder="Pavardė"
                className={inputCls(errors.lastName)}
              />
            </Field>
          </div>

          <Field label="Specializacija" error={errors.specialty}>
            <input
              type="text"
              value={form.specialty}
              onChange={set('specialty')}
              placeholder="Pvz. Chirurgija, Dermatologija"
              className={inputCls(errors.specialty)}
            />
          </Field>

          <Field label="El. paštas *" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="vardas@klinika.lt"
              className={inputCls(errors.email)}
            />
          </Field>

          <Field label="Telefonas" error={errors.phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              placeholder="+370 600 00000"
              className={inputCls(errors.phone)}
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
