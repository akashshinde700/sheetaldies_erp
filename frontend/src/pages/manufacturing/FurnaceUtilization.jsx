import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, Flame, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import SearchSelect from '../../components/SearchSelect';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Loss codes a-g, matching the physical daily register and the backend's
// s1A..s1G / s2A..s2G / s3A..s3G minute fields on FurnaceUtilizationDay.
const LOSS_CATEGORIES = [
  { code: 'A', label: 'Loading / Unloading' },
  { code: 'B', label: 'Cycle Preparation' },
  { code: 'C', label: 'Waiting for Material' },
  { code: 'D', label: 'Prev. Maintenance / Cleaning' },
  { code: 'E', label: 'Break down Maint.' },
  { code: 'F', label: 'No Power' },
  { code: 'G', label: 'No Material' },
];

const SHIFTS = [1, 2, 3];
const DEFAULT_SHIFT_MIN = 480;

const emptyShift = () => ({
  usedMin: DEFAULT_SHIFT_MIN,
  A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0,
});

const emptyForm = () => ({
  shift1: emptyShift(),
  shift2: emptyShift(),
  shift3: emptyShift(),
  signedBy: '',
  remarks: '',
});

const todayStr = () => new Date().toISOString().slice(0, 10);

// Backend <-> form field mapping: form.shiftN.usedMin -> shiftNUsedMin, form.shiftN.A -> sNA
const toApiShifts = (form) => {
  const out = {};
  SHIFTS.forEach((n) => {
    const s = form[`shift${n}`];
    out[`shift${n}UsedMin`] = Number(s.usedMin) || 0;
    LOSS_CATEGORIES.forEach(({ code }) => {
      out[`s${n}${code}`] = Number(s[code]) || 0;
    });
  });
  return out;
};

const fromApiRow = (row) => {
  if (!row) return emptyForm();
  const form = emptyForm();
  SHIFTS.forEach((n) => {
    form[`shift${n}`] = {
      usedMin: row[`shift${n}UsedMin`] ?? DEFAULT_SHIFT_MIN,
      A: row[`s${n}A`] || 0, B: row[`s${n}B`] || 0, C: row[`s${n}C`] || 0,
      D: row[`s${n}D`] || 0, E: row[`s${n}E`] || 0, F: row[`s${n}F`] || 0, G: row[`s${n}G`] || 0,
    };
  });
  form.signedBy = row.signedBy || '';
  form.remarks = row.remarks || '';
  return form;
};

function shiftLoss(shift) {
  return LOSS_CATEGORIES.reduce((s, { code }) => s + (Number(shift[code]) || 0), 0);
}

