import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Printer, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { rowEditorKeys } from '../../utils/rowEditorKeys';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PrintSheetHeader } from '../../components/manufacturing/PrintRegisterSheet';

// Energy consumption register — meter readings recorded per furnace cycle,
// monthly. Where the run sheet is closed, the reading resolves to its HT
// Cycle No so kW can be traced back to a customer's job card.

const now = new Date();
const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString('en-IN'));

const emptyRowForm = (nextSr) => ({ id: null, srNo: nextSr, furnaceCycleNo: '', cycleWeightKg: '', startMeter: '', endMeter: '' });

export default function EnergyLog() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [machines, setMachines] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [editing, setEditing] = useState(null); // { machineId, form }
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/machines').then((r) => setMachines(r.data.data || [])).catch(() => {}); }, []);

  const load = () => {
    setLoading(true);
    setEditing(null); // switching month mid-edit would otherwise leave a stale row form open
    api.get('/manufacturing/energy-log', { params: { year, month } })
      .then((r) => { setRows(r.data.data.rows || []); setTotal(r.data.data.totalConsumption || 0); })
      .catch(() => toast.error('Failed to load energy log.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [year, month]);

  const byMachine = useMemo(() => {
    const ids = new Set(rows.map((r) => r.machineId));
    const used = machines.filter((m) => ids.has(m.id));
    return used.length ? used : machines;
  }, [machines, rows]);

  const weighed = rows.filter((r) => Number(r.consumptionKw) > 0 && r.cycleWeightKg);
  const kwPerKg = weighed.length
    ? (weighed.reduce((n, r) => n + Number(r.consumptionKw), 0) / weighed.reduce((n, r) => n + Number(r.cycleWeightKg), 0)).toFixed(2)
    : '—';

  const startAdd = (machineId) => {
    const nextSr = Math.max(0, ...rows.filter((r) => r.machineId === machineId).map((r) => r.srNo)) + 1;
    setEditing({ machineId, form: emptyRowForm(nextSr) });
  };
  const startEdit = (r) => setEditing({
    machineId: r.machineId,
    form: { id: r.id, srNo: r.srNo, furnaceCycleNo: r.furnaceCycleNo, cycleWeightKg: r.cycleWeightKg ?? '', startMeter: r.startMeter ?? '', endMeter: r.endMeter ?? '' },
  });

  const save = async () => {
    if (!editing) return;
    const { machineId, form } = editing;
    if (!form.furnaceCycleNo.trim()) { toast.error('Furnace cycle no is required.'); return; }
    setSaving(true);
    try {
      await api.post('/manufacturing/energy-log', {
        id: form.id, machineId, logYear: year, logMonth: month, srNo: form.srNo,
        furnaceCycleNo: form.furnaceCycleNo, cycleWeightKg: form.cycleWeightKg || null,
        startMeter: form.startMeter || null, endMeter: form.endMeter || null,
      });
      toast.success('Entry saved.');
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save entry.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (r) => setConfirmDialog({
    title: 'Delete this meter entry?',
    message: `Cycle ${r.furnaceCycleNo || '—'} will be removed from the energy log. This cannot be undone.`,
    confirmLabel: 'Delete entry',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await api.delete(`/manufacturing/energy-log/${r.id}`);
        toast.success('Entry deleted.');
        load();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete entry.');
      } finally { setConfirmDialog(null); }
    },
  });

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">
      <style>{`@media print { @page { size: A4 landscape; margin: 8mm; } .no-print { display: none !important; } }`}</style>

      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Energy Consumption Register</h1>
          <p className="page-subtitle">Meter readings per furnace cycle, month-wise.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="number" value={month} onChange={(e) => setMonth(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} className="w-16" title="Month (1-12)" />
          <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || now.getFullYear())} className="w-24" title="Year" />
          <Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>
        </div>
      </div>

      <div className="no-print grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Recorded consumption</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-800 tabular-nums">{fmtNum(total)} <span className="text-sm font-medium text-slate-400">KW</span></p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Avg. per kg charged</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-800 tabular-nums">{kwPerKg} <span className="text-sm font-medium text-slate-400">KW/KG</span></p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Traced to HT Cycle No</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-800 tabular-nums">{rows.filter((r) => r.runsheetId).length}<span className="text-sm font-medium text-slate-400"> / {rows.length}</span></p>
        </div>
      </div>

      <div className="hidden print:block">
        <PrintSheetHeader title={`Energy Consumption — ${String(month).padStart(2, '0')}/${year}`} date={new Date().toLocaleDateString('en-GB')} />
        <EnergyPrintTable machines={byMachine} rows={rows} />
        <div className="mt-1 flex items-center justify-between border border-slate-900 px-2 py-1 font-mono text-[8px] uppercase">
          <span>Energy consumption register</span>
          <span>Total : {fmtNum(total)} KW</span>
          <span>Checked By :- ____________</span>
        </div>
      </div>

      {loading ? (
        <div className="no-print card p-10 text-center text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="no-print grid gap-4 xl:grid-cols-2">
          {byMachine.map((m) => {
            const list = rows.filter((r) => r.machineId === m.id);
            const mTotal = list.reduce((n, r) => n + (Number(r.consumptionKw) || 0), 0);
            return (
              <section key={m.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <h2 className="font-mono text-base font-bold text-slate-900">{m.name || m.code}</h2>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500 tabular-nums">{fmtNum(mTotal)} KW</span>
                    <Button size="icon-sm" variant="ghost" className="no-print" title={`Log a reading for ${m.name || m.code}`} aria-label={`Log an energy reading for ${m.name || m.code}`} onClick={() => startAdd(m.id)}><Plus /></Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400">
                        <th className="px-3 py-2 font-semibold">Sr</th>
                        <th className="px-3 py-2 font-semibold">Furnace cycle no</th>
                        <th className="px-3 py-2 font-semibold">Wt</th>
                        <th className="px-3 py-2 font-semibold">Start</th>
                        <th className="px-3 py-2 font-semibold">End</th>
                        <th className="px-3 py-2 text-right font-semibold">KW</th>
                        <th className="w-16 px-3 py-2 no-print" />
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r) => (
                        editing?.form?.id === r.id ? (
                          <RowEditor key={r.id} editing={editing} onChange={setEditing} onSave={save} onCancel={() => setEditing(null)} saving={saving} />
                        ) : (
                          <tr key={r.id} className="border-b border-slate-100 align-top">
                            <td className="px-3 py-2 font-mono text-[12px] text-slate-400">{r.srNo}</td>
                            <td className="px-3 py-2">
                              <p className="font-mono text-[12px] text-slate-800">{r.furnaceCycleNo}</p>
                              {r.runsheet && <p className="mt-0.5 font-mono text-[11px] text-primary-700">{r.runsheet.furnaceCycleNo || r.runsheet.runsheetNumber}</p>}
                            </td>
                            <td className="px-3 py-2 font-mono text-[12px] text-slate-700 tabular-nums">{r.cycleWeightKg ?? '—'}</td>
                            <td className="px-3 py-2 font-mono text-[12px] text-slate-500 tabular-nums">{fmtNum(r.startMeter)}</td>
                            <td className="px-3 py-2 font-mono text-[12px] text-slate-500 tabular-nums">{fmtNum(r.endMeter)}</td>
                            <td className="px-3 py-2 text-right font-mono text-[12px] font-semibold text-slate-900 tabular-nums">
                              {Number(r.consumptionKw) > 0 ? r.consumptionKw : <span className="font-normal text-slate-400">open</span>}
                            </td>
                            <td className="px-3 py-2 no-print">
                              <div className="flex items-center justify-end gap-0.5">
                                <Button size="icon-sm" variant="ghost" title="Edit this entry" aria-label="Edit this energy log entry" className="text-slate-400 hover:text-primary-700" onClick={() => startEdit(r)}><Pencil /></Button>
                                <Button size="icon-sm" variant="ghost" title="Delete this entry" aria-label="Delete this energy log entry" className="text-slate-400 hover:text-rose-600" onClick={() => remove(r)}><Trash2 /></Button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                      {editing?.machineId === m.id && editing.form.id === null && (
                        <RowEditor editing={editing} onChange={setEditing} onSave={save} onCancel={() => setEditing(null)} saving={saving} />
                      )}
                      {!list.length && editing?.machineId !== m.id && (
                        <tr><td colSpan={7} className="px-3 py-6 text-center">
                          <Zap className="h-4 w-4 mx-auto mb-1 text-slate-300" />
                          <p className="text-[12px] text-slate-400">No readings logged yet.</p>
                          <Button size="sm" variant="outline" className="no-print mt-2" onClick={() => startAdd(m.id)}>
                            <Plus /> Log the first reading
                          </Button>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}

// Print-only recreation of the energy consumption register — every furnace
// side by side, ported from the client-supplied prototype's EnergyPrintTable.
function EnergyPrintTable({ machines, rows }) {
  if (!machines.length) return <p className="text-[10px] uppercase">No meter readings logged yet.</p>;
  return (
    <div className="flex gap-2">
      {machines.map((m) => {
        const list = rows.filter((r) => r.machineId === m.id);
        const total = list.reduce((n, r) => n + (Number(r.consumptionKw) || 0), 0);
        return (
          <div key={m.id} className="flex-1">
            <p className="border border-slate-900 py-0.5 text-center font-mono text-[11px] font-bold">{m.name || m.code}</p>
            <table className="w-full border-collapse text-[7.5px]">
              <thead>
                <tr>
                  <th className="w-5 px-0.5 py-0.5 text-center font-bold uppercase border border-slate-900">Sr</th>
                  <th className="px-0.5 py-0.5 text-center font-bold uppercase border border-slate-900">Furnace cycle no</th>
                  <th className="px-0.5 py-0.5 text-center font-bold uppercase border border-slate-900">HT cycle no</th>
                  <th className="px-0.5 py-0.5 text-center font-bold uppercase border border-slate-900">Cycle wt</th>
                  <th className="px-0.5 py-0.5 text-center font-bold uppercase border border-slate-900">Start meter</th>
                  <th className="px-0.5 py-0.5 text-center font-bold uppercase border border-slate-900">End meter</th>
                  <th className="px-0.5 py-0.5 text-center font-bold uppercase border border-slate-900">Total (KW)</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td className="px-0.5 py-0.5 text-center font-mono border border-slate-900">{r.srNo}</td>
                    <td className="px-0.5 py-0.5 font-mono border border-slate-900">{r.furnaceCycleNo}</td>
                    <td className="px-0.5 py-0.5 font-mono border border-slate-900">{r.runsheet?.furnaceCycleNo || r.runsheet?.runsheetNumber || '—'}</td>
                    <td className="px-0.5 py-0.5 text-right font-mono tabular-nums border border-slate-900">{r.cycleWeightKg ?? ''}</td>
                    <td className="px-0.5 py-0.5 text-right font-mono tabular-nums border border-slate-900">{r.startMeter ? fmtNum(r.startMeter) : ''}</td>
                    <td className="px-0.5 py-0.5 text-right font-mono tabular-nums border border-slate-900">{r.endMeter ? fmtNum(r.endMeter) : ''}</td>
                    <td className="px-0.5 py-0.5 text-right font-mono font-bold tabular-nums border border-slate-900">{Number(r.consumptionKw) > 0 ? r.consumptionKw : ''}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={6} className="px-1 py-0.5 text-right font-bold uppercase border border-slate-900">Total</td>
                  <td className="px-0.5 py-0.5 text-right font-mono font-bold tabular-nums border border-slate-900">{fmtNum(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function RowEditor({ editing, onChange, onSave, onCancel, saving }) {
  const { form } = editing;
  const set = (k, v) => onChange({ ...editing, form: { ...form, [k]: v } });
  return (
    <tr className="border-b border-primary-100 bg-primary-50/40 align-top" onKeyDown={rowEditorKeys({ onSave, onCancel, saving })}>
      <td className="px-3 py-2 font-mono text-[12px] text-slate-500">{form.srNo}</td>
      <td className="px-2 py-1.5"><Input value={form.furnaceCycleNo} onChange={(e) => set('furnaceCycleNo', e.target.value)} placeholder="VPT1-26/09/01" className="font-mono text-[12px] h-7" /></td>
      <td className="px-2 py-1.5"><Input type="number" value={form.cycleWeightKg} onChange={(e) => set('cycleWeightKg', e.target.value)} className="w-20 h-7 tabular-nums" /></td>
      <td className="px-2 py-1.5"><Input type="number" value={form.startMeter} onChange={(e) => set('startMeter', e.target.value)} className="w-24 h-7 tabular-nums" /></td>
      <td className="px-2 py-1.5"><Input type="number" value={form.endMeter} onChange={(e) => set('endMeter', e.target.value)} className="w-24 h-7 tabular-nums" /></td>
      <td colSpan={2} className="px-2 py-1.5">
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" onClick={onSave} disabled={saving}>{saving ? '…' : 'Save'}</Button>
          <Button size="icon-sm" variant="ghost" title="Discard this row" aria-label="Discard this reading without saving" onClick={onCancel}><X /></Button>
        </div>
      </td>
    </tr>
  );
}
