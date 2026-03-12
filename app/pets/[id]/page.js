/**
 * @fileoverview Pet detail page — shows pet info, visit history, upcoming appointments.
 *
 * Fetches three endpoints in parallel:
 *   GET /api/pets/:id               → pet info card
 *   GET /api/visits?petId=:id       → last 10 visits (visit history table)
 *   GET /api/appointments?petId=:id → upcoming scheduled appointments
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PetForm from '@/components/forms/PetForm';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS = { scheduled: 'Suplanuota', completed: 'Baigta', cancelled: 'Atšaukta' };
const STATUS_COLORS = {
  scheduled: 'bg-emerald-100 text-emerald-700',
  completed:  'bg-sky-100 text-sky-700',
  cancelled:  'bg-red-100 text-red-700',
};

const GENDER_LABELS = { male: 'Patinas', female: 'Patelė' };

/**
 * Returns age string in Lithuanian.
 *
 * @param {number|null} age
 * @returns {string}
 */
function formatAge(age) {
  if (age === null || age === undefined) return '—';
  if (age === 0) return '< 1 metų';
  if (age === 1) return '1 metai';
  if (age >= 2 && age <= 9) return `${age} metai`;
  return `${age} metų`;
}

// ---------------------------------------------------------------------------
// Info row helper
// ---------------------------------------------------------------------------

/**
 * Labelled info row inside the pet card.
 *
 * @param {{ label: string, value: React.ReactNode }} props
 */
function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 w-36 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value ?? '—'}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section card helper
// ---------------------------------------------------------------------------

/**
 * @param {{ title: string, children: React.ReactNode }} props
 */
function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

/**
 * PetDetailPage — shows full pet profile with visit history and upcoming appointments.
 */
export default function PetDetailPage() {
  const { id }    = useParams();
  const router    = useRouter();

  const [pet, setPet]               = useState(null);
  const [visits, setVisits]         = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [editOpen, setEditOpen]     = useState(false);

  // ── Fetch all data ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const [petRes, visitsRes, apptRes] = await Promise.all([
          fetch(`/api/pets/${id}`),
          fetch(`/api/visits?petId=${id}&limit=10&sortBy=date&order=desc`),
          fetch(`/api/appointments?petId=${id}&from=${today}&status=scheduled&limit=5&sortBy=date&order=asc`),
        ]);
        const [petData, visitsData, apptData] = await Promise.all([
          petRes.json(), visitsRes.json(), apptRes.json(),
        ]);
        if (!petData.success) throw new Error('Gyvūnas nerastas');
        setPet(petData.data);
        setVisits(visitsData.data   ?? []);
        setAppointments(apptData.data ?? []);
      } catch (err) {
        setError(err.message ?? 'Nepavyko įkelti duomenų.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // ── Edit / Delete ──────────────────────────────────────────────────────────

  async function handleSave(formData) {
    const res  = await fetch(`/api/pets/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error ?? 'Nepavyko atnaujinti');
    setPet(data.data);
  }

  async function handleDelete() {
    if (!window.confirm(`Ar tikrai norite ištrinti „${pet?.name}"?\nŠis veiksmas negrįžtamas.`)) return;
    const res  = await fetch(`/api/pets/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) router.push('/pets');
    else alert(data.error ?? 'Nepavyko ištrinti gyvūno.');
  }

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Kraunama…</div>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/pets" className="text-sm text-emerald-600 hover:text-emerald-800">
          ← Grįžti į gyvūnų sąrašą
        </Link>
        <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ------------------------------------------------------------------ */}
      {/* Back link + heading                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/pets" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Gyvūnai
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">{pet.name}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="px-4 py-2 text-sm font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
          >
            Redaguoti
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-100 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            Ištrinti
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pet info card                                                       */}
      {/* ------------------------------------------------------------------ */}
      <Section title="Gyvūno informacija">
        <div className="px-5 py-2">
          <InfoRow label="Vardas"       value={pet.name} />
          <InfoRow label="Rūšis"        value={pet.species} />
          <InfoRow label="Veislė"       value={pet.breed} />
          <InfoRow label="Lytis"        value={GENDER_LABELS[pet.gender] ?? pet.gender} />
          <InfoRow label="Amžius"       value={formatAge(pet.age)} />
          <InfoRow label="Gimimo data"  value={pet.birthDate} />
          <InfoRow label="Savininkas"   value={pet.ownerFullName} />
          <InfoRow label="Registruota"  value={pet.createdAt} />
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* Visit history                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Section title={`Vizitų istorija${visits.length > 0 ? ` (${visits.length})` : ''}`}>
        {visits.length === 0 ? (
          <p className="px-5 py-10 text-center text-gray-400 text-sm">Vizitų dar nebuvo</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Data', 'Veterinaras', 'Diagnozė', 'Paslaugos', 'Suma'].map((col) => (
                    <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visits.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{v.date}</td>
                    <td className="px-5 py-3.5 text-gray-700">{v.vetFullName ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-700 max-w-[200px] truncate" title={v.diagnosis}>
                      {v.diagnosis}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{v.services?.length ?? 0}</td>
                    <td className="px-5 py-3.5 text-gray-700 font-medium">
                      {v.totalCost != null ? `${Number(v.totalCost).toFixed(2)} €` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* Upcoming appointments                                               */}
      {/* ------------------------------------------------------------------ */}
      <Section title={`Artėjančios registracijos${appointments.length > 0 ? ` (${appointments.length})` : ''}`}>
        {appointments.length === 0 ? (
          <p className="px-5 py-10 text-center text-gray-400 text-sm">Artėjančių registracijų nėra</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Data', 'Laikas', 'Veterinaras', 'Būsena'].map((col) => (
                    <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{a.date}</td>
                    <td className="px-5 py-3.5 text-gray-600">{a.timeSlot}</td>
                    <td className="px-5 py-3.5 text-gray-700">{a.vetFullName ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium
                        ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[a.status] ?? a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Edit modal */}
      {editOpen && (
        <PetForm
          pet={pet}
          onSave={handleSave}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
