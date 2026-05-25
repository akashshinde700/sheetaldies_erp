import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';

const SVT = {
  name:  'SHITAL VACUUM TREAT PVT LTD.',
  addr1: 'Plot No.84/1, Sector No.10, PCNTDA, Bhosari, Pune – 411019',
  email: 'info@shitalgroup.com',
};

// ── shared cell style helpers ─────────────────────────────────
const B  = '1px solid #222';
const B2 = '2px solid #222';

const cellStyle  = (extra = {}) => ({ border: B,  padding: '3px 6px', fontSize: 9,  ...extra });
const headStyle  = (extra = {}) => ({ border: B,  padding: '3px 6px', fontSize: 9,  fontWeight: 700, background: '#f0f0f0', ...extra });
const labelStyle = (extra = {}) => ({ fontSize: 10, color: '#000', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 2, ...extra });
const valueStyle = (extra = {}) => ({ fontSize: 11, fontWeight: 700, ...extra });
const sigLine    = { borderTop: B, marginTop: 28, fontSize: 9, color: '#000', textAlign: 'center', paddingTop: 2 };

function CB({ checked }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 11, height: 11, border: B, fontSize: 8, lineHeight: 1,
      marginRight: 3, flexShrink: 0, verticalAlign: 'middle',
    }}>
      {checked ? '✓' : ''}
    </span>
  );
}

function SectionBar({ children, style = {} }) {
  return (
    <div style={{ background: '#f0f0f0', borderBottom: B, padding: '3px 8px', fontWeight: 700, fontSize: 10, letterSpacing: '0.05em', ...style }}>
      {children}
    </div>
  );
}

const getImageUrl = (src) => {
  if (!src) return null;
  if (src.startsWith('http')) return src;
  const base = import.meta.env.VITE_API_URL || '';
  return `${base}${src}`;
};

function SvtLogo({ size = 44 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 100 115" fill="none" style={{ flexShrink: 0 }}>
      <polygon points="50,2 95,27 95,77 50,102 5,77 5,27" fill="#1a1a1a" stroke="#000" strokeWidth="1.5"/>
      <path d="M 38,28 C 22,28 20,38 30,43 L 40,48 C 54,53 54,65 38,66 C 28,66 24,62 24,62"
        fill="none" stroke="white" strokeWidth="7" strokeLinecap="round"/>
      <text x="60" y="70" textAnchor="middle" fill="white" fontFamily="Arial Black,Arial,sans-serif" fontWeight="900" fontSize="28" letterSpacing="1">VT</text>
      <text x="50" y="96" textAnchor="middle" fill="#aaa" fontFamily="Arial,sans-serif" fontSize="6" letterSpacing="0.5">PUNE</text>
    </svg>
  );
}

function TuvLogo({ size = 38 }) {
  return (
    <svg width={size * 1.4} height={size} viewBox="0 0 72 52" fill="none">
      <rect x="1" y="1" width="70" height="50" rx="4" fill="white" stroke="#1e3a8a" strokeWidth="2"/>
      <text x="36" y="20" textAnchor="middle" fill="#1e3a8a" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="14" letterSpacing="1">TÜV</text>
      <text x="36" y="33" textAnchor="middle" fill="#1e3a8a" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="9" letterSpacing="1">AUSTRIA</text>
      <text x="36" y="44" textAnchor="middle" fill="#64748b" fontFamily="Arial,sans-serif" fontSize="7">CERTIFIED</text>
    </svg>
  );
}

const HT_ROWS = 9;

