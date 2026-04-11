import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';

function asGraph(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return [];
    }
  }
  return [];
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

function StepGraph({ graph }) {
  const pts = useMemo(() => expandToPlot(graph), [graph]);
  if (pts.length < 2) return <div className="text-[10px] text-slate-500">No graph data.</div>;

  const w = 420;
  const h = 140;
  const pad = 24;
  const minX = Math.min(...pts.map((p) => p.t));
  const maxX = Math.max(...pts.map((p) => p.t));
  const minY = Math.min(...pts.map((p) => p.temp), 0);
  const maxY = Math.max(...pts.map((p) => p.temp));
  const sx = (x) => pad + ((x - minX) / (maxX - minX || 1)) * (w - pad * 2);
  const sy = (y) => h - pad - ((y - minY) / (maxY - minY || 1)) * (h - pad * 2);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.t).toFixed(2)} ${sy(p.temp).toFixed(2)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[140px] print:max-w-md">
      <rect x="0" y="0" width={w} height={h} fill="white" />
      <path d={d} fill="none" stroke="#111" strokeWidth="1.8" />
      {pts.map((p, i) => (
        <circle key={i} cx={sx(p.t)} cy={sy(p.temp)} r="2" fill="#111" />
      ))}
    </svg>
  );
}

export default function VHTRunsheetPrint() {
  const { id } = useParams();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/manufacturing/runsheets/${id}`)
      .then((r) => setRow(r.data.data))
      .catch(() => setRow(null))
      .finally(() => setLoading(false));
  }, [id]);

  const totalWt = useMemo(
    () => (row?.items || []).reduce((s, it) => s + (Number(it.weightKg) || 0), 0),
    [row]
  );

  const graph = asGraph(row?.tempGraphPoints);

  if (loading) return <div className="p-6 text-slate-400 text-sm">Loading…</div>;
  if (!row) {
    return (
      <div className="p-6">
        <p className="text-slate-500 text-sm">Run sheet not found.</p>
        <Link to="/manufacturing/runsheet" className="text-indigo-600 text-sm mt-2 inline-block">
          Back
        </Link>
      </div>
    );
  }

  const runDateStr = formatDate(row.runDate);

  return (
    <div className="min-h-screen bg-white text-slate-900 print:p-0 p-6">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <div className="no-print mb-4 flex gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium"
        >
          Print
        </button>
        <Link to={`/manufacturing/runsheet/${id}`} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">
          Edit
        </Link>
        <Link to="/manufacturing/runsheet" className="px-4 py-2 rounded-lg border border-slate-200 text-sm">
          List
        </Link>
      </div>

      <div className="max-w-[210mm] mx-auto border border-slate-300 print:border-0 p-4 space-y-4 text-[11px] leading-snug">
        <header className="text-center border-b border-slate-800 pb-2">
          <div className="text-[10px] font-semibold tracking-wide">SHITAL VACUUM TREAT PVT. LTD.</div>
          <div className="text-lg font-bold mt-1">VHT RUN SHEET</div>
        </header>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <div><span className="font-semibold">Date:</span> {runDateStr}</div>
          <div><span className="font-semibold">Furnace:</span> {row.furnace?.name || row.furnace?.code || '—'}</div>
          <div><span className="font-semibold">Run sheet no.:</span> {row.runsheetNumber}</div>
          <div><span className="font-semibold">Cycle end:</span> {row.cycleEndTime || '—'}</div>
          <div><span className="font-semibold">Total time:</span> {row.totalTimeDisplay || '—'}</div>
          <div><span className="font-semibold">M.R.:</span> {row.mrStart ?? '—'} → {row.mrEnd ?? '—'} (total {row.totalMr ?? '—'})</div>
          <div className="col-span-2"><span className="font-semibold">Loading operator:</span> {row.loadingOperatorName || '—'}</div>
        </div>

        <table className="w-full border-collapse border border-slate-800 text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-800 px-1 py-1 text-left">Customer</th>
              <th className="border border-slate-800 px-1 py-1 text-left">Job card no.</th>
              <th className="border border-slate-800 px-1 py-1 text-left">Description</th>
              <th className="border border-slate-800 px-1 py-1 text-left">MTRL</th>
              <th className="border border-slate-800 px-1 py-1 text-left">HRC req</th>
              <th className="border border-slate-800 px-1 py-1 text-right">Qty</th>
              <th className="border border-slate-800 px-1 py-1 text-right">Wt (kg)</th>
            </tr>
          </thead>
          <tbody>
            {(row.items || []).map((it, i) => (
              <tr key={i}>
                <td className="border border-slate-800 px-1 py-1">{it.customerName || '—'}</td>
                <td className="border border-slate-800 px-1 py-1 font-mono">{it.jobCard?.jobCardNo || '—'}</td>
                <td className="border border-slate-800 px-1 py-1">{it.jobDescription || it.item?.description || '—'}</td>
                <td className="border border-slate-800 px-1 py-1">{it.materialGrade || '—'}</td>
                <td className="border border-slate-800 px-1 py-1">{it.hrcRequired || '—'}</td>
                <td className="border border-slate-800 px-1 py-1 text-right">{it.quantity}</td>
                <td className="border border-slate-800 px-1 py-1 text-right tabular-nums">
                  {it.weightKg != null ? Number(it.weightKg).toFixed(2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td colSpan={6} className="border border-slate-800 px-1 py-1 text-right">Total weight</td>
              <td className="border border-slate-800 px-1 py-1 text-right tabular-nums">{totalWt.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div><span className="font-semibold">Type of hardening:</span> {row.hardeningType || row.tempProfile || '—'}</div>
            <div><span className="font-semibold">Quenching pressure:</span>{' '}
              {row.quenchPressureBar != null ? `${row.quenchPressureBar} bar` : '—'}
            </div>
            <div><span className="font-semibold">Fan speed:</span> {row.fanRpm != null ? `${row.fanRpm} RPM` : '—'}</div>
            <div><span className="font-semibold">Fixtures / T.C. position:</span> {row.fixturesPosition || '—'}</div>
          </div>
          <div className="border border-slate-800 p-2">
            <div className="font-semibold text-center mb-1 border-b border-slate-300 pb-1">Temperature–time (actual)</div>
            <StepGraph graph={graph} />
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3 space-y-2">
          <p className="text-[10px] text-slate-700 font-medium">
            {row.verificationNote ||
              'After processing within 24 hrs, Supervisor shall verify process parameter (graph) & sign below.'}
          </p>
          <div className="grid grid-cols-2 gap-8 mt-4">
            <div>
              <div className="text-[10px] font-semibold">Operator sign</div>
              <div className="h-10 border-b border-slate-400 mt-1">{row.operatorSign || ''}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold">Production supervisor sign</div>
              <div className="h-10 border-b border-slate-400 mt-1">{row.supervisorSign || ''}</div>
            </div>
          </div>
        </div>

        <footer className="text-[9px] text-slate-600 flex justify-between border-t border-slate-300 pt-2">
          <span>Rev. {row.docRevNo || '—'} | Effective {formatDate(row.docEffectiveDate)}</span>
          <span>Page {row.docPageOf || '1 of 2'}</span>
        </footer>
      </div>
    </div>
  );
}
