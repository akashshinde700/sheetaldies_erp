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

// D2 default cycle — fallback when no graph saved on runsheet or cert
const DEFAULT_TEMP_CYCLE = [
  { time: '0',   temp: '550'  },
  { time: '30',  temp: '550'  },
  { time: '30',  temp: '850'  },
  { time: '75',  temp: '850'  },
  { time: '75',  temp: '1030' },
  { time: '135', temp: '1030' },
  { time: '145', temp: '80'   },
];

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

// ── Temperature graph — matches physical paper graph style ──────
function TempGraph({ points }) {
  const rawPts = (() => {
    if (!points || points.length === 0) return [];
    if (typeof points[0] === 'number') return points.map((v, i) => ({ x: i, y: v }));
    return points
      .map(p => ({ x: num(p.time ?? p.x), y: num(p.temp ?? p.y) }))
      .filter(p => p.x != null && p.y != null)
      .sort((a, b) => a.x - b.x);
  })();

  const W = 720; const H = 260; const PL = 56; const PR = 24; const PT = 30; const PB = 38;
  const iW = W - PL - PR; const iH = H - PT - PB;
  const n = rawPts.length;

  const allY = rawPts.map(p => p.y);
  const dataMin = n > 0 ? Math.min(...allY) : 0;
  const dataMax = n > 0 ? Math.max(...allY) : 1000;
  const Y_MIN = dataMin < 0 ? Math.floor(dataMin / 100) * 100 - 50 : 0;
  const Y_MAX = Math.ceil((dataMax + 100) / 100) * 100;
  const yStep = (Y_MAX - Y_MIN) <= 600 ? 100 : 200;
  const yTicks = [];
  for (let t = Math.ceil(Y_MIN / yStep) * yStep; t <= Y_MAX; t += yStep) yTicks.push(t);

  const sy = y => PT + iH - ((y - Y_MIN) / (Y_MAX - Y_MIN || 1)) * iH;
  const minX = n > 0 ? rawPts[0].x : 0;
  const maxX = n > 0 ? rawPts[n - 1].x : 1;
  const sx = x => PL + ((x - minX) / (maxX - minX || 1)) * iW;
  const zero_y = sy(0);

  // Deduplicate: keep FIRST point at each unique time value so that
  // instant-step data (same t, different temps) becomes flat→slope pattern.
  const pts = [];
  const seenX = new Set();
  for (const p of rawPts) {
    const key = String(p.x);
    if (!seenX.has(key)) { seenX.add(key); pts.push(p); }
  }
  const m = pts.length;

  if (m < 2) return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <rect x="0" y="0" width={W} height={H} fill="white" />
      <line x1={PL} y1={PT} x2={PL} y2={PT + iH} stroke="#888" strokeWidth="1" />
      <line x1={PL} y1={zero_y} x2={PL + iW} y2={zero_y} stroke="#888" strokeWidth="1" />
      <text x={PL + iW / 2} y={PT + iH / 2 + 5} textAnchor="middle" fontSize="9" fill="#bbb">— No graph data —</text>
    </svg>
  );

  // Straight lines between each point → diagonal ramps like physical graph
  let d = `M ${sx(pts[0].x).toFixed(1)} ${sy(pts[0].y).toFixed(1)}`;
  for (let i = 1; i < m; i++) {
    d += ` L ${sx(pts[i].x).toFixed(1)} ${sy(pts[i].y).toFixed(1)}`;
  }

  // Labels: temp at each new level (bold), duration centered on each segment
  const labelEls = [];
  for (let i = 0; i < m; i++) {
    const p  = pts[i];
    const cx = sx(p.x);
    const cy = sy(p.y);

    const prevY = i > 0 ? pts[i - 1].y : null;
    const tempChanged = prevY === null || prevY !== p.y;

    // Temperature label: always above the point (bold)
    if (tempChanged && p.y !== 0) {
      const tempY = Math.max(cy - 8, PT + 10);
      labelEls.push(
        <text key={`t${i}`} x={cx} y={tempY}
          textAnchor="middle" fontSize="10" fontWeight="bold" fill="#000">
          {p.y}
        </text>
      );
    }

    // Duration label: always BELOW the line midpoint
    if (i < m - 1) {
      const next  = pts[i + 1];
      const dur   = next.x - p.x;
      if (dur > 0) {
        const mx  = (cx + sx(next.x)) / 2;
        const my  = (cy + sy(next.y)) / 2;
        labelEls.push(
          <text key={`d${i}`} x={mx} y={my + 16}
            textAnchor="middle" fontSize="9" fill="#444">
            {dur}
          </text>
        );
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H, fontFamily: 'Arial, sans-serif' }}>
      <rect x="0" y="0" width={W} height={H} fill="white" />

      {/* Y axis */}
      <line x1={PL} y1={PT - 4} x2={PL} y2={PT + iH + 2} stroke="#111" strokeWidth="1.5" />
      <polygon points={`${PL},${PT - 12} ${PL - 4.5},${PT - 3} ${PL + 4.5},${PT - 3}`} fill="#111" />

      {/* X axis at temperature = 0 */}
      <line x1={PL} y1={zero_y} x2={PL + iW + 4} y2={zero_y} stroke="#111" strokeWidth="1.5" />
      <polygon points={`${PL + iW + 13},${zero_y} ${PL + iW + 4},${zero_y - 4.5} ${PL + iW + 4},${zero_y + 4.5}`} fill="#111" />

      {/* Y axis tick marks + labels (no grid lines) */}
      {yTicks.filter(t => t !== 0).map(t => (
        <g key={t}>
          <line x1={PL - 4} y1={sy(t)} x2={PL} y2={sy(t)} stroke="#555" strokeWidth="1" />
          <text x={PL - 6} y={sy(t) + 3.5} textAnchor="end" fontSize="8" fill="#333">{t}</text>
        </g>
      ))}

      {/* Y axis title — stacked letters like physical form */}
      {'TEMPERATURE'.split('').map((ch, i) => (
        <text key={i} x={13} y={PT + 4 + i * 9.5} textAnchor="middle" fontSize="7" fontWeight="bold" fill="#444">{ch}</text>
      ))}
      <text x={13} y={PT + 4 + 11 * 9.5} textAnchor="middle" fontSize="7" fill="#444">°C</text>

      {/* Staircase — thick bold line, no dots */}
      <path d={d} fill="none" stroke="#000" strokeWidth="2.8" strokeLinejoin="miter" strokeLinecap="square" />

      {/* Temperature + duration labels */}
      {labelEls}

      {/* X axis label */}
      <text x={PL + iW / 2} y={H - 5} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#444">
        TIME (MINUTE)
      </text>
    </svg>
  );
}

