import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Printer, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { rowEditorKeys } from '../../utils/rowEditorKeys';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PrintSheetHeader, PrintSheetFooter } from '../../components/manufacturing/PrintRegisterSheet';

// Doc control QF/PD/03 page 2 — the tempering furnace board. Every slot can
// batch more than one hardening HT Cycle No together (real client workflow:
// several small loads from different VHT cycles go into one temper run).

const todayStr = () => new Date().toISOString().slice(0, 10);
// Slot times are stored as literal UTC clock values (see backend
// upsertTemperingSlot) — always read them back via the UTC components, never
// toLocaleTimeString, or the displayed time would drift with the viewer's
// browser timezone instead of showing the shop-floor clock time as typed.
const hhmm = (d) => (d ? new Date(d).toISOString().slice(11, 16) : '—');
const toTimeInput = (d) => (d ? new Date(d).toISOString().slice(11, 16) : '');

const emptySlotForm = () => ({ id: null, startTime: '', endTime: '', title: '', batchLabel: '', runsheetIds: [] });

// The plant's secondary tempering furnaces — distinct from the hardening
// furnaces (VPT-01/02, Muffle, Sub Zero) that already have their own board
// on Daily Planning / VHT Runsheet / Furnace Utilisation.
const TEMPERING_FURNACES = ['TFR-01', 'TFR-02', 'TFR-03', 'VTF', 'TF-02'];
const norm = (s) => String(s || '').toUpperCase().replace(/\s+/g, '').trim();
const isTemperingFurnace = (m) => TEMPERING_FURNACES.some((t) => {
  const nt = norm(t);
  return norm(m.code) === nt || norm(m.name) === nt || norm(m.code).startsWith(nt) || norm(m.name).startsWith(nt);
});

