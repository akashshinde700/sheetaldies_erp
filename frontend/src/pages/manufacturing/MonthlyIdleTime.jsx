import { useEffect, useMemo, useState } from 'react';
import { Save, Printer, Flame, Eraser } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import SearchSelect from '../../components/SearchSelect';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Hardening idle time register — per-machine, per-month, day-by-day minutes
// against the same a-g loss codes as the Daily Utilisation Statement.

const LOSS_FIELDS = [
  { code: 'A', key: 'loadingUnloadingMin', label: 'Loading / Unloading' },
  { code: 'B', key: 'waitingCyclePrepMin', label: 'Cycle Preparation' },
  { code: 'C', key: 'waitingMaterialMin', label: 'Waiting for Material' },
  { code: 'D', key: 'preventiveMaintMin', label: 'Prev. Maintenance / Cleaning' },
  { code: 'E', key: 'breakdownMaintMin', label: 'Break down Maint.' },
  { code: 'F', key: 'noPowerMin', label: 'No Power' },
  { code: 'G', key: 'noMaterialMin', label: 'No Material' },
];

const now = new Date();

export default function MonthlyIdleTime() {
  const [machines, setMachines] = useState([]);
  const [machineId, setMachineId] = useState('');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [reloadKey, setReloadKey] = useState(0);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/machines').then((r) => {
      const list = r.data.data || [];
      setMachines(list);
      if (list.length && !machineId) setMachineId(String(list[0].id));
    }).catch(() => toast.error('Failed to load machines.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!machineId) return;
    setLoading(true);
    api.get('/manufacturing/idle-logs', { params: { machineId, year, month } })
      .then((r) => setDays(r.data.data.days || []))
      .catch(() => toast.error('Failed to load idle time sheet.'))
      .finally(() => setLoading(false));
  }, [machineId, year, month, reloadKey]);

  // One sheet per furnace per month; clearing drops that month's day rows.
  const handleClear = async () => {
    if (!window.confirm(`Clear the whole idle-time sheet for ${machine?.name || machine?.code || 'this furnace'}, ${month}/${year}? This cannot be undone.`)) return;
    try {
      await api.delete('/manufacturing/idle-logs', { params: { machineId, year, month } });
      toast.success('Idle time cleared.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sheet clear nahi hui.');
    }
  };

  const setCell = (day, key, value) => {
    setDays((rows) => rows.map((r) => (r.day === day ? { ...r, [key]: Math.max(0, Number(value) || 0) } : r)));
  };

  const totalsMin = useMemo(() => {
    const t = { loadingUnloadingMin: 0, waitingCyclePrepMin: 0, waitingMaterialMin: 0, preventiveMaintMin: 0, breakdownMaintMin: 0, noPowerMin: 0, noMaterialMin: 0 };
    days.forEach((d) => LOSS_FIELDS.forEach(({ key }) => { t[key] += Number(d[key]) || 0; }));
    return t;
  }, [days]);
  const lossHoursTotal = LOSS_FIELDS.reduce((s, { key }) => s + totalsMin[key], 0) / 60;

  const handleSave = async () => {
    if (!machineId) return;
    setSaving(true);
    try {
      await api.post('/manufacturing/idle-logs', { machineId, year, month, days });
      toast.success('Idle time sheet saved.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const machine = machines.find((m) => String(m.id) === String(machineId));

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Monthly Idle Time</h1>
          <p className="page-subtitle">Hardening idle time register — daily minutes against a-g loss codes, rolled up to hours.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={!machineId} asChild>
            <Link to={`/manufacturing/idle-time/print?machineId=${machineId}&year=${year}&month=${month}`} target="_blank" rel="noreferrer">
              <Printer /> Print sheet
            </Link>
          </Button>
          <Button variant="ghost" onClick={handleClear} disabled={saving || loading || !machineId} className="text-slate-400 hover:text-rose-600" title="Clear this month's sheet">
            <Eraser /> Clear month
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || !machineId}><Save /> {saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
            <div className="space-y-1 sm:w-64">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Furnace / Machine</label>
              <SearchSelect value={String(machineId || '')} onChange={setMachineId} options={(machines || []).map((m) => ({ value: m.id, label: m.name || m.code }))} placeholder="Select machine" className="text-xs w-full" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Month</label>
              <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} className="w-20" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Year</label>
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || now.getFullYear())} className="w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {!machineId ? (
        <div className="card p-10 text-center">
          <div className="w-10 h-10 mx-auto rounded-xl bg-amber-50 flex items-center justify-center mb-2"><Flame className="h-5 w-5 text-amber-300" /></div>
          <p className="text-sm text-slate-500">Add a machine under Master Data → Machines first.</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="table-responsive">
              <table className="w-full text-center min-w-[820px]">
                <thead>
                  <tr>
                    <th className="th text-left">Date</th>
                    {LOSS_FIELDS.map((f) => <th key={f.code} className="th" title={f.label}>{f.code}</th>)}
                    <th className="th">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/80">
                  {days.map((d) => {
                    const total = LOSS_FIELDS.reduce((s, { key }) => s + (Number(d[key]) || 0), 0);
                    const flagged = (Number(d.breakdownMaintMin) || 0) > 0 || (Number(d.noPowerMin) || 0) > 0 || (Number(d.noMaterialMin) || 0) > 0;
                    return (
                      <tr key={d.day} className="tr">
                        <td className="td text-left font-mono font-semibold text-danger-600">{d.day}</td>
                        {LOSS_FIELDS.map(({ key }) => (
                          <td key={key} className="td">
                            <Input type="number" min={0} value={d[key] || ''} placeholder="0" onChange={(e) => setCell(d.day, key, e.target.value)} className="w-16 text-center tabular-nums mx-auto" />
                          </td>
                        ))}
                        <td className={`td font-mono tabular-nums ${flagged ? 'bg-amber-50 font-semibold' : ''}`}>{total || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300">
                    <td className="td text-left font-bold text-[11px] uppercase">Hrs</td>
                    {LOSS_FIELDS.map(({ key }) => (
                      <td key={key} className="td font-mono font-semibold tabular-nums">{(totalsMin[key] / 60).toFixed(2)}</td>
                    ))}
                    <td className="td font-mono font-bold tabular-nums text-danger-600">{lossHoursTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
              {LOSS_FIELDS.map((f) => <span key={f.code}><span className="font-semibold">{f.code})</span> {f.label}</span>)}
            </div>
          </div>
          {machine && <p className="text-xs text-slate-400">{machine.name || machine.code} — {String(month).padStart(2, '0')}/{year}</p>}
        </>
      )}
    </div>
  );
}
