import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';

// ── SVT constants ─────────────────────────────────────────────
const SVT = {
  name:    'SHITAL VACUUM TREAT PVT LTD.',
  addr1:   'Plot No.84/1, Sector No.10',
  addr2:   'PCNTDA, Bhosari,',
  addr3:   'Pune',
  email:   'info@shitalgroup.com',
};

function CB({ checked }) {
  return (
    <span className="inline-flex items-center justify-center w-[11px] h-[11px] border border-black text-[8px] leading-none mr-0.5 flex-shrink-0">
      {checked ? '✓' : ''}
    </span>
  );
}

const getImageUrl = (src) => {
  if (!src) return null;
  return src.startsWith('http') ? src : `${import.meta.env.VITE_API_URL}${src}`;
};

function SvtLogo({ size = 46 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="27" fill="#0f172a" stroke="#0f172a" strokeWidth="2" />
      <text x="28" y="35" textAnchor="middle" fill="white" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="16" letterSpacing="1">SVT</text>
    </svg>
  );
}

function TuvLogo({ size = 40 }) {
  return (
    <svg width={size * 1.4} height={size} viewBox="0 0 72 52" fill="none">
      <rect x="1" y="1" width="70" height="50" rx="4" fill="white" stroke="#1e3a8a" strokeWidth="2" />
      <text x="36" y="20" textAnchor="middle" fill="#1e3a8a" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="14" letterSpacing="1">TÜV</text>
      <text x="36" y="33" textAnchor="middle" fill="#1e3a8a" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="9" letterSpacing="1">AUSTRIA</text>
      <text x="36" y="44" textAnchor="middle" fill="#64748b" fontFamily="Arial,sans-serif" fontSize="7">CERTIFIED</text>
    </svg>
  );
}

// Fixed HT process rows (matching Excel rows 50-54)
const HT_ROWS = ['SR-', 'HARDENING', '1 ST TEMP', '2 ND TEMP', '3 RD TEMP'];

