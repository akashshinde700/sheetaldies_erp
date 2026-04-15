import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { toNum, toInt } from '../../utils/normalize';

const DEFAULT_GRAPH = [
  { tempC: 550, holdMin: 20, label: '' },
  { tempC: 850, holdMin: 20, label: '' },
  { tempC: 1045, holdMin: 120, label: 'Soak' },
];

const emptyLine = () => ({
  jobCardId: '',
  quantity: '',
  weightKg: '',
  plannedSlot: '',
  customerName: '',
  jobDescription: '',
  materialGrade: '',
  hrcRequired: '',
});

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function expandToPlot(points) {
  if (!points?.length) return [];
  let t = 0;
  const out = [{ t: 0, temp: Number(points[0].tempC) }];
  for (let i = 0; i < points.length; i++) {
    const temp = Number(points[i].tempC);
    const hold = Number(points[i].holdMin) || 0;
    if (i > 0) {
      const prev = out[out.length - 1];
      if (prev.temp !== temp) out.push({ t, temp });
    }
    t += hold;
    out.push({ t, temp });
  }
  out.push({ t: t + 8, temp: 80 });
  return out;
}

function RunGraphPreview({ graph }) {
  const pts = useMemo(() => expandToPlot(graph), [graph]);
  if (pts.length < 2) return <div className="text-xs text-slate-400">Add graph points.</div>;

  const w = 560;
  const h = 160;
  const pad = 28;
  const minX = Math.min(...pts.map((p) => p.t));
  const maxX = Math.max(...pts.map((p) => p.t));
  const minY = Math.min(...pts.map((p) => p.temp), 0);
  const maxY = Math.max(...pts.map((p) => p.temp));
  const sx = (x) => pad + ((x - minX) / (maxX - minX || 1)) * (w - pad * 2);
  const sy = (y) => h - pad - ((y - minY) / (maxY - minY || 1)) * (h - pad * 2);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.t).toFixed(2)} ${sy(p.temp).toFixed(2)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-xl h-[160px] border border-slate-200 rounded bg-white">
      <path d={d} fill="none" stroke="#1e293b" strokeWidth="2" />
      {pts.map((p, i) => (
        <circle key={i} cx={sx(p.t)} cy={sy(p.temp)} r="2.5" fill="#6366f1" />
      ))}
      <text x={pad} y={h - 6} className="text-[9px] fill-slate-500">Time (min)</text>
      <text x={4} y={pad} className="text-[9px] fill-slate-500" transform={`rotate(-90 4 ${pad})`}>°C</text>
    </svg>
  );
}

