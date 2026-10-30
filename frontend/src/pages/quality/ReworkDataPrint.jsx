import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import api from '../../utils/api';

// Ported as-is from the client-supplied "Rework Data" prototype
// (Rework Data/src/components/ReworkDataSheet.tsx) — same headers, column
// widths, borders and layout as the QF-QA-07 paper register.

const HEADERS = ['SR.NO', 'DATE', 'CUSTOMER NAME', 'DESCRIPTION', 'QTY', 'WEIGHT', 'JOB CARD NO / HARDNESS (REQD.)', 'CYCLE NO', 'REASON', 'REWORK CYCLE NO', 'AFTER PROCESS RESULTS', 'REMARK'];
const WIDTHS = ['3%', '6%', '11%', '17%', '3.5%', '4.5%', '9%', '9%', '13%', '9%', '8%', '7%'];
const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

function SvtLogo({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Shital Vacuum Treat logo">
      <path d="M24 3 41 9v18c0 9-7.5 15.5-17 18C14.5 42.5 7 36 7 27V9L24 3Z" fill="#b81b5c" />
      <text x="24" y="31" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" fontStyle="italic" fontWeight="700" fill="#ffffff">SVT</text>
    </svg>
  );
}

export default function ReworkDataPrint() {
  const [params] = useSearchParams();
  const year = Number(params.get('year')) || new Date().getFullYear();
  const month = Number(params.get('month')) || new Date().getMonth() + 1;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const p = document.title; document.title = ' '; return () => { document.title = p; }; }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/quality/rework-entries', { params: { year, month } })
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, [year, month]);

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const rows = data?.entries || [];
  const totals = data?.totals || { totalReworkQty: 0, totalReworkWeight: 0, monthlyReworkPercent: 0 };
  const causes = data?.causes?.length ? data.causes : ['', '', '', ''];
  const correctiveActions = data?.correctiveActions?.length ? data.correctiveActions : ['', '', '', ''];
  const blankRows = Math.max(0, 13 - rows.length);

  if (loading) return <div className="p-10 text-slate-400">Loading...</div>;

  return (
    <div className="bg-neutral-100 min-h-screen py-8 print:bg-white print:py-0">
      <style>{`
        @page { size: A4 landscape; margin: 8mm; }
        @media print { .no-print { display: none !important; } html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; } }
        .cell { border: 1px solid #000; padding: 2px 3px; text-align: center; vertical-align: middle; word-break: break-word; }
      `}</style>

      <div className="no-print max-w-[1400px] mx-auto mb-4 flex justify-end">
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-500">
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
      </div>

      <section className="mx-auto max-w-[1400px] bg-white p-[10px] border border-black print:p-0 print:border-0">
        <table className="w-full table-fixed border-collapse text-[9px] leading-tight">
          <colgroup>{WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead>
            <tr>
              <th className="cell align-middle" colSpan={2}><div className="flex items-center justify-center py-1"><SvtLogo className="h-9 w-9" /></div></th>
              <th className="cell align-middle" colSpan={7}>
                <div className="py-1.5">
                  <div className="text-[15px] font-bold tracking-wide">SHITAL VACUUM TREAT PVT LTD</div>
                  <div className="mt-1 text-[10px] font-semibold">TITLE:- REWORK DATA</div>
                </div>
              </th>
              <th className="p-0 align-top" colSpan={3}>
                <table className="w-full table-fixed border-collapse text-[8px]">
                  <tbody>
                    <tr><td className="cell text-left font-semibold">DOC NO.</td><td className="cell text-left">QF-QA-07</td></tr>
                    <tr><td className="cell text-left font-semibold">REV NO.</td><td className="cell text-left">0</td></tr>
                    <tr><td className="cell text-left font-semibold">REV DATE</td><td className="cell text-left">01.04.2019</td></tr>
                    <tr><td className="cell text-left font-semibold">PAGE NO.</td><td className="cell text-left">1 OF 1</td></tr>
                  </tbody>
                </table>
              </th>
            </tr>
            <tr><th className="cell py-1 text-[10px] font-bold" colSpan={12}>REWORK AND REJECTION DATA FOR THE MONTH OF :- {monthLabel}</th></tr>
            <tr>{HEADERS.map((h) => <th key={h} className="cell py-1.5 align-middle font-bold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="cell">{row.srNo}</td>
                <td className="cell">{row.entryDate.slice(0, 10)}</td>
                <td className="cell text-left">{row.customerName}</td>
                <td className="cell text-left">{row.description}</td>
                <td className="cell">{row.qty}</td>
                <td className="cell">{row.weightKg}</td>
                <td className="cell"><div>{row.jobCardNoText}</div><div>{row.hardnessRequired}</div></td>
                <td className="cell">{row.cycleNo}</td>
                <td className="cell text-left">{row.reason}</td>
                <td className="cell">{row.reworkCycleNo}</td>
                <td className="cell">{row.afterProcessResults}</td>
                <td className="cell">{row.remark}</td>
              </tr>
            ))}
            {Array.from({ length: blankRows }).map((_, i) => (
              <tr key={`blank-${i}`}>{WIDTHS.map((__, c) => <td key={c} className="cell h-[18px]">&nbsp;</td>)}</tr>
            ))}

            <tr>
              <td className="cell text-left font-semibold" colSpan={4}>Total Rework Qty &amp; Weight :-</td>
              <td className="cell">{totals.totalReworkQty}</td>
              <td className="cell">{totals.totalReworkWeight}</td>
              <td className="cell" rowSpan={4} colSpan={6}>
                <div className="px-2 py-2 text-left text-[9px] font-bold">DECLERATION:- Corrective action of in house N.C to initiate when rejection is above KPI target (monthly basis)</div>
              </td>
            </tr>
            <tr>
              <td className="cell text-left font-semibold" colSpan={4}>Total Processed weight :-</td>
              <td className="cell" colSpan={2}>{data?.totalProcessedWeightKg ?? ''}</td>
            </tr>
            <tr>
              <td className="cell font-semibold" colSpan={4}>Monthly Rework %</td>
              <td className="cell font-semibold">Target</td>
              <td className="cell font-semibold">Act</td>
            </tr>
            <tr>
              <td className="cell" colSpan={4}>{totals.monthlyReworkPercent}</td>
              <td className="cell">{data?.targetPercent}%</td>
              <td className="cell">&nbsp;</td>
            </tr>

            {causes.map((cause, i) => (
              <tr key={`cause-${i}`}>
                {i === 0 && <td className="cell font-bold" rowSpan={4}>CAUSES</td>}
                <td className="cell w-[6%]">{i + 1}</td>
                <td className="cell h-[18px] text-left" colSpan={10}>{cause || ' '}</td>
              </tr>
            ))}
            {correctiveActions.map((action, i) => (
              <tr key={`action-${i}`}>
                {i === 0 && <td className="cell text-[8px] font-bold leading-tight" rowSpan={4}>CORRECTIVE ACTIONS</td>}
                <td className="cell">{i + 1}</td>
                <td className="cell h-[18px] text-left" colSpan={10}>{action || ' '}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="cell h-[54px] align-bottom text-left" colSpan={6}><span className="pl-2 text-[10px] font-semibold italic">Prepared By (Q.A) :-</span></td>
              <td className="cell h-[54px] align-bottom text-left" colSpan={6}><span className="pl-2 text-[10px] font-semibold">Approved By (M.R) :-</span></td>
            </tr>
          </tfoot>
        </table>
      </section>
    </div>
  );
}