export default function JobCardPrint() {
  const { id } = useParams();
  const [jc, setJc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    api.get(`/jobcards/${id}`)
      .then((r) => setJc(r.data.data))
      .catch(() => setError('Job Card not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-slate-400">Loading…</div>;
  if (error || !jc) return (
    <div className="p-10 space-y-2 text-center">
      <p className="text-rose-500 font-bold">{error || 'Job Card not found.'}</p>
      <Link to="/jobcards" className="btn-ghost">← Back</Link>
    </div>
  );

  const insp = jc.inspection || {};
  const customer = jc.customer;
  const custName = jc.customerNameSnapshot || customer?.name || '—';
  const custAddr = jc.customerAddressSnapshot || customer?.address || '—';

  // Challan items (all challan items flattened)
  const challan = jc.challans?.[0];
  const dcNo    = challan?.challanNo || '—';
  const challanItems = jc.challans?.flatMap(ch => ch.items || []) || [];

  // Fallback: single item from part
  const items = challanItems.length > 0
    ? challanItems
    : jc.part ? [{ partName: jc.part.description, qty: jc.quantity, weight: jc.totalWeight }] : [];

  const totalQty = items.reduce((s, it) => s + (Number(it.qty ?? it.quantity) || 0), 0);
  const totalWt  = items.reduce((s, it) => s + (Number(it.weight ?? it.totalWeight) || 0), 0);

  const material = jc.dieMaterial || challanItems[0]?.material || '—';
  const htSpec   = jc.hrcRange?.replace(/\d.*/, '').trim() || jc.operationMode || 'HARDEN AND TEMPER';
  const hrc      = jc.hrcRange || '—';

  const distBefore = Array.isArray(insp.distortionBefore)
    ? insp.distortionBefore.map(v => (typeof v === 'object' ? v.val : v))
    : [];
  const distAfter = Array.isArray(insp.distortionAfter)
    ? insp.distortionAfter.map(v => (typeof v === 'object' ? v.val : v))
    : [];

  const ITEMS_8 = [0,1,2,3,4,5,6,7];

  const imageUrls = [jc.image1, jc.image2].map(getImageUrl);

  // Category name of the item group (e.g. "THREADROLL") — from partName or part description
  const categoryName = challanItems[0]?.partName?.toUpperCase() || jc.part?.description?.toUpperCase() || '';

  const td = (extra = '') => ({ style: { border: '1px solid black', padding: '3px 5px' }, className: extra });
  const th = (extra = '') => ({ style: { border: '1px solid black', padding: '3px 5px', fontWeight: 'bold', background: '#f8f8f8' }, className: extra });

  return (
    <div className="bg-slate-100 py-4 print:bg-white print:py-0" style={{ fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page { box-shadow: none !important; margin: 0 !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          @page { margin: 8mm; size: A4 portrait; }
        }
      `}</style>

      {/* Action bar */}
      <div className="no-print max-w-[900px] mx-auto mb-3 flex items-center gap-2 px-2">
        <Link to={`/jobcards/${id}`} className="btn-ghost text-sm">← Back</Link>
        <button className="btn-primary ml-auto text-sm" onClick={() => window.print()}>Print / Save PDF</button>
      </div>

      {/* ══════════════════════════════════════════════════════
          PAGE 1 — JOB CARD
      ══════════════════════════════════════════════════════ */}
      <div className="page max-w-[900px] mx-auto bg-white shadow-lg text-[10px]" style={{ border: '1px solid black' }}>

        {/* ── HEADER ── */}
        <table className="w-full" style={{ borderCollapse: 'collapse', borderBottom: '2px solid black' }}>
          <tbody>
            <tr>
              {/* Factory */}
              <td style={{ width: '35%', borderRight: '1px solid black', padding: '6px 8px', verticalAlign: 'top' }}>
                <div className="flex items-start gap-2">
                  <SvtLogo size={44} />
                  <div>
                    <div style={{ fontSize: 9, color: '#555', fontWeight: 'bold' }}>Factory:</div>
                    <div style={{ fontWeight: 'bold', fontSize: 11 }}>{SVT.name}</div>
                    <div style={{ fontSize: 9 }}>{SVT.addr1}</div>
                    <div style={{ fontSize: 9 }}>{SVT.addr2} {SVT.addr3}</div>
                    <div style={{ fontSize: 9 }}>{SVT.email}</div>
                  </div>
                </div>
              </td>
              {/* Title + Reg Office + TUV */}
              <td style={{ padding: '6px 8px', verticalAlign: 'top' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div style={{ fontSize: 9, color: '#555', fontWeight: 'bold' }}>Registered Office:</div>
                    <div style={{ fontWeight: 'bold', fontSize: 11 }}>{SVT.name}</div>
                    <div style={{ fontSize: 9 }}>{SVT.addr1}</div>
                    <div style={{ fontSize: 9 }}>{SVT.addr2} {SVT.addr3}</div>
                    <div style={{ fontSize: 9 }}>{SVT.email}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-4">
                    <TuvLogo size={38} />
                    <table style={{ fontSize: 8, borderCollapse: 'collapse', border: '1px solid black', marginTop: 4 }}>
                      <tbody>
                        <tr><td style={{ border: '1px solid black', padding: '1px 5px', fontWeight: 'bold' }}>DOC NO</td><td style={{ border: '1px solid black', padding: '1px 5px' }}>QF-PD-01</td></tr>
                        <tr><td style={{ border: '1px solid black', padding: '1px 5px', fontWeight: 'bold' }}>REVISION NO</td><td style={{ border: '1px solid black', padding: '1px 5px' }}>01</td></tr>
                        <tr><td style={{ border: '1px solid black', padding: '1px 5px', fontWeight: 'bold' }}>REV. DATE</td><td style={{ border: '1px solid black', padding: '1px 5px' }}>—</td></tr>
                        <tr><td style={{ border: '1px solid black', padding: '1px 5px', fontWeight: 'bold' }}>PAGE NO</td><td style={{ border: '1px solid black', padding: '1px 5px' }}>1 Of 2</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 16, letterSpacing: '0.15em', marginTop: 4 }}>JOB CARD</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── CP NUMBER ── */}
        <div style={{ borderBottom: '1px solid black', padding: '3px 8px', fontSize: 9, fontWeight: 'bold' }}>
          CP NO — SVT/047/2022-23
        </div>

        {/* ── CUSTOMER + JOB DETAILS ── */}
        <table className="w-full" style={{ borderCollapse: 'collapse', borderBottom: '1px solid black' }}>
          <tbody>
            <tr>
              <td style={{ width: '55%', borderRight: '1px solid black', padding: '6px 8px', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>Customer's:</div>
                <div style={{ fontWeight: 'bold', fontSize: 11 }}>{custName}</div>
                <div style={{ fontSize: 9, whiteSpace: 'pre-wrap', lineHeight: 1.4, marginTop: 2 }}>{custAddr}</div>
              </td>
              <td style={{ padding: '6px 8px', verticalAlign: 'top', fontSize: 9.5 }}>
                <table className="w-full">
                  <tbody>
                    <tr><td style={{ paddingRight: 8, paddingBottom: 2, color: '#555', whiteSpace: 'nowrap' }}>Certificate No.</td><td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>: {jc.certificateNo || '—'}</td></tr>
                    <tr><td style={{ paddingRight: 8, paddingBottom: 2, color: '#555' }}>Job Card No.</td><td style={{ fontFamily: 'monospace' }}>: {jc.jobCardNo || '—'}</td></tr>
                    <tr><td style={{ paddingRight: 8, paddingBottom: 2, color: '#555' }}>Your PO No.</td><td style={{ fontFamily: 'monospace' }}>: {jc.yourNo || '—'}</td></tr>
                    <tr><td style={{ paddingRight: 8, paddingBottom: 2, color: '#555' }}>Your DC No.</td><td style={{ fontFamily: 'monospace' }}>: {dcNo}</td></tr>
                    <tr><td style={{ paddingRight: 8, paddingBottom: 2, color: '#555' }}>Issue Date</td><td style={{ fontFamily: 'monospace' }}>: {formatDate(jc.issueDate) || '—'}</td></tr>
                    <tr><td style={{ paddingRight: 8, color: '#555' }}>Issue By</td><td style={{ fontFamily: 'monospace' }}>: {jc.issueBy || jc.createdBy?.name || '—'}</td></tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── DISPATCH MODE ── */}
        <table className="w-full" style={{ borderCollapse: 'collapse', borderBottom: '1px solid black' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 8px', borderRight: '1px solid black' }}>
                <span style={{ fontWeight: 'bold', marginRight: 8 }}>DISPATCH MODE:-</span>
                <span className="mr-4"><CB checked={jc.dispatchByOurVehicle} /> BY OUR VEHICLE</span>
                <span className="mr-4"><CB checked={jc.dispatchByCourier} /> BY COURIER</span>
                <span><CB checked={jc.collectedByCustomer} /> COLLECTED BY CUSTOMER</span>
              </td>
              <td style={{ padding: '4px 8px', width: 200, verticalAlign: 'top' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>Special Instruction</div>
                <div><CB checked={jc.specInstrCert} /> CERTIFICATE</div>
                <div><CB checked={jc.specInstrMPIRep} /> MPI REPORT</div>
                <div><CB checked={jc.specInstrGraph} /> PROCESS GRAPH</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── MATERIAL / HT SPEC / HRC ── */}
        <table className="w-full" style={{ borderCollapse: 'collapse', borderBottom: '1px solid black' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid black', padding: '4px 8px', width: 70, fontWeight: 'bold', fontSize: 11 }}>{material}</td>
              <td style={{ border: '1px solid black', padding: '4px 8px' }}>
                <span style={{ color: '#555', marginRight: 6 }}>Heat Treatment Specification</span>
                <span style={{ fontWeight: 'bold' }}>{htSpec}</span>
              </td>
              <td style={{ border: '1px solid black', padding: '4px 8px', width: 130, fontWeight: 900, fontSize: 12, textAlign: 'center' }}>{hrc}</td>
            </tr>
          </tbody>
        </table>

        {/* ── ITEMS TABLE ── */}
        <table className="w-full" style={{ borderCollapse: 'collapse', borderBottom: '1px solid black' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid black' }}>
              <th {...th('text-left')} style={{ ...th().style, width: 40 }}>Item</th>
              <th {...th('text-left')}>Description</th>
              <th {...th('text-center')} style={{ ...th().style, width: 100 }}>Quantity (Pcs)</th>
              <th {...th('text-center')} style={{ ...th().style, width: 100 }}>Weight (Kg)</th>
              <th {...th('text-center')} style={{ ...th().style, width: 100 }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {/* Category sub-heading row */}
            {categoryName && (
              <tr>
                <td colSpan={5} style={{ border: '1px solid black', padding: '2px 6px', fontWeight: 'bold', fontSize: 9, background: '#f9f9f9' }}>
                  {categoryName}
                </td>
              </tr>
            )}
            {items.map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                <td {...td('text-center')}>{i + 1}</td>
                <td {...td()}>{it.partName || it.description || '—'}</td>
                <td {...td('text-center font-mono')}>{it.qty ?? it.quantity ?? '—'}</td>
                <td {...td('text-center font-mono')}>{it.weight != null ? Number(it.weight).toFixed(2) : (it.totalWeight != null ? Number(it.totalWeight).toFixed(2) : '—')}</td>
                <td {...td('text-center')}>{it.remarks || ''}</td>
              </tr>
            ))}
            {/* Empty filler rows */}
            {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
              <tr key={`e${i}`} style={{ height: 20 }}>
                <td style={{ border: '1px solid black' }}></td>
                <td style={{ border: '1px solid black' }}></td>
                <td style={{ border: '1px solid black' }}></td>
                <td style={{ border: '1px solid black' }}></td>
                <td style={{ border: '1px solid black' }}></td>
              </tr>
            ))}
            {/* Total */}
            <tr style={{ borderTop: '1px solid black' }}>
              <td colSpan={2} style={{ border: '1px solid black', padding: '3px 6px', fontWeight: 'bold', textAlign: 'right' }}>Total</td>
              <td style={{ border: '1px solid black', padding: '3px 6px', fontWeight: 'bold', textAlign: 'center', fontFamily: 'monospace' }}>{totalQty || '—'}</td>
              <td style={{ border: '1px solid black', padding: '3px 6px', fontWeight: 'bold', textAlign: 'center', fontFamily: 'monospace' }}>{totalWt ? totalWt.toFixed(2) : '—'}</td>
              <td style={{ border: '1px solid black' }}></td>
            </tr>
          </tbody>
        </table>

        {/* ── SPECIAL REQUIREMENTS + DELIVERY DATE ── */}
        <table className="w-full" style={{ borderCollapse: 'collapse', borderBottom: '1px solid black' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', borderRight: '1px solid black', padding: '4px 8px', minHeight: 30 }}>
                <span style={{ fontWeight: 'bold' }}>Special Requirements: </span>
                {jc.specialRequirements || ''}
              </td>
              <td style={{ padding: '4px 8px' }}>
                <span style={{ fontWeight: 'bold' }}>Delivery Date: </span>
                {formatDate(jc.dueDate) || '—'}
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ borderTop: '1px solid black', padding: '4px 8px', minHeight: 24 }}>
                <span style={{ fontWeight: 'bold' }}>Precautions During Production &amp; Final Inspection: </span>
                {jc.precautions || ''}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── PAGE 1 FOOTER ── */}
        <div style={{ padding: '3px 8px', fontSize: 8, color: '#555' }}>
          QF-PD-01 &nbsp;&nbsp; Effective Date: 01-04-2019 &nbsp;&nbsp; Revision: 01 &nbsp;&nbsp; Revision Date: 00 &nbsp;&nbsp; Page 1 of 2
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          PAGE 2 — INCOMING INSPECTION + HT PROCESS + DISTORTION
      ══════════════════════════════════════════════════════ */}
      <div className="page max-w-[900px] mx-auto bg-white shadow-lg text-[10px] mt-4 print:mt-0" style={{ border: '1px solid black', pageBreakBefore: 'always' }}>

        {/* ── INCOMING INSPECTION HEADER ── */}
        <div style={{ borderBottom: '1px solid black', padding: '4px 8px', fontWeight: 'bold', fontSize: 11 }}>
          INCOMING INSPECTION
        </div>

        {/* ── CATEGORIZATION | PROCESS | INSPECTION RIGHT PANEL ── */}
        <table className="w-full" style={{ borderCollapse: 'collapse', borderBottom: '1px solid black' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid black', padding: '3px 6px', width: '22%', textAlign: 'left', fontSize: 9 }}>Categorization</th>
              <th style={{ border: '1px solid black', padding: '3px 6px', width: '22%', textAlign: 'left', fontSize: 9 }}>Process</th>
              <th style={{ border: '1px solid black', padding: '3px 6px', textAlign: 'left', fontSize: 9 }} colSpan={2}>INCOMING INSPECTION BY:</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {/* Categorization */}
              <td style={{ border: '1px solid black', padding: '4px 6px', verticalAlign: 'top' }}>
                <div><CB checked={insp.catNormal} /> NORMAL</div>
                <div><CB checked={insp.catWelded ?? false} /> WELDED</div>
                <div><CB checked={insp.catCrackRisk} /> CRACK OR CRACK RISK</div>
                <div><CB checked={insp.catDistortionRisk} /> DISTORTION RISK</div>
                <div><CB checked={insp.catCriticalFinishing} /> CRITICAL FINISHING</div>
                <div><CB checked={insp.catDentDamage} /> DENT / DAMAGE</div>
                <div><CB checked={insp.catRusty ?? false} /> RUSTY</div>
                <div><CB checked={insp.catOthers} /> OTHERS</div>
              </td>
              {/* Process */}
              <td style={{ border: '1px solid black', padding: '4px 6px', verticalAlign: 'top' }}>
                <div><CB checked={insp.procStressRelieving} /> STRESS RELIVING</div>
                <div><CB checked={insp.procHardening} /> HARDENING</div>
                <div><CB checked={insp.procTempering} /> TEMPERING</div>
                <div><CB checked={insp.procAnnealing} /> ANNEALING</div>
                <div><CB checked={insp.procBrazing} /> BRAZING</div>
                <div><CB checked={insp.procPlasmaNitriding} /> PLASMA NITRIDING</div>
                <div><CB checked={insp.procSubZero} /> SUB ZERO</div>
                <div><CB checked={insp.procSoakClean} /> SOAK CLEAN</div>
              </td>
              {/* Visual / MPI / Hardness */}
              <td style={{ border: '1px solid black', padding: '4px 6px', verticalAlign: 'top', width: '28%' }}>
                <div style={{ fontWeight: 'bold', fontSize: 9, marginBottom: 2 }}>VISUAL INSPECTION</div>
                <div><CB checked={insp.visualBefore} /> BEFORE</div>
                <div><CB checked={insp.visualAfter ?? true} /> AFTER</div>
                <div style={{ marginTop: 6, fontWeight: 'bold', fontSize: 9, marginBottom: 2 }}>MPI INSPECTION</div>
                <div><CB checked={insp.mpiBefore} /> BEFORE</div>
                <div><CB checked={insp.mpiAfter} /> AFTER</div>
                <div><CB checked={insp.mpiNil ?? !insp.mpiAfter} /> NIL</div>
              </td>
              {/* Require + Achieved hardness */}
              <td style={{ padding: '4px 6px', verticalAlign: 'top', width: '28%' }}>
                <div style={{ border: '1px solid black', marginBottom: 4 }}>
                  <div style={{ borderBottom: '1px solid black', padding: '2px 4px', fontWeight: 'bold', fontSize: 9 }}>REQUIRE HARDNESS</div>
                  <div style={{ padding: '4px', fontWeight: 900, fontSize: 12 }}>
                    {insp.requiredHardnessMin && insp.requiredHardnessMax
                      ? `${insp.requiredHardnessMin}-${insp.requiredHardnessMax} ${insp.hardnessUnit || 'HRC'}`
                      : (jc.hrcRange || '—')}
                  </div>
                </div>
                <div style={{ border: '1px solid black' }}>
                  <div style={{ borderBottom: '1px solid black', padding: '2px 4px', fontWeight: 'bold', fontSize: 9 }}>ACHIVED HARDNESS</div>
                  <div style={{ padding: '4px', fontWeight: 900, fontSize: 12 }}>
                    {insp.achievedHardness ? `${insp.achievedHardness} ${insp.hardnessUnit || 'HRC'}` : '—'}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── HEAT TREATMENT PROCESS TABLE ── */}
        <div style={{ borderBottom: '1px solid black' }}>
          <div style={{ padding: '3px 8px', fontWeight: 'bold', display: 'flex', gap: 20, borderBottom: '1px solid black' }}>
            <span>HEAT TREATMENT PROCESS</span>
            <span style={{ fontWeight: 'normal' }}>CYCLE NO: <span style={{ fontFamily: 'monospace' }}>{jc.heatNo || '—'}</span></span>
          </div>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontSize: 8 }}>
                {['EQIPMENT','PROCESS','TEMP/TIME','START TIME','END TIME','DATE','LOADING BY','RESULT','SIGN'].map(h => (
                  <th key={h} style={{ border: '1px solid black', padding: '2px 3px', fontWeight: 'bold' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HT_ROWS.map((row, i) => {
                const hp = insp.heatProcesses?.[i] || {};
                return (
                  <tr key={i} style={{ height: 20 }}>
                    <td style={{ border: '1px solid black', padding: '2px 3px', fontSize: 8 }}>{hp.equipment || ''}</td>
                    <td style={{ border: '1px solid black', padding: '2px 3px', fontSize: 8, fontWeight: 'bold' }}>{row}</td>
                    <td style={{ border: '1px solid black', padding: '2px 3px', fontSize: 8 }}>{hp.tempTime || ''}</td>
                    <td style={{ border: '1px solid black', padding: '2px 3px', fontSize: 8 }}>{hp.startTime ? new Date(hp.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                    <td style={{ border: '1px solid black', padding: '2px 3px', fontSize: 8 }}>{hp.endTime ? new Date(hp.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                    <td style={{ border: '1px solid black', padding: '2px 3px', fontSize: 8 }}>{hp.processDate ? formatDate(hp.processDate) : ''}</td>
                    <td style={{ border: '1px solid black', padding: '2px 3px', fontSize: 8 }}>{hp.loadingBy || ''}</td>
                    <td style={{ border: '1px solid black', padding: '2px 3px', fontSize: 8 }}>{hp.result || ''}</td>
                    <td style={{ border: '1px solid black', padding: '2px 3px', fontSize: 8 }}></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── DISTORTION + HARDNESS + PACKED ── */}
        <table className="w-full" style={{ borderCollapse: 'collapse', borderBottom: '1px solid black' }}>
          <tbody>
            <tr>
              {/* Distortion table */}
              <td style={{ verticalAlign: 'top', padding: '4px 6px', borderRight: '1px solid black' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 8 }}>
                  <thead>
                    <tr>
                      <th colSpan={9} style={{ border: '1px solid black', padding: '2px 4px', fontWeight: 'bold' }}>DISTORTION</th>
                    </tr>
                    <tr>
                      <th style={{ border: '1px solid black', padding: '2px 4px', fontWeight: 'bold' }}>ITEM</th>
                      {ITEMS_8.map(i => (
                        <th key={i} style={{ border: '1px solid black', padding: '2px 6px', textAlign: 'center' }}>{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid black', padding: '2px 4px', fontWeight: 'bold' }}>BEFORE</td>
                      {ITEMS_8.map(i => (
                        <td key={i} style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center' }}>
                          {distBefore[i] ?? (i === 0 ? 'NA' : '')}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid black', padding: '2px 4px', fontWeight: 'bold' }}>AFTER:</td>
                      {ITEMS_8.map(i => (
                        <td key={i} style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center' }}>
                          {distAfter[i] ?? (i === 0 ? 'NA' : '')}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </td>
              {/* HARDNESS AFTER + PACKED */}
              <td style={{ verticalAlign: 'top', padding: '4px 6px', width: 200 }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 8, width: '100%' }}>
                  <tbody>
                    <tr><td colSpan={2} style={{ border: '1px solid black', padding: '2px 4px', fontWeight: 'bold' }}>HARDNESS AFTER</td></tr>
                    {[1,2,3,4].map(n => (
                      <tr key={n}>
                        <td style={{ border: '1px solid black', padding: '2px 4px', width: 20, fontWeight: 'bold' }}>{n}</td>
                        <td style={{ border: '1px solid black', padding: '2px 4px', fontFamily: 'monospace' }}>
                          {insp[`hardnessAfter${n}`] || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ border: '1px solid black', marginTop: 4 }}>
                  <div style={{ borderBottom: '1px solid black', padding: '2px 4px', fontWeight: 'bold', fontSize: 8 }}>PACKED QUANTITY</div>
                  <div style={{ padding: '3px 4px', fontFamily: 'monospace', fontSize: 8 }}>{insp.packedQty || ''}</div>
                </div>
                <div style={{ border: '1px solid black', marginTop: 4 }}>
                  <div style={{ borderBottom: '1px solid black', padding: '2px 4px', fontWeight: 'bold', fontSize: 8 }}>PACKED BY</div>
                  <div style={{ padding: '3px 4px', fontSize: 8 }}>{insp.packedBy || ''}</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── JOB IMAGES ── */}
        <div style={{ borderBottom: '1px solid black' }}>
          <div style={{ borderBottom: '1px solid black', padding: '3px 8px', fontWeight: 'bold' }}>JOB IMAGE</div>
          <div style={{ display: 'flex', gap: 8, padding: 8 }}>
            {[0, 1].map(n => (
              <div key={n} style={{ border: '1px solid black', width: 140, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {imageUrls[n]
                  ? <img src={imageUrls[n]} alt={`Job ${n+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 9, color: '#aaa' }}>{n + 1}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ── SIGNATURE ROW ── */}
        <table className="w-full" style={{ borderCollapse: 'collapse', borderBottom: '1px solid black' }}>
          <tbody>
            <tr>
              {['INCOMING INSPECTION BY', 'FINAL INSPECTION BY', 'APPROVED BY:'].map(label => (
                <td key={label} style={{ border: '1px solid black', padding: '4px 6px', width: '33%' }}>
                  <div style={{ fontWeight: 'bold', fontSize: 8, marginBottom: 18 }}>{label}</div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        {/* ── PAGE 2 FOOTER ── */}
        <div style={{ padding: '3px 8px', fontSize: 8, color: '#555' }}>
          QF-PD-01 &nbsp;&nbsp; Effective Date: 01/04/2019 &nbsp;&nbsp; Revision: 00 &nbsp;&nbsp; Revision Date: 00 &nbsp;&nbsp; Page 2 of 2
        </div>
        <div style={{ borderTop: '1px solid #ddd', padding: '3px 8px', fontSize: 8, color: '#555' }}>
          <strong>Color Code for Job Card —</strong> WHITE: Regular &nbsp; RED: Rework &nbsp; BLUE: New Development &nbsp; YELLOW: Stress Relieving &amp; Other Process.
        </div>
      </div>
    </div>
  );
}