export default function VHTRunsheetForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [machines, setMachines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [jobCards, setJobCards] = useState([]);
  const [jobCardNoLookup, setJobCardNoLookup] = useState('');
  const [fillingJobCard, setFillingJobCard] = useState(false);

  const [form, setForm] = useState({
    batchId: '',
    furnaceId: '',
    runDate: todayISODate(),
    cycleEndTime: '',
    totalTimeDisplay: '',
    mrStart: '',
    mrEnd: '',
    totalMr: '',
    loadingOperatorName: '',
    docRevNo: '01',
    docEffectiveDate: '2021-01-01',
    docPageOf: '1 of 2',
    tempProfile: '',
    cycleTime: 480,
    hardeningType: '',
    quenchPressureBar: '',
    fanRpm: '',
    fixturesPosition: '',
    tempGraphPoints: DEFAULT_GRAPH,
    operatorSign: '',
    supervisorSign: '',
    supervisorVerifiedAt: '',
    verificationNote: '',
    status: 'IN_PROGRESS',
    actualOutput: '',
    remarks: '',
    items: [emptyLine()],
  });

  useEffect(() => {
    Promise.all([
      api.get('/machines'),
      api.get('/manufacturing/batches', { params: { limit: 100 } }),
      api.get('/jobcards', { params: { limit: 500 } }),
    ])
      .then(([m, b, j]) => {
        setMachines(m.data.data || []);
        setBatches(b.data.data || []);
        setJobCards(j.data.data || []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    api
      .get(`/manufacturing/runsheets/${id}`)
      .then((res) => {
        const r = res.data.data;
        if (!r) return;
        const g = r.tempGraphPoints;
        const graph = Array.isArray(g) ? g : typeof g === 'string' ? JSON.parse(g || '[]') : DEFAULT_GRAPH;
        setForm({
          batchId: r.batchId ? String(r.batchId) : '',
          furnaceId: String(r.furnaceId || ''),
          runDate: r.runDate ? r.runDate.slice(0, 10) : todayISODate(),
          cycleEndTime: r.cycleEndTime || '',
          totalTimeDisplay: r.totalTimeDisplay || '',
          mrStart: r.mrStart != null ? String(r.mrStart) : '',
          mrEnd: r.mrEnd != null ? String(r.mrEnd) : '',
          totalMr: r.totalMr != null ? String(r.totalMr) : '',
          loadingOperatorName: r.loadingOperatorName || '',
          docRevNo: r.docRevNo || '01',
          docEffectiveDate: r.docEffectiveDate ? r.docEffectiveDate.slice(0, 10) : '',
          docPageOf: r.docPageOf || '1 of 2',
          tempProfile: r.tempProfile || '',
          cycleTime: r.cycleTime || 480,
          hardeningType: r.hardeningType || '',
          quenchPressureBar: r.quenchPressureBar != null ? String(r.quenchPressureBar) : '',
          fanRpm: r.fanRpm != null ? String(r.fanRpm) : '',
          fixturesPosition: r.fixturesPosition || '',
          tempGraphPoints: graph.length ? graph : DEFAULT_GRAPH,
          operatorSign: r.operatorSign || '',
          supervisorSign: r.supervisorSign || '',
          supervisorVerifiedAt: r.supervisorVerifiedAt
            ? new Date(r.supervisorVerifiedAt).toISOString().slice(0, 16)
            : '',
          verificationNote: r.verificationNote || '',
          status: r.status || 'PLANNED',
          actualOutput: r.actualOutput != null ? String(r.actualOutput) : '',
          remarks: r.remarks || '',
          items:
            r.items?.map((it) => ({
              jobCardId: it.jobCardId ? String(it.jobCardId) : '',
              itemId: it.itemId ? String(it.itemId) : '',
              quantity: String(it.quantity ?? ''),
              weightKg: it.weightKg != null ? String(it.weightKg) : '',
              plannedSlot: it.plannedSlot || '',
              customerName: it.customerName || '',
              jobDescription: it.jobDescription || '',
              materialGrade: it.materialGrade || '',
              hrcRequired: it.hrcRequired || '',
            })) || [emptyLine()],
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const jcById = useMemo(() => {
    const m = new Map();
    (jobCards || []).forEach((jc) => m.set(jc.id, jc));
    return m;
  }, [jobCards]);

  const onSelectJobCard = (idx, jobCardId) => {
    const jc = jcById.get(Number(jobCardId));
    const next = [...form.items];
    next[idx] = {
      ...next[idx],
      jobCardId,
      quantity: jc ? String(jc.quantity) : next[idx].quantity,
      weightKg: jc?.totalWeight != null ? String(jc.totalWeight) : next[idx].weightKg,
      customerName: jc?.customerNameSnapshot || jc?.customer?.name || '',
      jobDescription: jc?.part?.description || '',
      materialGrade: jc?.dieMaterial || jc?.part?.material || '',
      hrcRequired: jc?.hrcRange || '',
    };
    setForm({ ...form, items: next });
  };

  const updateItem = (idx, field, value) => {
    const next = [...form.items];
    next[idx] = { ...next[idx], [field]: value };
    setForm({ ...form, items: next });
  };

  const fillFromJobCardNumber = () => {
    const number = jobCardNoLookup.trim();
    if (!number) {
      toast.error('Enter a job card number to fill the run sheet.');
      return;
    }
    const found = jobCards.find((jc) => String(jc.jobCardNo).toLowerCase() === number.toLowerCase());
    if (!found) {
      toast.error('Job card number not found.');
      return;
    }
    setForm((prev) => ({
      ...prev,
      items: [{
        ...emptyLine(),
        jobCardId: String(found.id),
        quantity: found.quantity ? String(found.quantity) : prev.items[0]?.quantity || '',
        weightKg: found.totalWeight != null ? String(found.totalWeight) : prev.items[0]?.weightKg || '',
      }],
    }));
    toast.success(`Loaded job card ${found.jobCardNo}.`);
  };

  const updateGraphRow = (idx, field, value) => {
    const next = [...(form.tempGraphPoints || [])];
    next[idx] = { ...next[idx], [field]: field === 'holdMin' || field === 'tempC' ? (value === '' ? '' : Number(value)) : value };
    setForm({ ...form, tempGraphPoints: next });
  };

  const totalWeight = useMemo(
    () =>
      form.items.reduce((s, it) => s + toNum(it.weightKg, 0), 0),
    [form.items]
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!form.furnaceId) {
      toast.error('Select furnace.');
      return;
    }
    const lines = form.items
      .filter((it) => it.jobCardId)
      .map((it) => ({
        jobCardId: toInt(it.jobCardId),
        quantity: toNum(it.quantity, 0),
        weightKg: it.weightKg === '' ? null : toNum(it.weightKg, 0),
        plannedSlot: it.plannedSlot || null,
        customerName: it.customerName || null,
        jobDescription: it.jobDescription || null,
        materialGrade: it.materialGrade || null,
        hrcRequired: it.hrcRequired || null,
      }));
    if (!lines.length) {
      toast.error('Add at least one line with a job card.');
      return;
    }

    const validGraphPoints = (form.tempGraphPoints || [])
      .filter((p) => p.tempC !== '' && p.tempC != null && !Number.isNaN(Number(p.tempC)))
      .map((p) => ({
        tempC: toNum(p.tempC, 0),
        holdMin: toNum(p.holdMin, 0),
        label: p.label || null,
      }));
    
    if (!validGraphPoints.length) {
      toast.error('Add at least one temperature segment for the graph.');
      return;
    }

    const payload = {
      batchId: form.batchId ? toInt(form.batchId) : null,
      furnaceId: toInt(form.furnaceId),
      runDate: form.runDate,
      cycleEndTime: form.cycleEndTime || null,
      totalTimeDisplay: form.totalTimeDisplay || null,
      mrStart: form.mrStart === '' ? null : toNum(form.mrStart, 0),
      mrEnd: form.mrEnd === '' ? null : toNum(form.mrEnd, 0),
      totalMr: form.totalMr === '' ? null : toNum(form.totalMr, 0),
      loadingOperatorName: form.loadingOperatorName || null,
      docRevNo: form.docRevNo || null,
      docEffectiveDate: form.docEffectiveDate || null,
      docPageOf: form.docPageOf || null,
      tempProfile: form.tempProfile || null,
      cycleTime: form.cycleTime ? toNum(form.cycleTime, 240) : 240,
      hardeningType: form.hardeningType || null,
      quenchPressureBar: form.quenchPressureBar === '' ? null : toNum(form.quenchPressureBar, 0),
      fanRpm: form.fanRpm === '' ? null : toNum(form.fanRpm, 0),
      fixturesPosition: form.fixturesPosition || null,
      tempGraphPoints: validGraphPoints,
      operatorSign: form.operatorSign || null,
      supervisorSign: form.supervisorSign || null,
      supervisorVerifiedAt: form.supervisorVerifiedAt || null,
      verificationNote: form.verificationNote || null,
      status: form.status,
      actualOutput: form.actualOutput === '' ? null : toNum(form.actualOutput, 0),
      remarks: form.remarks || null,
      items: lines,
    };

    setSaving(true);
    try {
      if (isNew) {
        await api.post('/manufacturing/runsheets', payload);
        toast.success('Run sheet saved.');
        navigate('/manufacturing/runsheet');
      } else {
        await api.put(`/manufacturing/runsheets/${id}`, payload);
        toast.success('Run sheet updated.');
        navigate('/manufacturing/runsheet');
      }
    } catch (err) {
      const msg = err.response?.data?.errors?.map((e) => e.message).join(', ') || err.response?.data?.message || err.message;
      toast.error(msg || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-400 text-sm">Loading…</div>;
  }

  return (
    <div className="page-stack w-full p-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <Link to="/manufacturing/runsheet" className="text-sm text-indigo-600 hover:underline">
            ← Run sheets
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-2">{isNew ? 'New VHT Run Sheet' : 'Edit VHT Run Sheet'}</h1>
        </div>
        {!isNew && (
          <Link
            to={`/manufacturing/runsheet/${id}/print`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-slate-600 hover:text-indigo-600"
          >
            Open print view
          </Link>
        )}
      </div>

      <form onSubmit={submit} className="space-y-8">
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Header</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="block text-xs">
              <span className="text-slate-500">Run date *</span>
              <input
                type="date"
                required
                value={form.runDate}
                onChange={(e) => setForm({ ...form, runDate: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs">
              <span className="text-slate-500">Furnace *</span>
              <select
                required
                value={form.furnaceId}
                onChange={(e) => setForm({ ...form, furnaceId: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.name || m.code}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs">
              <span className="text-slate-500">Manufacturing batch (optional)</span>
              <select
                value={form.batchId}
                onChange={(e) => setForm({ ...form, batchId: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.batchNumber}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs">
              <span className="text-slate-500">Cycle end time</span>
              <input
                type="time"
                value={form.cycleEndTime}
                onChange={(e) => setForm({ ...form, cycleEndTime: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs">
              <span className="text-slate-500">Total time (display)</span>
              <input
                type="text"
                placeholder="e.g. 8:00"
                value={form.totalTimeDisplay}
                onChange={(e) => setForm({ ...form, totalTimeDisplay: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs">
              <span className="text-slate-500">Cycle (minutes)</span>
              <input
                type="number"
                value={form.cycleTime}
                onChange={(e) => setForm({ ...form, cycleTime: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs">
              <span className="text-slate-500">M.R. start</span>
              <input
                type="number"
                value={form.mrStart}
                onChange={(e) => setForm({ ...form, mrStart: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs">
              <span className="text-slate-500">M.R. end</span>
              <input
                type="number"
                value={form.mrEnd}
                onChange={(e) => setForm({ ...form, mrEnd: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs">
              <span className="text-slate-500">Total M.R.</span>
              <input
                type="number"
                value={form.totalMr}
                onChange={(e) => setForm({ ...form, totalMr: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs sm:col-span-2">
              <span className="text-slate-500">Loading operator</span>
              <input
                type="text"
                value={form.loadingOperatorName}
                onChange={(e) => setForm({ ...form, loadingOperatorName: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <label className="block text-xs">
              <span className="text-slate-500">Doc rev.</span>
              <input
                type="text"
                value={form.docRevNo}
                onChange={(e) => setForm({ ...form, docRevNo: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs">
              <span className="text-slate-500">Effective date</span>
              <input
                type="date"
                value={form.docEffectiveDate}
                onChange={(e) => setForm({ ...form, docEffectiveDate: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs">
              <span className="text-slate-500">Page</span>
              <input
                type="text"
                value={form.docPageOf}
                onChange={(e) => setForm({ ...form, docPageOf: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Jobs in this batch</h2>
              <p className="text-xs text-slate-500">Select job cards or load one by number.</p>
            </div>
            <span className="text-xs text-slate-500">Total weight: <strong>{totalWeight.toFixed(2)}</strong> kg</span>
          </div>
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <label className="block text-xs">
              <span className="text-slate-500">Job card number</span>
              <input
                type="text"
                value={jobCardNoLookup}
                onChange={(e) => setJobCardNoLookup(e.target.value)}
                placeholder="Enter job card number"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={fillFromJobCardNumber}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Load from job card
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[800px]">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 pr-2">Job card *</th>
                  <th className="py-2 pr-2">Customer</th>
                  <th className="py-2 pr-2">Description</th>
                  <th className="py-2 pr-2">Material</th>
                  <th className="py-2 pr-2">HRC req</th>
                  <th className="py-2 pr-2">Qty</th>
                  <th className="py-2 pr-2">Wt (kg)</th>
                  <th className="py-2 pr-2">Slot</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, idx) => (
                  <tr key={idx} className="border-b border-slate-50">
                    <td className="py-2 pr-2">
                      <select
                        value={it.jobCardId}
                        onChange={(e) => onSelectJobCard(idx, e.target.value)}
                        className="w-full border rounded px-2 py-1.5 max-w-[200px]"
                        required={idx === 0}
                      >
                        <option value="">Select job card</option>
                        {jobCards.map((jc) => (
                          <option key={jc.id} value={jc.id}>
                            {jc.jobCardNo}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        className="w-full border rounded px-2 py-1.5"
                        value={it.customerName}
                        onChange={(e) => updateItem(idx, 'customerName', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        className="w-full border rounded px-2 py-1.5"
                        value={it.jobDescription}
                        onChange={(e) => updateItem(idx, 'jobDescription', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        className="w-full border rounded px-2 py-1.5"
                        value={it.materialGrade}
                        onChange={(e) => updateItem(idx, 'materialGrade', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        className="w-full border rounded px-2 py-1.5 max-w-[90px]"
                        value={it.hrcRequired}
                        onChange={(e) => updateItem(idx, 'hrcRequired', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        className="w-16 border rounded px-2 py-1.5"
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        step="0.01"
                        className="w-20 border rounded px-2 py-1.5"
                        value={it.weightKg}
                        onChange={(e) => updateItem(idx, 'weightKg', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        className="w-20 border rounded px-2 py-1.5"
                        value={it.plannedSlot}
                        onChange={(e) => updateItem(idx, 'plannedSlot', e.target.value)}
                        placeholder="—"
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => {
                          const next = form.items.filter((_, i) => i !== idx);
                          setForm({ ...form, items: next.length ? next : [emptyLine()] });
                        }}
                        className="text-red-600 text-xs"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, items: [...form.items, emptyLine()] })}
            className="text-sm text-indigo-600 font-medium"
          >
            + Add line
          </button>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Cycle parameters</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-xs">
              <span className="text-slate-500">Type of hardening / mix</span>
              <input
                value={form.hardeningType}
                onChange={(e) => setForm({ ...form, hardeningType: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. D2, SS303 + D2"
              />
            </label>
            <label className="block text-xs">
              <span className="text-slate-500">Temp profile (text)</span>
              <input
                value={form.tempProfile}
                onChange={(e) => setForm({ ...form, tempProfile: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs">
              <span className="text-slate-500">Quenching pressure (bar)</span>
              <input
                type="number"
                step="0.01"
                value={form.quenchPressureBar}
                onChange={(e) => setForm({ ...form, quenchPressureBar: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs">
              <span className="text-slate-500">Fan speed (RPM)</span>
              <input
                type="number"
                value={form.fanRpm}
                onChange={(e) => setForm({ ...form, fanRpm: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs sm:col-span-2">
              <span className="text-slate-500">Fixtures / T.C. position</span>
              <input
                value={form.fixturesPosition}
                onChange={(e) => setForm({ ...form, fixturesPosition: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. LH-02"
              />
            </label>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Temperature–time graph (steps)</h2>
          <p className="text-xs text-slate-500">
            Enter soak segments (°C and hold minutes). Preview shows a step curve similar to the paper graph.
          </p>
          <div className="space-y-2">
            {(form.tempGraphPoints || []).map((row, idx) => (
              <div key={idx} className="flex flex-wrap gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-24 border rounded px-2 py-1.5 text-sm"
                  placeholder="°C *"
                  value={row.tempC}
                  onChange={(e) => updateGraphRow(idx, 'tempC', e.target.value)}
                  required
                />
                <span className="text-xs text-slate-500">for</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-20 border rounded px-2 py-1.5 text-sm"
                  placeholder="min *"
                  value={row.holdMin}
                  onChange={(e) => updateGraphRow(idx, 'holdMin', e.target.value)}
                  required
                />
                <input
                  type="text"
                  className="flex-1 min-w-[120px] border rounded px-2 py-1.5 text-sm"
                  placeholder="Label (optional)"
                  value={row.label || ''}
                  onChange={(e) => updateGraphRow(idx, 'label', e.target.value)}
                />
                <button
                  type="button"
                  className="text-xs text-red-600"
                  onClick={() => {
                    const next = (form.tempGraphPoints || []).filter((_, i) => i !== idx);
                    setForm({ ...form, tempGraphPoints: next.length ? next : DEFAULT_GRAPH });
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-indigo-600"
              onClick={() =>
                setForm({
                  ...form,
                  tempGraphPoints: [...(form.tempGraphPoints || []), { tempC: '', holdMin: '', label: '' }],
                })
              }
            >
              + Add segment
            </button>
          </div>
          <RunGraphPreview graph={form.tempGraphPoints} />
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Verification & status</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-xs">
              <span className="text-slate-500">Operator sign</span>
              <input
                value={form.operatorSign}
                onChange={(e) => setForm({ ...form, operatorSign: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs">
              <span className="text-slate-500">Production supervisor sign</span>
              <input
                value={form.supervisorSign}
                onChange={(e) => setForm({ ...form, supervisorSign: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs">
              <span className="text-slate-500">Supervisor verified at</span>
              <input
                type="datetime-local"
                value={form.supervisorVerifiedAt}
                onChange={(e) => setForm({ ...form, supervisorVerifiedAt: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs">
              <span className="text-slate-500">Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>
            <label className="block text-xs sm:col-span-2">
              <span className="text-slate-500">Verification note</span>
              <textarea
                value={form.verificationNote}
                onChange={(e) => setForm({ ...form, verificationNote: e.target.value })}
                rows={2}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="After processing within 24 hrs, supervisor shall verify process parameter (graph) & sign."
              />
            </label>
            <label className="block text-xs sm:col-span-2">
              <span className="text-slate-500">Remarks</span>
              <textarea
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                rows={2}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
          </div>
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link to="/manufacturing/runsheet" className="px-6 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
