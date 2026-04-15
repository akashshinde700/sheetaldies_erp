import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const emptyRow = () => ({ quantity: '', remarks: '', hrcRange: '' });

export default function SplitJobCardModal({ card, onClose, onSuccess }) {
  const [rows, setRows] = useState([emptyRow(), emptyRow()]);
  const [saving, setSaving] = useState(false);

  const totalQty = rows.reduce((s, r) => s + (parseInt(r.quantity) || 0), 0);
  const remaining = card.quantity - totalQty;

  const updateRow = (i, field, val) => {
    setRows(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val };
      return next;
    });
  };

  const handleSubmit = async () => {
    const valid = rows.filter(r => parseInt(r.quantity) > 0);
    if (valid.length < 2) {
      toast.error('Need at least 2 parts with quantity > 0');
      return;
    }
    if (totalQty > card.quantity) {
      toast.error(`Total qty (${totalQty}) exceeds parent qty (${card.quantity})`);
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(`/jobcards/${card.id}/split`, { splits: valid });
      toast.success(res.data.message);
      onSuccess(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Split failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-violet-600 text-xl">call_split</span>
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">Split Job Card</p>
            <p className="text-[10px] text-slate-400">
              Parent: <span className="font-mono font-bold text-indigo-600">{card.jobCardNo}</span>
              &nbsp;·&nbsp; Total Qty: <strong>{card.quantity}</strong>
              &nbsp;·&nbsp; Part: {card.part?.partNo} — {card.part?.description}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Qty tracker */}
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold border ${
            remaining < 0 ? 'bg-rose-50 border-rose-200 text-rose-700' :
            remaining === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
            'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            <span className="material-symbols-outlined text-base">
              {remaining < 0 ? 'error' : remaining === 0 ? 'check_circle' : 'info'}
            </span>
            Allocated: {totalQty} / {card.quantity}
            {remaining > 0 && <span className="ml-1 text-slate-500">· {remaining} unallocated</span>}
            {remaining < 0 && <span className="ml-1">· Over by {Math.abs(remaining)}</span>}
          </div>

          {/* Split rows */}
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase w-8">#</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Qty *</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">HRC Range</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Remarks</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-slate-400 font-mono">{i + 1}</td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={e => updateRow(i, 'quantity', e.target.value)}
                      className="form-input text-xs w-20 text-center font-mono font-bold"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.hrcRange}
                      onChange={e => updateRow(i, 'hrcRange', e.target.value)}
                      className="form-input text-xs w-28"
                      placeholder={card.hrcRange || 'e.g. 54-56 HRC'}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.remarks}
                      onChange={e => updateRow(i, 'remarks', e.target.value)}
                      className="form-input text-xs w-full"
                      placeholder="Optional note"
                    />
                  </td>
                  <td className="px-2 py-2">
                    {rows.length > 2 && (
                      <button type="button" onClick={() => setRows(p => p.filter((_, j) => j !== i))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="button" onClick={() => setRows(p => [...p, emptyRow()])}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-sm">add</span> Add Split Part
          </button>

          <p className="text-[10px] text-slate-400 italic leading-relaxed">
            Each split creates a new child job card inheriting parent details. Unallocated quantity stays on parent.
            All child cards start with status CREATED.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="btn-outline text-sm">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving || totalQty < 1 || totalQty > card.quantity}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin material-symbols-outlined text-sm">refresh</span> Splitting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">call_split</span> Split Job Card
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
