import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { toNum, toInt } from '../../utils/normalize';
import SearchSelect from '../../components/SearchSelect';
import HeatCycleGraphPreview from '../../components/HeatCycleGraphPreview';
import {
  CYCLE_PRESETS,
  CYCLE_NAMES,
  DEFAULT_GRAPH_SEGMENTS,
} from '../../data/heatTreatmentCycles';
import { Plus, Printer, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Stepper, useStepper } from '@/components/ui/stepper';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DEFAULT_GRAPH = DEFAULT_GRAPH_SEGMENTS;

const GroupTitle = ({ children }) => (
  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{children}</p>
);

const emptyLine = () => ({
  _id: Math.random(),
  jobCardId: '',
  quantity: '',
  weightKg: '',
  plannedSlot: '',
  customerName: '',
  jobDescription: '',
  materialGrade: '',
  hrcRequired: '',
  fixtures: '',
  tcPosition: '',
  instruction: '',
});

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// "07:00" + "17:00" -> "10:00" (H:MM). Assumes the cycle finishes the same
// day; if end time is earlier than start it's treated as running past
// midnight (adds 24h) rather than showing a negative duration.
function computeDurationDisplay(start, end) {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return '';
  let minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

export default function VHTRunsheetForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [machines, setMachines] = useState([]);
  const [jobCards, setJobCards] = useState([]);
  const [jobCardNoLookup, setJobCardNoLookup] = useState('');
  const [fillingJobCard, setFillingJobCard] = useState(false);
  const [masterGraphs, setMasterGraphs] = useState([]);

  useEffect(() => {
    api.get('/quality/temp-cycle-templates', { params: { isActive: 'true', limit: 200 } })
      .then(r => setMasterGraphs(r.data.data || []))
      .catch(() => {});
  }, []);

  const loadMasterGraph = async (graphId) => {
    if (!graphId) return;
    try {
      const r = await api.get(`/quality/temp-cycle-templates/${graphId}`);
      const segments = r.data.data?.data;
      if (segments?.length) {
        setForm(f => ({ ...f, tempGraphPoints: segments.map(p => ({ ...p })) }));
        toast.success(`Loaded graph: ${r.data.data.name}`);
      }
    } catch {
      toast.error('Failed to load graph.');
    }
  };

  const [form, setForm] = useState({
    batchId: '',
    furnaceId: '',
    runDate: todayISODate(),
    cycleStartTime: '',
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
    gasPressure: '',
    waterCirculationFrom: '',
    waterCirculationTo: '',
    powerFailureFrom: '',
    powerFailureTo: '',
    otherCheckpoint: '',
    status: 'IN_PROGRESS',
    actualOutput: '',
    remarks: '',
    items: [emptyLine()],
  });

  // Total time and Total M.R. are fully derived from the start/end pairs —
  // auto-recompute whenever those change instead of relying on manual entry
  // (manual entry is what produced the wrong "-1" seen on a real run sheet).
  useEffect(() => {
    setForm(f => ({ ...f, totalTimeDisplay: computeDurationDisplay(f.cycleStartTime, f.cycleEndTime) }));
  }, [form.cycleStartTime, form.cycleEndTime]);

  useEffect(() => {
    setForm(f => {
      if (f.mrStart === '' || f.mrEnd === '') return f;
      const diff = toNum(f.mrEnd, 0) - toNum(f.mrStart, 0);
      return { ...f, totalMr: String(diff) };
    });
  }, [form.mrStart, form.mrEnd]);

  useEffect(() => {
    Promise.all([
      api.get('/machines'),
      api.get('/jobcards', { params: { limit: 500 } }),
    ])
      .then(([m, j]) => {
        setMachines(m.data.data || []);
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
          cycleStartTime: r.cycleStartTime || '',
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
          gasPressure: r.gasPressure || '',
          waterCirculationFrom: r.waterCirculationFrom || '',
          waterCirculationTo: r.waterCirculationTo || '',
          powerFailureFrom: r.powerFailureFrom || '',
          powerFailureTo: r.powerFailureTo || '',
          otherCheckpoint: r.otherCheckpoint || '',
          status: r.status || 'PLANNED',
          actualOutput: r.actualOutput != null ? String(r.actualOutput) : '',
          remarks: r.remarks || '',
          items:
            r.items?.map((it) => ({
              _id: it.id ?? Math.random(),
              jobCardId: it.jobCardId ? String(it.jobCardId) : '',
              itemId: it.itemId ? String(it.itemId) : '',
              quantity: String(it.quantity ?? ''),
              weightKg: it.weightKg != null ? String(it.weightKg) : '',
              plannedSlot: it.plannedSlot || '',
              customerName: it.customerName || '',
              jobDescription: it.jobDescription || '',
              materialGrade: it.materialGrade || '',
              hrcRequired: it.hrcRequired || '',
              fixtures: it.fixtures || '',
              tcPosition: it.tcPosition || '',
              instruction: it.instruction || '',
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

  const onSelectJobCard = async (idx, jobCardId) => {
    const jc = jcById.get(Number(jobCardId));
    // Seed immediately from the list-row data (fast, but its quantity/
    // totalWeight/material can be stale header fields), then replace with
    // the full job card detail's actual linked-item totals — the same
    // numbers shown on the Job Card's own Items table — once it loads.
    setForm(prev => {
      const next = [...prev.items];
      next[idx] = {
        ...next[idx],
        jobCardId,
        customerName: jc?.customerNameSnapshot || jc?.customer?.name || '',
        hrcRequired: jc?.hrcRange || '',
      };
      return { ...prev, items: next };
    });
    if (!jobCardId) return;
    try {
      const r = await api.get(`/jobcards/${jobCardId}`);
      const full = r.data.data;
      const linkedItems = (full.challanItemLinks || []).length > 0
        ? full.challanItemLinks
        : (full.challans?.flatMap(ch => ch.items || []) || []);
      const totalQty = linkedItems.reduce((s, it) => s + (Number(it.qty ?? it.quantity) || 0), 0);
      const totalWt  = linkedItems.reduce((s, it) => s + (Number(it.weight) || 0), 0);
      const material = full.dieMaterial || linkedItems[0]?.material || '';
      setForm(prev => {
        const next = [...prev.items];
        if (next[idx]?.jobCardId !== jobCardId) return prev; // user picked a different card while this was loading
        next[idx] = {
          ...next[idx],
          quantity: totalQty ? String(totalQty) : (full.quantity != null ? String(full.quantity) : next[idx].quantity),
          weightKg: totalWt ? String(totalWt) : (full.totalWeight != null ? String(full.totalWeight) : next[idx].weightKg),
          materialGrade: material,
        };
        return { ...prev, items: next };
      });
    } catch { /* keep the list-row seeded values */ }
  };

  const updateItem = (idx, field, value) => {
    setForm(prev => {
      const next = [...prev.items];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, items: next };
    });
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
    setForm(prev => ({ ...prev, items: [emptyLine()] }));
    onSelectJobCard(0, String(found.id));
    toast.success(`Loaded job card ${found.jobCardNo}.`);
  };

  const updateGraphRow = (idx, field, value) => {
    setForm(prev => {
      const next = [...(prev.tempGraphPoints || [])];
      next[idx] = { ...next[idx], [field]: field === 'holdMin' || field === 'tempC' ? (value === '' ? '' : Number(value)) : value };
      return { ...prev, tempGraphPoints: next };
    });
  };

  const totalWeight = useMemo(
    () =>
      form.items.reduce((s, it) => s + toNum(it.weightKg, 0), 0),
    [form.items]
  );

  const RS_STEPS = [
    { key: 'run',    label: 'Run details' },
    { key: 'jobs',   label: 'Jobs' },
    { key: 'cycle',  label: 'Cycle params' },
    { key: 'graph',  label: 'Temp graph' },
    { key: 'checks', label: 'Check points' },
    { key: 'verify', label: 'Verification' },
  ];
  const wiz = useStepper(RS_STEPS.length);
  const LAST = RS_STEPS.length - 1;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.furnaceId) {
      toast.error('Select furnace.');
      wiz.goto(0);
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
        fixtures: it.fixtures || null,
        tcPosition: it.tcPosition || null,
        instruction: it.instruction || null,
      }));
    if (!lines.length) {
      toast.error('Add at least one line with a job card.');
      wiz.goto(1);
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
      wiz.goto(3);
      return;
    }

    const payload = {
      batchId: form.batchId ? toInt(form.batchId) : null,
      furnaceId: toInt(form.furnaceId),
      runDate: form.runDate,
      cycleStartTime: form.cycleStartTime || null,
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
      gasPressure: form.gasPressure || null,
      waterCirculationFrom: form.waterCirculationFrom || null,
      waterCirculationTo: form.waterCirculationTo || null,
      powerFailureFrom: form.powerFailureFrom || null,
      powerFailureTo: form.powerFailureTo || null,
      otherCheckpoint: form.otherCheckpoint || null,
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
    <div className="font-app flex flex-col h-full min-h-0">
      <PageHeader
        title={isNew ? 'New VHT Run Sheet' : 'Edit VHT Run Sheet'}
        backTo="/manufacturing/runsheet"
        breadcrumbs={[
          { label: 'Run sheets', to: '/manufacturing/runsheet' },
          { label: isNew ? 'New' : 'Edit' },
        ]}
        actions={!isNew ? (
          <Button asChild variant="outline" size="sm">
            <Link to={`/manufacturing/runsheet/${id}/print`} target="_blank" rel="noreferrer">
              <Printer /> Open print view
            </Link>
          </Button>
        ) : null}
      />

      <div className="mt-2 shrink-0 rounded-xl border border-slate-200 bg-white p-2 shadow-card">
        <Stepper steps={RS_STEPS} current={wiz.current} completed={wiz.completed} onStepClick={(i) => wiz.goto(i)} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (wiz.current === LAST) submit(e); }} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-3 pr-0.5 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Step {wiz.current + 1} of {RS_STEPS.length} · {RS_STEPS[wiz.current].label}
        </p>

        {/* ── Step 1 · Run details ── */}
        <div hidden={wiz.current !== 0} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Run Details</CardTitle>
            <CardDescription>Furnace, cycle timing, meter readings and document control.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <GroupTitle>Schedule &amp; Furnace</GroupTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                <FormField label="Run Date" htmlFor="runDate" required>
                  <Input
                    id="runDate"
                    type="date"
                    required
                    value={form.runDate}
                    onChange={(e) => setForm({ ...form, runDate: e.target.value })}
                  />
                </FormField>
                <FormField label="Furnace" required>
                  <SearchSelect
                    value={String(form.furnaceId || '')}
                    onChange={v => setForm({ ...form, furnaceId: v })}
                    options={machines.map(m => ({ value: m.id, label: m.name || m.code }))}
                    placeholder="Select furnace"
                    required
                  />
                </FormField>
                <FormField label="Cycle (minutes)" htmlFor="cycleTime">
                  <Input
                    id="cycleTime"
                    type="number"
                    inputMode="numeric"
                    value={form.cycleTime}
                    onChange={(e) => setForm({ ...form, cycleTime: e.target.value })}
                    className="text-right tabular-nums"
                  />
                </FormField>
                <FormField label="Cycle Start Time" htmlFor="cycleStartTime">
                  <Input
                    id="cycleStartTime"
                    type="time"
                    value={form.cycleStartTime}
                    onChange={(e) => setForm({ ...form, cycleStartTime: e.target.value })}
                  />
                </FormField>
                <FormField label="Cycle End Time" htmlFor="cycleEndTime">
                  <Input
                    id="cycleEndTime"
                    type="time"
                    value={form.cycleEndTime}
                    onChange={(e) => setForm({ ...form, cycleEndTime: e.target.value })}
                  />
                </FormField>
                <FormField label="Total Time" htmlFor="totalTimeDisplay" hint="Auto — from start/end">
                  <Input
                    id="totalTimeDisplay"
                    type="text"
                    readOnly
                    placeholder="e.g. 8:00"
                    value={form.totalTimeDisplay}
                    className="bg-slate-50 text-slate-500 tabular-nums"
                  />
                </FormField>
              </div>
            </div>

            <div className="space-y-3">
              <GroupTitle>Meter Reading &amp; Operator</GroupTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3">
                <FormField label="M.R. Start" htmlFor="mrStart">
                  <Input
                    id="mrStart"
                    type="number"
                    inputMode="decimal"
                    value={form.mrStart}
                    onChange={(e) => setForm({ ...form, mrStart: e.target.value })}
                    className="text-right tabular-nums"
                  />
                </FormField>
                <FormField label="M.R. End" htmlFor="mrEnd">
                  <Input
                    id="mrEnd"
                    type="number"
                    inputMode="decimal"
                    value={form.mrEnd}
                    onChange={(e) => setForm({ ...form, mrEnd: e.target.value })}
                    className="text-right tabular-nums"
                  />
                </FormField>
                <FormField label="Total M.R." htmlFor="totalMr" hint="Auto — end − start">
                  <Input
                    id="totalMr"
                    type="text"
                    readOnly
                    value={form.totalMr}
                    className="bg-slate-50 text-slate-500 text-right tabular-nums"
                  />
                </FormField>
                <FormField label="Loading Operator" htmlFor="loadingOperatorName" className="col-span-2">
                  <Input
                    id="loadingOperatorName"
                    type="text"
                    value={form.loadingOperatorName}
                    onChange={(e) => setForm({ ...form, loadingOperatorName: e.target.value })}
                  />
                </FormField>
              </div>
            </div>

            <div className="space-y-3">
              <GroupTitle>Document Control</GroupTitle>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
                <FormField label="Doc Rev." htmlFor="docRevNo">
                  <Input
                    id="docRevNo"
                    type="text"
                    value={form.docRevNo}
                    onChange={(e) => setForm({ ...form, docRevNo: e.target.value })}
                  />
                </FormField>
                <FormField label="Effective Date" htmlFor="docEffectiveDate">
                  <Input
                    id="docEffectiveDate"
                    type="date"
                    value={form.docEffectiveDate}
                    onChange={(e) => setForm({ ...form, docEffectiveDate: e.target.value })}
                  />
                </FormField>
                <FormField label="Page" htmlFor="docPageOf">
                  <Input
                    id="docPageOf"
                    type="text"
                    value={form.docPageOf}
                    onChange={(e) => setForm({ ...form, docPageOf: e.target.value })}
                  />
                </FormField>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* ── Step 2 · Jobs in this batch ── */}
        <div hidden={wiz.current !== 1} className="space-y-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 gap-3">
            <div className="space-y-1">
              <CardTitle>Jobs in this Batch</CardTitle>
              <CardDescription>Select job cards or load one by number.</CardDescription>
            </div>
            <span className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              Total weight: <span className="tabular-nums font-bold text-slate-800">{totalWeight.toFixed(2)}</span> kg
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,320px)_auto] gap-x-3 gap-y-3 items-end">
              <FormField label="Job Card Number" htmlFor="jobCardNoLookup">
                <Input
                  id="jobCardNoLookup"
                  type="text"
                  value={jobCardNoLookup}
                  onChange={(e) => setJobCardNoLookup(e.target.value)}
                  placeholder="Enter job card number"
                />
              </FormField>
              <Button type="button" variant="secondary" onClick={fillFromJobCardNumber}>
                Load from job card
              </Button>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-xs min-w-[860px]">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="py-2 pr-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Job Card *</th>
                    <th className="py-2 pr-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="py-2 pr-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="py-2 pr-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Material</th>
                    <th className="py-2 pr-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">HRC Req</th>
                    <th className="py-2 pr-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Qty</th>
                    <th className="py-2 pr-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Wt (kg)</th>
                    <th className="py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((it, idx) => (
                    <tr key={it._id} className="border-b border-slate-100 last:border-0">
                      <td className="py-1.5 pr-2 align-middle">
                        <SearchSelect
                          value={String(it.jobCardId || '')}
                          onChange={v => onSelectJobCard(idx, v)}
                          options={jobCards.map(jc => ({ value: jc.id, label: jc.jobCardNo }))}
                          placeholder="Select job card"
                          required={idx === 0}
                          useFixed
                          className="max-w-[200px]"
                        />
                      </td>
                      <td className="py-1.5 pr-2 align-middle">
                        <Input
                          className="h-8 sm:h-8 min-h-0 text-xs"
                          value={it.customerName}
                          onChange={(e) => updateItem(idx, 'customerName', e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 pr-2 align-middle">
                        <Input
                          className="h-8 sm:h-8 min-h-0 text-xs"
                          value={it.jobDescription}
                          onChange={(e) => updateItem(idx, 'jobDescription', e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 pr-2 align-middle">
                        <Input
                          className="h-8 sm:h-8 min-h-0 text-xs"
                          value={it.materialGrade}
                          onChange={(e) => updateItem(idx, 'materialGrade', e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 pr-2 align-middle">
                        <Input
                          className="h-8 sm:h-8 min-h-0 text-xs max-w-[90px]"
                          value={it.hrcRequired}
                          onChange={(e) => updateItem(idx, 'hrcRequired', e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 pr-2 align-middle">
                        <Input
                          type="number"
                          inputMode="numeric"
                          className="h-8 sm:h-8 min-h-0 text-xs w-16 text-right tabular-nums"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 pr-2 align-middle">
                        <Input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          className="h-8 sm:h-8 min-h-0 text-xs w-20 text-right tabular-nums"
                          value={it.weightKg}
                          onChange={(e) => updateItem(idx, 'weightKg', e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setForm(prev => {
                            const next = prev.items.filter((_, i) => i !== idx);
                            return { ...prev, items: next.length ? next : [emptyLine()] };
                          })}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          aria-label={`Remove line ${idx + 1}`}
                        >
                          <Trash2 />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm(prev => ({ ...prev, items: [...prev.items, emptyLine()] }))}
            >
              <Plus /> Add line
            </Button>
          </CardContent>
        </Card>
        </div>

        {/* ── Step 3 · Cycle parameters ── */}
        <div hidden={wiz.current !== 2} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Cycle Parameters</CardTitle>
            <CardDescription>Hardening mix, quench and fixture setup for this run.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
              <FormField label="Type of Hardening / Mix" htmlFor="hardeningType">
                <Input
                  id="hardeningType"
                  value={form.hardeningType}
                  onChange={(e) => setForm({ ...form, hardeningType: e.target.value })}
                  placeholder="e.g. D2, SS303 + D2"
                />
              </FormField>
              <FormField label="Temp Profile (text)" htmlFor="tempProfile">
                <Input
                  id="tempProfile"
                  value={form.tempProfile}
                  onChange={(e) => setForm({ ...form, tempProfile: e.target.value })}
                />
              </FormField>
              <FormField label="Quenching Pressure (bar)" htmlFor="quenchPressureBar">
                <Input
                  id="quenchPressureBar"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={form.quenchPressureBar}
                  onChange={(e) => setForm({ ...form, quenchPressureBar: e.target.value })}
                  className="text-right tabular-nums"
                />
              </FormField>
              <FormField label="Fan Speed (RPM)" htmlFor="fanRpm">
                <Input
                  id="fanRpm"
                  type="number"
                  inputMode="numeric"
                  value={form.fanRpm}
                  onChange={(e) => setForm({ ...form, fanRpm: e.target.value })}
                  className="text-right tabular-nums"
                />
              </FormField>
              <FormField label="Fixtures / T.C. Position" htmlFor="fixturesPosition" className="sm:col-span-2">
                <Input
                  id="fixturesPosition"
                  value={form.fixturesPosition}
                  onChange={(e) => setForm({ ...form, fixturesPosition: e.target.value })}
                  placeholder="e.g. LH-02"
                />
              </FormField>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* ── Step 4 · Temperature–time graph ── */}
        <div hidden={wiz.current !== 3} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Temperature–Time Graph (Steps)</CardTitle>
            <CardDescription>
              Select a material cycle preset or enter custom segments. Graph on the test certificate will reflect these values.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {masterGraphs.length > 0 && (
              <div className="space-y-3">
                <GroupTitle>Load from Graph Master</GroupTitle>
                <SearchSelect
                  value=""
                  onChange={loadMasterGraph}
                  options={masterGraphs.map(g => ({ value: g.id, label: g.isDefault ? `${g.name} ★` : g.name }))}
                  placeholder="— Select a saved graph —"
                  useFixed
                  className="max-w-xs"
                />
              </div>
            )}

            <div className="space-y-3">
              <GroupTitle>Load Preset</GroupTitle>
              <div className="flex flex-wrap gap-2">
                {CYCLE_NAMES.map(name => (
                  <Button
                    key={name}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setForm(f => ({ ...f, tempGraphPoints: CYCLE_PRESETS[name].map(p => ({ ...p })) }))}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <GroupTitle>Segments</GroupTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[480px]">
                  <thead>
                    <tr className="text-left border-b border-slate-200">
                      <th className="py-2 pr-2 w-10 text-[10px] font-bold text-slate-500 uppercase tracking-wider">#</th>
                      <th className="py-2 pr-2 w-28 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Temp (°C) *</th>
                      <th className="py-2 pr-2 w-24 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Hold (min) *</th>
                      <th className="py-2 pr-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Label</th>
                      <th className="py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {(form.tempGraphPoints || []).map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0">
                        <td className="py-1.5 pr-2 align-middle text-slate-400 font-semibold tabular-nums">{idx + 1}</td>
                        <td className="py-1.5 pr-2 align-middle">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            className="h-8 sm:h-8 min-h-0 text-xs text-right tabular-nums"
                            placeholder="°C *"
                            value={row.tempC}
                            onChange={(e) => updateGraphRow(idx, 'tempC', e.target.value)}
                            required
                          />
                        </td>
                        <td className="py-1.5 pr-2 align-middle">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            className="h-8 sm:h-8 min-h-0 text-xs text-right tabular-nums"
                            placeholder="min *"
                            value={row.holdMin}
                            onChange={(e) => updateGraphRow(idx, 'holdMin', e.target.value)}
                            required
                          />
                        </td>
                        <td className="py-1.5 pr-2 align-middle">
                          <Input
                            type="text"
                            className="h-8 sm:h-8 min-h-0 text-xs min-w-[120px]"
                            placeholder="Label (optional)"
                            value={row.label || ''}
                            onChange={(e) => updateGraphRow(idx, 'label', e.target.value)}
                          />
                        </td>
                        <td className="py-1.5 align-middle">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setForm(prev => {
                              const next = (prev.tempGraphPoints || []).filter((_, i) => i !== idx);
                              return { ...prev, tempGraphPoints: next.length ? next : DEFAULT_GRAPH };
                            })}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            aria-label={`Remove segment ${idx + 1}`}
                          >
                            <Trash2 />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm(prev => ({
                    ...prev,
                    tempGraphPoints: [...(prev.tempGraphPoints || []), { tempC: '', holdMin: '', label: '' }],
                  }))
                }
              >
                <Plus /> Add segment
              </Button>
            </div>

            <HeatCycleGraphPreview segments={form.tempGraphPoints} />
          </CardContent>
        </Card>
        </div>

        {/* ── Step 5 · Check points ── */}
        <div hidden={wiz.current !== 4} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Check Points</CardTitle>
            <CardDescription>Utilities and interruptions observed during the run.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
              <FormField label="Gas Pressure" htmlFor="gasPressure">
                <Input
                  id="gasPressure"
                  value={form.gasPressure}
                  onChange={(e) => setForm({ ...form, gasPressure: e.target.value })}
                />
              </FormField>
              <FormField label="Water Circulation" htmlFor="waterCirculationFrom">
                {/* Native select kept: has a value="" placeholder option (Radix Select breaks on '') */}
                <select
                  id="waterCirculationFrom"
                  value={form.waterCirculationFrom}
                  onChange={(e) => setForm({ ...form, waterCirculationFrom: e.target.value })}
                  className="form-input"
                >
                  <option value="">—</option>
                  <option value="OK">OK</option>
                  <option value="NOT OK">NOT OK</option>
                </select>
              </FormField>
              <FormField label="Power Failure — From" htmlFor="powerFailureFrom">
                <Input
                  id="powerFailureFrom"
                  type="time"
                  value={form.powerFailureFrom}
                  onChange={(e) => setForm({ ...form, powerFailureFrom: e.target.value })}
                />
              </FormField>
              <FormField label="Power Failure — To" htmlFor="powerFailureTo">
                <Input
                  id="powerFailureTo"
                  type="time"
                  value={form.powerFailureTo}
                  onChange={(e) => setForm({ ...form, powerFailureTo: e.target.value })}
                />
              </FormField>
              <FormField label="Other" htmlFor="otherCheckpoint" className="sm:col-span-2 lg:col-span-4">
                <Textarea
                  id="otherCheckpoint"
                  value={form.otherCheckpoint}
                  onChange={(e) => setForm({ ...form, otherCheckpoint: e.target.value })}
                  rows={2}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* ── Step 6 · Verification & status ── */}
        <div hidden={wiz.current !== 5} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Verification &amp; Status</CardTitle>
            <CardDescription>Sign-offs, supervisor verification and run status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
              <FormField label="Operator Sign" htmlFor="operatorSign">
                <Input
                  id="operatorSign"
                  value={form.operatorSign}
                  onChange={(e) => setForm({ ...form, operatorSign: e.target.value })}
                />
              </FormField>
              <FormField label="Production Supervisor Sign" htmlFor="supervisorSign">
                <Input
                  id="supervisorSign"
                  value={form.supervisorSign}
                  onChange={(e) => setForm({ ...form, supervisorSign: e.target.value })}
                />
              </FormField>
              <FormField label="Supervisor Verified At" htmlFor="supervisorVerifiedAt">
                <Input
                  id="supervisorVerifiedAt"
                  type="datetime-local"
                  value={form.supervisorVerifiedAt}
                  onChange={(e) => setForm({ ...form, supervisorVerifiedAt: e.target.value })}
                />
              </FormField>
              <FormField label="Status">
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED">Planned</SelectItem>
                    <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Verification Note" htmlFor="verificationNote" className="sm:col-span-2">
                <Textarea
                  id="verificationNote"
                  value={form.verificationNote}
                  onChange={(e) => setForm({ ...form, verificationNote: e.target.value })}
                  rows={2}
                  placeholder="After processing within 24 hrs, supervisor shall verify process parameter (graph) & sign."
                />
              </FormField>
              <FormField label="Remarks" htmlFor="remarks" className="sm:col-span-2">
                <Textarea
                  id="remarks"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  rows={2}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>
        </div>

        </div>

        {/* ── Wizard navigation ── */}
        <div className="shrink-0 mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-card sm:px-5">
          <span className="font-app-mono text-xs text-slate-400">Step {wiz.current + 1} of {RS_STEPS.length}</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost"><Link to="/manufacturing/runsheet">Cancel</Link></Button>
            <Button type="button" variant="ghost" disabled={wiz.isFirst} onClick={wiz.back}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            {wiz.current < LAST ? (
              <Button type="button" onClick={wiz.next}>Next <ChevronRight className="h-4 w-4" /></Button>
            ) : (
              <Button type="button" onClick={submit} disabled={saving}>
                {saving ? 'Saving…' : (isNew ? 'Save Run Sheet' : 'Update Run Sheet')}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