// ── SVT logo ─────────────────────────────────────────────────
function SvtLogo({ size = 50 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 100 115" fill="none">
      <polygon points="50,2 95,27 95,77 50,102 5,77 5,27" fill="#1a1a1a" stroke="#000" strokeWidth="1.5"/>
      <path d="M 38,28 C 22,28 20,38 30,43 L 40,48 C 54,53 54,65 38,66 C 28,66 24,62 24,62"
        fill="none" stroke="white" strokeWidth="7" strokeLinecap="round"/>
      <text x="60" y="70" textAnchor="middle" fill="white"
        fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="28" letterSpacing="1">VT</text>
      <text x="50" y="96" textAnchor="middle" fill="#aaa"
        fontFamily="Arial, sans-serif" fontSize="6" letterSpacing="0.5">PUNE</text>
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

  // Use relative path — nginx serves /uploads/* from backend on production
  const makeImgUrl = p => {
    if (!p) return null;
    // Strip any localhost prefix stored from dev environment
    const clean = p.replace(/^https?:\/\/localhost:\d+/, '');
    return clean.startsWith('http') ? clean : clean;
  };

  const derived = useMemo(() => {
    if (!cert) return {};
    const tempPoints = asArray(cert.effectiveTempCycleData ?? cert.tempCycleData);
    const effectiveTempPoints = tempPoints.length >= 2 ? tempPoints : DEFAULT_TEMP_CYCLE;
    const insp = cert.jobCard?.inspection;

    // Required hardness — num(0)||null treats stored-zero as "not set", falls back to jc.hrcRange
    const reqMin = num(insp?.requiredHardnessMin) ?? (num(cert.hardnessMin) || null);
    const reqMax = num(insp?.requiredHardnessMax) ?? (num(cert.hardnessMax) || null);
    const reqText = (reqMin != null && reqMax != null)
      ? `${reqMin}-${reqMax} ${cert.hardnessUnit || 'HRC'}`
      : cert.hrcRange || cert.jobCard?.hrcRange || '—';

    // Achieved hardness — from inspectionResults or cert inspection
    const achResult = (cert.inspectionResults || []).find(r => r.inspectionType === 'HARDNESS');
    const achText = achResult?.achievedValue || (insp?.achievedHardness != null ? `${insp.achievedHardness} ${cert.hardnessUnit || 'HRC'}` : '—');

    // Challan items (for WM No, DRG No + items fallback)
    const challanItems = cert.jobCard?.challans?.flatMap(ch => ch.items || []) || [];

    return { tempPoints, effectiveTempPoints, reqText, achText, challanItems };
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
  const challanItems = derived.challanItems || [];
  const insp = jc.inspection || {};

  // If cert was saved before categorization/process were populated, fall back to job card inspection
  const hasCertCat  = cert.catNormal || cert.catWelded || cert.catCrackRisk || cert.catDistortionRisk ||
                      cert.catCriticalFinishing || cert.catDentDamage || cert.catRusty || cert.catOthers;
  const hasCertProc = cert.procStressRelieving || cert.procHardening || cert.procTempering || cert.procAnnealing ||
                      cert.procBrazing || cert.procPlasmaNitriding || cert.procSubZero || cert.procSoakClean;
  const cat  = (field) => hasCertCat  ? !!cert[field] : !!insp[field];
  const proc = (field) => hasCertProc ? !!cert[field] : !!insp[field];

  // If cert has no saved items, fall back to job card challan items so the table isn't blank
  const certItemsSaved = cert.items || [];
  const items = certItemsSaved.length > 0
    ? certItemsSaved
    : challanItems.map(it => ({
        id:          it.id,
        description: it.partName || it.description || '',
        quantity:    it.qty ?? it.quantity ?? '',
        totalWeight: it.weight ?? it.totalWeight ?? null,
        remarks:     '',
      }));
  const totalQty   = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const totalWt    = items.reduce((s, it) => s + (num(it.totalWeight) || 0), 0);

  const dt = cert.dispatchedThrough || '';
  const byOurVehicle     = jc.dispatchByOurVehicle  || dt.toLowerCase().includes('vehicle');
  const byCourier        = jc.dispatchByCourier      || dt.toLowerCase().includes('courier');
  const collectedByCust  = jc.collectedByCustomer    || dt.toLowerCase().includes('collected');

  // Get DC No from yourRefNo or from linked challan
  const yourDcNo = cert.yourRefNo || jc.challans?.[0]?.challanNo || '—';
  const cycleNo  = cert.heatNo || '';

  // Material and process from cert or job card or first challan item
  const material  = cert.dieMaterial || jc.dieMaterial || challanItems[0]?.material || '—';
  const htSpec    = cert.operatorMode || jc.hrcRange?.replace(/\d.*/, '').trim() || challanItems[0]?.processName || '—';

  // DB stores distortion as [{pt, val}, ...] — extract scalar values
  const extractDist = arr => asArray(arr).map(v =>
    v != null && typeof v === 'object' ? (v.val ?? v.value ?? '') : v
  );
  const distBefore = extractDist(cert.distortionBefore);
  const distAfter  = extractDist(cert.distortionAfter);

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
                        <tr><td className="px-2 py-0.5 border border-black font-semibold">DOC NO</td><td className="px-2 py-0.5 border border-black">QF-QA-08</td></tr>
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

        {/* ── DISPATCH MODE + MATERIAL + SPECIAL INSTRUCTION (merged) ── */}
        <table className="w-full border-collapse" style={{ borderBottom: '1px solid black' }}>
          <tbody>
            {/* Row 1: Dispatch Mode */}
            <tr>
              <td className="p-2" colSpan={3} style={{ borderRight: '1px solid black', borderBottom: '1px solid black' }}>
                <span className="font-bold mr-2">DISPATCH MODE:-</span>
                <span className="mr-3"><CB checked={byOurVehicle} /> BY OUR VEHICLE</span>
                <span className="mr-3"><CB checked={byCourier} /> BY COURIER</span>
                <span><CB checked={collectedByCust || (!byOurVehicle && !byCourier)} /> COLLECTED BY CUSTOMER</span>
              </td>
              <td className="p-2 align-top" rowSpan={3} style={{ width: '200px' }}>
                <div className="font-bold mb-1">Special Instruction</div>
                <div><CB checked={cert.specInstrCertificate} /> CERTIFICATE</div>
                <div><CB checked={cert.specInstrMpiReport} /> MPI REPORT</div>
                <div><CB checked={cert.specInstrProcessGraph} /> PROCESS GRAPH</div>
              </td>
            </tr>
            {/* Row 2: Labels */}
            <tr style={{ borderBottom: '1px solid black' }}>
              <td className="px-2 py-0.5 text-slate-500 text-[9px]" style={{ borderRight: '1px solid black' }}>Material</td>
              <td className="px-2 py-0.5 text-slate-500 text-[9px]" style={{ borderRight: '1px solid black' }}>Heat Treatment Specification</td>
              <td className="px-2 py-0.5 text-slate-500 text-[9px]" style={{ borderRight: '1px solid black' }}></td>
            </tr>
            {/* Row 3: Values */}
            <tr>
              <td className="p-2 font-bold" style={{ width: '80px', borderRight: '1px solid black' }}>
                {material}
              </td>
              <td className="p-2 font-bold" style={{ borderRight: '1px solid black' }}>
                {htSpec || 'HARDEN AND TEMPER'}
              </td>
              <td className="p-2 font-extrabold text-center" style={{ width: '120px', fontSize: '12px', borderRight: '1px solid black' }}>
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
            <span><CB checked={cat('catNormal') || (!cat('catCrackRisk') && !cat('catDistortionRisk'))} /> NORMAL</span>
            <span><CB checked={false} /> SPECIAL</span>
          </div>
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                {/* Categorization */}
                <td className="p-2 align-top" style={{ width: '22%', borderRight: '1px solid black' }}>
                  <div className="font-bold mb-1 text-[9px]">Categorization</div>
                  <div><CB checked={cat('catNormal')} /> NORMAL</div>
                  <div><CB checked={cat('catWelded')} /> WELDED</div>
                  <div><CB checked={cat('catCrackRisk')} /> CRACK OR CRACK RISK</div>
                  <div><CB checked={cat('catDistortionRisk')} /> DISTORTION RISK</div>
                  <div><CB checked={cat('catCriticalFinishing')} /> CRITCAL FINISHING</div>
                  <div><CB checked={cat('catDentDamage')} /> DENT/ DAMAGE</div>
                  <div><CB checked={cat('catRusty')} /> RUSTY</div>
                  <div><CB checked={cat('catOthers')} /> OTHERS</div>
                </td>

                {/* Process */}
                <td className="p-2 align-top" style={{ width: '22%', borderRight: '1px solid black' }}>
                  <div className="font-bold mb-1 text-[9px]">Process</div>
                  <div><CB checked={proc('procStressRelieving')} /> STRESS RELIVING</div>
                  <div><CB checked={proc('procHardening')} /> HARDENING</div>
                  <div><CB checked={proc('procTempering')} /> TEMPERING</div>
                  <div><CB checked={proc('procAnnealing')} /> ANNEALING</div>
                  <div><CB checked={proc('procBrazing')} /> BRAZING</div>
                  <div><CB checked={proc('procPlasmaNitriding')} /> PLASMA NITRIDING</div>
                  <div><CB checked={proc('procSubZero')} /> SUB ZERO</div>
                  <div><CB checked={proc('procSoakClean')} /> SOAK CLEAN</div>
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
            <TempGraph points={derived.effectiveTempPoints || []} />
          </div>
        </div>

        {/* ── DISTORTION + HARDNESS + PACKED ── */}
        <table className="w-full border-collapse" style={{ borderBottom: '1px solid black' }}>
          <tbody>
            <tr>
              <td className="align-top p-2" style={{ borderRight: '1px solid black' }}>
                <table className="w-full border-collapse text-[9px]" style={{ border: '1px solid black' }}>
                  <thead>
                    <tr>
                      <th className="p-1 font-bold" style={{ border: '1px solid black' }} colSpan={9}>DISTORTION</th>
                    </tr>
                    <tr>
                      <th className="p-1 font-bold" style={{ border: '1px solid black', width: '15%' }}>ITEM</th>
                      {ITEMS_8.map(i => (
                        <th key={i} className="p-1 text-center" style={{ border: '1px solid black' }}>{i + 1}</th>
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
            {[jc.image1, jc.image2, jc.image3, jc.image4, jc.image5]
              .map(makeImgUrl)
              .filter(Boolean)
              .map((url, i) => (
                <div key={i} className="border border-black" style={{ width: 140, height: 110 }}>
                  <img src={url} alt={`Job ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            {![jc.image1, jc.image2].some(Boolean) && (
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
        <div className="flex justify-between items-center px-2 py-1.5 text-[8.5px] text-slate-600" style={{ borderTop: '1px solid #ccc' }}>
          <span>QF-QA-08</span>
          <span>Effective Date: 10/05/2019</span>
          <span>Revision: 00</span>
          <span>Revision Date: 00</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
}
