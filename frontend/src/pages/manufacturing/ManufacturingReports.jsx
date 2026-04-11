import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function ManufacturingReports() {
  const [utilization, setUtilization] = useState([]);
  const [idleTime, setIdleTime] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [plantLossMonth, setPlantLossMonth] = useState(null);
  const [lossYear, setLossYear] = useState(new Date().getFullYear());
  const [lossMonth, setLossMonth] = useState(new Date().getMonth() + 1);
  const [machines, setMachines] = useState([]);
  const [lossRows, setLossRows] = useState([]);
  const [savingLoss, setSavingLoss] = useState(false);
  const [idleMachineId, setIdleMachineId] = useState('');
  const [idleYear, setIdleYear] = useState(new Date().getFullYear());
  const [idleMonth, setIdleMonth] = useState(new Date().getMonth() + 1);
  const [idleSheet, setIdleSheet] = useState(null);
  const [savingIdle, setSavingIdle] = useState(false);
  const [utilMachineId, setUtilMachineId] = useState('');
  const [utilDate, setUtilDate] = useState(new Date().toISOString().split('T')[0]);
  const [utilRow, setUtilRow] = useState(null);
  const [savingUtil, setSavingUtil] = useState(false);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [utilRes, idleRes, shiftRes] = await Promise.all([
        api.get(`/manufacturing/reports/machine-utilization?startDate=${startDate}&endDate=${endDate}`),
        api.get(`/manufacturing/reports/idle-time?startDate=${startDate}&endDate=${endDate}`),
        api.get(`/manufacturing/reports/shift-wise?startDate=${startDate}&endDate=${endDate}`)
      ]);
      setUtilization(utilRes.data.data || []);
      setIdleTime(idleRes.data.data || null);
      setShifts(shiftRes.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlantLoss = async () => {
    try {
      const [mRes, rRes] = await Promise.all([
        api.get('/machines'),
        api.get(`/manufacturing/reports/plant-losses?year=${lossYear}&month=${lossMonth}`),
      ]);
      setMachines(mRes.data.data || []);
      const d = rRes.data.data;
      setPlantLossMonth(d || null);
      setLossRows(d?.entries?.length ? d.entries.map(e => ({
        machineId: e.machineId || '',
        furnaceName: e.furnaceName || '',
        availableHours: e.availableHours ?? 624,
        usedHours: e.usedHours ?? 0,
        loadingUnloadingMin: e.loadingUnloadingMin ?? '',
        waitingCyclePrepHrs: e.waitingCyclePrepHrs ?? '',
        waitingMaterialHrs: e.waitingMaterialHrs ?? '',
        cleaningFurnaceHrs: e.cleaningFurnaceHrs ?? '',
        breakdownMaintHrs: e.breakdownMaintHrs ?? '',
        noPowerHrs: e.noPowerHrs ?? '',
        noMaterialHrs: e.noMaterialHrs ?? '',
      })) : []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load plant losses.');
    }
  };

  const fetchDailyIdle = async () => {
    if (!idleMachineId) { setIdleSheet(null); return; }
    try {
      const r = await api.get(`/manufacturing/reports/daily-idle?machineId=${idleMachineId}&year=${idleYear}&month=${idleMonth}`);
      setIdleSheet(r.data.data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load daily idle sheet.');
    }
  };

  const updateIdleDay = (dayIdx, key, value) => {
    setIdleSheet((p) => {
      if (!p) return p;
      const days = [...p.days];
      days[dayIdx] = { ...days[dayIdx], [key]: value };
      return { ...p, days };
    });
  };

  const saveDailyIdle = async () => {
    if (!idleSheet) return;
    setSavingIdle(true);
    try {
      await api.post('/manufacturing/reports/daily-idle', {
        machineId: idleMachineId,
        year: idleYear,
        month: idleMonth,
        days: idleSheet.days.map(d => ({
          day: d.day,
          loadingUnloadingMin: d.loadingUnloadingMin,
          waitingCyclePrepMin: d.waitingCyclePrepMin,
          waitingMaterialMin: d.waitingMaterialMin,
          preventiveMaintMin: d.preventiveMaintMin,
          breakdownMaintMin: d.breakdownMaintMin,
          noPowerMin: d.noPowerMin,
          noMaterialMin: d.noMaterialMin,
          remarks: d.remarks,
        })),
      });
      await fetchDailyIdle();
      toast.success('Daily idle sheet saved.');
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to save daily idle sheet.');
    } finally {
      setSavingIdle(false);
    }
  };

  const deriveMonthlyFromDaily = async () => {
    setSavingLoss(true);
    try {
      await api.post('/manufacturing/reports/plant-losses/derive', { year: idleYear, month: idleMonth });
      await fetchPlantLoss();
      toast.success('Monthly plant losses derived from daily logs.');
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to derive monthly report.');
    } finally {
      setSavingLoss(false);
    }
  };

  const fetchUtilDay = async () => {
    if (!utilMachineId) { setUtilRow(null); return; }
    try {
      const r = await api.get(`/manufacturing/reports/furnace-utilisation?machineId=${utilMachineId}&date=${utilDate}`);
      const d = r.data.data;
      setUtilRow(d || {
        shifts: {
          shift1UsedMin: 0, shift2UsedMin: 0, shift3UsedMin: 0,
          s1A: 0, s1B: 0, s1C: 0, s1D: 0, s1E: 0, s1F: 0, s1G: 0,
          s2A: 0, s2B: 0, s2C: 0, s2D: 0, s2E: 0, s2F: 0, s2G: 0,
          s3A: 0, s3B: 0, s3C: 0, s3D: 0, s3E: 0, s3F: 0, s3G: 0,
        },
        signedBy: '',
        remarks: '',
      });
    } catch (e) {
      console.error(e);
      toast.error('Failed to load utilisation statement.');
    }
  };

  const updateUtil = (k, v) => {
    setUtilRow(p => {
      if (!p) return p;
      if (k in (p.shifts || {})) return { ...p, shifts: { ...p.shifts, [k]: v } };
      return { ...p, [k]: v };
    });
  };

  const saveUtilDay = async () => {
    if (!utilMachineId || !utilRow) return;
    setSavingUtil(true);
    try {
      await api.post('/manufacturing/reports/furnace-utilisation', {
        machineId: utilMachineId,
        date: utilDate,
        signedBy: utilRow.signedBy,
        remarks: utilRow.remarks,
        shifts: utilRow.shifts,
      });
      await fetchUtilDay();
      toast.success('Utilisation statement saved.');
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to save utilisation statement.');
    } finally {
      setSavingUtil(false);
    }
  };
  useEffect(() => { fetchPlantLoss(); }, []);

  const updateLossRow = (i, k, v) => setLossRows(p => p.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const addLossRow = () => setLossRows(p => [...p, {
    machineId: '',
    furnaceName: '',
    availableHours: 624,
    usedHours: 0,
    loadingUnloadingMin: '',
    waitingCyclePrepHrs: '',
    waitingMaterialHrs: '',
    cleaningFurnaceHrs: '',
    breakdownMaintHrs: '',
    noPowerHrs: '',
    noMaterialHrs: '',
  }]);

  const savePlantLoss = async () => {
    setSavingLoss(true);
    try {
      await api.post('/manufacturing/reports/plant-losses', {
        year: lossYear,
        month: lossMonth,
        entries: lossRows.map(r => ({
          machineId: r.machineId || null,
          furnaceName: r.furnaceName || null,
          availableHours: r.availableHours,
          usedHours: r.usedHours,
          loadingUnloadingMin: r.loadingUnloadingMin === '' ? null : r.loadingUnloadingMin,
          waitingCyclePrepHrs: r.waitingCyclePrepHrs === '' ? null : r.waitingCyclePrepHrs,
          waitingMaterialHrs: r.waitingMaterialHrs === '' ? null : r.waitingMaterialHrs,
          cleaningFurnaceHrs: r.cleaningFurnaceHrs === '' ? null : r.cleaningFurnaceHrs,
          breakdownMaintHrs: r.breakdownMaintHrs === '' ? null : r.breakdownMaintHrs,
          noPowerHrs: r.noPowerHrs === '' ? null : r.noPowerHrs,
          noMaterialHrs: r.noMaterialHrs === '' ? null : r.noMaterialHrs,
        })),
      });
      await fetchPlantLoss();
      toast.success('Plant losses saved.');
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to save plant losses.');
    } finally {
      setSavingLoss(false);
    }
  };

  const totalIdleHours = idleTime?.totalIdleHours || 0;
  const avgUtilization = utilization.length > 0
    ? Math.round(utilization.reduce((sum, m) => sum + m.utilizationPercent, 0) / utilization.length)
    : 0;

  return (
    <div className="page-stack-wide">
        <h1 className="page-title mb-2">Manufacturing Reports &amp; Analytics</h1>
        <p className="page-subtitle mb-6">Utilization, plant losses, and shift data</p>

        {/* Filters */}
        <div className="card p-5 mb-6 flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border rounded" />
          </div>
          <button onClick={fetchReports} disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Loading...' : 'Generate Reports'}
          </button>
        </div>

        {/* Plant Losses (Monthly) */}
        <div className="card p-5 mb-6">
          <div className="flex items-end gap-3 flex-wrap justify-between">
            <div>
              <h2 className="text-lg font-bold">Plant Losses (Monthly)</h2>
              <p className="text-xs text-slate-500">Loading/Unloading, waiting, cleaning, breakdown, no power/material → efficiency</p>
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <input type="number" value={lossYear} onChange={(e) => setLossYear(Number(e.target.value || 0))} className="px-3 py-2 border rounded w-28" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Month</label>
                <select value={lossMonth} onChange={(e) => setLossMonth(Number(e.target.value))} className="px-3 py-2 border rounded w-36">
                  {Array.from({ length: 12 }).map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                </select>
              </div>
              <button onClick={fetchPlantLoss} className="btn-primary">Load</button>
              <button onClick={addLossRow} className="btn-secondary">+ Row</button>
              <button onClick={savePlantLoss} disabled={savingLoss} className="btn-primary disabled:opacity-50">
                {savingLoss ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {plantLossMonth?.totals && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/90"><div className="text-xs text-slate-500">Total Available</div><div className="text-xl font-bold">{plantLossMonth.totals.totalAvailable}h</div></div>
              <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/90"><div className="text-xs text-slate-500">Total Used</div><div className="text-xl font-bold">{plantLossMonth.totals.totalUsed}h</div></div>
              <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/90"><div className="text-xs text-slate-500">Total Loss</div><div className="text-xl font-bold text-red-600">{plantLossMonth.totals.totalLoss}h</div></div>
              <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/90"><div className="text-xs text-slate-500">Efficiency</div><div className="text-xl font-bold text-blue-700">{plantLossMonth.totals.efficiencyPercent}%</div></div>
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-sky-50/80 border-b border-slate-200/80">
                <tr>
                  <th className="p-2 border text-left">Furnace</th>
                  <th className="p-2 border text-center">Available (h)</th>
                  <th className="p-2 border text-center">Used (h)</th>
                  <th className="p-2 border text-center">Load/Unload (min)</th>
                  <th className="p-2 border text-center">Wait Cycle Prep (h)</th>
                  <th className="p-2 border text-center">Wait Material (h)</th>
                  <th className="p-2 border text-center">Cleaning (h)</th>
                  <th className="p-2 border text-center">Breakdown (h)</th>
                  <th className="p-2 border text-center">No Power (h)</th>
                  <th className="p-2 border text-center">No Material (h)</th>
                </tr>
              </thead>
              <tbody>
                {lossRows.length === 0 ? (
                  <tr><td colSpan={10} className="p-3 text-center text-slate-500">No data. Click “+ Row”.</td></tr>
                ) : lossRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/90">
                    <td className="p-2 border">
                      <select value={r.machineId} onChange={(e) => updateLossRow(i, 'machineId', e.target.value)} className="px-2 py-1 border rounded w-64">
                        <option value="">Select machine (optional)</option>
                        {machines.map(m => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
                      </select>
                      {!r.machineId && (
                        <input value={r.furnaceName} onChange={(e) => updateLossRow(i, 'furnaceName', e.target.value)} className="ml-2 px-2 py-1 border rounded" placeholder="Furnace name" />
                      )}
                    </td>
                    {['availableHours','usedHours','loadingUnloadingMin','waitingCyclePrepHrs','waitingMaterialHrs','cleaningFurnaceHrs','breakdownMaintHrs','noPowerHrs','noMaterialHrs'].map((k) => (
                      <td key={k} className="p-2 border text-center">
                        <input type="number" step="0.01" value={r[k]} onChange={(e) => updateLossRow(i, k, e.target.value)} className="px-2 py-1 border rounded w-24 text-right" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Idle Time Sheet (raw data) */}
        <div className="card p-5 mb-6">
          <div className="flex items-end gap-3 flex-wrap justify-between">
            <div>
              <h2 className="text-lg font-bold">Daily Idle Time Sheet (Raw)</h2>
              <p className="text-xs text-slate-500">Minutes per day → monthly loss report auto-derives from this</p>
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-sm font-medium mb-1">Machine</label>
                <select value={idleMachineId} onChange={(e) => setIdleMachineId(e.target.value)} className="px-3 py-2 border rounded w-72">
                  <option value="">Select machine</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <input type="number" value={idleYear} onChange={(e) => setIdleYear(Number(e.target.value || 0))} className="px-3 py-2 border rounded w-28" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Month</label>
                <select value={idleMonth} onChange={(e) => setIdleMonth(Number(e.target.value))} className="px-3 py-2 border rounded w-36">
                  {Array.from({ length: 12 }).map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                </select>
              </div>
              <button onClick={fetchDailyIdle} className="btn-primary">Load</button>
              <button onClick={saveDailyIdle} disabled={savingIdle || !idleSheet} className="btn-primary disabled:opacity-50">
                {savingIdle ? 'Saving...' : 'Save'}
              </button>
              <button onClick={deriveMonthlyFromDaily} disabled={savingLoss || !idleSheet} className="btn-secondary disabled:opacity-50">
                Derive Monthly
              </button>
            </div>
          </div>

          {!idleSheet ? (
            <p className="text-slate-500 text-sm mt-3">Select a machine and click Load.</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/90">
                  <div className="text-xs text-slate-500">Loading/Unloading</div>
                  <div className="text-xl font-bold">{idleSheet.totalsHours.loadingUnloadingHrs}h</div>
                </div>
                <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/90">
                  <div className="text-xs text-slate-500">Waiting Cycle Prep</div>
                  <div className="text-xl font-bold">{idleSheet.totalsHours.waitingCyclePrepHrs}h</div>
                </div>
                <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/90">
                  <div className="text-xs text-slate-500">Preventive Maint</div>
                  <div className="text-xl font-bold">{idleSheet.totalsHours.preventiveMaintHrs}h</div>
                </div>
                <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/90">
                  <div className="text-xs text-slate-500">Total Idle</div>
                  <div className="text-xl font-bold text-red-600">{idleSheet.totalsHours.totalIdleHrs}h</div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs border">
                  <thead className="bg-sky-50/80 border-b border-slate-200/80">
                    <tr>
                      <th className="p-2 border">Day</th>
                      <th className="p-2 border">Load/Unload (min)</th>
                      <th className="p-2 border">Wait Cycle Prep (min)</th>
                      <th className="p-2 border">Wait Material (min)</th>
                      <th className="p-2 border">Prev Maint (min)</th>
                      <th className="p-2 border">Breakdown (min)</th>
                      <th className="p-2 border">No Power (min)</th>
                      <th className="p-2 border">No Material (min)</th>
                      <th className="p-2 border">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {idleSheet.days.map((d, idx) => (
                      <tr key={d.date} className={(d.day % 7 === 0) ? 'bg-yellow-50' : ''}>
                        <td className="p-2 border font-mono">{d.day}</td>
                        {[
                          'loadingUnloadingMin','waitingCyclePrepMin','waitingMaterialMin',
                          'preventiveMaintMin','breakdownMaintMin','noPowerMin','noMaterialMin',
                        ].map(k => (
                          <td key={k} className="p-2 border text-center">
                            <input type="number" min="0" step="1" value={d[k]}
                              onChange={(e) => updateIdleDay(idx, k, e.target.value)}
                              className="px-2 py-1 border rounded w-20 text-right" />
                          </td>
                        ))}
                        <td className="p-2 border">
                          <input value={d.remarks || ''} onChange={(e) => updateIdleDay(idx, 'remarks', e.target.value)}
                            className="px-2 py-1 border rounded w-56" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Furnace Utilisation Statement (Shift-wise) */}
        <div className="card p-5 mb-6">
          <div className="flex items-end gap-3 flex-wrap justify-between">
            <div>
              <h2 className="text-lg font-bold">Furnace Utilisation Statement (Shift-wise)</h2>
              <p className="text-xs text-slate-500">3 shifts × 480 min/day, reason codes A–g + used minutes</p>
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-sm font-medium mb-1">Machine</label>
                <select value={utilMachineId} onChange={(e) => setUtilMachineId(e.target.value)} className="px-3 py-2 border rounded w-72">
                  <option value="">Select machine</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" value={utilDate} onChange={(e) => setUtilDate(e.target.value)} className="px-3 py-2 border rounded" />
              </div>
              <button onClick={fetchUtilDay} className="btn-primary">Load</button>
              <button onClick={saveUtilDay} disabled={!utilRow || savingUtil} className="btn-primary disabled:opacity-50">
                {savingUtil ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {!utilRow ? (
            <p className="text-slate-500 text-sm mt-3">Select machine + date and click Load.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs border">
                <thead className="bg-sky-50/80 border-b border-slate-200/80">
                  <tr>
                    <th className="p-2 border text-left">Shift</th>
                    <th className="p-2 border text-center">Used (min)</th>
                    {['A','B','C','D','E','F','g'].map(c => (
                      <th key={c} className="p-2 border text-center">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: '1st Shift', used: 'shift1UsedMin', keys: ['s1A','s1B','s1C','s1D','s1E','s1F','s1G'] },
                    { label: '2nd Shift', used: 'shift2UsedMin', keys: ['s2A','s2B','s2C','s2D','s2E','s2F','s2G'] },
                    { label: '3rd Shift', used: 'shift3UsedMin', keys: ['s3A','s3B','s3C','s3D','s3E','s3F','s3G'] },
                  ].map((row) => (
                    <tr key={row.label}>
                      <td className="p-2 border font-semibold">{row.label}</td>
                      <td className="p-2 border text-center">
                        <input type="number" min="0" step="1" value={utilRow.shifts[row.used] ?? 0}
                          onChange={(e) => updateUtil(row.used, e.target.value)}
                          className="px-2 py-1 border rounded w-24 text-right" />
                      </td>
                      {row.keys.map((k) => (
                        <td key={k} className="p-2 border text-center">
                          <input type="number" min="0" step="1" value={utilRow.shifts[k] ?? 0}
                            onChange={(e) => updateUtil(k, e.target.value)}
                            className="px-2 py-1 border rounded w-20 text-right" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Remarks</label>
                  <input value={utilRow.remarks || ''} onChange={(e) => updateUtil('remarks', e.target.value)} className="px-3 py-2 border rounded w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sign</label>
                  <input value={utilRow.signedBy || ''} onChange={(e) => updateUtil('signedBy', e.target.value)} className="px-3 py-2 border rounded w-full" />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-3">
                Legend: A Loading/Unloading · B Cycle Preparation · C Waiting Material · D Preventive · E Breakdown · F No Power · g No Material
              </p>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-5 border-l-4 border-sky-600">
            <p className="text-slate-600 text-sm">Avg Utilization</p>
            <p className="text-3xl font-bold text-blue-600">{avgUtilization}%</p>
          </div>
          <div className="card p-5 border-l-4 border-rose-500">
            <p className="text-slate-600 text-sm">Total Idle Hours</p>
            <p className="text-3xl font-bold text-red-600">{totalIdleHours}h</p>
          </div>
          <div className="card p-5 border-l-4 border-emerald-500">
            <p className="text-slate-600 text-sm">Machines Tracked</p>
            <p className="text-3xl font-bold text-green-600">{utilization.length}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Machine Utilization */}
          <div className="card p-5">
            <h2 className="text-lg font-bold mb-4">Machine Utilization %</h2>
            {utilization.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={utilization}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="machine" angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="utilizationPercent" fill="#3b82f6" name="Utilization %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-8">No data available</p>
            )}
          </div>

          {/* Active vs Idle Hours */}
          <div className="card p-5">
            <h2 className="text-lg font-bold mb-4">Active vs Idle Hours</h2>
            {utilization.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={utilization}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="machine" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="activeHours" stackId="a" fill="#10b981" name="Active Hours" />
                  <Bar dataKey="idleHours" stackId="a" fill="#ef4444" name="Idle Hours" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-8">No data available</p>
            )}
          </div>
        </div>

        {/* Idle Time Details */}
        {idleTime?.shifts.length > 0 && (
          <div className="card p-5 mb-6">
            <h2 className="text-lg font-bold mb-4">Idle Time Detail</h2>
            <table className="w-full text-sm">
              <thead className="bg-sky-50/80 border-b border-slate-200/80">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Machine</th>
                  <th className="px-4 py-2 text-left">Shift</th>
                  <th className="px-4 py-2 text-left">Reason</th>
                  <th className="px-4 py-2 text-center">Duration (hrs)</th>
                </tr>
              </thead>
              <tbody>
                {idleTime.shifts.map((shift, idx) => (
                  <tr key={idx} className="border-b hover:bg-slate-50/90">
                    <td className="px-4 py-2">{new Date(shift.shiftDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{shift.machine}</td>
                    <td className="px-4 py-2">Shift {shift.shiftNumber}</td>
                    <td className="px-4 py-2 text-sm text-slate-600">{shift.reason}</td>
                    <td className="px-4 py-2 text-center font-bold">{shift.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Shift Summary */}
        {shifts.length > 0 && (
          <div className="card p-5">
            <h2 className="text-lg font-bold mb-4">Shift Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-sky-50/80 border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-center">Shift</th>
                    <th className="px-4 py-2 text-left">Machine</th>
                    <th className="px-4 py-2 text-center">Planned Output</th>
                    <th className="px-4 py-2 text-left">Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.slice(0, 10).map((shift, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50/90">
                      <td className="px-4 py-2">
                        {shift.plan?.planDate ? new Date(shift.plan.planDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-2 text-center">Shift {shift.shiftNumber}</td>
                      <td className="px-4 py-2">{shift.machineryAssigned}</td>
                      <td className="px-4 py-2 text-center">{shift.plannedOutput}</td>
                      <td className="px-4 py-2">{shift.operatorAssigned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
}