export default function TemperingPlan() {
  const [date, setDate] = useState(todayStr());
  const [machines, setMachines] = useState([]);
  const [slots, setSlots] = useState([]);
  const [runsheets, setRunsheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [editing, setEditing] = useState(null); // { machineId, form }
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/machines').then((r) => setMachines(r.data.data || [])).catch(() => {}); }, []);

  const load = () => {
    setLoading(true);
    setEditing(null); // switching dates mid-edit would otherwise leave a stale form open
    Promise.all([
      api.get('/manufacturing/tempering-slots', { params: { date } }),
      api.get('/manufacturing/daily-planning', { params: { date } }),
    ]).then(([slotsRes, planRes]) => {
      setSlots(slotsRes.data.data.slots || []);
      setRunsheets(planRes.data.data.runsheets || []);
    }).catch(() => toast.error('Failed to load tempering plan.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [date]);

  const unlinked = slots.filter((s) => !s.runsheetLinks?.length).length;

  const byMachine = useMemo(() => machines.filter(isTemperingFurnace), [machines]);

  const startAdd = (machineId) => setEditing({ machineId, form: emptySlotForm() });
  const startEdit = (slot) => setEditing({
    machineId: slot.machineId,
    form: {
      id: slot.id,
      startTime: toTimeInput(slot.startTime),
      endTime: toTimeInput(slot.endTime),
      title: slot.title || '',
      batchLabel: slot.batchLabel || '',
      runsheetIds: (slot.runsheetLinks || []).map((l) => l.runsheet.id),
    },
  });

  const toggleRunsheet = (id) => {
    setEditing((e) => {
      const has = e.form.runsheetIds.includes(id);
      return { ...e, form: { ...e.form, runsheetIds: has ? e.form.runsheetIds.filter((x) => x !== id) : [...e.form.runsheetIds, id] } };
    });
  };

  const save = async () => {
    if (!editing) return;
    const { machineId, form } = editing;
    if (!form.startTime || !form.endTime) { toast.error('Start and end time required.'); return; }
    setSaving(true);
    try {
      await api.post('/manufacturing/tempering-slots', {
        id: form.id, date, machineId, startTime: form.startTime, endTime: form.endTime,
        title: form.title, batchLabel: form.batchLabel, runsheetIds: form.runsheetIds,
      });
      toast.success('Slot saved.');
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save slot.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (slot) => setConfirmDialog({
    title: 'Delete this tempering slot?',
    message: `${slot.title || 'This slot'} will be removed from the day's plan, along with the run sheets batched into it. This cannot be undone.`,
    confirmLabel: 'Delete slot',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await api.delete(`/manufacturing/tempering-slots/${slot.id}`);
        toast.success('Slot deleted.');
        load();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete slot.');
      } finally { setConfirmDialog(null); }
    },
  });

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">
      <style>{`@media print { @page { size: A4 landscape; margin: 8mm; } .no-print { display: none !important; } }`}</style>

      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Tempering Furnace Planning</h1>
          <p className="page-subtitle">Every tempering slot names the HT Cycle No(s) it is tempering, so a batch label resolves to real hardening loads.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          <Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>
        </div>
      </div>

      {unlinked > 0 && (
        <div className="no-print flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-[13px] text-amber-900"><span className="font-semibold">{unlinked} slot(s) have no HT Cycle No linked.</span> Link them so the tempering record stays traceable.</p>
        </div>
      )}

      <div className="hidden print:block">
        <PrintSheetHeader title="Tempering Furnace Planning" date={date.split('-').reverse().join('/')} />
        <TemperingPrintTable machines={byMachine} slots={slots} />
        <PrintSheetFooter page="Page 2 of 2" signatures={false} />
      </div>

      {loading ? (
        <div className="no-print card p-10 text-center text-sm text-slate-400">Loading…</div>
      ) : !byMachine.length ? (
        <div className="no-print card p-10 text-center">
          <p className="text-sm text-slate-500">None of the tempering furnaces (TFR-01, TFR-02, TFR-03, VTF, TF-02) are set up yet.</p>
          <p className="mt-1 text-xs text-slate-400">Add them under Master Data → Machines with matching names/codes.</p>
        </div>
      ) : (
        <div className="no-print grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {byMachine.map((m) => {
            const mSlots = slots.filter((s) => s.machineId === m.id);
            return (
              <section key={m.id} className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <h2 className="font-mono text-base font-bold text-slate-900">{m.name || m.code}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400">{mSlots.length} slots</span>
                    <Button size="icon-sm" variant="ghost" className="no-print" title={`Add a slot on ${m.name || m.code}`} aria-label={`Add a tempering slot on ${m.name || m.code}`} onClick={() => startAdd(m.id)}><Plus /></Button>
                  </div>
                </div>
                <ul className="flex-1 divide-y divide-slate-100">
                  {mSlots.map((s) => (
                    <li key={s.id} className="px-4 py-3">
                      {editing?.form?.id === s.id ? (
                        <SlotEditor editing={editing} runsheets={runsheets} onChange={setEditing} onToggle={toggleRunsheet} onSave={save} onCancel={() => setEditing(null)} saving={saving} />
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium leading-snug text-slate-900">{s.title || '—'}</p>
                              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">{s.batchLabel}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <p className="text-right font-mono text-[12px] text-slate-700 tabular-nums">
                                {hhmm(s.startTime)}<span className="block text-slate-400">{hhmm(s.endTime)}</span>
                              </p>
                              <Button size="icon-sm" variant="ghost" title="Edit this slot" aria-label="Edit this tempering slot" className="no-print text-slate-400 hover:text-primary-700" onClick={() => startEdit(s)}><Pencil /></Button>
                              <Button size="icon-sm" variant="ghost" title="Delete this slot" aria-label="Delete this tempering slot" className="no-print text-slate-400 hover:text-rose-600" onClick={() => remove(s)}><Trash2 /></Button>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {s.runsheetLinks?.length > 0 ? s.runsheetLinks.map((l) => (
                              <span key={l.id} className="inline-flex items-center gap-1.5 font-mono text-[12px] font-medium text-primary-700">
                                {l.runsheet.furnaceCycleNo || l.runsheet.runsheetNumber}
                              </span>
                            )) : (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200">Cycle no. not linked</span>
                            )}
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                  {editing?.machineId === m.id && editing.form.id === null && (
                    <li className="px-4 py-3">
                      <SlotEditor editing={editing} runsheets={runsheets} onChange={setEditing} onToggle={toggleRunsheet} onSave={save} onCancel={() => setEditing(null)} saving={saving} />
                    </li>
                  )}
                  {!mSlots.length && editing?.machineId !== m.id && (
                    <li className="px-4 py-6 text-center">
                      <p className="text-[12px] text-slate-400">No slots yet.</p>
                      <Button size="sm" variant="outline" className="no-print mt-2" onClick={() => startAdd(m.id)}>
                        <Plus /> Add the first slot
                      </Button>
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}

// Print-only recreation of the paper page 2 layout: every furnace as its own
// column group, ported from the client-supplied prototype's TemperingPrintTable.
function TemperingPrintTable({ machines, slots }) {
  if (!machines.length) return <p className="text-[10px] uppercase">No tempering furnaces set up yet.</p>;
  const bySlots = machines.map((m) => slots.filter((s) => s.machineId === m.id));
  const maxSlots = Math.max(1, ...bySlots.map((s) => s.length));
  const rows = Array.from({ length: maxSlots }, (_, i) => i + 1);

  return (
    <table className="w-full border-collapse text-[8px]">
      <thead>
        <tr>
          <th className="w-6 px-1 py-1 text-center font-bold uppercase border border-slate-900">S.No</th>
          {machines.map((m) => (
            <th key={m.id} colSpan={3} className="px-1 py-1 text-center font-mono text-[11px] font-bold border border-slate-900">{m.name || m.code}</th>
          ))}
        </tr>
        <tr>
          <th className="px-1 py-0.5 border border-slate-900" />
          {machines.map((m) => (
            <React.Fragment key={m.id}>
              <th className="px-1 py-0.5 text-center font-bold uppercase border border-slate-900">Process</th>
              <th className="w-10 px-1 py-0.5 text-center font-bold uppercase border border-slate-900">Start</th>
              <th className="w-10 px-1 py-0.5 text-center font-bold uppercase border border-slate-900">End</th>
            </React.Fragment>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((srNo) => (
          <React.Fragment key={srNo}>
            <tr>
              <td rowSpan={2} className="px-1 py-1 text-center font-mono text-[10px] font-bold border border-slate-900">{srNo}</td>
              {machines.map((m, mi) => {
                const slot = bySlots[mi][srNo - 1];
                return (
                  <React.Fragment key={m.id}>
                    <td className="px-1 py-1 align-top leading-tight border border-slate-900">
                      {slot ? (
                        <>
                          <span className="block font-medium uppercase">{slot.title || '—'}</span>
                          <span className="mt-0.5 block font-mono text-[7px]">
                            {slot.runsheetLinks?.length ? slot.runsheetLinks.map((l) => l.runsheet.furnaceCycleNo || l.runsheet.runsheetNumber).join(' / ') : 'HT CYCLE NO :- ______'}
                          </span>
                        </>
                      ) : null}
                    </td>
                    <td className="px-1 py-1 text-center font-mono tabular-nums border border-slate-900">{slot ? hhmm(slot.startTime) : ''}</td>
                    <td className="px-1 py-1 text-center font-mono tabular-nums border border-slate-900">{slot ? hhmm(slot.endTime) : ''}</td>
                  </React.Fragment>
                );
              })}
            </tr>
            <tr>
              {machines.map((m, mi) => {
                const slot = bySlots[mi][srNo - 1];
                return (
                  <td key={m.id} colSpan={3} className="px-1 py-0.5 text-center font-semibold uppercase border border-slate-900">{slot?.batchLabel || ''}</td>
                );
              })}
            </tr>
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}

function SlotEditor({ editing, runsheets, onChange, onToggle, onSave, onCancel, saving }) {
  const { form } = editing;
  const set = (k, v) => onChange({ ...editing, form: { ...form, [k]: v } });
  return (
    <div className="rounded-md border border-primary-200 bg-primary-50/40 p-2.5 space-y-2" onKeyDown={rowEditorKeys({ onSave, onCancel, saving })}>
      <div className="flex gap-2">
        <Input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} className="w-28" />
        <Input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} className="w-28" />
      </div>
      <Input placeholder="Process (e.g. 1ST TEMP - 540°C/270MIN)" value={form.title} onChange={(e) => set('title', e.target.value)} />
      <Input placeholder="Batch label (e.g. SHIRODKAR + D2)" value={form.batchLabel} onChange={(e) => set('batchLabel', e.target.value)} />
      {runsheets.length > 0 && (
        <div className="max-h-28 overflow-y-auto rounded border border-slate-200 bg-white p-1.5 space-y-1">
          {runsheets.map((r) => (
            <label key={r.id} className="flex items-center gap-1.5 text-[12px] text-slate-700">
              <input type="checkbox" checked={form.runsheetIds.includes(r.id)} onChange={() => onToggle(r.id)} />
              <span className="font-mono">{r.furnaceCycleNo || r.runsheetNumber}</span>
            </label>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}><X /> Cancel</Button>
      </div>
    </div>
  );
}