export default function FurnaceUtilization() {
  const [machines, setMachines] = useState([]);
  const [machineId, setMachineId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [form, setForm] = useState(emptyForm());
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
    if (!machineId || !date) return;
    setLoading(true);
    api.get('/manufacturing/furnace-utilization', { params: { machineId, date } })
      .then((r) => setForm(fromApiRow(r.data.data)))
      .catch(() => toast.error('Failed to load utilisation for this day.'))
      .finally(() => setLoading(false));
  }, [machineId, date]);

  const setShiftField = (n, key, value) => {
    setForm((f) => ({ ...f, [`shift${n}`]: { ...f[`shift${n}`], [key]: value } }));
  };

  const totals = useMemo(() => {
    let available = 0, loss = 0;
    SHIFTS.forEach((n) => {
      const s = form[`shift${n}`];
      available += Number(s.usedMin) || 0;
      loss += shiftLoss(s);
    });
    const used = Math.max(0, available - loss);
    const percent = available ? (used / available) * 100 : 0;
    return { available, loss, used, percent };
  }, [form]);

  const tone = totals.percent >= 90 ? 'text-success-600' : totals.percent >= 75 ? 'text-warning-600' : 'text-danger-600';

  const handleSave = async () => {
    if (!machineId || !date) return;
    setSaving(true);
    try {
      await api.post('/manufacturing/furnace-utilization', {
        machineId,
        date,
        signedBy: form.signedBy,
        remarks: form.remarks,
        shifts: toApiShifts(form),
      });
      toast.success('Furnace utilisation saved.');
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
          <h1 className="page-title">Daily Utilisation Statement</h1>
          <p className="page-subtitle">Shift-wise furnace minutes: available time vs. logged loss reasons (a–g).</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={!machineId} asChild>
            <Link to={`/manufacturing/utilization/print?date=${date}&machineIds=${machineId}`} target="_blank" rel="noreferrer">
              <Printer /> Print sheet
            </Link>
          </Button>
          <Button variant="outline" disabled={!machines.length} asChild>
            <Link
              to={`/manufacturing/utilization/print-pack?date=${date}&machineIds=${machines.map((m) => m.id).join(',')}`}
              target="_blank" rel="noreferrer"
              title="Daily Statement + Idle Time + Plant Losses, one print job"
            >
              <Printer /> Print Pack
            </Link>
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || !machineId}>
            <Save /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
            <div className="space-y-1 sm:w-64">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Furnace / Machine</label>
              <SearchSelect
                value={String(machineId || '')}
                onChange={(v) => setMachineId(v)}
                options={(machines || []).map((m) => ({ value: m.id, label: m.name || m.code }))}
                placeholder="Select machine"
                className="text-xs w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:w-44" />
            </div>
          </div>
        </CardContent>
      </Card>

      {!machineId ? (
        <div className="card p-10 text-center">
          <div className="w-10 h-10 mx-auto rounded-xl bg-amber-50 flex items-center justify-center mb-2">
            <Flame className="h-5 w-5 text-amber-300" />
          </div>
          <p className="text-sm text-slate-500">Add a machine under Master Data → Machines first.</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="table-responsive">
              <table className="w-full text-center min-w-[760px]">
                <thead>
                  <tr>
                    <th className="th text-left">Shift</th>
                    <th className="th">Available (min)</th>
                    {LOSS_CATEGORIES.map((c) => (
                      <th key={c.code} className="th" title={c.label}>{c.code}</th>
                    ))}
                    <th className="th">Loss</th>
                    <th className="th">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/80">
                  {SHIFTS.map((n) => {
                    const s = form[`shift${n}`];
                    const loss = shiftLoss(s);
                    const balance = (Number(s.usedMin) || 0) - loss;
                    return (
                      <tr key={n} className="tr">
                        <td className="td text-left font-semibold text-slate-700">{n === 1 ? '1st' : n === 2 ? '2nd' : '3rd'} Shift</td>
                        <td className="td">
                          <Input
                            type="number" min={0} max={720}
                            value={s.usedMin}
                            onChange={(e) => setShiftField(n, 'usedMin', Math.max(0, Number(e.target.value) || 0))}
                            className="w-20 text-center tabular-nums mx-auto"
                          />
                        </td>
                        {LOSS_CATEGORIES.map(({ code }) => (
                          <td key={code} className="td">
                            <Input
                              type="number" min={0} max={720}
                              value={s[code] || ''}
                              placeholder="0"
                              onChange={(e) => setShiftField(n, code, Math.max(0, Number(e.target.value) || 0))}
                              className="w-16 text-center tabular-nums mx-auto"
                            />
                          </td>
                        ))}
                        <td className={`td font-semibold tabular-nums ${loss > (Number(s.usedMin) || 0) ? 'text-danger-600' : 'text-slate-600'}`}>{loss || '—'}</td>
                        <td className={`td font-bold tabular-nums ${balance < 0 ? 'text-danger-600' : 'text-primary-700'}`}>{balance}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
              {LOSS_CATEGORIES.map((c) => (
                <span key={c.code}><span className="font-semibold">{c.code})</span> {c.label}</span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card><CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Available</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-800 tabular-nums">{totals.available}<span className="ml-1 text-xs font-medium text-slate-400">min</span></p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Loss</p>
              <p className="mt-1 font-mono text-2xl font-bold text-danger-600 tabular-nums">{totals.loss}<span className="ml-1 text-xs font-medium text-slate-400">min</span></p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Used</p>
              <p className={`mt-1 font-mono text-2xl font-bold tabular-nums ${tone}`}>{totals.percent.toFixed(1)}%</p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${totals.percent >= 90 ? 'bg-success-500' : totals.percent >= 75 ? 'bg-warning-500' : 'bg-danger-500'}`}
                  style={{ width: `${Math.max(0, Math.min(100, totals.percent))}%` }} />
              </div>
            </CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-4 grid gap-3 sm:grid-cols-[1fr_2fr]">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signed By</label>
                <Input value={form.signedBy} onChange={(e) => setForm((f) => ({ ...f, signedBy: e.target.value }))} placeholder="Supervisor name" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remarks</label>
                <Input value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} placeholder="Notes for the day" />
              </div>
            </CardContent>
          </Card>

          {machine && (
            <p className="text-xs text-slate-400">{machine.name || machine.code} — {date}</p>
          )}
        </>
      )}
    </div>
  );
}
