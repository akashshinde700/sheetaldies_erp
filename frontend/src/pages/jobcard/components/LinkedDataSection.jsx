import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { formatDate } from '../../../utils/formatters';
import { useAuth } from '../../../context/AuthContext';

function ItemEditRow({ item, onSaved }) {
  const [desc,     setDesc]     = useState(item.description || '');
  const [qty,      setQty]      = useState(item.quantity != null ? String(item.quantity) : '');
  const [weight,   setWeight]   = useState(item.weight    != null ? String(item.weight)  : '');
  const [material, setMaterial] = useState(item.material  || '');
  const [saving,   setSaving]   = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/jobwork/items/${item.id}`, { description: desc, quantity: qty, weight, material });
      toast.success('Item updated');
      onSaved?.();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const inp = 'border border-slate-200 rounded px-1.5 py-1 text-xs font-mono bg-white focus:border-indigo-400 outline-none';

  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
      <input value={desc}     onChange={e => setDesc(e.target.value)}     className={inp} placeholder="Description" />
      <input value={qty}      onChange={e => setQty(e.target.value)}      className={`${inp} text-right`} placeholder="Qty" type="number" step="0.001" />
      <input value={weight}   onChange={e => setWeight(e.target.value)}   className={`${inp} text-right`} placeholder="Wt (kg)" type="number" step="0.001" />
      <input value={material} onChange={e => setMaterial(e.target.value)} className={inp} placeholder="Material" />
      <button onClick={save} disabled={saving} className="text-indigo-600 hover:text-indigo-800 font-bold text-xs px-2 py-1 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 whitespace-nowrap">
        {saving ? '…' : 'Save'}
      </button>
    </div>
  );
}

export default function LinkedDataSection({ isEdit, cardData, id }) {
  if (!isEdit || !cardData) return null;

  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const [creatingRS, setCreatingRS] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { isManager } = useAuth();

  const handleDelete = async () => {
    if (!window.confirm('Delete this job card permanently?')) return;
    setDeleting(true);
    try {
      await api.delete(`/jobcards/${id}`);
      toast.success('Job card deleted');
      navigate('/jobcards');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally { setDeleting(false); }
  };

  const hasCert     = cardData.testCertificates?.length > 0;
  const hasRunsheet = cardData.runsheets?.length > 0;

  const handleCreateRunSheet = async () => {
    setCreatingRS(true);
    try {
      const r  = await api.post('/jobwork/runsheet-from-jobcard', { jobCardId: Number(id) });
      const rs = r.data.data?.runsheet;
      toast.success(`VHT Run Sheet ${rs?.runsheetNumber} created!`);
      queryClient.invalidateQueries({ queryKey: ['pending-items'] });
      navigate(`/manufacturing/runsheet/${rs?.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating run sheet');
    } finally { setCreatingRS(false); }
  };

  return (
    <div className="space-y-4 mt-5">

      {/* ── Delete button (manager/admin) ── */}
      {isManager && (
        <div className="flex justify-end">
          <button onClick={handleDelete} disabled={deleting}
            className="text-xs text-rose-600 border border-rose-200 rounded-lg px-3 py-1.5 hover:bg-rose-50 font-semibold">
            {deleting ? 'Deleting…' : 'Delete Job Card'}
          </button>
        </div>
      )}

      {/* ── Challan Items with editable weight ── */}
      {(() => {
        const linkedItems = cardData.challanItemLinks || [];
        const allItems = linkedItems.length > 0
          ? linkedItems
          : (cardData.challans?.flatMap(ch => ch.items || []) || []);
        if (!allItems.length) return null;
        return (
          <div className="card p-5">
            <h3 className="section-title mb-3">Items (from Inward) — {allItems.length} item{allItems.length !== 1 ? 's' : ''}</h3>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-3 mb-1 text-[10px] font-semibold uppercase text-slate-400">
              <span>Description</span><span className="text-right">Qty</span><span className="text-right">Weight (kg)</span><span>Material</span><span></span>
            </div>
            <div className="space-y-1.5">
              {allItems.map(item => (
                <ItemEditRow key={item.id} item={item} onSaved={() => queryClient.invalidateQueries({ queryKey: ['jobcard', id] })} />
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Next-step action bar ─────────────────────────── */}
      <div className="card p-4 bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-indigo-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Next Step — Automation</p>
        <div className="flex flex-wrap gap-2">

          {/* Run Sheet */}
          {!hasRunsheet ? (
            <button
              onClick={handleCreateRunSheet}
              disabled={creatingRS}
              className="btn-outline border-sky-300 text-sky-700 hover:bg-sky-50 text-xs px-3 py-2 h-auto"
            >
              {creatingRS
                ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Creating...</>
                : <><span className="material-symbols-outlined text-sm">thermostat</span> Create VHT Run Sheet</>
              }
            </button>
          ) : (
            <Link
              to={`/manufacturing/runsheet/${cardData.runsheets[0].id}`}
              className="btn-outline border-sky-200 text-sky-700 hover:bg-sky-50 text-xs px-3 py-2 h-auto"
            >
              <span className="material-symbols-outlined text-sm">thermostat</span>
              View Run Sheet
            </Link>
          )}

          {/* Certificate */}
          {!hasCert ? (
            <Link
              to={`/quality/certificates/new?jobCardId=${id}`}
              className="btn-outline border-violet-300 text-violet-700 hover:bg-violet-50 text-xs px-3 py-2 h-auto"
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              Create Certificate
            </Link>
          ) : (
            <Link
              to={`/quality/certificates/${cardData.testCertificates[0].id}`}
              className="btn-outline border-violet-200 text-violet-700 hover:bg-violet-50 text-xs px-3 py-2 h-auto"
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              View Certificate
            </Link>
          )}

          {/* Invoice — only show if cert exists */}
          {hasCert && (
            <Link
              to={`/invoices/new?jobCardId=${id}`}
              className="btn-outline border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs px-3 py-2 h-auto"
            >
              <span className="material-symbols-outlined text-sm">receipt_long</span>
              Create Invoice
            </Link>
          )}

          {/* Inspection */}
          <Link
            to={`/jobcards/${id}/inspection`}
            className="btn-outline border-amber-200 text-amber-700 hover:bg-amber-50 text-xs px-3 py-2 h-auto"
          >
            <span className="material-symbols-outlined text-sm">fact_check</span>
            {cardData.inspection ? 'Edit Inspection' : 'Start Inspection'}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Inspection card */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-violet-500 text-[15px]">fact_check</span>
            </div>
            <h3 className="section-title">Inspection</h3>
          </div>
          {cardData.inspection ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Status</span>
                <span className={`badge ${
                  cardData.inspection.inspectionStatus === 'PASS'        ? 'bg-emerald-100 text-emerald-700' :
                  cardData.inspection.inspectionStatus === 'FAIL'        ? 'bg-rose-100 text-rose-700' :
                  cardData.inspection.inspectionStatus === 'CONDITIONAL' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-600'
                }`}>{cardData.inspection.inspectionStatus}</span>
              </div>
              {cardData.inspection.achievedHardness && (
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">Achieved</span>
                  <span className="text-xs font-bold text-slate-700">
                    {cardData.inspection.achievedHardness} {cardData.inspection.hardnessUnit}
                  </span>
                </div>
              )}
              <Link
                to={`/jobcards/${id}/inspection`}
                className="block text-center text-xs text-indigo-600 font-semibold hover:underline mt-2 border border-indigo-100 rounded-xl py-1.5 bg-indigo-50/50 hover:bg-indigo-100/50 transition-colors"
              >
                Edit Inspection →
              </Link>
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-xs text-slate-400 mb-3">No inspection done yet.</p>
              <Link to={`/jobcards/${id}/inspection`} className="btn-primary text-xs px-4 py-2">
                <span className="material-symbols-outlined text-sm">add</span> Start Inspection
              </Link>
            </div>
          )}
        </div>

        {/* Challans card */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-500 text-[15px]">engineering</span>
              </div>
              <h3 className="section-title">Challans</h3>
            </div>
            <Link to="/jobwork/inward-entry" className="text-[10px] text-indigo-600 font-bold hover:underline">+ New</Link>
          </div>
          {cardData.challans?.length ? (
            <div className="space-y-2">
              {cardData.challans.map((ch) => (
                <div key={ch.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <Link to={`/jobwork/${ch.id}`} className="text-xs font-mono text-indigo-600 hover:underline">{ch.challanNo}</Link>
                  <span className="text-[10px] text-slate-400">{formatDate(ch.challanDate)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-3">No jobwork challans linked.</p>
          )}
        </div>

        {/* Test Certificates card */}
        {hasCert && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-500 text-[15px]">verified</span>
              </div>
              <h3 className="section-title">Test Certificates</h3>
            </div>
            <div className="space-y-2">
              {cardData.testCertificates.map((cert) => (
                <div key={cert.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <Link to={`/quality/certificates/${cert.id}`} className="text-xs font-mono text-indigo-600 hover:underline">
                    {cert.certNo}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-[10px] ${cert.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {cert.status}
                    </span>
                    <Link to={`/quality/certificates/${cert.id}/print`} className="text-[10px] text-slate-400 hover:text-indigo-600">
                      <span className="material-symbols-outlined text-sm">print</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Run Sheets card */}
        {hasRunsheet && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-sky-500 text-[15px]">thermostat</span>
              </div>
              <h3 className="section-title">VHT Run Sheets</h3>
            </div>
            <div className="space-y-2">
              {cardData.runsheets.map((rs) => (
                <div key={rs.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <Link to={`/manufacturing/runsheet/${rs.id}`} className="text-xs font-mono text-indigo-600 hover:underline">
                    {rs.runsheetNumber}
                  </Link>
                  <span className="text-[10px] text-slate-400">{formatDate(rs.runDate)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
