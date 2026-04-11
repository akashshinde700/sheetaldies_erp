import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency } from '../../utils/formatters';

const STATUS_COLOR = {
  DRAFT:      'bg-slate-100 text-slate-600',
  SENT:       'bg-amber-100 text-amber-700',
  RECEIVED:   'bg-blue-100 text-blue-700',
  COMPLETED:  'bg-emerald-100 text-emerald-700',
  CANCELLED:  'bg-rose-100 text-rose-700',
};

export default function JobworkDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [ch,      setCh]      = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const [part2, setPart2] = useState({
    status: '', receivedDate: '', natureOfProcess: '',
    qtyReturned: '', reworkQty: '', scrapQtyKg: '', scrapDetails: '',
  });

  useEffect(() => {
    api.get(`/jobwork/${id}`)
      .then(r => {
        const d = r.data.data;
        setCh(d);
        setPart2({
          status:          d.status          || 'DRAFT',
          receivedDate:    d.receivedDate    ? d.receivedDate.split('T')[0] : '',
          natureOfProcess: d.natureOfProcess || '',
          qtyReturned:     d.qtyReturned     || '',
          reworkQty:       d.reworkQty       || '',
          scrapQtyKg:      d.scrapQtyKg      || '',
          scrapDetails:    d.scrapDetails    || '',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/jobwork/${id}/status`, part2);
      toast.success('Challan updated.');
      const r = await api.get(`/jobwork/${id}`);
      setCh(r.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating.');
    } finally { setSaving(false); }
  };

  const F = ({ label, children }) => (
    <div>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        <span className="text-sm">Loading challan...</span>
      </div>
    </div>
  );
  if (!ch) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm text-slate-400">Challan not found.</p>
    </div>
  );

  return (
    <div className="page-stack w-full space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/jobwork"
          className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-slate-800 font-headline font-mono">{ch.challanNo}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Rule 45(1) CGST Rules, 2017 — Jobwork Challan</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/jobwork/${id}/print`} className="btn-outline bg-white">
            <span className="material-symbols-outlined text-[20px]">print</span>
            Print
          </Link>
          <span className={`badge ${STATUS_COLOR[ch.status] || 'bg-slate-100 text-slate-600'}`}>{ch.status}</span>
        </div>
      </div>

      {/* Part 1: Challan Info */}
      <div className="card p-5">
        <p className="section-title border-b border-slate-100 pb-2 mb-4">Part 1 — Challan Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 text-sm">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Challan Date</span>
            <span className="font-semibold text-slate-800">{formatDate(ch.challanDate)}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">From</span>
            <span className="font-semibold text-slate-800">{ch.fromParty?.name}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">To (Processor)</span>
            <span className="font-semibold text-slate-800">{ch.toParty?.name}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Transport</span>
            <span className="font-semibold text-slate-800">{ch.transportMode || '—'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Vehicle No</span>
            <span className="font-semibold text-slate-800 font-mono">{ch.vehicleNo || '—'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Dispatch Date</span>
            <span className="font-semibold text-slate-800">{formatDate(ch.dispatchDate)}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Delivery Person</span>
            <span className="font-semibold text-slate-800">{ch.deliveryPerson || '—'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Due Date (Return by)</span>
            <span className="font-semibold text-amber-700">{formatDate(ch.dueDate)}</span>
          </div>
          {ch.jobCard && (
            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Linked Job Card</span>
              <Link to={`/jobcards/${ch.jobCard.id}`} className="font-semibold text-indigo-600 hover:underline font-mono">
                {ch.jobCard.part?.partNo || ch.jobCard.jobCardNo}
              </Link>
            </div>
          )}
          {ch.processingNotes && (
            <div className="col-span-3">
              <span className="text-xs text-slate-400 block mb-0.5">Processing Notes</span>
              <span className="font-semibold text-slate-800">{ch.processingNotes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="card p-5">
        <p className="section-title border-b border-slate-100 pb-2 mb-4">Items</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                {['Sr.', 'Description', 'Drawing No', 'Material', 'HRC', 'WO No', 'SAC No', 'Qty', 'UOM', 'Weight (kg)', 'Rate ₹', 'Amount ₹'].map(h => (
                  <th key={h} className="px-2 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {ch.items?.map((it, i) => (
                <tr key={it.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-2 py-2 text-slate-400 text-center font-mono">{i + 1}</td>
                  <td className="px-2 py-2 font-medium text-slate-800">{it.description || it.item?.description || '—'}</td>
                  <td className="px-2 py-2 text-slate-600 font-mono">{it.drawingNo || '—'}</td>
                  <td className="px-2 py-2 text-slate-600">{it.material || '—'}</td>
                  <td className="px-2 py-2 text-slate-600">{it.hrc || '—'}</td>
                  <td className="px-2 py-2 text-slate-600">{it.woNo || '—'}</td>
                  <td className="px-2 py-2 font-mono text-slate-500">{it.hsnCode || '—'}</td>
                  <td className="px-2 py-2 text-slate-600 text-right">{it.quantity}</td>
                   <td className="px-2 py-2 text-slate-500">{it.uom || 'KGS'}</td>
                  <td className="px-2 py-2 text-slate-600 text-right">{it.weight ? Number(it.weight).toFixed(3) : '—'}</td>
                  <td className="px-2 py-2 text-slate-600 text-right">{formatCurrency(it.rate)}</td>
                  <td className="px-2 py-2 font-bold text-slate-800 text-right">{formatCurrency(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
          <div className="w-80 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold text-slate-700">{formatCurrency(ch.subtotal)}</span>
            </div>
            {Number(ch.handlingCharges || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Handling</span>
                <span className="text-slate-700">{formatCurrency(ch.handlingCharges)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-slate-200 pt-1.5">
              <span>Total (before tax)</span>
              <span className="text-slate-800">{formatCurrency(ch.totalValue)}</span>
            </div>
            {Number(ch.cgstAmount || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">CGST @ {ch.cgstRate}%</span>
                <span className="text-slate-700">{formatCurrency(ch.cgstAmount)}</span>
              </div>
            )}
            {Number(ch.sgstAmount || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">SGST @ {ch.sgstRate}%</span>
                <span className="text-slate-700">{formatCurrency(ch.sgstAmount)}</span>
              </div>
            )}
            {Number(ch.igstAmount || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">IGST @ {ch.igstRate}%</span>
                <span className="text-slate-700">{formatCurrency(ch.igstAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-base border-t border-slate-200 pt-2">
              <span className="text-slate-800">Grand Total</span>
              <span className="text-indigo-700">{formatCurrency(ch.grandTotal || ch.totalValue || 0)}</span>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 italic mt-4 pt-3 border-t border-slate-100">
          Expected Duration of Processing/Manufacturing: Within One Year
        </p>
      </div>

      {/* Part 2: Processor fills */}
      <div className="card p-5">
        <p className="section-title border-b border-slate-100 pb-2 mb-4">Part 2 — To Be Filled by Processor</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <F label="Status">
            <select value={part2.status} onChange={e => setPart2(p => ({ ...p, status: e.target.value }))} className="form-input">
              {['DRAFT', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </F>
          <F label="Received Date">
            <input type="date" value={part2.receivedDate} onChange={e => setPart2(p => ({ ...p, receivedDate: e.target.value }))} className="form-input" />
          </F>
          <F label="Qty Returned">
            <input type="number" value={part2.qtyReturned} onChange={e => setPart2(p => ({ ...p, qtyReturned: e.target.value }))} className="form-input" placeholder="0" />
          </F>
          <F label="Rework Qty">
            <input type="number" value={part2.reworkQty} onChange={e => setPart2(p => ({ ...p, reworkQty: e.target.value }))} className="form-input" placeholder="0" />
          </F>
          <F label="Nature of Process">
            <input value={part2.natureOfProcess} onChange={e => setPart2(p => ({ ...p, natureOfProcess: e.target.value }))} className="form-input" placeholder="Vacuum Hardening + Tempering" />
          </F>
          <F label="Scrap Qty (kg)">
            <input type="number" step="0.001" value={part2.scrapQtyKg} onChange={e => setPart2(p => ({ ...p, scrapQtyKg: e.target.value }))} className="form-input" placeholder="0.000" />
          </F>
          <F label="Scrap Details">
            <input value={part2.scrapDetails} onChange={e => setPart2(p => ({ ...p, scrapDetails: e.target.value }))} className="form-input" placeholder="Nature of scrap..." />
          </F>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={handleStatusSave} disabled={saving} className="btn-primary">
            {saving
              ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Saving...</>
              : <><span className="material-symbols-outlined text-sm">save</span> Update Challan</>
            }
          </button>
          {ch.jobCard && (
            <Link to={`/jobcards/${ch.jobCard.id}/inspection`}
              className="btn-ghost" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: 'white', border: 'none' }}>
              <span className="material-symbols-outlined text-sm">fact_check</span> Go to Inspection
            </Link>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="text-[11px] text-slate-400 text-right pb-2">
        Created by {ch.createdBy?.name} · {formatDate(ch.createdAt, true)}
      </p>
    </div>
  );
}
