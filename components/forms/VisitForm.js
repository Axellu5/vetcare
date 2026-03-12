/**
 * @fileoverview VisitForm — modal form for creating a visit with appointment scheduling.
 *
 * Two-part form:
 *   PART 1 — Appointment scheduling: select vet → select date → pick time slot
 *   PART 2 — Visit details: select pet, diagnosis, notes, services, total cost
 *
 * On submit: creates both an Appointment and a Visit record via two API calls.
 * The time slot grid fetches availability from GET /api/appointments/availability.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import TimeSlotGrid from '@/components/ui/TimeSlotGrid';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All 9 daily time slots (09:00–17:00, 1-hour intervals). */
const ALL_SLOTS = [
  '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00',
];

const EMPTY = {
  vetId: '',
  date: '',
  timeSlot: '',
  petId: '',
  diagnosis: '',
  notes: '',
  serviceIds: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns Tailwind classes for standard form inputs.
 *
 * @param {string|undefined} error
 * @returns {string}
 */
function inputCls(error) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
    focus:ring-emerald-500 focus:border-transparent transition-colors
    ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'}`;
}

/**
 * Labelled form field wrapper.
 *
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
 * VisitForm modal component.
 *
 * @param {{
 *   onSave: () => void,
 *   onClose: () => void
 * }} props
 */
