import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';

// ── Company constants ─────────────────────────────────────────
const SVT = {
  name:    'SHITAL VACUUM TREAT PVT. LTD.',
  address: 'Plot No. 84/1, Sector No. 10, PCNTDA, Bhosari, Pune',
  email:   'info@shitalgroup.com',
  gstin:   '27AATCS0577L1ZK',
};

// ── Helpers ───────────────────────────────────────────────────
function asArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
  return [];
}

function num(v) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// Checkbox component matching physical form style
function CB({ checked }) {
  return (
    <span className="inline-flex items-center justify-center w-[11px] h-[11px] border border-black text-[8px] leading-none mr-0.5 flex-shrink-0">
      {checked ? '✓' : ''}
    </span>
  );
}

// ── Temperature graph — staircase / step chart (matches Excel HT cycle) ──────
function TempGraph({ points }) {
  // Accept [{time, temp}] or [{x,y}] or plain number array
  const rawPts = (() => {
    if (!points || points.length === 0) return [];
    if (typeof points[0] === 'number') return points.map((v, i) => ({ x: i, y: v }));
    return points
      .map(p => ({ x: num(p.time ?? p.x), y: num(p.temp ?? p.y) }))
      .filter(p => p.x != null && p.y != null)
      .sort((a, b) => a.x - b.x);
  })();

  // Canvas dimensions
  const W = 720; const H = 180; const PL = 36; const PR = 12; const PT = 12; const PB = 28;
  const iW = W - PL - PR; const iH = H - PT - PB;

  // Y scale: always 0..1300 so axis is consistent across different cycles
  const Y_MAX = 1300;
  const sy = y => PT + iH - (y / Y_MAX) * iH;
  const Y_TICKS = [0, 200, 400, 600, 800, 1000, 1200];

  // X scale: use actual time value
  const n = rawPts.length;
  const minX = n > 0 ? Math.min(...rawPts.map(p => p.x)) : 0;
  const maxX = n > 0 ? Math.max(...rawPts.map(p => p.x)) : 1;
  const sx = x => PL + ((x - minX) / (maxX - minX || 1)) * iW;

  // X tick labels: show actual time values (minutes)
  const xTickIdxs = rawPts.length <= 12
    ? rawPts.map((_, i) => i)
    : rawPts.reduce((acc, _, i) => {
        if (i === 0 || i === n - 1 || i % Math.ceil(n / 8) === 0) acc.push(i);
        return acc;
      }, []);

  // Build step-line path: horizontal first, then vertical (Excel staircase style)
  // From (x1,y1) → horizontal to (x2,y1) → vertical to (x2,y2)
  const buildPath = () => {
    if (n < 2) return '';
    let d = `M ${sx(rawPts[0].x).toFixed(1)} ${sy(rawPts[0].y).toFixed(1)}`;
    for (let i = 1; i < n; i++) {
      d += ` H ${sx(rawPts[i].x).toFixed(1)} V ${sy(rawPts[i].y).toFixed(1)}`;
    }
    return d;
  };

  // Label only at local maxima, minima transitions, start/end
  const shouldLabel = (i) => {
    if (i === 0 || i === n - 1) return true;
    const prev = rawPts[i - 1].y;
    const curr = rawPts[i].y;
    const next = rawPts[i + 1]?.y ?? curr;
    // local peak OR start of hold (two same values in a row)
    return curr > prev || curr > next;
  };

  const emptyGraph = (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 170 }}>
      <rect x="0" y="0" width={W} height={H} fill="white" />
      <line x1={PL} y1={PT} x2={PL} y2={PT + iH} stroke="#999" strokeWidth="1" />
      <line x1={PL} y1={PT + iH} x2={PL + iW} y2={PT + iH} stroke="#999" strokeWidth="1" />
      {Y_TICKS.map(t => {
        const yy = sy(t);
        return (
          <g key={t}>
            <line x1={PL} y1={yy} x2={PL + iW} y2={yy} stroke="#eee" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x={PL - 3} y={yy + 3} textAnchor="end" fontSize="8" fill="#aaa">{t}</text>
          </g>
        );
      })}
      <text x={PL + iW / 2} y={PT + iH / 2 + 5} textAnchor="middle" fontSize="9" fill="#bbb">— No graph data —</text>
      <text x={PL - 24} y={PT + iH / 2} textAnchor="middle" fontSize="8" fill="#aaa"
        transform={`rotate(-90,${PL - 24},${PT + iH / 2})`}>TEMP (°C)</text>
      <text x={PL + iW / 2} y={H - 4} textAnchor="middle" fontSize="8" fill="#aaa">TIME (MINUTE) →</text>
    </svg>
  );

  if (n < 2) return emptyGraph;

  const pathD = buildPath();

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 170 }}>
      <rect x="0" y="0" width={W} height={H} fill="white" />

      {/* Y grid lines + labels */}
      {Y_TICKS.map(t => {
        const yy = sy(t);
        return (
          <g key={t}>
            <line x1={PL} y1={yy} x2={PL + iW} y2={yy}
              stroke={t === 0 ? '#555' : '#ddd'} strokeWidth={t === 0 ? '1' : '0.6'} strokeDasharray={t === 0 ? '' : '4,3'} />
            <text x={PL - 3} y={yy + 3} textAnchor="end" fontSize="8" fill="#444">{t}</text>
          </g>
        );
      })}

      {/* Vertical axis */}
      <line x1={PL} y1={PT} x2={PL} y2={PT + iH} stroke="#555" strokeWidth="1" />
      {/* Horizontal axis */}
      <line x1={PL} y1={PT + iH} x2={PL + iW} y2={PT + iH} stroke="#555" strokeWidth="1" />

      {/* Staircase line */}
      <path d={pathD} fill="none" stroke="#111" strokeWidth="1.8" strokeLinejoin="miter" />

      {/* Dots + temperature labels at key points */}
      {rawPts.map((p, i) => {
        const cx = sx(p.x); const cy = sy(p.y);
        const label = shouldLabel(i);
        // offset label up/down to avoid overlap with gridlines
        const labelY = cy - 6 < PT + 8 ? cy + 13 : cy - 6;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={label ? 2.8 : 1.8} fill="#111" />
            {label && p.y > 0 && (
              <text x={cx} y={labelY} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#111">
                {p.y}
              </text>
            )}
          </g>
        );
      })}

      {/* X tick labels — time in minutes */}
      {xTickIdxs.map(i => (
        <text key={i} x={sx(rawPts[i].x)} y={PT + iH + 13}
          textAnchor="middle" fontSize="7.5" fill="#555">
          {rawPts[i].x}
        </text>
      ))}

      {/* Axis labels */}
      <text
        x={PL - 24} y={PT + iH / 2}
        textAnchor="middle" fontSize="8" fill="#555"
        transform={`rotate(-90,${PL - 24},${PT + iH / 2})`}
      >
        TEMP (°C)
      </text>
      <text x={PL + iW / 2} y={H - 4} textAnchor="middle" fontSize="8" fill="#555">
        TIME (STEP) →
      </text>
    </svg>
  );
}

