/**
 * @fileoverview Visit detail page — shows visit info, services list, cost breakdown.
 *
 * Fetches GET /api/visits/:id to display full visit details including
 * pet info, vet info, diagnosis, notes, and associated services with prices.
 * Supports editing (date, diagnosis, notes, vet) via VisitEditForm modal
 * and deletion with confirmation.
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import VisitEditForm from '@/components/forms/VisitEditForm';

// ---------------------------------------------------------------------------
// Section helper
// ---------------------------------------------------------------------------

/**
 * Card wrapper with heading.
 *
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

/**
 * Labelled info row.
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
// Page component
// ---------------------------------------------------------------------------

/**
 * VisitDetailPage — shows full visit profile with services and cost breakdown.
 * Supports edit and delete actions.
 */
export default function VisitDetailPage() {
  const { id }  = useParams();
  const router   = useRouter();

  const [visit, setVisit]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [editOpen, setEditOpen] = useState(false);

  // ── Fetch visit data ──────────────────────────────────────────────────────

  useEffect(() => {
    async function loadVisit() {
      try {
        const res  = await fetch(`/api/visits/${id}`);
        const data = await res.json();
        if (!data.success) throw new Error('Vizitas nerastas');
        setVisit(data.data);
      } catch (err) {
        setError(err.message ?? 'Nepavyko įkelti duomenų.');
      } finally {
        setLoading(false);
      }
    }
    loadVisit();
  }, [id]);

  // ── Edit ──────────────────────────────────────────────────────────────────

  async function handleEditSave(formData) {
    const res  = await fetch(`/api/visits/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(formData),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error ?? 'Nepavyko atnaujinti vizito');
    setVisit(data.data);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!window.confirm(`Ar tikrai norite ištrinti vizitą #${id}?\nBus pašalintos ir visos susijusios paslaugos.\nŠis veiksmas negrįžtamas.`)) return;
    try {
      const res  = await fetch(`/api/visits/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        router.push('/visits');
      } else {
        throw new Error(data.error ?? 'Nepavyko ištrinti vizito.');
      }
    } catch (err) {
      alert(err.message);
    }
  }

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Kraunama…</div>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/visits" className="text-sm text-emerald-600 hover:text-emerald-800">
          ← Grįžti į vizitų sąrašą
        </Link>
        <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  const services = visit.services ?? [];
  const totalCost = visit.totalCost ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ------------------------------------------------------------------ */}
      {/* Back link + heading + actions                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/visits" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Vizitai
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">
            Vizitas #{visit.id}
          </h1>
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
      {/* Visit info card                                                     */}
      {/* ------------------------------------------------------------------ */}
      <Section title="Vizito informacija">
        <div className="px-5 py-2">
          <InfoRow label="Data"         value={visit.date} />
          <InfoRow label="Gyvūnas"      value={visit.petName} />
          <InfoRow label="Savininkas"   value={visit.ownerFullName} />
          <InfoRow label="Veterinaras"  value={visit.vetFullName} />
          <InfoRow label="Diagnozė"     value={visit.diagnosis} />
          <InfoRow label="Pastabos"     value={visit.notes || 'Nėra'} />
          <InfoRow label="Sukurta"      value={visit.createdAt} />
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* Services table                                                      */}
      {/* ------------------------------------------------------------------ */}
      <Section title={`Paslaugos${services.length > 0 ? ` (${services.length})` : ''}`}>
        {services.length === 0 ? (
          <p className="px-5 py-10 text-center text-gray-400 text-sm">Paslaugų nepriskirta</p>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Paslauga
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Pastabos
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Kaina
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-800">{s.name ?? '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600">{s.notes || '—'}</td>
                      <td className="px-5 py-3.5 text-right text-gray-700 font-medium whitespace-nowrap">
                        {Number(s.price).toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-emerald-50 border-t border-emerald-100">
              <span className="text-sm font-semibold text-emerald-800">Bendra suma</span>
              <span className="text-lg font-bold text-emerald-700">{Number(totalCost).toFixed(2)} €</span>
            </div>
          </div>
        )}
      </Section>

      {/* Edit modal */}
      {editOpen && (
        <VisitEditForm
          visit={visit}
          onSave={handleEditSave}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
