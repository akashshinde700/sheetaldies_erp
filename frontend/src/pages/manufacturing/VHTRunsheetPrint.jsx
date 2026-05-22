import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';

const DEFAULT_GRAPH = [
  { tempC: 550,  holdMin: 30,  label: 'Preheat 1' },
  { tempC: 850,  holdMin: 45,  label: 'Preheat 2' },
  { tempC: 1030, holdMin: 60,  label: 'Austenitizing' },
];

function asGraph(v) {
  if (!v) return DEFAULT_GRAPH;
  if (Array.isArray(v)) return v.length ? v : DEFAULT_GRAPH;
  try { const p = JSON.parse(v); return Array.isArray(p) && p.length ? p : DEFAULT_GRAPH; } catch { return DEFAULT_GRAPH; }
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
  if (pts.length < 2) {
    return (
      <svg viewBox="0 0 300 120" style={{ width: '100%', height: 100 }}>
        <rect x="0" y="0" width="300" height="120" fill="white" />
        <line x1="24" y1="10" x2="24" y2="96" stroke="#999" strokeWidth="0.8" />
        <line x1="24" y1="96" x2="290" y2="96" stroke="#999" strokeWidth="0.8" />
        {[0, 400, 800, 1200].map((v, i) => {
          const y = 96 - (v / 1200) * 86;
          return <g key={i}>
            <line x1="22" y1={y} x2="290" y2={y} stroke="#eee" strokeWidth="0.5" />
            <text x="20" y={y + 3} textAnchor="end" fontSize="6" fill="#aaa">{v}</text>
          </g>;
        })}
        <text x="157" y="58" textAnchor="middle" fontSize="8" fill="#bbb">— No graph —</text>
      </svg>
    );
  }
  const w = 300; const h = 120; const pl = 24; const pb = 20; const pt = 8;
  const iW = w - pl - 8; const iH = h - pt - pb;
  const minX = Math.min(...pts.map(p => p.t));
  const maxX = Math.max(...pts.map(p => p.t));
  const maxY = Math.max(...pts.map(p => p.temp), 100);
  const sx = x => pl + ((x - minX) / (maxX - minX || 1)) * iW;
  const sy = y => pt + iH - (y / (maxY * 1.05)) * iH;
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.t).toFixed(1)} ${sy(p.temp).toFixed(1)}`).join(' ');
  const yTicks = [0, Math.round(maxY * 0.33), Math.round(maxY * 0.67), Math.round(maxY)];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 100 }}>
      <rect x="0" y="0" width={w} height={h} fill="white" />
      {yTicks.map((v, i) => {
        const yy = sy(v);
        return <g key={i}>
          <line x1={pl} y1={yy} x2={pl + iW} y2={yy} stroke="#ddd" strokeWidth="0.5" strokeDasharray="2,2" />
          <text x={pl - 2} y={yy + 2.5} textAnchor="end" fontSize="6" fill="#666">{v}</text>
        </g>;
      })}
      <line x1={pl} y1={pt} x2={pl} y2={pt + iH} stroke="#555" strokeWidth="0.8" />
      <line x1={pl} y1={pt + iH} x2={pl + iW} y2={pt + iH} stroke="#555" strokeWidth="0.8" />
      <path d={d} fill="none" stroke="#111" strokeWidth="1.5" />
      {pts.map((p, i) => (
        <circle key={i} cx={sx(p.t)} cy={sy(p.temp)} r="1.8" fill="#111" />
      ))}
      <text x={pl + iW / 2} y={h - 4} textAnchor="middle" fontSize="6" fill="#666">TIME (min) →</text>
    </svg>
  );
}

function SvtLogo({ size = 44 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 100 115" fill="none">
      <polygon points="50,2 95,27 95,77 50,102 5,77 5,27" fill="#1a1a1a" stroke="#000" strokeWidth="1.5" />
      <path d="M 38,28 C 22,28 20,38 30,43 L 40,48 C 54,53 54,65 38,66 C 28,66 24,62 24,62"
        fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" />
      <text x="60" y="70" textAnchor="middle" fill="white"
        fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="28" letterSpacing="1">VT</text>
      <text x="50" y="96" textAnchor="middle" fill="#aaa"
        fontFamily="Arial, sans-serif" fontSize="6" letterSpacing="0.5">PUNE</text>
    </svg>
  );
}

function TuvLogo({ size = 40 }) {
  return (
    <svg width={size * 1.4} height={size} viewBox="0 0 72 52" fill="none">
      <rect x="1" y="1" width="70" height="50" rx="4" fill="white" stroke="#1e3a8a" strokeWidth="2" />
      <text x="36" y="20" textAnchor="middle" fill="#1e3a8a"
        fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="14" letterSpacing="1">TÜV</text>
      <text x="36" y="33" textAnchor="middle" fill="#1e3a8a"
        fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="9" letterSpacing="1">AUSTRIA</text>
      <text x="36" y="44" textAnchor="middle" fill="#64748b"
        fontFamily="Arial,sans-serif" fontSize="7">CERTIFIED</text>
    </svg>
  );
}

const B = '1px solid black';
const cell = { border: B, padding: '3px 5px', fontSize: '9px', verticalAlign: 'middle' };
const label = { ...cell, color: '#555', whiteSpace: 'nowrap', fontWeight: 600 };
const val = { ...cell, fontWeight: 700 };

export default function VHTRunsheetPrint() {
  const { id } = useParams();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/manufacturing/runsheets/${id}`)
      .then(r => setRow(r.data.data))
      .catch(() => setRow(null))
      .finally(() => setLoading(false));
  }, [id]);

  const totalWt  = useMemo(() => (row?.items || []).reduce((s, it) => s + (Number(it.weightKg) || 0), 0), [row]);
  const totalQty = useMemo(() => (row?.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0), [row]);
  const graph = asGraph(row?.tempGraphPoints);

  if (loading) return <div className="p-6 text-slate-400 text-sm">Loading…</div>;
  if (!row) return (
    <div className="p-6">
      <p className="text-slate-500 text-sm">Run sheet not found.</p>
      <Link to="/manufacturing/runsheet" className="text-indigo-600 text-sm mt-2 inline-block">Back</Link>
    </div>
  );

  const items = row.items || [];
  const EMPTY_ROWS = Math.max(0, 10 - items.length);

  return (
    <div className="min-h-screen bg-white print:p-0 p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 8mm; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print mb-4 flex gap-3">
        <button onClick={() => window.print()}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium">
          Print
        </button>
        <Link to={`/manufacturing/runsheet/${id}`} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">Edit</Link>
        <Link to="/manufacturing/runsheet" className="px-4 py-2 rounded-lg border border-slate-200 text-sm">List</Link>
      </div>

      <div className="max-w-[210mm] mx-auto" style={{ border: B }}>

        {/* ── HEADER ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <tbody>
            <tr>
              <td style={{ ...cell, width: '60px', textAlign: 'center', borderRight: B }} rowSpan={2}>
                <SvtLogo size={44} />
              </td>
              <td style={{ ...cell, textAlign: 'center', borderRight: B }} rowSpan={2}>
                <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '1px' }}>SHITAL VACUUM TREAT PVT. LTD.</div>
                <div style={{ fontSize: '8px', color: '#555', marginTop: '2px' }}>Plot No. 84/1, Sector 10, PCNTDA, Bhosari, Pune</div>
                <div style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '2px', marginTop: '4px' }}>VHT RUN SHEET</div>
              </td>
              <td style={{ ...label, borderRight: B, borderBottom: B }}>DOC NO</td>
              <td style={{ ...val, borderRight: B, borderBottom: B }}>QF-PD-03</td>
              <td style={{ width: '70px', textAlign: 'center', borderLeft: B }} rowSpan={4}>
                <TuvLogo size={40} />
              </td>
            </tr>
            <tr>
              <td style={{ ...label, borderRight: B, borderBottom: B }}>REV NO</td>
              <td style={{ ...val, borderRight: B, borderBottom: B }}>00</td>
            </tr>
            <tr>
              <td style={{ ...cell, borderRight: B }}></td>
              <td style={{ ...cell, borderRight: B }}></td>
              <td style={{ ...label, borderRight: B, borderBottom: B }}>REV. DATE</td>
              <td style={{ ...val, borderRight: B, borderBottom: B }}></td>
            </tr>
            <tr>
              <td style={{ ...cell, borderRight: B }}></td>
              <td style={{ ...cell, borderRight: B }}></td>
              <td style={{ ...label, borderRight: B }}>PAGE NO</td>
              <td style={{ ...val, borderRight: B }}>{row.docPageOf || '1 OF 2'}</td>
            </tr>
          </tbody>
        </table>

        {/* ── BODY: Left (items) + Right (info panel) ── */}
        <div style={{ display: 'flex', borderBottom: B }}>

          {/* LEFT COLUMN */}
          <div style={{ flex: 1, borderRight: B }}>

            {/* Date / Cycle / MR row */}
            <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
              <tbody>
                <tr>
                  <td style={label}>DATE:</td>
                  <td style={{ ...val, borderRight: B }}>{formatDate(row.runDate)}</td>
                  <td style={label}>CYCLE END TIME:</td>
                  <td style={val}>{row.cycleEndTime || '—'}</td>
                </tr>
                <tr>
                  <td style={{ ...label, borderTop: B }}>M.R END:</td>
                  <td style={{ ...val, borderRight: B, borderTop: B }}>{row.mrEnd ?? '—'}</td>
                  <td style={{ ...label, borderTop: B }}></td>
                  <td style={{ ...val, borderTop: B }}></td>
                </tr>
              </tbody>
            </table>

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['CUSTOMERS', 'JOB CARD NO', 'JOB DESCRIPTION', 'MTRL', 'HRC REQ', 'QTY', 'W.T'].map((h, i) => (
                    <th key={i} style={{ ...cell, borderBottom: B, borderRight: i < 6 ? B : 'none', fontWeight: 900, fontSize: '8px', textAlign: 'center' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td style={{ ...cell, borderBottom: B, borderRight: B, fontSize: '8px' }}>{it.customerName || '—'}</td>
                    <td style={{ ...cell, borderBottom: B, borderRight: B, fontSize: '7px', fontFamily: 'monospace' }}>{it.jobCard?.jobCardNo || '—'}</td>
                    <td style={{ ...cell, borderBottom: B, borderRight: B, fontSize: '8px' }}>{it.jobDescription || it.item?.description || '—'}</td>
                    <td style={{ ...cell, borderBottom: B, borderRight: B, fontSize: '8px', textAlign: 'center' }}>{it.materialGrade || '—'}</td>
                    <td style={{ ...cell, borderBottom: B, borderRight: B, fontSize: '8px', textAlign: 'center' }}>{it.hrcRequired || '—'}</td>
                    <td style={{ ...cell, borderBottom: B, borderRight: B, fontSize: '8px', textAlign: 'center' }}>{it.quantity}</td>
                    <td style={{ ...cell, borderBottom: B, fontSize: '8px', textAlign: 'right', fontFamily: 'monospace' }}>
                      {it.weightKg != null ? Number(it.weightKg).toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}
                {/* Empty filler rows */}
                {Array.from({ length: EMPTY_ROWS }).map((_, i) => (
                  <tr key={`e${i}`} style={{ height: '18px' }}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} style={{ ...cell, borderBottom: B, borderRight: j < 6 ? B : 'none' }}></td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f1f5f9' }}>
                  <td style={{ ...cell, borderTop: B, borderRight: B, fontWeight: 900, fontSize: '8px' }}>VFT</td>
                  <td colSpan={4} style={{ ...cell, borderTop: B, borderRight: B, fontSize: '8px', textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
                  <td style={{ ...cell, borderTop: B, borderRight: B, fontWeight: 900, textAlign: 'center', fontSize: '8px' }}>{totalQty}</td>
                  <td style={{ ...cell, borderTop: B, fontWeight: 900, textAlign: 'right', fontSize: '8px', fontFamily: 'monospace' }}>{totalWt.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ width: '34%', fontSize: '9px' }}>

            {/* Runsheet info fields */}
            <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
              <tbody>
                {[
                  ['JOB CARD NO', row.items?.[0]?.jobCard?.jobCardNo || '—'],
                  ['FURNACE', row.furnace?.name || row.furnace?.code || '—'],
                  ['TOTAL TIME', row.totalTimeDisplay || '—'],
                  ['TOTAL M.R', row.totalMr != null ? `${row.mrStart ?? ''} – ${row.mrEnd ?? ''}` : '—'],
                  ['LOADING OPERATOR NAME', row.loadingOperatorName || '—'],
                  ['FIXTURES', row.fixturesPosition || '—'],
                  ['T.C. POSITION', ''],
                  ['INSTRUCTION', ''],
                ].map(([lbl, v], i) => (
                  <tr key={i}>
                    <td style={{ ...label, borderBottom: B, borderRight: B, width: '45%' }}>{lbl}</td>
                    <td style={{ ...val, borderBottom: B }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Cycle Parameters */}
            <div style={{ borderBottom: B, padding: '3px 5px' }}>
              <div style={{ fontWeight: 900, fontSize: '9px', borderBottom: B, marginBottom: '4px', paddingBottom: '2px' }}>
                CYCLE PARAMETERS
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ ...label }}>Type Of Hardening:-</td>
                  </tr>
                  <tr>
                    <td style={{ ...val, fontSize: '8px', paddingBottom: '4px' }}>{row.hardeningType || row.tempProfile || '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ ...label }}>Quenching Pressure:-</td>
                    <td style={{ ...val }}>{row.quenchPressureBar != null ? `${row.quenchPressureBar} bar` : ''}</td>
                  </tr>
                  <tr>
                    <td style={{ ...label }}>Fan Speed in:-</td>
                    <td style={{ ...val }}>{row.fanRpm != null ? `${row.fanRpm} RPM` : ''}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Graph */}
            <div style={{ padding: '4px', borderBottom: B }}>
              <div style={{ fontWeight: 900, fontSize: '9px', textAlign: 'center', borderBottom: B, marginBottom: '4px', paddingBottom: '2px' }}>
                GRAPH
              </div>
              <StepGraph graph={graph} />
            </div>
          </div>
        </div>

        {/* ── WATER CIRCULATION ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <tbody>
            <tr>
              <td style={{ ...label, borderRight: B, width: '25%' }}>WATER CIRCULATION:</td>
              <td style={{ ...label, borderRight: B, width: '25%' }}>FROM:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
              <td style={{ ...label, width: '50%' }}>TO:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
            </tr>
          </tbody>
        </table>

        {/* ── FAILURE / ISSUE / NTS ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <tbody>
            <tr>
              <td style={{ ...label, borderRight: B }}>FAILURE:</td>
              <td style={{ ...cell, borderRight: B, width: '30%' }}></td>
              <td style={{ ...label, borderRight: B }}>ISSUE:</td>
              <td style={{ ...cell, borderRight: B, width: '20%' }}></td>
              <td style={{ ...label, borderRight: B }}>NTS:</td>
              <td style={{ ...cell, width: '20%' }}></td>
            </tr>
          </tbody>
        </table>

        {/* ── NOTE + SIGNATURES ── */}
        <div style={{ padding: '5px 6px', borderBottom: B, fontSize: '8px', color: '#444' }}>
          After processing within 24 hrs, Supervisor shall verify process parameter (graph) &amp; sign below.
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <tbody>
            <tr>
              <td style={{ ...label, borderRight: B, width: '15%' }}>S SIGN:-</td>
              <td style={{ ...cell, borderRight: B, width: '35%', height: '30px' }}>{row.operatorSign || ''}</td>
              <td style={{ ...label, borderRight: B, width: '25%' }}>PROD. SUPERVISOR SIGN:-</td>
              <td style={{ ...cell, width: '25%' }}>{row.supervisorSign || ''}</td>
            </tr>
          </tbody>
        </table>

        {/* ── FOOTER ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ ...cell, borderRight: B }}>REV. NO:- {row.docRevNo || '01'}</td>
              <td style={{ ...cell, borderRight: B }}>
                EFFECTIVE DATE: {row.docEffectiveDate ? formatDate(row.docEffectiveDate) : '01/04/2019'}
              </td>
              <td style={{ ...cell, textAlign: 'right' }}>PAGE {row.docPageOf || '1 OF 2'}</td>
            </tr>
          </tbody>
        </table>

      </div>
    </div>
  );
}
