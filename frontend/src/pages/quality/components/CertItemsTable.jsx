import React, { useState } from 'react';
import { Plus, Trash2, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const todayISO = () => new Date().toISOString().slice(0, 10);

function ReworkForm({ item, index, certId, jobCardId, jobCardNo, customerName, hardnessRequired, onDone, onCancel }) {
  const [type, setType] = useState('REWORK');
  const [qty, setQty] = useState(String(item.quantity || 1));
  const [weightKg, setWeightKg] = useState(item.totalWeight || '');
  const [cycleNo, setCycleNo] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const maxQty = Number(item.quantity) || undefined;

  const save = async () => {
    if (!reason.trim()) { toast.error('Reason is required.'); return; }
    const entryDate = todayISO();
    setSaving(true);
    try {
      await api.post('/quality/rework-entries', {
        year: Number(entryDate.slice(0, 4)),
        month: Number(entryDate.slice(5, 7)),
        entryDate,
        type,
        jobCardId: jobCardId || null,
        certificateId: certId,
        certItemId: item.id,
        customerName: customerName || '',
        description: item.description,
        qty: qty || null,
        weightKg: weightKg || null,
        jobCardNoText: jobCardNo || '',
        hardnessRequired: hardnessRequired || '',
        cycleNo,
        reason,
      });
      toast.success(`${type === 'REJECT' ? 'Reject' : 'Rework'} entry raised — see Rework Data / Pending List.`);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to raise entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="bg-orange-50/60 border-b border-orange-100">
      <td />
      <td colSpan={6} className="px-2 py-2.5">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-0.5">
            <label className="block text-[9px] font-bold text-orange-700 uppercase tracking-wider">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="form-input h-8 text-xs w-28">
              <option value="REWORK">Rework</option>
              <option value="REJECT">Reject</option>
            </select>
          </div>
          <div className="space-y-0.5">
            <label className="block text-[9px] font-bold text-orange-700 uppercase tracking-wider">Qty {maxQty ? `(of ${maxQty})` : ''}</label>
            <Input type="number" min={0} max={maxQty} value={qty} onChange={(e) => setQty(e.target.value)} className="h-8 text-xs w-20 text-center tabular-nums" />
          </div>
          <div className="space-y-0.5">
            <label className="block text-[9px] font-bold text-orange-700 uppercase tracking-wider">Weight (kg)</label>
            <Input type="number" step="0.001" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="h-8 text-xs w-24 text-right tabular-nums" />
          </div>
          <div className="space-y-0.5">
            <label className="block text-[9px] font-bold text-orange-700 uppercase tracking-wider">Cycle No</label>
            <Input value={cycleNo} onChange={(e) => setCycleNo(e.target.value)} className="h-8 text-xs w-32" placeholder="e.g. VPT-02-26/04/32" />
          </div>
          <div className="space-y-0.5 flex-1 min-w-[180px]">
            <label className="block text-[9px] font-bold text-orange-700 uppercase tracking-wider">Reason</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} className="h-8 text-xs" placeholder="e.g. Lower HRC after cycle" />
          </div>
          <Button type="button" size="sm" onClick={save} disabled={saving} className="h-8">
            {saving ? 'Saving…' : 'Raise'}
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" title="Cancel" aria-label="Cancel raising this entry" onClick={onCancel} className="h-8 w-8"><X /></Button>
        </div>
      </td>
    </tr>
  );
}

export default function CertItemsTable({ certItems, setCertItems, certId, jobCardId, jobCardNo, customerName, hardnessRequired }) {
  const [reworkRowIndex, setReworkRowIndex] = useState(null);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>Items / Parts</CardTitle>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setCertItems(p => [...p, { description: '', quantity: '1', weightPerPc: '', totalWeight: '', remarks: '' }])}
        >
          <Plus /> Add Row
        </Button>
      </CardHeader>
      <CardContent>
        {/* Six editable columns do not fit a phone; let the table scroll inside
            its card instead of squeezing the inputs to nothing. */}
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['#', 'Part Description', 'Qty', 'Wt/Pc (kg)', 'Total Wt (kg)', 'Remarks', ''].map(h => (
                  <th key={h} className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {certItems.map((it, i) => (
                <React.Fragment key={i}>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-2 py-1.5 text-slate-400 font-mono tabular-nums">
                      {i + 1}
                      {it.sourceChallanItemId && (
                        <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-sky-400" title="Linked from inward item" />
                      )}
                    </td>
                    <td className="px-1 py-1.5">
                      <Input value={it.description} onChange={e => { const a = [...certItems]; a[i] = { ...a[i], description: e.target.value }; setCertItems(a); }}
                        className="h-8 sm:h-8 min-h-0 text-xs w-48" placeholder="Part name" />
                    </td>
                    <td className="px-1 py-1.5">
                      <Input type="number" inputMode="numeric" value={it.quantity}
                        onChange={e => { const a = [...certItems]; a[i].quantity = e.target.value; setCertItems(a); }}
                        className="h-8 sm:h-8 min-h-0 text-xs w-16 text-center tabular-nums" />
                    </td>
                    <td className="px-1 py-1.5">
                      <Input type="number" step="0.001" inputMode="decimal" value={it.weightPerPc}
                        onChange={e => { const a = [...certItems]; a[i].weightPerPc = e.target.value; setCertItems(a); }}
                        className="h-8 sm:h-8 min-h-0 text-xs w-20 text-right tabular-nums" />
                    </td>
                    <td className="px-1 py-1.5">
                      <Input type="number" step="0.001" inputMode="decimal" value={it.totalWeight}
                        onChange={e => { const a = [...certItems]; a[i] = { ...a[i], totalWeight: e.target.value }; setCertItems(a); }}
                        className="h-8 sm:h-8 min-h-0 text-xs w-20 text-right tabular-nums" />
                    </td>
                    <td className="px-1 py-1.5">
                      <Input value={it.remarks} onChange={e => { const a = [...certItems]; a[i] = { ...a[i], remarks: e.target.value }; setCertItems(a); }}
                        className="h-8 sm:h-8 min-h-0 text-xs w-28" placeholder="Optional" />
                    </td>
                    <td className="px-1 py-1.5">
                      <div className="flex items-center gap-0.5">
                        {certId && it.id && (
                          <Button type="button" variant="ghost" size="icon-sm"
                            onClick={() => setReworkRowIndex(reworkRowIndex === i ? null : i)}
                            className="text-orange-400 hover:text-orange-600 hover:bg-orange-50"
                            title="Raise Rework / Reject for this item"
                            aria-label={`Raise rework or reject for item ${i + 1}`}>
                            <AlertTriangle />
                          </Button>
                        )}
                        {certItems.length > 1 && (
                          <Button type="button" variant="ghost" size="icon-sm"
                            onClick={() => setCertItems(p => p.filter((_, j) => j !== i))}
                            className="text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                            aria-label={`Remove item ${i + 1}`}>
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {reworkRowIndex === i && (
                    <ReworkForm
                      item={it}
                      index={i}
                      certId={certId}
                      jobCardId={jobCardId}
                      jobCardNo={jobCardNo}
                      customerName={customerName}
                      hardnessRequired={hardnessRequired}
                      onDone={() => setReworkRowIndex(null)}
                      onCancel={() => setReworkRowIndex(null)}
                    />
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {certId ? (
          <p className="mt-2 text-[11px] text-slate-400">
            Click <AlertTriangle className="inline h-3 w-3 align-text-bottom" /> on a saved item to raise a Rework or Reject entry (partial qty/weight) — it shows up in Rework Data and the Pending List.
          </p>
        ) : (
          <p className="mt-2 text-[11px] text-slate-400">Save this certificate first to raise a rework/reject entry against an item.</p>
        )}
      </CardContent>
    </Card>
  );
}