export default function VisitForm({ onSave, onClose }) {
  const [form, setForm]         = useState(EMPTY);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [apiError, setApiError] = useState('');

  // Reference data
  const [vets, setVets]               = useState([]);
  const [pets, setPets]               = useState([]);
  const [services, setServices]       = useState([]);
  const [refLoading, setRefLoading]   = useState(true);

  // Availability
  const [slots, setSlots]             = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Pet search filter
  const [petSearch, setPetSearch] = useState('');

  // ── Load reference data (vets, pets, services) ────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch('/api/vets?limit=100&sortBy=name&order=asc').then((r) => r.json()),
      fetch('/api/pets?limit=100&sortBy=name&order=asc').then((r) => r.json()),
      fetch('/api/services?limit=100&sortBy=name&order=asc').then((r) => r.json()),
    ])
      .then(([vetsData, petsData, servicesData]) => {
        if (vetsData.success)    setVets(vetsData.data);
        if (petsData.success)    setPets(petsData.data);
        if (servicesData.success) setServices(servicesData.data);
      })
      .catch(() => {})
      .finally(() => setRefLoading(false));
  }, []);

  // ── Fetch availability when vet + date change ─────────────────────────────

  useEffect(() => {
    if (!form.vetId || !form.date) {
      setSlots([]);
      return;
    }

    setSlotsLoading(true);
    fetch(`/api/appointments/availability?vetId=${form.vetId}&date=${form.date}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSlots(data.data.slots);
        else setSlots([]);
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [form.vetId, form.date]);

  // Clear selected slot when vet or date changes
  useEffect(() => {
    setForm((prev) => ({ ...prev, timeSlot: '' }));
  }, [form.vetId, form.date]);

  // ── Filtered pets for searchable dropdown ─────────────────────────────────

  const filteredPets = useMemo(() => {
    if (!petSearch.trim()) return pets;
    const q = petSearch.toLowerCase();
    return pets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.ownerFullName && p.ownerFullName.toLowerCase().includes(q))
    );
  }, [pets, petSearch]);

  // ── Form helpers ──────────────────────────────────────────────────────────

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  function toggleService(id) {
    setForm((prev) => {
      const ids = prev.serviceIds.includes(id)
        ? prev.serviceIds.filter((s) => s !== id)
        : [...prev.serviceIds, id];
      return { ...prev, serviceIds: ids };
    });
  }

  /** Total cost calculated from selected services. */
  const totalCost = useMemo(() => {
    return services
      .filter((s) => form.serviceIds.includes(s.id))
      .reduce((sum, s) => sum + (s.price ?? 0), 0);
  }, [services, form.serviceIds]);

  // ── Validation ────────────────────────────────────────────────────────────

  function validate() {
    const errs = {};
    if (!form.vetId)             errs.vetId     = 'Veterinaras privalomas';
    if (!form.date)              errs.date      = 'Data privaloma';
    if (!form.timeSlot)          errs.timeSlot  = 'Pasirinkite laiką';
    if (!form.petId)             errs.petId     = 'Gyvūnas privalomas';
    if (!form.diagnosis.trim())  errs.diagnosis = 'Diagnozė privaloma';
    return errs;
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      // Find the pet's ownerId for the appointment
      const selectedPet = pets.find((p) => p.id === Number(form.petId));
      const ownerId = selectedPet?.ownerId;
      if (!ownerId) throw new Error('Nepavyko nustatyti savininko');

      // Step 1: Create appointment
      const apptRes = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vetId:    Number(form.vetId),
          petId:    Number(form.petId),
          ownerId,
          date:     form.date,
          timeSlot: form.timeSlot,
          notes:    form.notes || null,
        }),
      });
      const apptData = await apptRes.json();
      if (!apptData.success) throw new Error(apptData.error ?? 'Nepavyko sukurti registracijos');

      // Step 2: Create visit with services
      const visitRes = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId:      Number(form.petId),
          vetId:      Number(form.vetId),
          date:       form.date,
          diagnosis:  form.diagnosis.trim(),
          notes:      form.notes || null,
          serviceIds: form.serviceIds,
        }),
      });
      const visitData = await visitRes.json();
      if (!visitData.success) throw new Error(visitData.error ?? 'Nepavyko sukurti vizito');

      onSave();
      onClose();
    } catch (err) {
      setApiError(err.message ?? 'Įvyko klaida. Bandykite dar kartą.');
    } finally {
      setSaving(false);
    }
  }

  // ── Group services by category ────────────────────────────────────────────

  const servicesByCategory = useMemo(() => {
    const map = {};
    services.forEach((s) => {
      const cat = s.category || 'Kita';
      if (!map[cat]) map[cat] = [];
      map[cat].push(s);
    });
    return map;
  }, [services]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">Naujas vizitas su registracija</h2>
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
        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-6 overflow-y-auto flex-1">

          {/* ============================================================= */}
          {/* PART 1 — Appointment scheduling                                */}
          {/* ============================================================= */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
              1. Registracija
            </h3>
            <div className="space-y-4">

              {/* Vet selection */}
              <Field label="Veterinaras *" error={errors.vetId}>
                <select
                  value={form.vetId}
                  onChange={set('vetId')}
                  disabled={refLoading}
                  className={inputCls(errors.vetId)}
                >
                  <option value="">
                    {refLoading ? 'Kraunama…' : 'Pasirinkti veterinarą…'}
                  </option>
                  {vets.map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {v.fullName ?? `${v.firstName} ${v.lastName}`} — {v.specialty}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Date selection */}
              <Field label="Data *" error={errors.date}>
                <input
                  type="date"
                  value={form.date}
                  onChange={set('date')}
                  min={(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })()}
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
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* ============================================================= */}
          {/* PART 2 — Visit details                                         */}
          {/* ============================================================= */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
              2. Vizito informacija
            </h3>
            <div className="space-y-4">

              {/* Pet selection with search */}
              <Field label="Gyvūnas *" error={errors.petId}>
                <input
                  type="text"
                  value={petSearch}
                  onChange={(e) => setPetSearch(e.target.value)}
                  placeholder="Ieškoti pagal vardą arba savininką…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 bg-white rounded-lg rounded-b-none
                             focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <select
                  value={form.petId}
                  onChange={set('petId')}
                  disabled={refLoading}
                  size={Math.min(6, filteredPets.length + 1)}
                  className={`w-full px-3 py-1 text-sm border border-t-0 rounded-lg rounded-t-none
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                    ${errors.petId ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'}`}
                >
                  <option value="">Pasirinkti gyvūną…</option>
                  {filteredPets.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name} ({p.species}) — {p.ownerFullName ?? 'Be savininko'}
                    </option>
                  ))}
                </select>
              </Field>

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

              {/* Services checkboxes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Paslaugos</label>
                {Object.keys(servicesByCategory).length === 0 && !refLoading && (
                  <p className="text-sm text-gray-400">Paslaugų nėra</p>
                )}
                {refLoading && <p className="text-sm text-gray-400">Kraunama…</p>}
                <div className="space-y-3">
                  {Object.entries(servicesByCategory).map(([category, items]) => (
                    <div key={category}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        {category}
                      </p>
                      <div className="space-y-1">
                        {items.map((s) => (
                          <label
                            key={s.id}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                              form.serviceIds.includes(s.id)
                                ? 'border-emerald-300 bg-emerald-50'
                                : 'border-gray-100 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={form.serviceIds.includes(s.id)}
                              onChange={() => toggleService(s.id)}
                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded
                                         focus:ring-emerald-500 focus:ring-2"
                            />
                            <span className="flex-1 text-sm text-gray-700">{s.name}</span>
                            <span className="text-sm font-medium text-gray-500">
                              {Number(s.price).toFixed(2)} €
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total cost */}
              {form.serviceIds.length > 0 && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                  <span className="text-sm font-medium text-emerald-800">Bendra suma</span>
                  <span className="text-lg font-bold text-emerald-700">{totalCost.toFixed(2)} €</span>
                </div>
              )}
            </div>
          </div>

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
              className="px-5 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg transition-colors font-medium"
            >
              {saving ? 'Kuriama…' : 'Sukurti vizitą'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
