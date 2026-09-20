import { useEffect, useMemo, useState } from 'react';
import { Printer, RefreshCw, Save, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import SearchSelect from '../../components/SearchSelect';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Monthly plant-losses result sheet — one row of a-g category hours per
// furnace, plus available/loss/used/%used. "Derive from daily logs" sums the
// Monthly Idle Time entries for every machine into this summary automatically;
// rows are also directly editable here (or addable by hand) and saved back.

const now = new Date();
const fmt = (v, d = 2) => (Number(v) || 0).toFixed(d);
const CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const CODE_LABEL = { A: 'Loading/Unloading', B: 'Cycle Prep.', C: 'Waiting Material', D: 'Cleaning', E: 'Breakdown Maint.', F: 'No Power', G: 'No Material' };

// Row shape used for editing — always hours for every category (the A/
// loadingUnloadingMin backend quirk is converted at the load/save boundary).
const rowFromEntry = (e) => ({
  key: e.id ?? `new-${Math.random()}`,
  id: e.id ?? null,
  machineId: e.machineId ?? null,
  furnaceName: e.furnaceName || '',
  furnaceLabel: e.furnaceLabel || e.furnaceName || '',
  availableHours: e.availableHours != null ? String(e.availableHours) : '624',
  A: e.loadingUnloadingMin != null ? String((Number(e.loadingUnloadingMin) / 60).toFixed(2)) : '0',
  B: e.waitingCyclePrepHrs != null ? String(e.waitingCyclePrepHrs) : '0',
  C: e.waitingMaterialHrs != null ? String(e.waitingMaterialHrs) : '0',
  D: e.cleaningFurnaceHrs != null ? String(e.cleaningFurnaceHrs) : '0',
  E: e.breakdownMaintHrs != null ? String(e.breakdownMaintHrs) : '0',
  F: e.noPowerHrs != null ? String(e.noPowerHrs) : '0',
  G: e.noMaterialHrs != null ? String(e.noMaterialHrs) : '0',
});

const rowToApiEntry = (r) => {
  const lossHrs = CODES.reduce((s, c) => s + (Number(r[c]) || 0), 0);
  const available = Number(r.availableHours) || 0;
  return {
    machineId: r.machineId || null,
    furnaceName: r.furnaceName || null,
    availableHours: available,
    usedHours: Math.max(0, available - lossHrs),
    loadingUnloadingMin: (Number(r.A) || 0) * 60,
    waitingCyclePrepHrs: Number(r.B) || 0,
    waitingMaterialHrs: Number(r.C) || 0,
    cleaningFurnaceHrs: Number(r.D) || 0,
    breakdownMaintHrs: Number(r.E) || 0,
    noPowerHrs: Number(r.F) || 0,
    noMaterialHrs: Number(r.G) || 0,
  };
};

export default function PlantLosses() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deriving, setDeriving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addMachineId, setAddMachineId] = useState('');
  const [workingDays, setWorkingDays] = useState(26);

  useEffect(() => { api.get('/machines').then((r) => setMachines(r.data.data || [])).catch(() => {}); }, []);

  const load = () => {
    setLoading(true);
    api.get('/manufacturing/plant-losses', { params: { year, month } })
      .then((r) => setRows((r.data.data.entries || []).map(rowFromEntry)))
      .catch(() => toast.error('Failed to load plant losses.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [year, month]);

  const derive = async () => {
    if (rows.length && !window.confirm('This replaces the existing plant-loss entries for this month with fresh totals from the daily idle logs. Continue?')) return;
    setDeriving(true);
    try {
      await api.post('/manufacturing/plant-losses/derive', { year, month, workingDays });
      toast.success('Plant losses derived from daily idle logs.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to derive.');
    } finally {
      setDeriving(false);
    }
  };

  const setCell = (key, field, value) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    if (!addMachineId) return;
    const m = machines.find((x) => String(x.id) === String(addMachineId));
    setRows((rs) => [...rs, rowFromEntry({ machineId: Number(addMachineId), furnaceLabel: m ? `${m.code} – ${m.name}` : '', availableHours: workingDays * 24 })]);
    setAddMachineId('');
  };

  const removeRow = (key) => {
    if (!window.confirm('Remove this furnace row? (Save to make it permanent.)')) return;
    setRows((rs) => rs.filter((r) => r.key !== key));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/manufacturing/plant-losses', { year, month, entries: rows.map(rowToApiEntry) });
      toast.success('Plant losses saved.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const availableMachineOptions = useMemo(() => {
    const used = new Set(rows.map((r) => r.machineId).filter(Boolean));
    return machines.filter((m) => !used.has(m.id)).map((m) => ({ value: m.id, label: m.name || m.code }));
  }, [machines, rows]);

  // Live totals computed from the editable rows, not the last-saved response —
  // so the summary cards reflect unsaved edits immediately.
  const computed = useMemo(() => rows.map((r) => {
    const lossHrs = CODES.reduce((s, c) => s + (Number(r[c]) || 0), 0);
    const available = Number(r.availableHours) || 0;
    const usedHrs = Math.max(0, available - lossHrs);
    const efficiency = available > 0 ? (usedHrs / available) * 100 : 0;
    return { ...r, lossHrs, usedHrs, efficiency };
  }), [rows]);

  const totals = computed.reduce((acc, r) => ({
    available: acc.available + (Number(r.availableHours) || 0),
    loss: acc.loss + r.lossHrs,
    used: acc.used + r.usedHrs,
  }), { available: 0, loss: 0, used: 0 });
  const efficiencyPercent = totals.available > 0 ? (totals.used / totals.available) * 100 : 0;

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Plant Losses</h1>
          <p className="page-subtitle">Monthly result sheet — derive from Monthly Idle Time, or add/edit furnace rows by hand.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.open(`/manufacturing/plant-losses/print?year=${year}&month=${month}`, '_blank')}>
            <Printer /> Print sheet
          </Button>
          <Button variant="outline" onClick={derive} disabled={deriving}><RefreshCw /> {deriving ? 'Deriving…' : 'Derive from daily logs'}</Button>
          <Button onClick={save} disabled={saving || !rows.length}><Save /> {saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Month</label>
              <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} className="w-20" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Year</label>
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || now.getFullYear())} className="w-24" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider" title="Available hours per furnace = working days x 24, used by Derive">Working days</label>
              <Input type="number" min={1} max={31} value={workingDays} onChange={(e) => setWorkingDays(Math.max(1, Math.min(31, Number(e.target.value) || 1)))} className="w-20" />
            </div>
            <div className="space-y-1 sm:w-56">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Add Furnace Row</label>
              <div className="flex gap-1.5">
                <SearchSelect value={addMachineId} onChange={setAddMachineId} options={availableMachineOptions} placeholder="Select machine" className="flex-1" />
                <Button size="icon-sm" variant="outline" onClick={addRow} disabled={!addMachineId}><Plus /></Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="card p-10 text-center text-sm text-slate-400">Loading…</div>
      ) : !rows.length ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-slate-500">No plant loss rows for this month yet.</p>
          <p className="mt-1 text-xs text-slate-400">Click "Derive from daily logs" to auto-fill, or add a furnace row above and enter hours by hand.</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="table-responsive">
              <table className="w-full text-center min-w-[900px]">
                <thead>
                  <tr>
                    <th className="th text-left">Furnace</th>
                    {CODES.map((c) => <th key={c} className="th" title={CODE_LABEL[c]}>{c}</th>)}
                    <th className="th">Available</th><th className="th">Loss</th><th className="th">Used</th><th className="th">% Used</th><th className="th w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/80">
                  {computed.map((r) => (
                    <tr key={r.key} className="tr">
                      <td className="td text-left font-semibold text-slate-700">{r.furnaceLabel}</td>
                      {CODES.map((c) => (
                        <td key={c} className="td">
                          <Input type="number" min={0} step="0.01" value={r[c]} onChange={(e) => setCell(r.key, c, e.target.value)} className="w-16 text-center tabular-nums mx-auto" />
                        </td>
                      ))}
                      <td className="td">
                        <Input type="number" min={0} value={r.availableHours} onChange={(e) => setCell(r.key, 'availableHours', e.target.value)} className="w-20 text-center tabular-nums mx-auto" />
                      </td>
                      <td className="td font-mono tabular-nums text-danger-600">{fmt(r.lossHrs)}</td>
                      <td className="td font-mono tabular-nums text-primary-700">{fmt(r.usedHrs, 1)}</td>
                      <td className="td font-mono font-semibold tabular-nums">{fmt(r.efficiency, 1)}%</td>
                      <td className="td">
                        <Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={() => removeRow(r.key)}><Trash2 /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Card><CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Total Available</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-800 tabular-nums">{fmt(totals.available, 0)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Total Loss</p>
              <p className="mt-1 font-mono text-2xl font-bold text-danger-600 tabular-nums">{fmt(totals.loss)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Total Used</p>
              <p className="mt-1 font-mono text-2xl font-bold text-primary-700 tabular-nums">{fmt(totals.used)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">% of Time Used</p>
              <p className="mt-1 font-mono text-2xl font-bold text-success-600 tabular-nums">{fmt(efficiencyPercent, 0)}%</p>
            </CardContent></Card>
          </div>
        </>
      )}
    </div>
  );
}
