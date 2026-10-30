import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import api from '../../utils/api';

// Print Pack — combines the three Daily Utilisation Statement registers into
// one print job, matching the client-supplied prototype's own PrintPack.tsx
// (Daily Statement + one Idle Time sheet per furnace + Plant Losses),
// each starting a fresh page. Markup is duplicated (not shared) from
// FurnaceUtilizationPrint / MonthlyIdleTimePrint / PlantLossesPrint on
// purpose — those are separately verified, standalone prints; this page
// must not risk changing them.

const LOSS_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const LOSS_CATEGORIES = [
  { code: 'A', label: 'Loading / Unloading' }, { code: 'B', label: 'Cycle Prepration' },
  { code: 'C', label: 'Waiting for Material' }, { code: 'D', label: 'Prev. Maintenance' },
  { code: 'E', label: 'Break down Maint.' }, { code: 'F', label: 'No Power' }, { code: 'G', label: 'No Material' },
];
const IDLE_FIELDS = [
  { code: 'A', key: 'loadingUnloadingMin', sheetLabel: 'Loading Unloading Time in mints.' },
  { code: 'B', key: 'waitingCyclePrepMin', sheetLabel: 'Waiting For Cycle Prepration' },
  { code: 'C', key: 'waitingMaterialMin', sheetLabel: 'Waiting for material' },
  { code: 'D', key: 'preventiveMaintMin', sheetLabel: 'Cleaning of furnace' },
  { code: 'E', key: 'breakdownMaintMin', sheetLabel: 'B.down Maint.' },
  { code: 'F', key: 'noPowerMin', sheetLabel: 'No Power' },
  { code: 'G', key: 'noMaterialMin', sheetLabel: 'No Material' },
];
const SHIFTS = [{ id: 1, label: '1st Shift' }, { id: 2, label: '2nd Shift' }, { id: 3, label: '3rd Shift' }];
const B = 'border border-black';
const GROUP_WIDTH = LOSS_CODES.length + 1;
const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const fmt = (v, d = 2) => (Number(v) || 0).toFixed(d);
const sheetDate = (dateStr) => { if (!dateStr) return '—'; const [y, m, d] = dateStr.split('-'); return `${d}/${m}/${y}`; };
const emptyUtilRow = () => ({ shift1UsedMin: 480, shift2UsedMin: 480, shift3UsedMin: 480, s1A: 0, s1B: 0, s1C: 0, s1D: 0, s1E: 0, s1F: 0, s1G: 0, s2A: 0, s2B: 0, s2C: 0, s2D: 0, s2E: 0, s2F: 0, s2G: 0, s3A: 0, s3B: 0, s3C: 0, s3D: 0, s3E: 0, s3F: 0, s3G: 0, remarks: '', signedBy: '' });
const shiftLoss = (row, n) => LOSS_CODES.reduce((s, c) => s + (Number(row[`s${n}${c}`]) || 0), 0);
const hoursOfPlant = (e, code) => ({
  A: Number(e.loadingUnloadingMin || 0) / 60, B: Number(e.waitingCyclePrepHrs || 0), C: Number(e.waitingMaterialHrs || 0),
  D: Number(e.cleaningFurnaceHrs || 0), E: Number(e.breakdownMaintHrs || 0), F: Number(e.noPowerHrs || 0), G: Number(e.noMaterialHrs || 0),
}[code]);

