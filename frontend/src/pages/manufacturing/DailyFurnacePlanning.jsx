import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const todayStr = () => new Date().toISOString().split('T')[0];

const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

function isoFromDateAndTime(dateStr, timeStr) {
  // local datetime
  return new Date(`${dateStr}T${timeStr}:00`);
}

export default function DailyFurnacePlanning() {
  const [date, setDate] = useState(todayStr());
  const [machines, setMachines] = useState([]);
  const [jobcards, setJobcards] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [day, setDay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    machineId: '',
    jobCardId: '',
    processTypeId: '',
    stage: 'HARDENING',
    start: '14:30',
    end: '21:00',
    tempC: '',
    holdMin: '',
    pressureBar: '',
    fanRpm: '',
    holdAtC: '',
    holdExtraMin: '',
    title: '',
    remarks: '',
  });

  useEffect(() => {
    Promise.all([
      api.get('/machines'),
      api.get('/jobcards?limit=200'),
      api.get('/processes'),
    ]).then(([m, j, p]) => {
      setMachines(m.data.data || []);
      setJobcards(j.data.data || []);
      setProcesses((p.data.data || []).filter(x => x.isActive));
    }).catch(() => {});
  }, []);

  const fetchDay = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/furnace-planning/day?date=${date}`);
      setDay(r.data.data || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDay(); }, [date]);

  const slotsByMachine = useMemo(() => {
    const map = new Map();
    (day?.slots || []).forEach(s => {
      const k = String(s.machineId);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(s);
    });
    for (const arr of map.values()) arr.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    return map;
  }, [day]);

  const createSlot = async () => {
    if (!form.machineId) { toast.error('Select furnace/machine.'); return; }
    const payload = {
      date,
      machineId: form.machineId,
      jobCardId: form.jobCardId || null,
      processTypeId: form.processTypeId || null,
      stage: form.stage,
      startTime: isoFromDateAndTime(date, form.start).toISOString(),
      endTime: isoFromDateAndTime(date, form.end).toISOString(),
      tempC: form.tempC || null,
      holdMin: form.holdMin || null,
      pressureBar: form.pressureBar || null,
      fanRpm: form.fanRpm || null,
      holdAtC: form.holdAtC || null,
      holdExtraMin: form.holdExtraMin || null,
      title: form.title || null,
      remarks: form.remarks || null,
    };
    setSaving(true);
    try {
      await api.post('/furnace-planning/slots', payload);
      await fetchDay();
      setForm(p => ({ ...p, jobCardId: '', title: '', remarks: '' }));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create slot.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSlot = async (id) => {
    if (!window.confirm('Delete this slot?')) return;
    setSaving(true);
    try {
      await api.delete(`/furnace-planning/slots/${id}`);
      await fetchDay();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete slot.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack w-full space-y-4 animate-slide-up">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Daily Production Planning</h2>
          <p className="text-xs text-slate-500 mt-0.5">VPT-01 / VPT-02 style furnace timetable</p>
        </div>
        <Link to={`/manufacturing/planning/print?date=${date}`} className="btn-outline">
          <span className="material-symbols-outlined text-sm">print</span> Print
        </Link>
      </div>

      <div className="card p-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="form-label">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-input w-44" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="form-label">Furnace / Machine</label>
          <select value={form.machineId} onChange={(e) => setForm(p => ({ ...p, machineId: e.target.value }))} className="form-input">
            <option value="">— Select —</option>
            {machines.map(m => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[240px]">
          <label className="form-label">Job Card</label>
          <select value={form.jobCardId} onChange={(e) => setForm(p => ({ ...p, jobCardId: e.target.value }))} className="form-input">
            <option value="">— Optional —</option>
            {jobcards.map(j => <option key={j.id} value={j.id}>{j.jobCardNo} — {j.part?.description || j.part?.partNo || ''}</option>)}
          </select>
        </div>
        <div className="min-w-[220px]">
          <label className="form-label">Process</label>
          <select value={form.processTypeId} onChange={(e) => setForm(p => ({ ...p, processTypeId: e.target.value }))} className="form-input">
            <option value="">— Optional —</option>
            {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="min-w-[180px]">
          <label className="form-label">Stage</label>
          <select value={form.stage} onChange={(e) => setForm(p => ({ ...p, stage: e.target.value }))} className="form-input">
            <option value="HARDENING">HARDENING</option>
            <option value="TEMPERING">TEMPERING</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Start</label>
            <input value={form.start} onChange={(e) => setForm(p => ({ ...p, start: e.target.value }))} className="form-input w-28" placeholder="14:30" />
          </div>
          <div>
            <label className="form-label">End</label>
            <input value={form.end} onChange={(e) => setForm(p => ({ ...p, end: e.target.value }))} className="form-input w-28" placeholder="21:00" />
          </div>
        </div>

        <button type="button" onClick={createSlot} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : <><span className="material-symbols-outlined text-sm">add</span> Add Slot</>}
        </button>
      </div>

      <div className="card p-5 space-y-4">
        <p className="section-title border-b border-slate-100 pb-2">Cycle Parameters (Optional)</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            ['tempC','Temp °C'], ['holdMin','Hold min'], ['pressureBar','Bar'], ['fanRpm','RPM'],
            ['holdAtC','Hold@°C'], ['holdExtraMin','Hold extra min'],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="form-label">{label}</label>
              <input value={form[k]} onChange={(e) => setForm(p => ({ ...p, [k]: e.target.value }))} className="form-input" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="form-label">Title</label>
            <input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} className="form-input" placeholder="e.g. HOLD-250° / 15 MIN" />
          </div>
          <div>
            <label className="form-label">Remarks</label>
            <input value={form.remarks} onChange={(e) => setForm(p => ({ ...p, remarks: e.target.value }))} className="form-input" placeholder="Notes..." />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-slate-400 text-sm">Loading…</div>
        ) : (
          machines.map((m) => {
            const slots = slotsByMachine.get(String(m.id)) || [];
            if (slots.length === 0) return null;
            return (
              <div key={m.id} className="card p-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                  <p className="section-title">{m.code} — {m.name}</p>
                  <span className="text-[10px] text-slate-400 font-mono">{date}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        {['Time','Stage','Customer/Job','Process','Cycle','Hold','Notes',''].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {slots.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2 font-mono">
                            {fmtTime(s.startTime)} – {fmtTime(s.endTime)}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`badge text-[10px] ${
                              s.stage === 'TEMPERING' ? 'bg-amber-100 text-amber-700' :
                              s.stage === 'OTHER' ? 'bg-slate-100 text-slate-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>{s.stage}</span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-bold text-slate-800">{s.jobCard?.customer?.name || s.jobCard?.customerNameSnapshot || '—'}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{s.jobCard?.jobCardNo || s.title || ''}</div>
                          </td>
                          <td className="px-3 py-2">{s.processType?.name || '—'}</td>
                          <td className="px-3 py-2 font-mono">
                            {s.tempC ? `${s.tempC}° / ` : ''}{s.holdMin ? `${s.holdMin}min` : '—'}
                            {s.pressureBar ? ` · ${s.pressureBar}bar` : ''}{s.fanRpm ? ` · ${s.fanRpm}rpm` : ''}
                          </td>
                          <td className="px-3 py-2 font-mono">
                            {s.holdAtC ? `${s.holdAtC}°` : '—'}{s.holdExtraMin ? ` / ${s.holdExtraMin}min` : ''}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{s.remarks || '—'}</td>
                          <td className="px-3 py-2 text-right">
                            <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => deleteSlot(s.id)}>
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
        {!loading && (day?.slots?.length || 0) === 0 && (
          <div className="card p-6 text-center text-slate-500 text-sm">No slots planned for this date.</div>
        )}
      </div>
    </div>
  );
}

