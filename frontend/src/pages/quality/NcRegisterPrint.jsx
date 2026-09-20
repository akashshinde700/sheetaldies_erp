import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import api from '../../utils/api';

// Ported as-is from the client-supplied "Rework Data" prototype
// (Rework Data/src/components/NcRegisterSheet.tsx) — same headers, column
// widths, borders and layout as the QF-QA-20 paper register.

const HEADERS = ['Sr No', 'Date', 'Customer Name', 'Test Report', 'Process', 'Stage', 'N.C Qty', 'N.C Details', 'Disposition', 'Root Cause Analysis', 'Corrective Action', 'Re-Verification', 'Sign'];
const WIDTHS = ['3%', '6%', '10%', '8%', '8%', '8%', '4%', '14%', '11%', '10%', '11%', '9%', '4%'];

function SvtLogo({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Shital Vacuum Treat logo">
      <path d="M24 3 41 9v18c0 9-7.5 15.5-17 18C14.5 42.5 7 36 7 27V9L24 3Z" fill="#b81b5c" />
      <text x="24" y="31" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" fontStyle="italic" fontWeight="700" fill="#ffffff">SVT</text>
    </svg>
  );
}

export default function NcRegisterPrint() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const p = document.title; document.title = ' '; return () => { document.title = p; }; }, []);
  useEffect(() => {
    api.get('/quality/nc-register').then((r) => setRows(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  const blankRows = Math.max(0, 14 - rows.length);

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
              <th className="cell align-middle" colSpan={8}><div className="py-2 text-[15px] font-bold tracking-wide">INHOUSE NON CONFORMANCE (NC) REGISTER</div></th>
              <th className="cell align-middle" colSpan={3}><div className="py-2 text-[11px] font-bold text-[#b81b5c]">SHITAL VACUUM TREAT PVT LTD.</div></th>
            </tr>
            <tr>{HEADERS.map((h) => <th key={h} className="cell py-1.5 align-middle font-bold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="cell">{row.srNo}</td>
                <td className="cell">{row.entryDate.slice(0, 10)}</td>
                <td className="cell text-left">{row.customerName}</td>
                <td className="cell text-left">{row.testReport}</td>
                <td className="cell text-left">{row.process}</td>
                <td className="cell text-left">{row.stage}</td>
                <td className="cell">{row.ncQty}</td>
                <td className="cell text-left">{row.ncDetails}</td>
                <td className="cell text-left">{row.disposition}</td>
                <td className="cell text-left">{row.rootCauseAnalysis}</td>
                <td className="cell text-left">{row.correctiveAction}</td>
                <td className="cell text-left">{row.reVerification}</td>
                <td className="cell">{row.sign}</td>
              </tr>
            ))}
            {Array.from({ length: blankRows }).map((_, i) => (
              <tr key={`blank-${i}`}>{WIDTHS.map((__, c) => <td key={c} className="cell h-[26px]">&nbsp;</td>)}</tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="cell text-left font-semibold" colSpan={4}><span className="pl-1">QF-QA-20</span></td>
              <td className="cell font-semibold" colSpan={3}>REV. NO:- 00</td>
              <td className="cell font-semibold" colSpan={3}>REV. DATE:- 01.08.2021</td>
              <td className="cell font-semibold" colSpan={3}>PAGE- 1 OF 1</td>
            </tr>
          </tfoot>
        </table>
      </section>
    </div>
  );
}