function DailyUtilizationSheet({ date, furnaces }) {
  const columnCount = 1 + furnaces.length * GROUP_WIDTH + 1;
  return (
    <section className="sheet sheet-landscape mx-auto w-full max-w-[1240px] bg-white p-6 text-black print:p-0">
      <div className="border-2 border-black font-sans">
        <div className="flex items-stretch border-b-2 border-black">
          <div className="flex w-24 items-center justify-center border-r border-black p-2">
            <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center bg-[#8c1d4a] font-serif text-lg font-bold italic text-white" style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}>SVT</span>
          </div>
          <h2 className="flex flex-1 items-center justify-center px-4 py-3 text-center text-xl font-bold tracking-wide">SHITAL VACUUM TREAT PVT LTD.</h2>
          <div className="flex w-60 items-center gap-2 border-l border-black px-4">
            <span className="text-sm font-bold">DATE :-</span>
            <span className="font-mono text-base font-medium text-[#1f4e79]">{sheetDate(date)}</span>
          </div>
        </div>
        <p className="border-b border-black py-1 text-center text-sm font-bold underline">DAILY UTILISATION STATEMENT</p>
        <table className="w-full table-fixed border-collapse text-center text-[11px]">
          <colgroup>
            <col className="w-[92px]" />
            {furnaces.map((f) => <React.Fragment key={f.id}>{LOSS_CODES.map((c) => <col key={`${f.id}-${c}`} />)}<col className="w-[62px]" /></React.Fragment>)}
            <col className="w-[58px]" />
          </colgroup>
          <tbody>
            <tr>
              <th className={`${B} px-1 py-1 text-left font-bold`}>SHIFT</th>
              {furnaces.map((f) => <React.Fragment key={f.id}><th colSpan={LOSS_CODES.length} className={`${B} px-1 py-1 text-center text-[12px] font-bold`}>{f.shortName}</th><th className={`${B} px-0.5 text-[9px] font-semibold leading-tight`}>BAL.</th></React.Fragment>)}
              <th rowSpan={5} className={`${B} px-1 text-center font-bold`}>SIGN</th>
            </tr>
            {SHIFTS.map((shift) => (
              <tr key={`av-${shift.id}`}>
                <th className={`${B} px-1 py-1 text-left font-bold italic`}>{shift.label}</th>
                {furnaces.map((f) => {
                  const available = f.row[`shift${shift.id}UsedMin`] ?? 480;
                  const balance = available - shiftLoss(f.row, shift.id);
                  return <React.Fragment key={f.id}><td colSpan={LOSS_CODES.length} className={`${B} px-2 py-0.5 font-mono text-[13px] font-medium tabular-nums text-[#1f4e79]`}>{available}</td><td className={`${B} px-0.5 py-1 font-mono text-[13px] font-semibold tabular-nums ${balance < 0 ? 'text-[#b42318]' : 'text-[#1f4e79]'}`}>{balance}</td></React.Fragment>;
                })}
              </tr>
            ))}
            <tr>
              <th className={`${B} px-1 py-1`}><span className="sr-only">Day total</span></th>
              {furnaces.map((f) => {
                const available = SHIFTS.reduce((s, sh) => s + (f.row[`shift${sh.id}UsedMin`] ?? 480), 0);
                const used = Math.max(0, available - SHIFTS.reduce((s, sh) => s + shiftLoss(f.row, sh.id), 0));
                return <React.Fragment key={f.id}><td colSpan={LOSS_CODES.length} className={`${B} px-2 py-1 font-mono text-[13px] font-semibold tabular-nums`}>{available}</td><td className={`${B} px-0.5 py-1 font-mono text-[13px] font-bold tabular-nums text-[#1f4e79]`}>{used}</td></React.Fragment>;
              })}
            </tr>
            {SHIFTS.map((shift) => (
              <React.Fragment key={shift.id}>
                <tr>
                  <th rowSpan={2} className={`${B} px-1 py-1 text-left font-bold italic`}>{shift.label}</th>
                  {furnaces.map((f) => <React.Fragment key={f.id}>{LOSS_CATEGORIES.map((cat) => <th key={`${f.id}-${cat.code}`} title={cat.label} className={`${B} bg-[#f2f3e8] px-0 py-0.5 font-mono text-[11px] font-semibold`}>{cat.code}</th>)}<th className={`${B} bg-[#f2f3e8] px-0.5 py-0.5 text-[9px] font-semibold`}>TOTAL</th></React.Fragment>)}
                  <td rowSpan={2} className={B} />
                </tr>
                <tr>
                  {furnaces.map((f) => {
                    const available = f.row[`shift${shift.id}UsedMin`] ?? 480;
                    const loss = shiftLoss(f.row, shift.id);
                    const over = loss > available;
                    return <React.Fragment key={f.id}>{LOSS_CODES.map((code) => { const v = Number(f.row[`s${shift.id}${code}`]) || 0; return <td key={code} className={`${B} px-0.5 py-0.5 font-mono text-[13px] font-medium tabular-nums ${over ? 'text-[#b42318]' : 'text-[#1f4e79]'}`}>{v || ''}</td>; })}<td className={`${B} px-0.5 py-1 font-mono text-[13px] font-semibold tabular-nums ${over ? 'text-[#b42318]' : 'text-[#1f4e79]'}`}>{loss || ''}</td></React.Fragment>;
                  })}
                </tr>
              </React.Fragment>
            ))}
            {SHIFTS.map((shift) => (
              <tr key={`rmk-${shift.id}`}>
                <th className={`${B} px-1 py-2 text-left font-bold italic leading-tight`}>REMARK<br />{shift.label}</th>
                <td colSpan={furnaces.length * GROUP_WIDTH} className={`${B} px-2 py-1 text-left font-mono text-[12px] text-[#1f4e79]`}>{shift.id === 1 ? (furnaces[0]?.row.remarks || '') : ''}</td>
                <td className={B} />
              </tr>
            ))}
            <tr>
              <td colSpan={columnCount} className={`${B} px-2 py-1.5 text-left`}>
                <span className="flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] font-medium">
                  {LOSS_CATEGORIES.map((cat) => <span key={cat.code}>{cat.code}) {cat.label}</span>)}
                  <span className="font-semibold">BAL. = available − losses</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function IdleTimeSheetPP({ machine, days, totalsHours, monthLabel }) {
  return (
    <section className="sheet mx-auto w-full max-w-[900px] bg-white p-6 text-black print:p-0">
      <div className="border-2 border-black">
        <h2 className="border-b-2 border-black px-2 py-2 text-center text-base font-bold italic">
          {(machine?.name || machine?.code || '').replace(' FURNACE', '')} Idle Time for the month of {monthLabel}
        </h2>
        <table className="w-full table-fixed border-collapse text-center">
          <colgroup><col className="w-[48px]" />{IDLE_FIELDS.map((f) => <col key={f.code} />)}<col className="w-[70px]" /></colgroup>
          <thead>
            <tr>
              <th rowSpan={2} className={`${B} px-1 py-1 text-[11px] font-bold`}>Date</th>
              {IDLE_FIELDS.map((f) => <th key={f.code} className={`${B} px-0.5 py-1 align-middle text-[9.5px] font-semibold leading-tight`}>{f.sheetLabel}</th>)}
              <th rowSpan={2} className={`${B} px-1 py-1 text-[11px] font-bold`}>Total</th>
            </tr>
            <tr>{IDLE_FIELDS.map((f) => <th key={f.code} className={`${B} bg-[#dce6c8] py-0.5 font-mono text-[12px] font-bold`}>{f.code}</th>)}</tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const total = IDLE_FIELDS.reduce((s, f) => s + (Number(d[f.key]) || 0), 0);
              const flagged = (Number(d.breakdownMaintMin) || 0) > 0 || (Number(d.noPowerMin) || 0) > 0 || (Number(d.noMaterialMin) || 0) > 0;
              return (
                <tr key={d.day}>
                  <th className={`${B} py-0.5 font-mono text-[12px] font-semibold tabular-nums text-[#b42318]`}>{d.day}</th>
                  {IDLE_FIELDS.map((f) => <td key={f.code} className={`${B} py-0.5 font-mono text-[12px] tabular-nums`}>{d[f.key] || ''}</td>)}
                  <td className={`${B} py-0.5 font-mono text-[12px] tabular-nums ${flagged ? 'bg-[#ffe27a] font-semibold' : ''}`}>{total ? fmt(total) : ''}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th className={`${B} border-t-2 py-1 text-[9px] font-bold`}>Hrs</th>
              {IDLE_FIELDS.map((f) => {
                const key = { A: 'loadingUnloadingHrs', B: 'waitingCyclePrepHrs', C: 'waitingMaterialHrs', D: 'preventiveMaintHrs', E: 'breakdownMaintHrs', F: 'noPowerHrs', G: 'noMaterialHrs' }[f.code];
                return <td key={f.code} className={`${B} border-t-2 py-1 font-mono text-[12px] font-semibold tabular-nums`}>{fmt(totalsHours?.[key])}</td>;
              })}
              <td className={`${B} border-t-2 py-1 font-mono text-[12px] font-bold tabular-nums text-[#b42318]`}>{fmt(totalsHours?.totalIdleHrs)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-1 text-[9.5px] font-medium text-black">Daily figures in minutes · bottom row totals in hours</p>
    </section>
  );
}

function PlantLossesFurnaceBlock({ entry }) {
  return (
    <table className="w-full table-fixed border-collapse text-center">
      <tbody>
        <tr><th colSpan={LOSS_CODES.length} className={`${B} py-1 text-[13px] font-bold tracking-wide text-[#4b2e83]`}>{entry.furnaceLabel}</th></tr>
        <tr>{LOSS_CODES.map((c) => <th key={c} className={`${B} bg-[#eceedd] py-0.5 font-mono text-[12px] font-bold text-[#4b2e83]`}>{c}</th>)}</tr>
        <tr>{LOSS_CATEGORIES.map((cat) => <th key={cat.code} className={`${B} px-0.5 py-1.5 align-middle text-[10.5px] font-semibold leading-tight`}>{cat.label}</th>)}</tr>
        <tr>{LOSS_CODES.map((c) => <td key={c} className={`${B} py-1 font-mono text-[12.5px] tabular-nums text-[#1f4e79]`}>{fmt(hoursOfPlant(entry, c))}</td>)}</tr>
        <tr><th colSpan={2} className={`${B} py-0.5 text-[11px] font-bold`}>AVAILABLE TIME</th><th colSpan={2} className={`${B} py-0.5 text-[11px] font-bold`}>LOSS TIME</th><th colSpan={2} className={`${B} py-0.5 text-[11px] font-bold`}>USED TIME</th><th className={`${B} py-0.5 text-[11px] font-bold`}>% OF TIME USED</th></tr>
        <tr>
          <td colSpan={2} className={`${B} py-1 font-mono text-[12.5px] tabular-nums text-[#1f4e79]`}>{fmt(entry.availableHours, 0)}</td>
          <td colSpan={2} className={`${B} py-1 font-mono text-[12.5px] tabular-nums text-[#1f4e79]`}>{fmt(entry.lossHours)}</td>
          <td colSpan={2} className={`${B} py-1 font-mono text-[12.5px] tabular-nums text-[#1f4e79]`}>{fmt(entry.usedHours, 1)}</td>
          <td className={`${B} py-1 font-mono text-[12.5px] tabular-nums text-[#1f4e79]`}>{fmt(entry.efficiencyPercent, 1)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function PlantLossesSheetPP({ monthLabel, entries, totals }) {
  return (
    <section className="sheet mx-auto w-full max-w-[900px] bg-white p-6 text-black print:p-0">
      <div className="border-2 border-black">
        <h2 className="border-b-2 border-black py-2 text-center text-xl font-bold tracking-wide">PLANT LOSSES FOR THE MONTH OF {monthLabel}</h2>
        {entries.map((e, i) => <div key={e.id}>{i > 0 && <div className="h-3 border-y border-black bg-[#9cc3e5]" />}<PlantLossesFurnaceBlock entry={e} /></div>)}
        <div className="h-3 border-y border-black bg-[#9cc3e5]" />
        <table className="w-full table-fixed border-collapse text-center">
          <tbody>
            <tr>
              <th className={`${B} py-1 text-[11.5px] font-bold text-[#4b2e83]`}>TOTAL AVAILABLE TIME</th>
              <th className={`${B} py-1 text-[11.5px] font-bold text-[#4b2e83]`}>TOTAL LOSS TIME</th>
              <th className={`${B} py-1 text-[11.5px] font-bold text-[#4b2e83]`}>TOTAL USED TIME</th>
              <th className={`${B} py-1 text-[11.5px] font-bold text-[#4b2e83]`}>% OF Time Used</th>
            </tr>
            <tr>
              <td className={`${B} py-1.5 font-mono text-[14px] font-semibold tabular-nums text-[#1f4e79]`}>{fmt(totals.totalAvailable, 0)}</td>
              <td className={`${B} py-1.5 font-mono text-[14px] font-semibold tabular-nums text-[#1f4e79]`}>{fmt(totals.totalLoss)}</td>
              <td className={`${B} py-1.5 font-mono text-[14px] font-semibold tabular-nums text-[#1f4e79]`}>{fmt(totals.totalUsed)}</td>
              <td className={`${B} py-1.5 font-mono text-[14px] font-semibold tabular-nums text-[#1f4e79]`}>{fmt(totals.efficiencyPercent, 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[10px] font-medium text-black">All figures in hours.</p>
    </section>
  );
}

export default function DailyUtilizationPrintPack() {
  const [params] = useSearchParams();
  const date = params.get('date') || new Date().toISOString().slice(0, 10);
  const year = Number(params.get('year')) || Number(date.slice(0, 4));
  const month = Number(params.get('month')) || Number(date.slice(5, 7));
  const machineIds = (params.get('machineIds') || '').split(',').map((s) => s.trim()).filter(Boolean);

  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState([]);
  const [utilRows, setUtilRows] = useState({});
  const [idleData, setIdleData] = useState({});
  const [plantLosses, setPlantLosses] = useState(null);

  useEffect(() => { const p = document.title; document.title = ' '; return () => { document.title = p; }; }, []);

  useEffect(() => {
    if (!machineIds.length) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      api.get('/machines'),
      ...machineIds.map((id) => api.get('/manufacturing/furnace-utilization', { params: { machineId: id, date } })),
      ...machineIds.map((id) => api.get('/manufacturing/idle-logs', { params: { machineId: id, year, month } })),
      api.get('/manufacturing/plant-losses', { params: { year, month } }),
    ]).then(([machinesRes, ...rest]) => {
      const utilRes = rest.slice(0, machineIds.length);
      const idleRes = rest.slice(machineIds.length, machineIds.length * 2);
      const plantRes = rest[machineIds.length * 2];
      setMachines(machinesRes.data.data || []);
      const um = {}; machineIds.forEach((id, i) => { um[id] = utilRes[i].data.data || emptyUtilRow(); }); setUtilRows(um);
      const im = {}; machineIds.forEach((id, i) => { im[id] = idleRes[i].data.data; }); setIdleData(im);
      setPlantLosses(plantRes.data.data);
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, year, month, machineIds.join(',')]);

  const monthLabel = `${MONTH_NAMES[month - 1]}-${year}`;
  const furnaces = machineIds.map((id) => {
    const m = machines.find((x) => String(x.id) === String(id));
    return { id, shortName: m?.name || m?.code || `#${id}`, row: utilRows[id] || emptyUtilRow() };
  });

  if (loading) return <div className="p-10 text-slate-400">Loading...</div>;
  if (!machineIds.length) return (
    <div className="p-10 text-center">
      <p className="text-rose-500 font-bold">No furnaces selected to print.</p>
      <Link to="/manufacturing/utilization" className="text-indigo-600">← Back</Link>
    </div>
  );

  return (
    <div className="bg-slate-100 min-h-screen py-8 print:bg-white print:py-0">
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        @page landscapePage { size: A4 landscape; margin: 8mm; }
        .sheet-landscape { page: landscapePage; }
        @media print {
          .no-print { display: none !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .sheet { box-shadow: none !important; }
          .sheet ~ .sheet { break-before: page; page-break-before: always; }
        }
      `}</style>
      <div className="no-print max-w-[1240px] mx-auto mb-4 flex justify-end">
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-[#1f4e79] hover:border-[#1f4e79]">
          <Printer className="h-3.5 w-3.5" /> Print pack ({1 + machineIds.length + 1} pages)
        </button>
      </div>

      <DailyUtilizationSheet date={date} furnaces={furnaces} />
      {machineIds.map((id) => {
        const m = machines.find((x) => String(x.id) === String(id));
        const d = idleData[id];
        return <IdleTimeSheetPP key={id} machine={m} days={d?.days || []} totalsHours={d?.totalsHours} monthLabel={monthLabel} />;
      })}
      {plantLosses && <PlantLossesSheetPP monthLabel={monthLabel} entries={plantLosses.entries || []} totals={plantLosses.totals || {}} />}
    </div>
  );
}
