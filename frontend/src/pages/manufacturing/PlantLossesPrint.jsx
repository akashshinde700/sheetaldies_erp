import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import api from '../../utils/api';

// Ported as-is from the client-supplied prototype's
// src/components/sheets/PlantLossesSheet.tsx — same borders, same purple
// section labels, same blue divider bars between furnace blocks.

const LOSS_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const LOSS_SHEET_LABELS = {
  A: 'Loading Unloading Time in mints.', B: 'Waiting For Cycle Prepration', C: 'Waiting for material',
  D: 'Cleaning of furnace', E: 'B.down Maint.', F: 'No Power', G: 'No Material',
};
const B = 'border border-black';
const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const fmt = (v, d = 2) => (Number(v) || 0).toFixed(d);
const hoursOf = (e, code) => ({
  A: Number(e.loadingUnloadingMin || 0) / 60,
  B: Number(e.waitingCyclePrepHrs || 0),
  C: Number(e.waitingMaterialHrs || 0),
  D: Number(e.cleaningFurnaceHrs || 0),
  E: Number(e.breakdownMaintHrs || 0),
  F: Number(e.noPowerHrs || 0),
  G: Number(e.noMaterialHrs || 0),
}[code]);

function FurnaceBlock({ entry }) {
  return (
    <table className="w-full table-fixed border-collapse text-center">
      <tbody>
        <tr><th colSpan={LOSS_CODES.length} className={`${B} py-1 text-[13px] font-bold tracking-wide text-[#4b2e83]`}>{entry.furnaceLabel}</th></tr>
        <tr>{LOSS_CODES.map((c) => <th key={c} className={`${B} bg-[#eceedd] py-0.5 font-mono text-[12px] font-bold text-[#4b2e83]`}>{c}</th>)}</tr>
        <tr>{LOSS_CODES.map((c) => <th key={c} className={`${B} px-0.5 py-1.5 align-middle text-[10.5px] font-semibold leading-tight`}>{LOSS_SHEET_LABELS[c]}</th>)}</tr>
        <tr>{LOSS_CODES.map((c) => <td key={c} className={`${B} py-1 font-mono text-[12.5px] tabular-nums text-[#1f4e79]`}>{fmt(hoursOf(entry, c))}</td>)}</tr>
        <tr>
          <th colSpan={2} className={`${B} py-0.5 text-[11px] font-bold`}>AVAILABLE TIME</th>
          <th colSpan={2} className={`${B} py-0.5 text-[11px] font-bold`}>LOSS TIME</th>
          <th colSpan={2} className={`${B} py-0.5 text-[11px] font-bold`}>USED TIME</th>
          <th className={`${B} py-0.5 text-[11px] font-bold`}>% OF TIME USED</th>
        </tr>
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

export default function PlantLossesPrint() {
  const [params] = useSearchParams();
  const year = Number(params.get('year')) || new Date().getFullYear();
  const month = Number(params.get('month')) || new Date().getMonth() + 1;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const p = document.title; document.title = ' '; return () => { document.title = p; }; }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/manufacturing/plant-losses', { params: { year, month } })
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, [year, month]);

  const monthLabel = `${MONTH_NAMES[month - 1]}-${year}`;
  const entries = data?.entries || [];
  const totals = data?.totals || { totalAvailable: 0, totalLoss: 0, totalUsed: 0, efficiencyPercent: 0 };

  if (loading) return <div className="p-10 text-slate-400">Loading...</div>;
  if (!entries.length) return <div className="p-10 text-center text-slate-500">No plant loss data for {monthLabel} yet.</div>;

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
          <h2 className="border-b-2 border-black py-2 text-center text-xl font-bold tracking-wide">PLANT LOSSES FOR THE MONTH OF {monthLabel}</h2>

          {entries.map((e, i) => (
            <div key={e.id}>
              {i > 0 && <div className="h-3 border-y border-black bg-[#9cc3e5]" />}
              <FurnaceBlock entry={e} />
            </div>
          ))}
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
    </div>
  );
}
