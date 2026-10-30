import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Printer, Zap, Flame, Plus, Trash2, Pencil, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import SearchSelect from '../../components/SearchSelect';
import { PrintSheetHeader, PrintSheetFooter } from '../../components/manufacturing/PrintRegisterSheet';

// Doc control QF/PD/03 — furnace-wise view of the day's real VHT Run Sheets
// (no separate "plan" record for hardening; the run sheet IS the plan once
// created). Every HT Cycle No links out to tempering slots and the energy
// register that point back to it.

const STATUS_BADGE = {
  PLANNED: 'info', IN_PROGRESS: 'warning', TEMPERING: 'info', COMPLETED: 'success', CANCELLED: 'neutral',
};
const STATUS_LABEL = {
  PLANNED: 'Planned', IN_PROGRESS: 'In furnace', TEMPERING: 'Tempering', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const hhmm = (t) => (!t || t === '-' ? '—' : t);

function loadTotals(items) {
  return (items || []).reduce((acc, it) => ({
    qty: acc.qty + (Number(it.quantity) || 0),
    wt: acc.wt + (Number(it.weightKg) || 0),
  }), { qty: 0, wt: 0 });
}

function FurnaceBlock({ furnace, rows, onPlan, onEdit, onDelete }) {
  const planned = rows.reduce((n, r) => n + loadTotals(r.items).wt, 0);
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white print:break-inside-avoid print:rounded-none print:border-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 print:border-slate-900 print:py-1.5">
        <div className="flex items-baseline gap-3">
          <h2 className="font-mono text-lg font-bold tracking-tight text-slate-900 print:text-base">{furnace.name || furnace.code}</h2>
          <span className="text-xs text-slate-500 print:hidden">{rows.length} cycles</span>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <span className="font-mono text-xs text-slate-500 tabular-nums">{Math.round(planned * 10) / 10} KG total charge</span>
          <Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-primary-700" onClick={() => onPlan(furnace.id)} title={`Plan a cycle on ${furnace.name || furnace.code}`}>
            <Plus />
          </Button>
        </div>
        <span className="hidden print:inline font-mono text-xs text-slate-900 tabular-nums">{Math.round(planned * 10) / 10} KG total charge</span>
      </div>
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[900px] border-collapse text-left print:min-w-0 print:text-[9px]">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 print:border-slate-900 print:text-[8px] print:text-slate-900">
              <th className="w-12 px-3 py-2 font-semibold print:px-1 print:py-1">Sr</th>
              <th className="w-44 px-3 py-2 font-semibold print:px-1 print:py-1">HT Cycle No</th>
              <th className="px-3 py-2 font-semibold print:px-1 print:py-1">Load / customers</th>
              <th className="w-40 px-3 py-2 font-semibold print:px-1 print:py-1">Parameters</th>
              <th className="w-24 px-3 py-2 font-semibold print:px-1 print:py-1">Time</th>
              <th className="w-56 px-3 py-2 font-semibold print:hidden">Linked downstream</th>
              <th className="w-28 px-3 py-2 print:hidden" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const totals = loadTotals(r.items);
              const names = Array.from(new Set((r.items || []).map((it) => it.customerName).filter(Boolean)));
              const energy = (r.energyLogEntries || [])[0];
              return (
                <tr key={r.id} className="border-b border-slate-100 align-top print:border-slate-400">
                  <td className="px-3 py-2.5 font-mono text-sm text-slate-400 print:px-1 print:py-1 print:text-[9px] print:text-slate-900">{i + 1}</td>
                  <td className="px-3 py-2.5 print:px-1 print:py-1">
                    <Link to={`/manufacturing/runsheet/${r.id}`} className="font-mono text-[13px] font-semibold text-primary-700 underline decoration-primary-200 underline-offset-2 hover:decoration-primary-500 print:text-[9px] print:text-slate-900 print:no-underline">
                      {r.runsheetNumber}
                    </Link>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400 print:text-[8px] print:text-slate-700">{r.furnaceCycleNo || '—'}</p>
                    <div className="mt-1.5 print:hidden"><Badge variant={STATUS_BADGE[r.status] || 'neutral'}>{STATUS_LABEL[r.status] || r.status}</Badge></div>
                  </td>
                  <td className="px-3 py-2.5 min-w-0 print:px-1 print:py-1">
                    <p className="text-[13px] font-medium leading-snug text-slate-800 truncate print:text-[9px] print:whitespace-normal">{names.slice(0, 4).join(' · ') || '—'}</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-400 print:text-[8px] print:text-slate-700">{(r.items || []).length} job cards · {totals.qty} nos · {totals.wt.toFixed(1)} kg</p>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-slate-700 print:px-1 print:py-1 print:text-[9px]">
                    <p>{r.hardeningType || r.tempProfile || '—'}</p>
                    <p className="text-slate-500 print:text-slate-900">{r.quenchPressureBar ? `${r.quenchPressureBar} BAR` : ''}{r.fanRpm ? ` / ${r.fanRpm} RPM` : ''}</p>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[13px] text-slate-800 tabular-nums print:px-1 print:py-1 print:text-[9px]">
                    <p>{hhmm(r.cycleStartTime)}</p>
                    <p className="text-slate-400 print:text-slate-900">{hhmm(r.cycleEndTime)}</p>
                  </td>
                  <td className="px-3 py-2.5 print:hidden">
                    <div className="flex flex-wrap gap-1">
                      {(r.temperingLinks || []).length > 0 ? r.temperingLinks.map((l) => (
                        <Link key={l.id} to="/manufacturing/tempering" className="rounded bg-sky-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-sky-800 ring-1 ring-inset ring-sky-200 hover:bg-sky-100">
                          {l.slot?.machine?.name || l.slot?.machine?.code}
                        </Link>
                      )) : <span className="text-[11px] text-slate-400">No tempering slot yet</span>}
                    </div>
                    <p className="mt-1.5 flex items-center gap-1 font-mono text-[11px] text-slate-500">
                      <Zap className="h-3 w-3 text-slate-400" />
                      {energy && Number(energy.consumptionKw) > 0 ? `${energy.consumptionKw} KW` : 'Meter open'}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 print:hidden">
                    <div className="flex items-center gap-0.5">
                      <button type="button" title="Edit this cycle" onClick={() => onEdit(r)} className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-50 hover:text-primary-700">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" title="Delete this cycle" onClick={() => onDelete(r)} className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Link to={`/manufacturing/runsheet/${r.id}`} title="Open in VHT Run Sheet" className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-50 hover:text-primary-700">
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-400 print:text-[9px] print:py-1">No run sheets for this furnace on this day.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}


const emptyLine = () => ({ key: Math.random(), jobCardId: '', quantity: '', weightKg: '' });

// Plan a cycle: furnace + date + job cards -> creates a PLANNED VHT Run Sheet
// whose auto-generated cycle no is what the operator later enters on the
// VHT Run Sheet page to pull everything in.
function PlanCycleForm({ machines, jobCards, initial, editing, onSaved, onCancel }) {
  const [form, setForm] = useState(() => (editing ? {
    furnaceId: editing.furnaceId ? String(editing.furnaceId) : '',
    runDate: String(editing.runDate || '').split('T')[0] || initial.date,
    cycleStartTime: editing.cycleStartTime && editing.cycleStartTime !== '-' ? editing.cycleStartTime : '',
    cycleEndTime: editing.cycleEndTime && editing.cycleEndTime !== '-' ? editing.cycleEndTime : '',
    hardeningType: editing.hardeningType || '',
    tempProfile: editing.tempProfile || '',
    lines: (editing.items || []).length
      ? editing.items.map((it) => ({
        key: it.id,
        jobCardId: it.jobCardId ? String(it.jobCardId) : '',
        quantity: it.quantity != null ? String(it.quantity) : '',
        weightKg: it.weightKg != null ? String(it.weightKg) : '',
      }))
      : [emptyLine()],
  } : {
    furnaceId: initial.furnaceId ? String(initial.furnaceId) : '',
    runDate: initial.date,
    cycleStartTime: '',
    cycleEndTime: '',
    hardeningType: '',
    tempProfile: '',
    // Arriving from a job card ("Plan a cycle" on that page) starts the load
    // with it already on the first line.
    lines: [initial.jobCardId ? { ...emptyLine(), jobCardId: String(initial.jobCardId) } : emptyLine()],
  }));
  const [saving, setSaving] = useState(false);
  const [cycleInfo, setCycleInfo] = useState(null); // { nextCycleNo, lastCycleNo }

  // Show the number this cycle will get, and the last one already issued for
  // that furnace + month, as soon as a furnace (and date) is picked. An
  // existing cycle already has its number and never gets a new one.
  useEffect(() => {
    if (editing) { setCycleInfo(null); return; }
    if (!form.furnaceId || !form.runDate) { setCycleInfo(null); return; }
    let cancelled = false;
    api.get('/manufacturing/next-cycle-no', { params: { furnaceId: form.furnaceId, date: form.runDate } })
      .then((r) => { if (!cancelled) setCycleInfo(r.data.data); })
      .catch(() => { if (!cancelled) setCycleInfo(null); });
    return () => { cancelled = true; };
  }, [editing, form.furnaceId, form.runDate]);

  const setLine = (key, patch) => setForm((f) => ({ ...f, lines: f.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }));

  const pickJobCard = async (key, jobCardId) => {
    setLine(key, { jobCardId });
    if (!jobCardId) return;
    const jc = jobCards.find((j) => String(j.id) === String(jobCardId));
    if (jc) setLine(key, { quantity: jc.quantity != null ? String(jc.quantity) : '', weightKg: jc.totalWeight != null ? String(jc.totalWeight) : '' });
    try {
      // Same source the run sheet uses: linked inward items give the real qty/weight.
      const r = await api.get(`/jobcards/${jobCardId}`);
      const full = r.data.data;
      const linked = (full.challanItemLinks || []).length ? full.challanItemLinks : (full.challans?.flatMap((c) => c.items || []) || []);
      const qty = linked.reduce((s, it) => s + (Number(it.qty ?? it.quantity) || 0), 0);
      const wt = linked.reduce((s, it) => s + (Number(it.weight) || 0), 0);
      setLine(key, {
        quantity: qty ? String(qty) : (full.quantity != null ? String(full.quantity) : ''),
        weightKg: wt ? String(wt) : (full.totalWeight != null ? String(full.totalWeight) : ''),
      });
    } catch { /* keep the list-row values */ }
  };

  // A line seeded from ?jobCardId= has no qty/weight yet — fetch them the same
  // way picking the card by hand would.
  useEffect(() => {
    if (editing || !initial.jobCardId) return;
    const seeded = form.lines.find((l) => String(l.jobCardId) === String(initial.jobCardId));
    if (seeded) pickJobCard(seeded.key, String(initial.jobCardId));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!form.furnaceId) { toast.error('Select a furnace.'); return; }
    const items = form.lines.filter((l) => l.jobCardId).map((l) => ({
      jobCardId: Number(l.jobCardId),
      quantity: Math.max(1, Math.round(Number(l.quantity) || 1)),
      weightKg: l.weightKg === '' ? null : Number(l.weightKg),
    }));
    if (!items.length) { toast.error('Add at least one job card.'); return; }
    setSaving(true);
    const body = {
      furnaceId: Number(form.furnaceId),
      runDate: form.runDate,
      cycleStartTime: form.cycleStartTime || null,
      cycleEndTime: form.cycleEndTime || null,
      hardeningType: form.hardeningType || null,
      tempProfile: form.tempProfile || null,
      items,
    };
    try {
      // An existing cycle keeps its status and its number; only a new one is
      // born PLANNED.
      const r = editing
        ? await api.put(`/manufacturing/runsheets/${editing.id}`, body)
        : await api.post('/manufacturing/runsheets', { ...body, status: 'PLANNED' });
      onSaved(r.data.data, form.runDate);
    } catch (err) {
      toast.error(err.response?.data?.message || (editing ? 'Could not update the cycle.' : 'Could not plan the cycle.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="no-print border-primary-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">
            {editing ? <>Edit cycle <span className="font-mono text-primary-700">{editing.runsheetNumber}</span></> : 'Plan a cycle'}
          </h3>
          <Button size="icon-sm" variant="ghost" title="Close without saving" aria-label="Close the cycle form without saving" onClick={onCancel}><X /></Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1 lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Furnace *</label>
            <SearchSelect value={form.furnaceId} onChange={(v) => setForm({ ...form, furnaceId: v })} options={machines.map((m) => ({ value: m.id, label: m.name || m.code }))} placeholder="Select furnace" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date *</label>
            <Input type="date" value={form.runDate} onChange={(e) => setForm({ ...form, runDate: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start</label>
            <Input type="time" value={form.cycleStartTime} onChange={(e) => setForm({ ...form, cycleStartTime: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">End</label>
            <Input type="time" value={form.cycleEndTime} onChange={(e) => setForm({ ...form, cycleEndTime: e.target.value })} />
          </div>
          <div className="space-y-1 lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Process</label>
            <Input placeholder="e.g. VACUUM HARDENING" value={form.hardeningType} onChange={(e) => setForm({ ...form, hardeningType: e.target.value })} />
          </div>
          <div className="space-y-1 lg:col-span-3">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Temperature / soak</label>
            <Input placeholder="e.g. 1030°C / 30 MIN" value={form.tempProfile} onChange={(e) => setForm({ ...form, tempProfile: e.target.value })} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Load — job cards</label>
          {form.lines.map((l) => (
            <div key={l.key} className="flex flex-wrap items-center gap-2">
              <SearchSelect className="flex-1 min-w-[220px]" value={l.jobCardId} onChange={(v) => pickJobCard(l.key, v)} options={jobCards.map((j) => ({ value: j.id, label: `${j.jobCardNo} — ${j.customerNameSnapshot || j.customer?.name || ''}` }))} placeholder="Select job card" />
              <Input type="number" min={1} placeholder="Qty" value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value })} className="w-20 text-right tabular-nums" />
              <Input type="number" step="0.001" placeholder="Wt (kg)" value={l.weightKg} onChange={(e) => setLine(l.key, { weightKg: e.target.value })} className="w-28 text-right tabular-nums" />
              {form.lines.length > 1 && (
                <Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={() => setForm((f) => ({ ...f, lines: f.lines.filter((x) => x.key !== l.key) }))}><Trash2 /></Button>
              )}
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }))}><Plus /> Add job card</Button>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={saving}><Save /> {saving ? 'Saving…' : (editing ? 'Save changes' : 'Save plan')}</Button>
          {editing ? (
            <p className="text-[12px] text-slate-500">
              Cycle no stays <span className="font-mono font-bold text-primary-700">{editing.runsheetNumber}</span> — it never changes once issued.
            </p>
          ) : cycleInfo ? (
            <p className="text-[12px] text-slate-500">
              Next cycle no: <span className="font-mono font-bold text-primary-700">{cycleInfo.nextCycleNo}</span>
              {cycleInfo.lastCycleNo ? <> · last created: <span className="font-mono">{cycleInfo.lastCycleNo}</span></> : <> · first cycle this month for this furnace</>}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400">Pick a furnace to see its next cycle no.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DailyProductionPlanning() {
  const [date, setDate] = useState(todayStr());
  const [runsheets, setRunsheets] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobCards, setJobCards] = useState([]);
  const [planForm, setPlanForm] = useState(null); // { furnaceId?, editing? } when open
  const [justPlanned, setJustPlanned] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [deleting, setDeleting] = useState(null); // the run sheet awaiting confirmation
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => { api.get('/jobcards', { params: { limit: 500 } }).then((r) => setJobCards(r.data.data || [])).catch(() => {}); }, []);

  // "Plan a cycle" on a job card lands here with that card in hand — open the
  // form on it, then drop the parameter so a refresh does not reopen the form.
  useEffect(() => {
    const jcId = searchParams.get('jobCardId');
    if (!jcId) return;
    setPlanForm({ jobCardId: jcId });
    searchParams.delete('jobCardId');
    setSearchParams(searchParams, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.get('/machines').then((r) => setMachines(r.data.data || [])).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/manufacturing/daily-planning', { params: { date } })
      .then((r) => setRunsheets(r.data.data.runsheets || []))
      .catch(() => toast.error('Failed to load daily plan.'))
      .finally(() => setLoading(false));
  }, [date, reloadKey]);

  const byMachine = useMemo(() => {
    const usedIds = new Set(runsheets.map((r) => r.furnaceId));
    const list = machines.filter((m) => usedIds.has(m.id));
    return list.length ? list : machines.slice(0, 0);
  }, [machines, runsheets]);

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          .no-print { display: none !important; }
          html, body { background: #fff !important; }
        }
      `}</style>
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Daily Production Planning</h1>
          <p className="page-subtitle">Furnace-wise view of today's HT cycles — each one links to its tempering slot and energy record.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          <Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>
          <Button onClick={() => setPlanForm({})}><Plus /> Plan New Cycle</Button>
        </div>
      </div>

      {justPlanned && (
        <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-900">
            Cycle planned — <span className="font-mono font-bold">{justPlanned.runsheetNumber}</span>. Enter this cycle no on the VHT Run Sheet page to load everything.
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild><Link to={`/manufacturing/runsheet/${justPlanned.id}?start=1`}>Open in VHT Run Sheet</Link></Button>
            <Button size="icon-sm" variant="ghost" onClick={() => setJustPlanned(null)}><X /></Button>
          </div>
        </div>
      )}

      {planForm && (
        <PlanCycleForm
          key={planForm.editing ? `edit-${planForm.editing.id}` : `new-${planForm.furnaceId || ''}-${planForm.jobCardId || ''}`}
          machines={machines}
          jobCards={jobCards}
          initial={{ furnaceId: planForm.furnaceId, date, jobCardId: planForm.jobCardId }}
          editing={planForm.editing || null}
          onCancel={() => setPlanForm(null)}
          onSaved={(rs, runDate) => {
            const wasEdit = Boolean(planForm.editing);
            toast.success(`Cycle ${rs.runsheetNumber} ${wasEdit ? 'updated' : 'planned'}.`);
            if (!wasEdit) setJustPlanned(rs);
            setPlanForm(null);
            if (runDate !== date) setDate(runDate); else setReloadKey((k) => k + 1);
          }}
        />
      )}

      {deleting && (
        <div className="no-print rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm text-rose-900">
            Delete cycle <span className="font-mono font-bold">{deleting.runsheetNumber}</span>?
            {' '}Its {(deleting.items || []).length} job card line(s) come off this plan. This cannot be undone.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" variant="danger" onClick={async () => {
              try {
                await api.delete(`/manufacturing/runsheets/${deleting.id}`);
                toast.success(`Cycle ${deleting.runsheetNumber} deleted.`);
                setDeleting(null);
                setReloadKey((k) => k + 1);
              } catch (err) {
                toast.error(err.response?.data?.message || 'Could not delete the cycle.');
              }
            }}><Trash2 /> Delete cycle</Button>
            <Button size="sm" variant="ghost" onClick={() => setDeleting(null)}>Keep it</Button>
          </div>
        </div>
      )}

      <PrintSheetHeader title="Daily Production Planning" date={date.split('-').reverse().join('/')} />

      {loading ? (
        <div className="no-print card p-10 text-center text-sm text-slate-400">Loading…</div>
      ) : !byMachine.length ? (
        <div className="no-print card p-10 text-center">
          <div className="w-10 h-10 mx-auto rounded-xl bg-amber-50 flex items-center justify-center mb-2"><Flame className="h-5 w-5 text-amber-300" /></div>
          <p className="text-sm text-slate-500">No VHT run sheets planned for {date} yet.</p>
          <Button className="mt-3" variant="outline" size="sm" onClick={() => setPlanForm({})}><Plus /> Plan the first cycle</Button>
        </div>
      ) : (
        <div className="space-y-5 print:space-y-2">
          {byMachine.map((m) => (
            <FurnaceBlock
              key={m.id}
              furnace={m}
              rows={runsheets.filter((r) => r.furnaceId === m.id)}
              onPlan={(fid) => { setDeleting(null); setPlanForm({ furnaceId: fid }); }}
              onEdit={(rs) => { setDeleting(null); setJustPlanned(null); setPlanForm({ editing: rs }); }}
              onDelete={(rs) => { setPlanForm(null); setDeleting(rs); }}
            />
          ))}
        </div>
      )}

      <PrintSheetFooter page="Page 1 of 2" />
    </div>
  );
}
