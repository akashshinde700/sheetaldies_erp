import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import { DEFAULT_TEMP_CYCLE_TIME_TEMP, tempRowsToSegments } from '../../data/heatTreatmentCycles';
import HeatCycleStepGraph from '../../components/HeatCycleStepGraph';

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

// D2 default cycle — fallback when no graph saved on runsheet or cert.
// Derived from the canonical heat-treatment cycle definitions so all renderers stay in sync.
const DEFAULT_TEMP_CYCLE = DEFAULT_TEMP_CYCLE_TIME_TEMP;

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

// Temperature graph now uses the shared HeatCycleStepGraph component (same
// time-proportional ramp/hold rendering as the VHT Run Sheet print and the
// certificate's live-editing preview) so all three stay visually identical.

function SvtLogo({ size = 50 }) {
  return <img src="/logo.png" alt="SVT" style={{ height: size, width: 'auto', flexShrink: 0, display: 'block' }} />;
}

function TuvLogo({ size = 44 }) {
  return <img src="/tuv.png" alt="TÜV Austria" style={{ height: size, width: 'auto', display: 'block' }} />;
}

// ─────────────────────────────────────────────────────────────
export default function CertPrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { const p = document.title; document.title = ' '; return () => { document.title = p; }; }, []);

  // Replace history entry to remove detail page from browser history
  // This ensures Back button goes to certificate list instead of detail page
  useEffect(() => {
    navigate(`/quality/certificates/${id}/print`, { replace: true });
  }, [id, navigate]);

  useEffect(() => {
    api.get(`/quality/certificates/${id}`)
      .then(r => setCert(r.data.data))
      .catch(() => setError('Certificate not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const makeImgUrl = p => {
    if (!p) return null;
    if (p.startsWith('http')) return p;
    const base = import.meta.env.VITE_API_URL || '';
    return `${base}${p}`;
  };

  const derived = useMemo(() => {
    if (!cert) return {};
    const tempPoints = asArray(cert.effectiveTempCycleData ?? cert.tempCycleData);
    const effectiveTempPoints = tempPoints.length >= 2 ? tempPoints : DEFAULT_TEMP_CYCLE;
    const tempSegments = tempRowsToSegments(effectiveTempPoints);
    const insp = cert.jobCard?.inspection;

    // Required hardness — treat 0 as "not set", fall back to jc.hrcRange
    const reqMin = num(insp?.requiredHardnessMin) || num(cert.hardnessMin) || null;
    const reqMax = num(insp?.requiredHardnessMax) || num(cert.hardnessMax) || null;
    const rawHrcRange = cert.hrcRange || cert.jobCard?.hrcRange || '';
    const reqText = (reqMin != null && reqMax != null)
      ? `${reqMin}-${reqMax} ${cert.hardnessUnit || 'HRC'}`
      : rawHrcRange ? `${rawHrcRange} ${cert.hardnessUnit || 'HRC'}` : '—';

    // Achieved hardness — cert.achievedHardness (direct field) → inspectionResults → cert inspection
    const achResult = (cert.inspectionResults || []).find(r => r.inspectionType === 'HARDNESS');
    const achText = cert.achievedHardness != null
      ? `${cert.achievedHardness} ${cert.hardnessUnit || 'HRC'}`
      : (achResult?.achievedValue || (insp?.achievedHardness != null ? `${insp.achievedHardness} ${cert.hardnessUnit || 'HRC'}` : '—'));

    // Challan items (for WM No, DRG No + items fallback). challanItemLinks
    // reflects each item's actual current challan assignment; jobCard.challans
    // is a direct relation that can be empty or point to a stale/wrong
    // challan, so it's only used as a last-resort fallback.
    const challanItems = (cert.jobCard?.challanItemLinks?.length > 0
      ? cert.jobCard.challanItemLinks
      : cert.jobCard?.challans?.flatMap(ch => ch.items || [])) || [];

    return { tempPoints, effectiveTempPoints, tempSegments, reqText, achText, challanItems };
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
  // Index challan items by ID so cert items can look up DRG NO by sourceChallanItemId
  const chItemById = {};
  challanItems.forEach(ci => { chItemById[ci.id] = ci; });
  const insp = jc.inspection || {};

  // Categorization/Process — the Job Card's Incoming Inspection is the
  // source of truth (matches CertForm's edit-load sync); fall back to the
  // certificate's own saved value only if this job card has no inspection
  // record at all yet.
  // The certificate carries its own categorisation, and editing it must show
  // up here. This used to read the job card's inspection whenever one existed,
  // so the certificate's own ticks were never printed and every certificate
  // made from the same job card looked identical no matter what was set.
  // The inspection is only a fallback for certificates that carry nothing.
  const CAT_PROC_FIELDS = [
    'catNormal', 'catWelded', 'catCrackRisk', 'catDistortionRisk', 'catCriticalFinishing',
    'catDentDamage', 'catRusty', 'catCavity', 'catOthers',
    'procStressRelieving', 'procHardening', 'procTempering', 'procAnnealing',
    'procBrazing', 'procPlasmaNitriding', 'procSubZero', 'procSoakClean',
    'visualBefore', 'visualAfter', 'mpiBefore', 'mpiAfter', 'mpiNil',
  ];
  const certHasOwnFlags = CAT_PROC_FIELDS.some(f => cert[f]);
  const cat  = (field) => !!(certHasOwnFlags ? cert[field] : (jc.inspection ? insp[field] : cert[field]));
  const proc = cat;

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
  // Weight shown on a certificate is the job card's weight. Prefer what the
  // certificate saved, then the inward item it came from, and finally the job
  // card's own total split across the items — certificates made before the
  // weight was carried across have none of their own, and job cards where the
  // weight was typed only into "Total Weight" leave the items blank.
  const jcTotalWeight = Number(jc.totalWeight) || 0;
  const itemWeight = (it, i, list = items) => {
    const ch = (it.sourceChallanItemId && chItemById[it.sourceChallanItemId]) || challanItems[i] || challanItems[0];
    const own = num(it.totalWeight) || num(ch?.weight) || 0;
    if (own) return own;
    return jcTotalWeight && list.length ? jcTotalWeight / list.length : 0;
  };
  const totalWt    = items.reduce((s, it, i) => s + itemWeight(it, i), 0)
                     || Number(jc.totalWeight) || 0;

  const dt = cert.dispatchedThrough || '';
  const byOurVehicle     = jc.dispatchByOurVehicle  || dt.toLowerCase().includes('vehicle');
  const byCourier        = jc.dispatchByCourier      || dt.toLowerCase().includes('courier');
  const collectedByCust  = jc.collectedByCustomer    || dt.toLowerCase().includes('collected');

  // challanItemLinks reflects each item's actual current challan assignment;
  // jc.challans[0] is a direct relation that can point to a stale/wrong
  // challan (e.g. an auto-created placeholder), so it must be checked last.
  const _dcBase = cert.yourRefNo
    || jc.challanItemLinks?.[0]?.challan?.challanNo
    || jc.challans?.[0]?.challanNo
    || '';
  const _challanDate = jc.challanItemLinks?.[0]?.challan?.challanDate || jc.challans?.[0]?.challanDate;
  const _challanDateStr = _challanDate ? (() => {
    const d = new Date(_challanDate);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  })() : null;
  const yourDcNo = _dcBase
    ? (_challanDateStr ? `${_dcBase}/${_challanDateStr}` : _dcBase)
    : '—';
  const cycleNo  = cert.heatNo || '';

  // Material — prefer JC value (cert may have been created before material was filled)
  const material  = jc.dieMaterial || cert.dieMaterial || challanItems[0]?.material || '—';
  const htSpec    = cert.operatorMode || jc.hrcRange?.replace(/\d.*/, '').trim() || challanItems[0]?.processName || '—';

  // DB stores distortion as [{pt, val}, ...] — extract scalar values
  const extractDist = arr => asArray(arr).map(v =>
    v != null && typeof v === 'object' ? (v.val ?? v.value ?? '') : v
  );
  // Use certificate distortion data, fall back to job card inspection data
  const distBefore = extractDist(cert.distortionBefore || insp.distortionBefore);
  const distAfter  = extractDist(cert.distortionAfter || insp.distortionAfter);

  const ITEMS_8 = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div className="bg-slate-100 py-4 print:bg-white print:py-0">
      <style>{`
        @page { margin: 4mm; size: A4; }
        @media print {
          .no-print { display: none !important; }
          html, body { margin: 0 !important; padding: 0 !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          /* Fill the full A4-portrait printable box (297 - 2*4mm), edge to edge,
             so the certificate prints as a proper full-page document instead of
             a compact block that ends two-thirds down the sheet. */
          .page {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 285mm;   /* A4 297 - 2*4mm, minus safety so it never spills */
            display: flex !important;
            flex-direction: column;
            font-size: 11px !important;
          }
          .page > * { flex: 0 0 auto; }
          /* the job-image section stretches to take up the leftover height */
          .cert-grow { flex: 1 1 auto !important; display: flex; flex-direction: column; min-height: 0; }
          .cert-grow > *:last-child { flex: 1 1 auto; min-height: 0; }
          .cert-img-row { align-items: stretch !important; }
          .cert-img-row .cert-imgbox {
            height: auto !important; align-self: stretch;
            min-height: 150px; max-height: 360px;
          }
          .cert-img-row .cert-imgbox img { height: 100% !important; }
        }
        .cert-border { border: 1px solid black; }
        .cell { border: 1px solid black; }
      `}</style>

      {/* Action bar */}
      <div className="no-print max-w-[900px] mx-auto mb-3 flex items-center gap-2 px-2">
        <Link to="/quality/certificates" className="btn-ghost text-sm">← Back</Link>
        <button className="btn-primary ml-auto text-sm" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      {/* ── Certificate Page ── */}
      <div className="page max-w-[900px] mx-auto bg-white shadow-lg text-[10px]" style={{ fontFamily: 'Arial, sans-serif', border: '2px solid #222' }}>

        {/* ── HEADER ── */}
        <table className="w-full border-collapse" style={{ borderBottom: '2px solid black' }}>
          <tbody>
            <tr>
              {/* SVT logo — left corner */}
              <td style={{ width: 120, padding: '5px 10px', verticalAlign: 'middle', textAlign: 'center' }}>
                <SvtLogo size={96} />
              </td>
              {/* Title + company info */}
              <td style={{ padding: '6px 16px', verticalAlign: 'middle' }}>
                <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 18, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
                  TEST CERTIFICATE
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 9, color: '#555', marginBottom: 2 }}>Factory:</div>
                    <div style={{ fontWeight: 900, fontSize: 10.5 }}>{SVT.name}</div>
                    <div style={{ fontSize: 9 }}>{SVT.address}</div>
                    <div style={{ fontSize: 9 }}>{SVT.email}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 9, color: '#555', marginBottom: 2 }}>Registered Office:</div>
                    <div style={{ fontWeight: 900, fontSize: 10.5 }}>{SVT.name}</div>
                    <div style={{ fontSize: 9 }}>{SVT.address}</div>
                    <div style={{ fontSize: 9 }}>{SVT.email}</div>
                  </div>
                </div>
              </td>
              {/* TÜV logo — right corner */}
              <td style={{ width: 120, padding: '5px 10px', verticalAlign: 'middle', textAlign: 'center' }}>
                <TuvLogo size={82} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── CUSTOMER + CERT DETAILS ── */}
        <table className="w-full border-collapse" style={{ borderBottom: '1px solid black' }}>
          <tbody>
            <tr>
              <td className="p-1.5 align-top" style={{ width: '55%' }}>
                <div className="font-bold mb-1" style={{ fontSize: 10 }}>Customer's:</div>
                <div className="font-extrabold" style={{ fontSize: 12 }}>{customer?.name || '—'}</div>
                {/* address holds only the street line; city, state and PIN are
                    separate columns, so printing address alone dropped them. */}
                <div className="whitespace-pre-wrap leading-snug mt-0.5" style={{ fontSize: 10 }}>
                  {[
                    customer?.address,
                    [customer?.city, customer?.state].filter(Boolean).join(', '),
                    customer?.pinCode ? `- ${customer.pinCode}` : '',
                  ].filter(Boolean).join(' ').replace(/,\s*-/g, ' -').trim() || '—'}
                </div>
              </td>
              <td className="align-top" style={{ width: '45%', padding: '4px 6px 4px 20px' }}>
                <table style={{ borderCollapse: 'collapse' }}>
                  <tbody>
                    {[
                      ['Certificate No.', cert.certNo, true],
                      ['Job Card No.',    jc.jobCardNo || '—', false],
                      ['Your PO No.',     cert.yourPoNo || '—', false],
                      cert.yourPoDate ? ['Your PO Date', formatDate(cert.yourPoDate), false] : null,
                      ['Your DC No.',     yourDcNo, false],
                      ['Issue Date',      formatDate(cert.issueDate), false],
                      ['Issue By',        cert.checkedBy || cert.createdBy?.name || '—', false],
                    ].filter(Boolean).map(([lbl, val, bold]) => (
                      <tr key={lbl}>
                        <td style={{ paddingRight: 6, paddingBottom: 2, fontSize: 10, color: '#000', whiteSpace: 'nowrap', fontWeight: 700 }}>{lbl}</td>
                        <td style={{ paddingRight: 4, paddingBottom: 2, fontSize: 10, fontWeight: 700, color: '#000' }}>:</td>
                        <td style={{ paddingBottom: 2, fontSize: 10, fontWeight: bold ? 900 : 700, color: '#000', whiteSpace: 'nowrap' }}>{val}</td>
                      </tr>
                    ))}
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
              <td className="p-1.5" colSpan={3} style={{ borderBottom: '1px solid black' }}>
                <span className="font-bold mr-2">DISPATCH MODE:-</span>
                <span className="mr-3"><CB checked={byOurVehicle} /> BY OUR VEHICLE</span>
                <span className="mr-3"><CB checked={byCourier} /> BY COURIER</span>
                <span><CB checked={collectedByCust || (!byOurVehicle && !byCourier)} /> COLLECTED BY CUSTOMER</span>
              </td>
              <td className="p-1.5 align-top" rowSpan={3} style={{ width: '200px', borderLeft: '1px solid black' }}>
                <div className="font-bold mb-1">Special Instruction</div>
                <div><CB checked={cert.specInstrCertificate || jc.specInstrCert} /> CERTIFICATE</div>
                <div><CB checked={cert.specInstrMpiReport || jc.specInstrMPIRep} /> MPI REPORT</div>
                <div><CB checked={cert.specInstrProcessGraph || jc.specInstrGraph} /> PROCESS GRAPH</div>
              </td>
            </tr>
            {/* Row 2: Labels */}
            <tr style={{ borderBottom: '1px solid black' }}>
              <td className="px-2 py-0.5 text-slate-500 text-[9px]" style={{ borderRight: '1px solid black' }}>Material</td>
              <td className="px-2 py-0.5 text-slate-500 text-[9px]" colSpan={2}>Heat Treatment Specification</td>
            </tr>
            {/* Row 3: Values */}
            <tr>
              <td className="p-1.5 font-bold" style={{ width: '80px', borderRight: '1px solid black' }}>
                {material}
              </td>
              <td className="p-1.5 font-bold" colSpan={2}>
                {htSpec || 'HARDEN AND TEMPER'}
                {derived.reqText && derived.reqText !== '—' && (
                  <span className="ml-4 font-extrabold" style={{ fontSize: '12px' }}>{derived.reqText}</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── ITEMS TABLE ── */}
        <table className="w-full border-collapse" style={{ borderBottom: '1px solid black' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid black' }}>
              <th className="p-1 text-left font-bold" style={{ width: '40px', borderRight: '1px solid black' }}>Item</th>
              <th className="p-1 text-left font-bold" style={{ borderRight: '1px solid black' }}>Description</th>
              <th className="p-1 text-center font-bold" style={{ width: '100px', borderRight: '1px solid black' }}>Quantity (Pcs)</th>
              <th className="p-1 text-center font-bold" style={{ width: '100px', borderRight: '1px solid black' }}>Weight (Kg)</th>
              <th className="p-1 text-center font-bold" style={{ width: '100px' }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => {
              const chItem = (it.sourceChallanItemId && chItemById[it.sourceChallanItemId])
                || challanItems[i]
                || challanItems[0];
              // Clean description: remove process name and material suffixes (same logic as JobCardPrint)
              let desc = it.description || it.partName || '—';
              const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              if (chItem?.processName) desc = desc.replace(new RegExp('\\s*[-–]\\s*' + esc(chItem.processName) + '\\s*$', 'i'), '').trim();
              if (chItem?.material) desc = desc.replace(new RegExp('\\s*[-–]\\s*' + esc(chItem.material) + '\\s*$', 'i'), '').trim();
              return (
                <tr key={it.id} style={{ borderBottom: '1px solid #ccc' }}>
                  <td className="p-0.5 text-center" style={{ borderRight: '1px solid black' }}>{i + 1}</td>
                  <td className="p-0.5" style={{ borderRight: '1px solid black' }}>
                    <div className="font-semibold flex items-baseline gap-1.5 flex-wrap">
                      <span>{desc || '—'}</span>
                      {jc.showDrawingNoInPrint !== false && chItem?.drawingNo && (
                        <span className="text-[9px] font-normal text-slate-600">
                          {jc.showDrawingNoLabelInPrint !== false && (chItem.drawingNoLabel || 'DRG NO').trim() ? `${(chItem.drawingNoLabel || 'DRG NO').trim()} - ` : ''}{chItem.drawingNo}
                        </span>
                      )}
                    </div>
                    {chItem?.woNo && <div className="text-[9px] text-slate-600">WM NO - {chItem.woNo}</div>}
                  </td>
                  <td className="p-0.5 text-center font-mono" style={{ borderRight: '1px solid black' }}>{it.quantity}</td>
                  <td className="p-0.5 text-center font-mono" style={{ borderRight: '1px solid black' }}>
                    {/* Certificates saved before the weight was carried across
                        have a blank totalWeight; the inward item it came from
                        still knows it, so read that rather than printing "—". */}
                    {(() => {
                      const wt = itemWeight(it, i);
                      return wt ? Number(wt).toFixed(3) : '—';
                    })()}
                  </td>
                  <td className="p-0.5 text-center">{it.remarks || ''}</td>
                </tr>
              );
            })}
            {/* empty rows to fill form */}
            {Array.from({ length: Math.max(0, 1 - items.length) }).map((_, i) => (
              <tr key={`empty-${i}`} style={{ borderBottom: '1px solid #e5e5e5', height: '18px' }}>
                <td style={{ borderRight: '1px solid black' }}></td>
                <td style={{ borderRight: '1px solid black' }}></td>
                <td style={{ borderRight: '1px solid black' }}></td>
                <td style={{ borderRight: '1px solid black' }}></td>
                <td></td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid black' }}>
              <td className="p-1 font-bold text-right" colSpan={2} style={{ borderRight: '1px solid black' }}>Total</td>
              <td className="p-1 text-center font-bold font-mono" style={{ borderRight: '1px solid black' }}>{totalQty}</td>
              <td className="p-1 text-center font-bold font-mono" style={{ borderRight: '1px solid black' }}>
                {totalWt ? totalWt.toFixed(3) : '—'}
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
                <td className="px-2 py-0.5 align-top" style={{ width: '22%', borderRight: '1px solid black', lineHeight: 1.35 }}>
                  <div className="font-bold text-[9px]" style={{ marginBottom: 2 }}>Categorization</div>
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
                <td className="px-2 py-0.5 align-top" style={{ width: '22%', borderRight: '1px solid black', lineHeight: 1.35 }}>
                  <div className="font-bold text-[9px]" style={{ marginBottom: 2 }}>Process</div>
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
                <td className="px-2 py-0.5 align-top" style={{ width: '28%', borderRight: '1px solid black', lineHeight: 1.35 }}>
                  <div className="font-bold text-[9px]" style={{ marginBottom: 2 }}>VISUAL INSPECTION</div>
                  <div><CB checked={cert.visualBefore ?? false} /> BEFORE</div>
                  <div><CB checked={cert.visualAfter !== false} /> AFTER</div>
                  <div className="font-bold text-[9px]" style={{ marginTop: 4, marginBottom: 2 }}>MPI INSPECTION</div>
                  <div><CB checked={cert.mpiBefore ?? false} /> BEFORE</div>
                  <div><CB checked={cert.mpiAfter ?? false} /> AFTER</div>
                  <div><CB checked={cert.mpiNil ?? (!cert.specInstrMpiReport)} /> NIL</div>
                </td>

                {/* Hardness + Final Inspection By */}
                <td className="px-2 py-0.5 align-top" style={{ width: '28%' }}>
                  <div style={{ border: '1px solid black', marginBottom: 3 }}>
                    <div className="px-1 font-bold text-[9px]" style={{ borderBottom: '1px solid black', padding: '2px 4px' }}>REQUIRE HARDNESS</div>
                    <div className="font-extrabold text-[12px]" style={{ padding: '2px 4px' }}>{derived.reqText}</div>
                  </div>
                  <div style={{ border: '1px solid black', marginBottom: 3 }}>
                    <div className="font-bold text-[9px]" style={{ borderBottom: '1px solid black', padding: '2px 4px' }}>ACHIVED HARDNESS</div>
                    <div className="font-extrabold text-[12px]" style={{ padding: '2px 4px' }}>{derived.achText}</div>
                  </div>
                  <div style={{ border: '1px solid black' }}>
                    <div className="font-bold text-[9px]" style={{ borderBottom: '1px solid black', padding: '2px 4px' }}>FINAL INSPECTION BY</div>
                    <div style={{ padding: '4px 4px', fontWeight: 700, fontSize: 11, minHeight: 20 }}>{cert.finalInspectionBy || ''}</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── HEAT TREATMENT PROCESS GRAPH ── */}
        <div style={{ borderBottom: '1px solid black' }}>
          <div className="flex items-center gap-4 px-2 py-0.5 font-bold" style={{ borderBottom: '1px solid black' }}>
            <span>HEAT TREATMENT PROCESS</span>
            <span className="font-normal">
              CYCLE NO: <span className="font-mono">{cycleNo}</span>
            </span>
          </div>
          <div className="px-2" style={{ paddingTop: 0, paddingBottom: 0, height: 170 }}>
            <HeatCycleStepGraph segments={derived.tempSegments || []} stroke="#000" viewW={1400} labelFontSize={13} strokeWidth={3} showYAxisTicks />
          </div>
        </div>

        {/* ── DISTORTION + HARDNESS + APPROVED BY (side by side) ── */}
        <table className="w-full border-collapse" style={{ borderBottom: '1px solid black' }}>
          <tbody>
            <tr style={{ verticalAlign: 'top' }}>
              <td className="p-1" style={{ width: '55%', borderRight: '1px solid black' }}>
                <table className="w-full border-collapse text-[9px]" style={{ border: '1px solid black', height: '46px' }}>
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
              <td className="p-1" style={{ width: '22%', borderRight: '1px solid black' }}>
                <table className="w-full border-collapse text-[8px]" style={{ border: '1px solid black', height: '46px' }}>
                  <thead>
                    <tr>
                      <th className="p-0.5 font-bold" style={{ border: '1px solid black' }} colSpan={2}>HARDNESS AFTER</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-0.5 font-bold text-center" style={{ border: '1px solid black', width: '30%' }}>1</td>
                      <td className="p-0.5 text-center" style={{ border: '1px solid black' }}>{cert.hardnessAfter1 || '—'}</td>
                    </tr>
                    <tr>
                      <td className="p-0.5 font-bold text-center" style={{ border: '1px solid black' }}>2</td>
                      <td className="p-0.5 text-center" style={{ border: '1px solid black' }}>{cert.hardnessAfter2 || '—'}</td>
                    </tr>
                    <tr>
                      <td className="p-0.5 font-bold text-center" style={{ border: '1px solid black' }}>3</td>
                      <td className="p-0.5 text-center" style={{ border: '1px solid black' }}>{cert.hardnessAfter3 || '—'}</td>
                    </tr>
                    <tr>
                      <td className="p-0.5 font-bold text-center" style={{ border: '1px solid black' }}>4</td>
                      <td className="p-0.5 text-center" style={{ border: '1px solid black' }}>{cert.hardnessAfter4 || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td className="p-1" style={{ width: '23%' }}>
                <table className="w-full border-collapse text-[9px]" style={{ border: '1px solid black', height: '46px' }}>
                  <thead>
                    <tr>
                      <th className="p-1 font-bold" style={{ border: '1px solid black' }}>APPROVED BY:</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-1 text-center" style={{ border: '1px solid black', verticalAlign: 'middle', height: 'calc(46px - 24px)' }}>{cert.approvedBy || ''}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── JOB IMAGES ── */}
        <div className="cert-grow" style={{ borderBottom: '1px solid black' }}>
          <div className="px-2 py-1 font-bold" style={{ borderBottom: '1px solid black' }}>JOB IMAGE</div>
          <div className="flex gap-1 p-1 cert-img-row">
            {[jc.image1, jc.image2, jc.image3, jc.image4, jc.image5]
              .map(makeImgUrl)
              .filter(Boolean)
              .map((url, i) => (
                <div key={i} className="border border-black cert-imgbox" style={{ width: 150, height: 95 }}>
                  <img src={url} alt={`Job ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            {![jc.image1, jc.image2].some(Boolean) && (
              <div className="flex gap-1">
                {[1, 2].map(n => (
                  <div key={n} className="border border-black flex items-center justify-center text-slate-400 text-[9px] cert-imgbox"
                    style={{ width: 150, height: 95 }}>
                    {n}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="flex justify-between items-center px-2 py-0.5 text-[8.5px] text-slate-600" style={{ borderTop: '1px solid #ccc' }}>
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