export default function JobCardPrint() {
  const { id } = useParams();
  const [jc, setJc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Page 1 inline-editable fields (still editable in print preview)
  const [controlPlanNo, setControlPlanNo] = useState('');
  const [specification, setSpecification] = useState('');
  const [dieMaterial, setDieMaterial] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [precautions, setPrecautions] = useState('');
  const [dispatchByOurVehicle, setDispatchByOurVehicle] = useState(false);
  const [dispatchByCourier, setDispatchByCourier] = useState(false);
  const [collectedByCustomer, setCollectedByCustomer] = useState(false);
  const [specInstrCert, setSpecInstrCert] = useState(false);
  const [specInstrMPIRep, setSpecInstrMPIRep] = useState(false);
  const [specInstrGraph, setSpecInstrGraph] = useState(false);

  // Page 2 inspection state (read-only on print page — edit via job card form)
  const [inspState, setInspState] = useState({
    catNormal: false, catWelded: false, catCrackRisk: false, catDistortionRisk: false,
    catCriticalFinishing: false, catDentDamage: false, catRusty: false, catOthers: false,
    procStressRelieving: false, procHardening: false, procTempering: false, procAnnealing: false,
    procBrazing: false, procPlasmaNitriding: false, procSubZero: false, procSoakClean: false,
    visualBefore: false, visualAfter: false, mpiBefore: false, mpiAfter: false, mpiNil: false,
    requiredHardnessMin: '', requiredHardnessMax: '', hardnessUnit: 'HRC',
    achievedHardness: '',
    hardnessAfter1: '', hardnessAfter2: '', hardnessAfter3: '', hardnessAfter4: '',
    packedQty: '',
  });

  const saveField = (field, value) => {
    api.put(`/jobcards/${id}`, { [field]: value }).catch(() => {});
  };

  const saveInsp = (updates) => {
    const next = { ...inspState, ...updates };
    setInspState(next);
    api.put(`/quality/${id}/inspection`, next).catch(() => {});
  };

  useEffect(() => {
    api.get(`/jobcards/${id}`)
      .then(async (r) => {
        let d = r.data.data;
        if (!d.certificateNo) {
          try {
            const cr = await api.post(`/jobcards/${id}/assign-certificate-no`);
            d = { ...d, certificateNo: cr.data.data.certificateNo };
          } catch (_) {}
        }
        setJc(d);
        setControlPlanNo(d.controlPlanNo || '');
        setSpecification(d.specification || '');
        const linked = d.challanItemLinks || [];
        setDieMaterial(d.dieMaterial || linked[0]?.material || '');
        if (d.dueDate) {
          setDueDate(d.dueDate.slice(0, 10));
        } else if (d.issueDate) {
          const base = new Date(d.issueDate);
          base.setDate(base.getDate() + 4);
          const computed = base.toISOString().slice(0, 10);
          setDueDate(computed);
          api.put(`/jobcards/${id}`, { dueDate: computed }).catch(() => {});
        } else {
          setDueDate('');
        }
        setSpecialRequirements(d.specialRequirements || '');
        setPrecautions(d.precautions || '');
        setDispatchByOurVehicle(!!d.dispatchByOurVehicle);
        setDispatchByCourier(!!d.dispatchByCourier);
        setCollectedByCustomer(!!d.collectedByCustomer);
        setSpecInstrCert(!!d.specInstrCert);
        setSpecInstrMPIRep(!!d.specInstrMPIRep);
        setSpecInstrGraph(!!d.specInstrGraph);
        const i = d.inspection || {};
        setInspState({
          catNormal: !!i.catNormal, catWelded: !!i.catWelded, catCrackRisk: !!i.catCrackRisk,
          catDistortionRisk: !!i.catDistortionRisk, catCriticalFinishing: !!i.catCriticalFinishing,
          catDentDamage: !!i.catDentDamage, catRusty: !!i.catRusty, catOthers: !!i.catOthers,
          procStressRelieving: !!i.procStressRelieving, procHardening: !!i.procHardening,
          procTempering: !!i.procTempering, procAnnealing: !!i.procAnnealing,
          procBrazing: !!i.procBrazing, procPlasmaNitriding: !!i.procPlasmaNitriding,
          procSubZero: !!i.procSubZero, procSoakClean: !!i.procSoakClean,
          visualBefore: !!i.visualBefore, visualAfter: i.visualAfter !== false,
          mpiBefore: !!i.mpiBefore, mpiAfter: !!i.mpiAfter, mpiNil: i.mpiNil !== false && !i.mpiAfter,
          requiredHardnessMin: i.requiredHardnessMin || '', requiredHardnessMax: i.requiredHardnessMax || '',
          hardnessUnit: i.hardnessUnit || 'HRC',
          achievedHardness: i.achievedHardness || '',
          hardnessAfter1: i.hardnessAfter1 || '', hardnessAfter2: i.hardnessAfter2 || '',
          hardnessAfter3: i.hardnessAfter3 || '', hardnessAfter4: i.hardnessAfter4 || '',
          packedQty: i.packedQty || '',
        });
      })
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

  const insp     = jc.inspection || {};
  const customer = jc.customer;
  const custName = jc.customerNameSnapshot || customer?.name || '—';
  const custAddr = jc.customerAddressSnapshot || [customer?.address, customer?.city, customer?.state, customer?.pinCode].filter(Boolean).join(', ') || '—';

  const challan              = jc.challans?.[0];
  const challanItemLinks     = jc.challanItemLinks || [];
  const challanItemsFromChallans = jc.challans?.flatMap(ch => ch.items || []) || [];
  const challanItems         = challanItemLinks.length > 0 ? challanItemLinks : challanItemsFromChallans;
  const dcNo      = challan?.challanNo  || challanItemLinks[0]?.challan?.challanNo  || '—';
  const inwardNo  = challan?.inwardNo   || challanItemLinks[0]?.challan?.inwardNo   || '—';

  const items = challanItems.length > 0
    ? challanItems
    : jc.part ? [{ partName: jc.part.description, qty: jc.quantity, weight: jc.totalWeight }] : [];

  const totalQty = items.reduce((s, it) => s + (Number(it.qty ?? it.quantity) || 0), 0);
  const totalWt  = items.reduce((s, it) => s + (Number(it.weight ?? it.totalWeight) || 0), 0);

  const htSpec = jc.hrcRange?.replace(/\d.*/, '').trim() || jc.operationMode || 'HARDEN AND TEMPER';
  const hrc    = jc.hrcRange || '—';

  const distBefore = Array.isArray(insp.distortionBefore)
    ? insp.distortionBefore.map(v => (typeof v === 'object' ? v.val : v)) : [];
  const distAfter = Array.isArray(insp.distortionAfter)
    ? insp.distortionAfter.map(v => (typeof v === 'object' ? v.val : v)) : [];

  const imageUrls = [jc.image1, jc.image2, jc.image3, jc.image4, jc.image5].map(getImageUrl);
  const ITEMS_8 = [0,1,2,3,4,5,6,7];

  const editInput = (value, setValue, field, opts = {}) => (
    <input
      className="no-print-border"
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={e => saveField(field, e.target.value)}
      style={{
        width: '100%', fontSize: 10, border: '1px dashed #bbb', borderRadius: 2,
        padding: '1px 4px', outline: 'none', background: 'transparent',
        fontFamily: 'Arial, sans-serif', ...opts,
      }}
    />
  );

  return (
    <div className="bg-slate-100 py-4 print:bg-white print:py-0" style={{ fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 4mm; size: A4 landscape; }
          .no-print-border { border: none !important; padding-left: 0 !important; background: transparent !important; }
          body.print-p1-only #page2 { display: none !important; }
          body.print-p2-only #page1 { display: none !important; }
          body * { font-weight: bold !important; color: #000 !important; }
          #page1 { font-size: 11px !important; }
          #page1 td, #page1 th { font-size: 11px !important; }
          #page2 { break-before: page; page-break-before: always; font-size: 10px !important; }
          #page2 td, #page2 th { padding: 2px 5px !important; font-size: 10px !important; }
          #page2 div[style] { font-size: inherit; }
          #page2 img { max-height: 120px !important; }
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Nav bar (no-print) ── */}
      <div className="no-print max-w-[1150px] mx-auto mb-4 px-2">
        <div className="flex items-center gap-2">
          <Link to={`/jobcards/${id}`} className="btn-ghost text-sm">← Back</Link>
          <button className="btn-ghost text-xs" onClick={() => { document.body.classList.add('print-p1-only'); window.print(); document.body.classList.remove('print-p1-only'); }}>Print Page 1</button>
          <button className="btn-ghost text-xs" onClick={() => { document.body.classList.add('print-p2-only'); window.print(); document.body.classList.remove('print-p2-only'); }}>Print Page 2</button>
          <button className="btn-primary text-sm ml-auto" onClick={() => window.print()}>Print Both</button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          PAGE 1 — JOB CARD
      ══════════════════════════════════════════ */}
      <div id="page1" className="page max-w-[1150px] mx-auto bg-white shadow-lg" style={{ border: B2, fontSize: 10 }}>

        {/* ── HEADER ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B2 }}>
          <tbody>
            <tr>
              {/* Left — logo + company */}
              <td style={{ width: '38%', borderRight: B2, padding: '6px 10px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <SvtLogo size={46} />
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.02em' }}>{SVT.name}</div>
                    <div style={{ fontSize: 10, color: '#000', fontWeight: 600, marginTop: 2 }}>{SVT.addr1}</div>
                    <div style={{ fontSize: 10, color: '#000', fontWeight: 600 }}>{SVT.email}</div>
                  </div>
                </div>
              </td>
              {/* Center — title */}
              <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px 10px', borderRight: B2 }}>
                <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '0.25em', textTransform: 'uppercase' }}>JOB CARD</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── CUSTOMER + JOB META ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <tbody>
            <tr>
              {/* Customer */}
              <td style={{ width: '52%', borderRight: B, padding: '6px 10px', verticalAlign: 'top' }}>
                <div style={labelStyle()}>Customer</div>
                <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 2 }}>{custName}</div>
                <div style={{ fontSize: 10, color: '#000', fontWeight: 600, lineHeight: 1.55 }}>
                  {(() => {
                    const parts = custAddr.split(', ').map(p => p.trim()).filter(Boolean);
                    const deduped = parts.filter((part, i) =>
                      !parts.some((other, j) => j !== i && other.toLowerCase().includes(part.toLowerCase()))
                    );
                    return deduped.join(', ');
                  })()}
                </div>
              </td>
              {/* Job meta */}
              <td style={{ padding: '6px 10px', verticalAlign: 'top' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {[
                      ['Certificate No.', jc.certificateNo || '—', true],
                      ['Job Card No.',    jc.jobCardNo || '—', false],
                      ['Inward No.',      inwardNo, false],
                      ['Your PO No.',     jc.yourNo || '—', false],
                      ['Your DC No.',     dcNo, false],
                      ['Issue Date',      formatDate(jc.issueDate) || '—', false],
                      ['Issue By',        jc.issueBy || jc.createdBy?.name || '—', false],
                    ].map(([lbl, val, bold]) => (
                      <tr key={lbl}>
                        <td style={{ paddingRight: 8, paddingBottom: 3, fontSize: 10, color: '#000', whiteSpace: 'nowrap', fontWeight: 700 }}>{lbl}</td>
                        <td style={{ paddingBottom: 3, fontSize: 11, fontWeight: bold ? 900 : 700, fontFamily: 'monospace', color: '#000' }}>: {val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── DISPATCH MODE / CONTROL PLAN / SPECIFICATION / SPECIAL INSTRUCTION ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <tbody>
            <tr>
              {/* Dispatch Mode */}
              <td style={{ padding: '4px 8px', borderRight: B, verticalAlign: 'top', width: '26%' }}>
                <div style={labelStyle({ marginBottom: 4 })}>Dispatch Mode</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#000' }}><CB checked={dispatchByOurVehicle} /> BY OUR VEHICLE</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#000' }}><CB checked={dispatchByCourier} /> BY COURIER</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#000' }}><CB checked={collectedByCustomer} /> COLLECTED BY CUSTOMER</div>
                </div>
              </td>
              {/* Control Plan No */}
              <td style={{ padding: '4px 8px', borderRight: B, verticalAlign: 'top', width: '22%' }}>
                <div style={labelStyle({ marginBottom: 3 })}>Control Plan No.</div>
                {editInput(controlPlanNo, setControlPlanNo, 'controlPlanNo', { fontWeight: 600 })}
              </td>
              {/* Specification */}
              <td style={{ padding: '4px 8px', borderRight: B, verticalAlign: 'top' }}>
                <div style={labelStyle({ marginBottom: 3 })}>Specification</div>
                {editInput(specification, setSpecification, 'specification')}
              </td>
              {/* Special Instruction */}
              <td style={{ padding: '4px 8px', verticalAlign: 'top' }}>
                <div style={labelStyle({ marginBottom: 4 })}>Special Instruction</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#000' }}><CB checked={specInstrCert} /> CERTIFICATE</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#000' }}><CB checked={specInstrMPIRep} /> MPI REPORT</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#000' }}><CB checked={specInstrGraph} /> PROCESS GRAPH</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── MATERIAL / HRC / HT SPEC ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <tbody>
            <tr>
              <td style={{ width: '26%', borderRight: B, padding: '4px 10px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={labelStyle({ marginBottom: 0 })}>Material :</span>
                  <input
                    className="no-print-border"
                    value={dieMaterial}
                    onChange={e => setDieMaterial(e.target.value)}
                    onBlur={e => saveField('dieMaterial', e.target.value)}
                    placeholder="—"
                    style={{ fontWeight: 800, fontSize: 12, border: '1px dashed #bbb', borderRadius: 2, padding: '1px 6px', outline: 'none', background: 'transparent', width: 80, textAlign: 'center' }}
                  />
                </div>
              </td>
              <td style={{ width: '22%', borderRight: B, padding: '4px 18px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={labelStyle({ marginBottom: 0 })}>Hardness :</span>
                  <span style={{ fontWeight: 900, fontSize: 14, letterSpacing: '0.05em' }}>{hrc}</span>
                </div>
              </td>
              <td style={{ padding: '4px 12px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={labelStyle({ marginBottom: 0 })}>Heat Treatment Specification :</span>
                  <span style={{ fontWeight: 700, fontSize: 11 }}>{htSpec}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── ITEMS TABLE + RIGHT PANEL ── */}
        <div style={{ display: 'flex', borderBottom: B }}>
          {/* Items table */}
          <div style={{ flex: 1, borderRight: B, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={headStyle({ width: 34, textAlign: 'center' })}>Item</th>
                  <th style={headStyle({ textAlign: 'left' })}>Description</th>
                  <th style={headStyle({ width: 100, textAlign: 'center' })}>Quantity (Pcs)</th>
                  <th style={headStyle({ width: 100, textAlign: 'center' })}>Weight (Kg)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={cellStyle({ textAlign: 'center', fontWeight: 600 })}>{i + 1}</td>
                    <td style={cellStyle()}>
                      <div style={{ fontWeight: 700, fontSize: 10 }}>
                        {(() => {
                          let name = it.partName || it.description || '—';
                          if (it.processName && name.includes(it.processName)) {
                            name = name.replace(new RegExp('\\s*[-–]\\s*' + it.processName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
                          }
                          return name;
                        })()}
                      </div>
                      {jc.woNo && (
                        <div style={{ fontSize: 8, color: '#444', marginTop: 1 }}>WM NO - {jc.woNo}</div>
                      )}
                      {(it.drawingNo || jc.drawingNo) && (
                        <div className="no-print" style={{ fontSize: 8, color: '#444' }}>DRG NO. - {it.drawingNo || jc.drawingNo}</div>
                      )}
                    </td>
                    <td style={cellStyle({ textAlign: 'center', fontFamily: 'monospace', fontSize: 10 })}>{it.qty ?? it.quantity ?? '—'}</td>
                    <td style={cellStyle({ textAlign: 'center', fontFamily: 'monospace', fontSize: 10 })}>
                      {it.weight != null ? Number(it.weight).toFixed(2) : (it.totalWeight != null ? Number(it.totalWeight).toFixed(2) : '—')}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: B2, background: '#f8f8f8' }}>
                  <td colSpan={2} style={{ border: B, padding: '3px 6px', fontWeight: 700, textAlign: 'right', fontSize: 9 }}>TOTAL</td>
                  <td style={{ border: B, padding: '3px 6px', fontWeight: 700, textAlign: 'center', fontFamily: 'monospace' }}>{totalQty || '—'}</td>
                  <td style={{ border: B, padding: '3px 6px', fontWeight: 700, textAlign: 'center', fontFamily: 'monospace' }}>{totalWt ? totalWt.toFixed(2) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Right panel */}
          <div style={{ width: 175, display: 'flex', flexDirection: 'column', fontSize: 9 }}>
            <div style={{ borderBottom: B, padding: '4px 8px' }}>
              <div style={labelStyle({ marginBottom: 3 })}>Delivery Date</div>
              <input
                type="date"
                className="no-print-border"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                onBlur={e => saveField('dueDate', e.target.value)}
                style={{ fontWeight: 700, fontSize: 10, border: '1px dashed #bbb', borderRadius: 2, padding: '1px 4px', outline: 'none', background: 'transparent', width: '100%' }}
              />
            </div>
            <div style={{ borderBottom: B, padding: '4px 8px', flex: 1 }}>
              <div style={labelStyle({ marginBottom: 3 })}>Special Requirements</div>
              <textarea
                className="no-print-border"
                value={specialRequirements}
                onChange={e => setSpecialRequirements(e.target.value)}
                onBlur={e => saveField('specialRequirements', e.target.value)}
                rows={3}
                style={{ width: '100%', resize: 'none', fontSize: 9, lineHeight: 1.5, border: '1px dashed #bbb', borderRadius: 2, padding: '1px 4px', outline: 'none', background: 'transparent' }}
              />
            </div>
            <div style={{ padding: '4px 8px', flex: 1 }}>
              <div style={labelStyle({ marginBottom: 3, textAlign: 'center' })}>Precautions During Production &amp; Final Inspection</div>
              <textarea
                className="no-print-border"
                value={precautions}
                onChange={e => setPrecautions(e.target.value)}
                onBlur={e => saveField('precautions', e.target.value)}
                rows={3}
                style={{ width: '100%', resize: 'none', fontSize: 9, lineHeight: 1.5, border: '1px dashed #bbb', borderRadius: 2, padding: '1px 4px', outline: 'none', background: 'transparent' }}
              />
            </div>
          </div>
        </div>

        {/* ── PAGE 1 FOOTER ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: B2 }}>
          <tbody><tr style={{ fontSize: 8, color: '#000', fontWeight: 700 }}>
            <td style={{ padding: '4px 10px', textAlign: 'center', width: '25%' }}>QF-PD-01</td>
            <td style={{ padding: '4px 10px', textAlign: 'center', width: '25%' }}>Effective Date: 01-04-2019</td>
            <td style={{ padding: '4px 10px', textAlign: 'center', width: '25%' }}>Revision: 01</td>
            <td style={{ padding: '4px 10px', textAlign: 'center', width: '25%' }}>Page 1 of 2</td>
          </tr></tbody>
        </table>
      </div>

      {/* ══════════════════════════════════════════
          PAGE 2 — INCOMING INSPECTION
      ══════════════════════════════════════════ */}
      <div id="page2" className="page max-w-[1150px] mx-auto bg-white shadow-lg mt-4 print:mt-0" style={{ border: B2, fontSize: 10, pageBreakBefore: 'always' }}>

        {/* ── CATEGORIZATION | PROCESS | INSPECTION ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <thead>
            <tr>
              <th style={headStyle({ width: '18%', textAlign: 'left', borderRight: B })}>Categorization — INCOMING INSPECTION</th>
              <th style={headStyle({ width: '18%', textAlign: 'left', borderRight: B })}>Process</th>
              <th style={headStyle({ textAlign: 'left', borderRight: B })} colSpan={2}>Inspection Details</th>
              <th style={headStyle({ width: '20%', textAlign: 'left', borderLeft: B })}>Incoming Inspection By</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: B, padding: '5px 10px', verticalAlign: 'top', lineHeight: 2.1, fontSize: 9, color: '#000', fontWeight: 700 }}>
                {[
                  [inspState.catNormal,           'NORMAL'],
                  [inspState.catWelded,           'WELDED'],
                  [inspState.catCrackRisk,        'CRACK OR CRACK RISK'],
                  [inspState.catDistortionRisk,   'DISTORTION RISK'],
                  [inspState.catCriticalFinishing,'CRITICAL FINISHING'],
                  [inspState.catDentDamage,       'DENT / DAMAGE'],
                  [inspState.catRusty,            'RUSTY'],
                  [inspState.catOthers,           'OTHERS'],
                ].map(([c, lbl]) => <div key={lbl}><CB checked={c} /> {lbl}</div>)}
              </td>
              <td style={{ border: B, padding: '5px 10px', verticalAlign: 'top', lineHeight: 2.1, fontSize: 9, color: '#000', fontWeight: 700 }}>
                {[
                  [inspState.procStressRelieving, 'STRESS RELIEVING'],
                  [inspState.procHardening,       'HARDENING'],
                  [inspState.procTempering,       'TEMPERING'],
                  [inspState.procAnnealing,       'ANNEALING'],
                  [inspState.procBrazing,         'BRAZING'],
                  [inspState.procPlasmaNitriding, 'PLASMA NITRIDING'],
                  [inspState.procSubZero,         'SUB ZERO'],
                  [inspState.procSoakClean,       'SOAK CLEAN'],
                ].map(([c, lbl]) => <div key={lbl}><CB checked={c} /> {lbl}</div>)}
              </td>
              {/* Visual / MPI */}
              <td style={{ border: B, padding: '5px 10px', verticalAlign: 'top', width: '22%', lineHeight: 2.1, fontSize: 9, color: '#000', fontWeight: 700 }}>
                <div style={labelStyle({ marginBottom: 3 })}>Visual Inspection</div>
                <div><CB checked={inspState.visualBefore} /> BEFORE</div>
                <div><CB checked={inspState.visualAfter} /> AFTER</div>
                <div style={{ marginTop: 8 }}>
                  <div style={labelStyle({ marginBottom: 3 })}>MPI Inspection</div>
                  <div><CB checked={inspState.mpiBefore} /> BEFORE</div>
                  <div><CB checked={inspState.mpiAfter} /> AFTER</div>
                  <div><CB checked={inspState.mpiNil} /> NIL</div>
                </div>
              </td>
              {/* Hardness */}
              <td style={{ padding: '5px 8px', verticalAlign: 'top', width: '22%' }}>
                <div style={{ border: B, marginBottom: 6 }}>
                  <div style={{ ...headStyle(), borderBottom: B }}>Required Hardness</div>
                  <div style={{ padding: '5px 8px', fontWeight: 900, fontSize: 13, fontFamily: 'monospace' }}>
                    {inspState.requiredHardnessMin && inspState.requiredHardnessMax
                      ? `${inspState.requiredHardnessMin}–${inspState.requiredHardnessMax} ${inspState.hardnessUnit || 'HRC'}`
                      : (jc.hrcRange || '—')}
                  </div>
                </div>
                <div style={{ border: B }}>
                  <div style={{ ...headStyle(), borderBottom: B }}>Achieved Hardness</div>
                  <div style={{ padding: '5px 8px', fontWeight: 900, fontSize: 13, fontFamily: 'monospace' }}>
                    {inspState.achievedHardness ? `${inspState.achievedHardness} ${inspState.hardnessUnit || 'HRC'}` : '—'}
                  </div>
                </div>
              </td>
              {/* Incoming Inspection By */}
              <td style={{ border: B, padding: '5px 10px', verticalAlign: 'top', width: '20%' }}>
                <div style={labelStyle({ marginBottom: 4 })}>Incoming Inspection By</div>
                <div style={{ ...sigLine, marginTop: 70 }}>Signature &amp; Date</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── HEAT TREATMENT PROCESS ── */}
        <SectionBar>
          HEAT TREATMENT PROCESS &nbsp;&nbsp;
          <span style={{ fontWeight: 400, fontSize: 9 }}>Cycle No: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{jc.heatNo || '—'}</span></span>
        </SectionBar>
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <thead>
            <tr>
              {['Equipment','Process','Temp / Time','Start Time','End Time','Date','Loading By','Result','Sign'].map(h => (
                <th key={h} style={headStyle({ textAlign: 'center', fontSize: 10, padding: '3px 4px' })}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: HT_ROWS }, (_, i) => {
              const hp = insp.heatProcesses?.[i] || {};
              return (
                <tr key={i} style={{ height: 26 }}>
                  <td style={cellStyle({ textAlign: 'center' })}>{hp.equipment || ''}</td>
                  <td style={cellStyle({ fontWeight: 700, textAlign: 'center' })}>{hp.process || ''}</td>
                  <td style={cellStyle({ textAlign: 'center' })}>{hp.tempTime || ''}</td>
                  <td style={cellStyle({ textAlign: 'center' })}>{hp.startTime ? new Date(hp.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                  <td style={cellStyle({ textAlign: 'center' })}>{hp.endTime ? new Date(hp.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                  <td style={cellStyle({ textAlign: 'center' })}>{hp.processDate ? formatDate(hp.processDate) : ''}</td>
                  <td style={cellStyle({ textAlign: 'center' })}>{hp.loadingBy || ''}</td>
                  <td style={cellStyle({ textAlign: 'center' })}>{hp.result || ''}</td>
                  <td style={cellStyle({ textAlign: 'center' })}></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── DISTORTION + HARDNESS AFTER ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top', padding: '6px 8px', borderRight: B }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 9, width: '100%' }}>
                  <thead>
                    <tr>
                      <th colSpan={9} style={headStyle({ textAlign: 'center' })}>DISTORTION MEASUREMENT</th>
                    </tr>
                    <tr>
                      <th style={headStyle({ textAlign: 'center', width: 50 })}>ITEM</th>
                      {ITEMS_8.map(i => <th key={i} style={headStyle({ textAlign: 'center', minWidth: 40 })}>{i + 1}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[['BEFORE', distBefore], ['AFTER', distAfter]].map(([lbl, arr]) => (
                      <tr key={lbl} style={{ height: 26 }}>
                        <td style={cellStyle({ fontWeight: 700, textAlign: 'center', background: '#f8f8f8' })}>{lbl}</td>
                        {ITEMS_8.map(i => (
                          <td key={i} style={cellStyle({ textAlign: 'center' })}>
                            {arr[i] ?? (i === 0 ? 'NA' : '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
              <td style={{ verticalAlign: 'top', padding: '6px 8px', width: 180 }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 9, width: '100%' }}>
                  <thead>
                    <tr><th colSpan={2} style={headStyle({ textAlign: 'center' })}>HARDNESS AFTER</th></tr>
                  </thead>
                  <tbody>
                    {[1,2,3,4].map(n => (
                      <tr key={n} style={{ height: 24 }}>
                        <td style={cellStyle({ width: 28, fontWeight: 700, textAlign: 'center', background: '#f8f8f8' })}>{n}</td>
                        <td style={cellStyle({ fontFamily: 'monospace' })}>{inspState[`hardnessAfter${n}`] || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── JOB IMAGES + SIGNATURES (side by side) ── */}
        <div style={{ display: 'flex', borderBottom: B }}>
          {/* Images — larger, take most of the width */}
          <div style={{ flex: 1, borderRight: B }}>
            <SectionBar>JOB IMAGES</SectionBar>
            <div style={{ display: 'flex', gap: 8, padding: '6px 10px', flexWrap: 'wrap' }}>
              {[0, 1, 2, 3, 4].map(n => (
                <div key={n} style={{ border: B, width: 160, height: 115, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', flexShrink: 0 }}>
                  {imageUrls[n]
                    ? <img src={imageUrls[n]} alt={`Job ${n+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 8, color: '#bbb' }}>Image {n + 1}</span>}
                </div>
              ))}
            </div>
          </div>
          {/* Packed Qty + Quality Approved — narrow column */}
          <div style={{ width: 230, display: 'flex', flexDirection: 'column' }}>
            <div style={{ borderBottom: B, padding: '6px 10px', flex: 1 }}>
              <div style={labelStyle()}>Packed Quantity</div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, marginTop: 4, fontWeight: 600 }}>{inspState.packedQty || ''}</div>
              <div style={sigLine}>Packed By</div>
            </div>
            <div style={{ padding: '6px 10px', flex: 1 }}>
              <div style={labelStyle()}>Quality Approved By</div>
              <div style={sigLine}>Signature &amp; Date</div>
            </div>
          </div>
        </div>

        {/* ── PAGE 2 FOOTER ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: B2 }}>
          <tbody><tr style={{ fontSize: 8, color: '#000', fontWeight: 700 }}>
            <td style={{ padding: '4px 10px', textAlign: 'left', width: '75%', whiteSpace: 'nowrap', fontSize: 7 }}>
              Color Code — WHITE: Regular &nbsp;|&nbsp; RED: Rework &nbsp;|&nbsp; BLUE: New Development &nbsp;|&nbsp; YELLOW: Stress Relieving &amp; Other &nbsp;|&nbsp; QF-PD-01 &nbsp;|&nbsp; Effective Date: 01/04/2019 &nbsp;|&nbsp; Revision: 00
            </td>
            <td style={{ padding: '4px 10px', textAlign: 'right', width: '25%', whiteSpace: 'nowrap' }}>
              Page 2 of 2
            </td>
          </tr></tbody>
        </table>
      </div>
    </div>
  );
}