// ── SVT logo ─────────────────────────────────────────────────
function SvtLogo({ size = 50 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="27" fill="#0f172a" stroke="#0f172a" strokeWidth="2" />
      <text x="28" y="35" textAnchor="middle" fill="white" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="16" letterSpacing="1">SVT</text>
    </svg>
  );
}

function TuvLogo({ size = 44 }) {
  return (
    <svg width={size * 1.4} height={size} viewBox="0 0 72 52" fill="none">
      <rect x="1" y="1" width="70" height="50" rx="4" fill="white" stroke="#1e3a8a" strokeWidth="2" />
      <text x="36" y="20" textAnchor="middle" fill="#1e3a8a" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="14" letterSpacing="1">TÜV</text>
      <text x="36" y="33" textAnchor="middle" fill="#1e3a8a" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="9" letterSpacing="1">AUSTRIA</text>
      <text x="36" y="44" textAnchor="middle" fill="#64748b" fontFamily="Arial,sans-serif" fontSize="7">CERTIFIED</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
export default function CertPrint() {
  const { id } = useParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/quality/certificates/${id}`)
      .then(r => setCert(r.data.data))
      .catch(() => setError('Certificate not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const derived = useMemo(() => {
    if (!cert) return {};
    const tempPoints = asArray(cert.effectiveTempCycleData ?? cert.tempCycleData);
    const insp = cert.jobCard?.inspection;

    // Required hardness
    const reqMin = num(insp?.requiredHardnessMin) ?? num(cert.hardnessMin);
    const reqMax = num(insp?.requiredHardnessMax) ?? num(cert.hardnessMax);
    const reqText = (reqMin != null && reqMax != null) ? `${reqMin}-${reqMax} ${cert.hardnessUnit || 'HRC'}` : cert.hrcRange || cert.jobCard?.hrcRange || '—';

    // Achieved hardness — from inspectionResults or cert inspection
    const achResult = (cert.inspectionResults || []).find(r => r.inspectionType === 'HARDNESS');
    const achText = achResult?.achievedValue || (insp?.achievedHardness != null ? `${insp.achievedHardness} ${cert.hardnessUnit || 'HRC'}` : '—');

    // Challan items (for WM No, DRG No)
    const challanItems = cert.jobCard?.challans?.flatMap(ch => ch.items || []) || [];

    return { tempPoints, reqText, achText, challanItems };
  }, [cert]);

  if (loading) return <div className="p-4 text-slate-400 text-sm">Loading…</div>;
  if (error || !cert) return (
    <div className="p-4 space-y-2">
      <p className="text-slate-500 text-sm">{error || 'Not found.'}</p>
      <Link to="/quality/certificates" className="text-indigo-600 text-sm hover:underline">← Back</Link>
    </div>
  );

  const customer   = cert.customer || cert.jobCard?.customer;
  const jc         = cert.jobCard || {};
  const items      = cert.items || [];
  const totalQty   = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const totalWt    = items.reduce((s, it) => s + (num(it.totalWeight) || 0), 0);
  const challanItems = derived.challanItems || [];

  const byOurVehicle     = jc.dispatchByOurVehicle  || cert.dispatchedThrough === 'OUR_VEHICLE';
  const byCourier        = jc.dispatchByCourier      || cert.dispatchedThrough === 'COURIER';
  const collectedByCust  = jc.collectedByCustomer    || cert.dispatchedThrough === 'COLLECTED';

  // Get DC No from yourRefNo or from linked challan
  const yourDcNo = cert.yourRefNo || jc.challans?.[0]?.challanNo || '—';
  const cycleNo  = cert.heatNo || '';

  // Material and process from cert or job card or first challan item
  const material  = cert.dieMaterial || jc.dieMaterial || challanItems[0]?.material || '—';
  const htSpec    = cert.operatorMode || jc.hrcRange?.replace(/\d.*/, '').trim() || challanItems[0]?.processName || '—';

  const distBefore = asArray(cert.distortionBefore);
  const distAfter  = asArray(cert.distortionAfter);

  const ITEMS_8 = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div className="bg-slate-100 py-4 print:bg-white print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page { box-shadow: none !important; margin: 0 !important; border: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          @page { margin: 8mm; size: A4; }
        }
        .cert-border { border: 1px solid black; }
        .cell { border: 1px solid black; }
      `}</style>

      {/* Action bar */}
      <div className="no-print max-w-[900px] mx-auto mb-3 flex items-center gap-2 px-2">
        <Link to={`/quality/certificates/${id}`} className="btn-ghost text-sm">← Back</Link>
        <button className="btn-primary ml-auto text-sm" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      {/* ── Certificate Page ── */}
      <div className="page max-w-[900px] mx-auto bg-white shadow-lg text-[10px]" style={{ fontFamily: 'Arial, sans-serif' }}>

        {/* ── HEADER ── */}
        <table className="w-full border-collapse" style={{ borderBottom: '2px solid black' }}>
          <tbody>
            <tr>
              {/* Left: SVT + Factory */}
              <td className="p-2 align-top" style={{ width: '35%', borderRight: '1px solid black' }}>
                <div className="flex items-start gap-2">
                  <SvtLogo size={46} />
                  <div className="leading-snug">
                    <div className="font-bold text-[9px] text-slate-600 mb-0.5">Factory:</div>
                    <div className="font-extrabold text-[11px]">{SVT.name}</div>
                    <div className="text-[9px] text-slate-700">{SVT.address}</div>
                    <div className="text-[9px] text-slate-700">{SVT.email}</div>
                  </div>
                </div>
              </td>

              {/* Center + Right: Title + Reg Office + TUV */}
              <td className="p-2 align-top" style={{ width: '65%' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-[9px] text-slate-600 mb-0.5">Registered Office:</div>
                    <div className="font-extrabold text-[11px]">{SVT.name}</div>
                    <div className="text-[9px] text-slate-700">{SVT.address}</div>
                    <div className="text-[9px] text-slate-700">{SVT.email}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-4">
                    <TuvLogo size={40} />
                    <table className="text-[8px] border border-black mt-1" style={{ borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr><td className="px-2 py-0.5 border border-black font-semibold">DOC NO</td><td className="px-2 py-0.5 border border-black">QF-QA-04</td></tr>
                        <tr><td className="px-2 py-0.5 border border-black font-semibold">REVISION NO</td><td className="px-2 py-0.5 border border-black">00</td></tr>
                        <tr><td className="px-2 py-0.5 border border-black font-semibold">REV. DATE</td><td className="px-2 py-0.5 border border-black"></td></tr>
                        <tr><td className="px-2 py-0.5 border border-black font-semibold">PAGE NO</td><td className="px-2 py-0.5 border border-black">1 Of 1</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="text-center font-extrabold text-[16px] tracking-widest mt-1" style={{ letterSpacing: '0.15em' }}>
                  TEST CERTIFICATE
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── CUSTOMER + CERT DETAILS ── */}
        <table className="w-full border-collapse" style={{ borderBottom: '1px solid black' }}>
          <tbody>
            <tr>
              <td className="p-2 align-top" style={{ width: '55%', borderRight: '1px solid black' }}>
                <div className="font-bold mb-1">Customer's:</div>
                <div className="font-extrabold text-[11px]">{customer?.name || '—'}</div>
                <div className="text-[9px] whitespace-pre-wrap leading-snug mt-0.5">{customer?.address || '—'}</div>
              </td>
              <td className="p-2 align-top text-[9.5px]" style={{ width: '45%' }}>
                <table className="w-full">
                  <tbody>
                    <tr><td className="pr-2 py-0.5 text-slate-600 whitespace-nowrap">Certificate No.</td><td className="font-bold font-mono">: {cert.certNo}</td></tr>
                    <tr><td className="pr-2 py-0.5 text-slate-600">Job Card No.</td><td className="font-mono">: {jc.jobCardNo || '—'}</td></tr>
                    <tr><td className="pr-2 py-0.5 text-slate-600">Your PO No.</td><td className="font-mono">: {cert.yourPoNo || '—'}</td></tr>
                    <tr><td className="pr-2 py-0.5 text-slate-600">Your DC No.</td><td className="font-mono">: {yourDcNo}</td></tr>
                    <tr><td className="pr-2 py-0.5 text-slate-600">Issue Date</td><td className="font-mono">: {formatDate(cert.issueDate)}</td></tr>
                    <tr><td className="pr-2 py-0.5 text-slate-600">Issue By</td><td className="font-mono">: {cert.checkedBy || cert.createdBy?.name || '—'}</td></tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── DISPATCH MODE + SPECIAL INSTRUCTION ── */}
        <table className="w-full border-collapse" style={{ borderBottom: '1px solid black' }}>
          <tbody>
            <tr>
              <td className="p-2" style={{ borderRight: '1px solid black' }}>
                <span className="font-bold mr-2">DISPATCH MODE:-</span>
                <span className="mr-3"><CB checked={byOurVehicle} /> BY OUR VEHICLE</span>
                <span className="mr-3"><CB checked={byCourier} /> BY COURIER</span>
                <span><CB checked={collectedByCust || (!byOurVehicle && !byCourier)} /> COLLECTED BY CUSTOMER</span>
              </td>
              <td className="p-2" style={{ width: '200px' }}>
                <div className="font-bold mb-1">Special Instruction</div>
                <div><CB checked={cert.specInstrCertificate} /> CERTIFICATE</div>
                <div><CB checked={cert.specInstrMpiReport} /> MPI REPORT</div>
                <div><CB checked={cert.specInstrProcessGraph} /> PROCESS GRAPH</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── MATERIAL / HT SPEC / HRC ── */}
        <table className="w-full border-collapse" style={{ borderBottom: '1px solid black' }}>
          <tbody>
            <tr>
              <td className="p-2 font-bold" style={{ width: '80px', borderRight: '1px solid black' }}>
                {material}
              </td>
              <td className="p-2" style={{ borderRight: '1px solid black' }}>
                <span className="text-slate-500 mr-2">Heat Treatment Specification</span>
                <span className="font-bold">{htSpec || 'HARDEN AND TEMPER'}</span>
              </td>
              <td className="p-2 font-extrabold text-center" style={{ width: '120px', fontSize: '12px' }}>
                {derived.reqText}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── ITEMS TABLE ── */}
        <table className="w-full border-collapse" style={{ borderBottom: '1px solid black' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid black' }}>
              <th className="p-1.5 text-left font-bold" style={{ width: '40px', borderRight: '1px solid black' }}>Item</th>
              <th className="p-1.5 text-left font-bold" style={{ borderRight: '1px solid black' }}>Description</th>
              <th className="p-1.5 text-center font-bold" style={{ width: '100px', borderRight: '1px solid black' }}>Quantity (Pcs)</th>
              <th className="p-1.5 text-center font-bold" style={{ width: '100px', borderRight: '1px solid black' }}>Weight (Kg)</th>
              <th className="p-1.5 text-center font-bold" style={{ width: '100px' }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => {
              const chItem = challanItems[i] || challanItems[0];
              return (
                <tr key={it.id} style={{ borderBottom: '1px solid #ccc' }}>
                  <td className="p-1.5 text-center" style={{ borderRight: '1px solid black' }}>{i + 1}</td>
                  <td className="p-1.5" style={{ borderRight: '1px solid black' }}>
                    <div className="font-semibold">{it.description}</div>
                    {chItem?.woNo && <div className="text-[9px] text-slate-600">WM NO - {chItem.woNo}</div>}
                    {chItem?.drawingNo && <div className="text-[9px] text-slate-600">DRG NO - {chItem.drawingNo || '-'}</div>}
                  </td>
                  <td className="p-1.5 text-center font-mono" style={{ borderRight: '1px solid black' }}>{it.quantity}</td>
                  <td className="p-1.5 text-center font-mono" style={{ borderRight: '1px solid black' }}>
                    {num(it.totalWeight) != null ? Number(it.totalWeight).toFixed(2) : '—'}
                  </td>
                  <td className="p-1.5 text-center">{it.remarks || ''}</td>
                </tr>
              );
            })}
            {/* empty rows to fill form */}
            {Array.from({ length: Math.max(0, 3 - items.length) }).map((_, i) => (
              <tr key={`empty-${i}`} style={{ borderBottom: '1px solid #e5e5e5', height: '22px' }}>
                <td style={{ borderRight: '1px solid black' }}></td>
                <td style={{ borderRight: '1px solid black' }}></td>
                <td style={{ borderRight: '1px solid black' }}></td>
                <td style={{ borderRight: '1px solid black' }}></td>
                <td></td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid black' }}>
              <td className="p-1.5 font-bold text-right" colSpan={2} style={{ borderRight: '1px solid black' }}>Total</td>
              <td className="p-1.5 text-center font-bold font-mono" style={{ borderRight: '1px solid black' }}>{totalQty}</td>
              <td className="p-1.5 text-center font-bold font-mono" style={{ borderRight: '1px solid black' }}>
                {totalWt ? totalWt.toFixed(2) : '—'}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {/* ── FINAL INSPECTION ── */}
        <div style={{ borderBottom: '1px solid black' }}>
          <div className="px-2 py-1 font-bold flex gap-4" style={{ borderBottom: '1px solid black' }}>
            <span>FINAL INSPECTION</span>
            <span><CB checked={cert.catNormal || (!cert.catCrackRisk && !cert.catDistortionRisk)} /> NORMAL</span>
            <span><CB checked={false} /> SPECIAL</span>
          </div>
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                {/* Categorization */}
                <td className="p-2 align-top" style={{ width: '22%', borderRight: '1px solid black' }}>
                  <div className="font-bold mb-1 text-[9px]">Categorization</div>
                  <div><CB checked={cert.catNormal} /> NORMAL</div>
                  <div><CB checked={false} /> WELDED</div>
                  <div><CB checked={cert.catCrackRisk} /> CRACK OR CRACK RISK</div>
                  <div><CB checked={cert.catDistortionRisk} /> DISTORTION RISK</div>
                  <div><CB checked={cert.catCriticalFinishing} /> CRITCAL FINISHING</div>
                  <div><CB checked={cert.catDentDamage} /> DENT/ DAMAGE</div>
                  <div><CB checked={false} /> RUSTY</div>
                  <div><CB checked={cert.catOthers} /> OTHERS</div>
                </td>

                {/* Process */}
                <td className="p-2 align-top" style={{ width: '22%', borderRight: '1px solid black' }}>
                  <div className="font-bold mb-1 text-[9px]">Process</div>
                  <div><CB checked={cert.procStressRelieving} /> STRESS RELIVING</div>
                  <div><CB checked={cert.procHardening} /> HARDENING</div>
                  <div><CB checked={cert.procTempering} /> TEMPERING</div>
                  <div><CB checked={cert.procAnnealing} /> ANNEALING</div>
                  <div><CB checked={cert.procBrazing} /> BRAZING</div>
                  <div><CB checked={cert.procPlasmaNitriding} /> PLASMA NITRIDING</div>
                  <div><CB checked={cert.procSubZero} /> SUB ZERO</div>
                  <div><CB checked={cert.procSoakClean} /> SOAK CLEAN</div>
                </td>

                {/* Visual + MPI inspection */}
                <td className="p-2 align-top" style={{ width: '28%', borderRight: '1px solid black' }}>
                  <div className="font-bold mb-1 text-[9px]">VISUAL INSPECTION</div>
                  <div><CB checked={false} /> BEFORE</div>
                  <div><CB checked={true} /> AFTER</div>
                  <div className="mt-2 font-bold mb-1 text-[9px]">MPI INSPECTION</div>
                  <div><CB checked={false} /> BEFORE</div>
                  <div><CB checked={false} /> AFTER</div>
                  <div><CB checked={!cert.specInstrMpiReport} /> NIL</div>
                </td>

                {/* Hardness + Final Inspection By */}
                <td className="p-2 align-top" style={{ width: '28%' }}>
                  <div style={{ border: '1px solid black', marginBottom: '4px' }}>
                    <div className="px-2 py-1 font-bold text-[9px]" style={{ borderBottom: '1px solid black' }}>REQUIRE HARDNESS</div>
                    <div className="px-2 py-1.5 font-extrabold text-[12px]">{derived.reqText}</div>
                  </div>
                  <div style={{ border: '1px solid black', marginBottom: '4px' }}>
                    <div className="px-2 py-1 font-bold text-[9px]" style={{ borderBottom: '1px solid black' }}>ACHIVED HARDNESS</div>
                    <div className="px-2 py-1.5 font-extrabold text-[12px]">{derived.achText}</div>
                  </div>
                  <div style={{ border: '1px solid black' }}>
                    <div className="px-2 py-1 font-bold text-[9px]" style={{ borderBottom: '1px solid black' }}>FINAL INSPECTION BY</div>
                    <div className="px-2 py-3"></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── HEAT TREATMENT PROCESS GRAPH ── */}
        <div style={{ borderBottom: '1px solid black' }}>
          <div className="flex items-center gap-4 px-2 py-1 font-bold" style={{ borderBottom: '1px solid black' }}>
            <span>HEAT TREATMENT PROCESS</span>
            <span className="font-normal">
              CYCLE NO: <span className="font-mono">{cycleNo}</span>
            </span>
          </div>
          <div className="px-2 py-1">
            <TempGraph points={derived.tempPoints || []} />
          </div>
        </div>

        {/* ── DISTORTION + HARDNESS + PACKED ── */}
        <table className="w-full border-collapse" style={{ borderBottom: '1px solid black' }}>
          <tbody>
            <tr>
              <td className="align-top p-2" style={{ borderRight: '1px solid black' }}>
                <table className="border-collapse text-[9px]" style={{ border: '1px solid black' }}>
                  <thead>
                    <tr>
                      <th className="p-1 font-bold" style={{ border: '1px solid black' }} colSpan={9}>DISTORTION</th>
                    </tr>
                    <tr>
                      <th className="p-1 font-bold" style={{ border: '1px solid black' }}>ITEM</th>
                      {ITEMS_8.map(i => (
                        <th key={i} className="p-1 text-center" style={{ border: '1px solid black', minWidth: '28px' }}>{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-1 font-bold" style={{ border: '1px solid black' }}>BEFORE</td>
                      {ITEMS_8.map(i => (
                        <td key={i} className="p-1 text-center" style={{ border: '1px solid black' }}>
                          {distBefore[i] != null ? distBefore[i] : (i === 0 ? 'NA' : '')}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-1 font-bold" style={{ border: '1px solid black' }}>AFTER:</td>
                      {ITEMS_8.map(i => (
                        <td key={i} className="p-1 text-center" style={{ border: '1px solid black' }}>
                          {distAfter[i] != null ? distAfter[i] : (i === 0 ? 'NA' : '')}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </td>
              <td className="align-top p-2" style={{ width: '220px' }}>
                <table className="border-collapse text-[9px] w-full" style={{ border: '1px solid black' }}>
                  <tbody>
                    {[1, 2, 3, 4].map(n => (
                      <tr key={n} style={{ borderBottom: '1px solid black' }}>
                        <td className="p-1 font-semibold" style={{ borderRight: '1px solid black', width: '20px' }}>{n}</td>
                        <td className="p-1.5 font-mono">{derived.reqText}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-1.5" style={{ border: '1px solid black' }}>
                  <div className="px-2 py-1 font-bold text-[9px]" style={{ borderBottom: '1px solid black' }}>PACKED QUANTITY</div>
                  <div className="px-2 py-2 font-mono">{cert.packedQty != null ? cert.packedQty : ''}</div>
                </div>
                <div className="mt-1.5" style={{ border: '1px solid black' }}>
                  <div className="px-2 py-1 font-bold text-[9px]" style={{ borderBottom: '1px solid black' }}>PACKED BY</div>
                  <div className="px-2 py-2">{cert.packedBy || ''}</div>
                </div>
                <div className="mt-1.5" style={{ border: '1px solid black' }}>
                  <div className="px-2 py-1 font-bold text-[9px]" style={{ borderBottom: '1px solid black' }}>APPROVED BY:</div>
                  <div className="px-2 py-3">{cert.approvedBy || ''}</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── JOB IMAGES ── */}
        <div style={{ borderBottom: '1px solid black' }}>
          <div className="px-2 py-1 font-bold" style={{ borderBottom: '1px solid black' }}>JOB IMAGE</div>
          <div className="flex gap-2 p-2">
            {[cert.image1, cert.image2, cert.image3, cert.image4, cert.image5]
              .filter(Boolean)
              .map((img, i) => (
                <div key={i} className="border border-black" style={{ width: 140, height: 110 }}>
                  <img src={img} alt={`Job ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            {![cert.image1, cert.image2].some(Boolean) && (
              <div className="flex gap-2">
                {[1, 2].map(n => (
                  <div key={n} className="border border-black flex items-center justify-center text-slate-400 text-[9px]"
                    style={{ width: 140, height: 110 }}>
                    {n}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="flex justify-between items-end px-2 py-1.5 text-[8.5px] text-slate-600">
          <span>QF-QA-04 &nbsp;&nbsp; Effective Date : 01/04/2019 &nbsp;&nbsp; Revision: 00 &nbsp;&nbsp; Revision Date : 00 &nbsp;&nbsp; Page 1 of 1</span>
        </div>
        <div className="px-2 py-1 text-[8px] text-slate-600" style={{ borderTop: '1px solid #ccc' }}>
          <span className="font-semibold">Color Code for Job Crd -</span>
          <span className="ml-2">WHITE – Regular,</span>
          <span className="ml-2">RED – Rework,</span>
          <span className="ml-2">BLUE – New Development,</span>
          <span className="ml-2">YELLOW – Stress Relieving &amp; Other Process.</span>
        </div>
      </div>
    </div>
  );
}
