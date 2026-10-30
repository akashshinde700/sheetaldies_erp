import { useState } from 'react';
import toast from 'react-hot-toast';
import { Split, X, Plus, Trash2, AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

  const RemainingIcon = remaining < 0 ? AlertCircle : remaining === 0 ? CheckCircle2 : Info;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card-elevated w-full max-w-2xl mx-4 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <Split className="h-4 w-4 text-violet-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-tight">Split Job Card</p>
            <p className="text-[10px] text-slate-400 truncate">
              Parent: <span className="font-mono font-bold text-indigo-600">{card.jobCardNo}</span>
              &nbsp;·&nbsp; Total Qty: <strong>{card.quantity}</strong>
              &nbsp;·&nbsp; Part: {card.part?.partNo} — {card.part?.description}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}
            aria-label="Close" className="ml-auto text-slate-400 hover:text-slate-700 shrink-0">
            <X />
          </Button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Qty tracker */}
          <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border ${
            remaining < 0 ? 'bg-rose-50 border-rose-200 text-rose-700' :
            remaining === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
            'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            <RemainingIcon className="h-4 w-4 shrink-0" />
            <span className="tabular-nums">Allocated: {totalQty} / {card.quantity}</span>
            {remaining > 0 && <span className="ml-1 text-slate-500 tabular-nums">· {remaining} unallocated</span>}
            {remaining < 0 && <span className="ml-1 tabular-nums">· Over by {Math.abs(remaining)}</span>}
          </div>

          {/* Split rows. Five columns of inputs need room, so let them scroll
              inside the modal rather than collapse. */}
          <div className="table-responsive">
            <table className="w-full text-left min-w-[440px]">
              <thead>
                <tr>
                  <th className="th w-8">#</th>
                  <th className="th">Qty *</th>
                  <th className="th">HRC Range</th>
                  <th className="th">Remarks</th>
                  <th className="th w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {rows.map((row, i) => (
                  <tr key={i} className="tr">
                    <td className="td text-slate-400 font-mono">{i + 1}</td>
                    <td className="td">
                      <Input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={e => updateRow(i, 'quantity', e.target.value)}
                        className="text-xs w-20 text-center font-mono font-bold"
                        placeholder="0"
                        aria-label={`Split ${i + 1} quantity`}
                      />
                    </td>
                    <td className="td">
                      <Input
                        type="text"
                        value={row.hrcRange}
                        onChange={e => updateRow(i, 'hrcRange', e.target.value)}
                        className="text-xs w-28"
                        placeholder={card.hrcRange || 'e.g. 54-56 HRC'}
                        aria-label={`Split ${i + 1} HRC range`}
                      />
                    </td>
                    <td className="td">
                      <Input
                        type="text"
                        value={row.remarks}
                        onChange={e => updateRow(i, 'remarks', e.target.value)}
                        className="text-xs w-full"
                        placeholder="Optional note"
                        aria-label={`Split ${i + 1} remarks`}
                      />
                    </td>
                    <td className="td">
                      {rows.length > 2 && (
                        <Button type="button" variant="ghost" size="icon-sm"
                          onClick={() => setRows(p => p.filter((_, j) => j !== i))}
                          title="Remove split" aria-label={`Remove split ${i + 1}`}
                          className="text-rose-400 hover:text-rose-600 hover:bg-rose-50">
                          <Trash2 />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button type="button" variant="ghost" size="sm"
            onClick={() => setRows(p => [...p, emptyRow()])}
            className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold">
            <Plus /> Add Split Part
          </Button>

          <p className="text-[10px] text-slate-400 italic leading-relaxed">
            Each split creates a new child job card inheriting parent details. Unallocated quantity stays on parent.
            All child cards start with status CREATED.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving || totalQty < 1 || totalQty > card.quantity}
          >
            {saving ? (
              <><Loader2 className="animate-spin" /> Splitting...</>
            ) : (
              <><Split /> Split Job Card</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
