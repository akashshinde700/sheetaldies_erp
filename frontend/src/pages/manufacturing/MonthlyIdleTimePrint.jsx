import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import api from '../../utils/api';

// Ported as-is from the client-supplied prototype's
// src/components/sheets/IdleTimeSheet.tsx — same borders, same loss-code
// header row, same "breakdown/no-power/no-material flagged" highlight.

const LOSS_FIELDS = [
  { code: 'A', key: 'loadingUnloadingMin', sheetLabel: 'Loading Unloading Time in mints.' },
  { code: 'B', key: 'waitingCyclePrepMin', sheetLabel: 'Waiting For Cycle Prepration' },
  { code: 'C', key: 'waitingMaterialMin', sheetLabel: 'Waiting for material' },
  { code: 'D', key: 'preventiveMaintMin', sheetLabel: 'Cleaning of furnace' },
  { code: 'E', key: 'breakdownMaintMin', sheetLabel: 'B.down Maint.' },
  { code: 'F', key: 'noPowerMin', sheetLabel: 'No Power' },
  { code: 'G', key: 'noMaterialMin', sheetLabel: 'No Material' },
];
const B = 'border border-black';
const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const fmt = (v, d = 2) => (Number(v) || 0).toFixed(d);

export default function MonthlyIdleTimePrint() {
  const [params] = useSearchParams();
  const machineId = params.get('machineId');
  const year = Number(params.get('year')) || new Date().getFullYear();
  const month = Number(params.get('month')) || new Date().getMonth() + 1;

  const [machine, setMachine] = useState(null);
  const [days, setDays] = useState([]);
  const [totalsHours, setTotalsHours] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const p = document.title; document.title = ' '; return () => { document.title = p; }; }, []);

  useEffect(() => {
    if (!machineId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      api.get('/machines'),
      api.get('/manufacturing/idle-logs', { params: { machineId, year, month } }),
    ]).then(([machinesRes, sheetRes]) => {
      setMachine((machinesRes.data.data || []).find((m) => String(m.id) === String(machineId)) || null);
      setDays(sheetRes.data.data.days || []);
      setTotalsHours(sheetRes.data.data.totalsHours || null);
    }).finally(() => setLoading(false));
  }, [machineId, year, month]);

  const monthLabel = `${MONTH_NAMES[month - 1]}-${year}`;

  if (loading) return <div className="p-10 text-slate-400">Loading...</div>;
  if (!machine) return (
    <div className="p-10 text-center">
      <p className="text-rose-500 font-bold">No machine selected to print.</p>
      <Link to="/manufacturing/idle-time" className="text-indigo-600">← Back</Link>
    </div>
  );

  return (
    <div className="bg-slate-100 min-h-screen py-8 print:bg-white print:py-0">
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        @media print { .no-print { display: none !important; } html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; } }
      `}</style>

      <div className="no-print max-w-[900px] mx-auto mb-4 flex justify-end">
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-[#1f4e79] hover:border-[#1f4e79]">
          <Printer className="h-3.5 w-3.5" /> Print sheet
        </button>
      </div>

      <section className="mx-auto w-full max-w-[900px] bg-white p-6 text-black shadow-sm ring-1 ring-[#dfe4e9] print:p-0 print:shadow-none print:ring-0">
        <div className="border-2 border-black">
          <h2 className="border-b-2 border-black px-2 py-2 text-center text-base font-bold italic">
            {(machine.name || machine.code).replace(' FURNACE', '')} Idle Time for the month of {monthLabel}
          </h2>

          <table className="w-full table-fixed border-collapse text-center">
            <colgroup>
              <col className="w-[48px]" />
              {LOSS_FIELDS.map((f) => <col key={f.code} />)}
              <col className="w-[70px]" />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2} className={`${B} px-1 py-1 text-[11px] font-bold`}>Date</th>
                {LOSS_FIELDS.map((f) => (
                  <th key={f.code} className={`${B} px-0.5 py-1 align-middle text-[9.5px] font-semibold leading-tight`}>{f.sheetLabel}</th>
                ))}
                <th rowSpan={2} className={`${B} px-1 py-1 text-[11px] font-bold`}>Total</th>
              </tr>
              <tr>
                {LOSS_FIELDS.map((f) => (
                  <th key={f.code} className={`${B} bg-[#dce6c8] py-0.5 font-mono text-[12px] font-bold`}>{f.code}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const total = LOSS_FIELDS.reduce((s, f) => s + (Number(d[f.key]) || 0), 0);
                const flagged = (Number(d.breakdownMaintMin) || 0) > 0 || (Number(d.noPowerMin) || 0) > 0 || (Number(d.noMaterialMin) || 0) > 0;
                return (
                  <tr key={d.day}>
                    <th className={`${B} py-0.5 font-mono text-[12px] font-semibold tabular-nums text-[#b42318]`}>{d.day}</th>
                    {LOSS_FIELDS.map((f) => (
                      <td key={f.code} className={`${B} py-0.5 font-mono text-[12px] tabular-nums`}>{d[f.key] || ''}</td>
                    ))}
                    <td className={`${B} py-0.5 font-mono text-[12px] tabular-nums ${flagged ? 'bg-[#ffe27a] font-semibold' : ''}`}>{total ? fmt(total) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th className={`${B} border-t-2 py-1 text-[9px] font-bold`}>Hrs</th>
                {LOSS_FIELDS.map((f) => {
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
    </div>
  );
}
