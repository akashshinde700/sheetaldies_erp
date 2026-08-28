import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import { useProcesses, useMachines } from '../../hooks/useMasterData';
import SearchSelect from '../../components/SearchSelect';

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
  return <img src="/logo.png" alt="SVT" style={{ height: size, width: 'auto', flexShrink: 0, display: 'block' }} />;
}

function TuvLogo({ size = 38 }) {
  return <img src="/tuv.png" alt="TÜV Austria" style={{ height: size, width: 'auto', display: 'block' }} />;
}

const HT_ROWS = 9;

export default function JobCardPrint() {
  const { id } = useParams();
  const { data: processes = [] } = useProcesses();
  const { data: machines = [] } = useMachines();
  const [jc, setJc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [heatProcessRows, setHeatProcessRows] = useState(
    Array.from({ length: HT_ROWS }, () => ({ equipment: '', processTypeId: '' }))
  );
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
  const [showDrawingNoInPrint, setShowDrawingNoInPrint] = useState(true);
  const [showDrawingNoLabelInPrint, setShowDrawingNoLabelInPrint] = useState(true);
  // Per-item DRG NO label overrides, keyed by challan item id (each item can
  // rename its own "DRG NO" label independently).
  const [itemLabels, setItemLabels] = useState({});

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
    incomingInspectionBy: '',
  });

  const saveField = (field, value) => {
    api.put(`/jobcards/${id}`, { [field]: value }).catch(() => {});
  };

  const saveItemLabel = (itemId, value) => {
    api.patch(`/jobwork/items/${itemId}`, { drawingNoLabel: value }).catch(() => {});
  };

  const saveInsp = (updates) => {
    const next = { ...inspState, ...updates };
    setInspState(next);
    api.put(`/quality/${id}/inspection`, next).catch(() => {});
  };

  const updateHeatProcessRow = (idx, field, value) => {
    const rows = heatProcessRows.map((r, i) => (i === idx ? { ...r, [field]: value } : r));
    setHeatProcessRows(rows);
    // The inspection endpoint replaces the full heatProcesses set on every save,
    // so send the whole current inspState alongside it (skip fully-blank rows).
    api.put(`/quality/${id}/inspection`, {
      ...inspState,
      heatProcesses: rows.filter(r => r.equipment || r.processTypeId),
    }).catch(() => {});
  };

  useEffect(() => {
    const prev = document.title;
    document.title = ' ';
    return () => { document.title = prev; };
  }, []);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const r = await api.get(`/jobcards/${id}`);
      const d = r.data.data;
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
      setShowDrawingNoInPrint(d.showDrawingNoInPrint !== false);
      setShowDrawingNoLabelInPrint(d.showDrawingNoLabelInPrint !== false);
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
        hardnessAfter1: i.hardnessAfter1 != null ? String(i.hardnessAfter1) : '',
        hardnessAfter2: i.hardnessAfter2 != null ? String(i.hardnessAfter2) : '',
        hardnessAfter3: i.hardnessAfter3 != null ? String(i.hardnessAfter3) : '',
        hardnessAfter4: i.hardnessAfter4 != null ? String(i.hardnessAfter4) : '',
        packedQty: i.packedQty || '',
        incomingInspectionBy: i.incomingInspectionBy || '',
      });
      const existingRows = i.heatProcesses || [];
      setHeatProcessRows(
        Array.from({ length: HT_ROWS }, (_, idx) => {
          const hp = existingRows[idx];
          return {
            equipment: hp?.equipment || '',
            processTypeId: hp?.processTypeId ? String(hp.processTypeId) : '',
          };
        })
      );
      setError(null);
    } catch {
      if (!isRefresh) setError('Job Card not found.');
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

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
  const fixNo     = (s) => s ? s.replace(/\bSDT\b/g, 'SVT') : s;
  // challanItemLinks reflects each item's actual current challan assignment;
  // jc.challans[0] is a direct relation that can point to a stale/wrong
  // challan, so prefer the per-item link when one exists.
  const inwardNo  = fixNo(challanItemLinks[0]?.challan?.inwardNo || challan?.inwardNo || '—');
  const challanNo = fixNo(challanItemLinks[0]?.challan?.challanNo || challan?.challanNo || '');
  // Use challanDate from the linked inward — never current date or job card date
  const challanDate = challanItemLinks[0]?.challan?.challanDate || challan?.challanDate;
  const challanDateStr = challanDate
    ? (() => {
        const d = new Date(challanDate);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}.${mm}.${yyyy}`;
      })()
    : null;
  const dcBase = challanNo || inwardNo;
  const dcNo = dcBase && dcBase !== '—'
    ? (challanDateStr ? `${dcBase}/${challanDateStr}` : dcBase)
    : '—';

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
        @page { margin: 0mm; size: A4 landscape; }
        @media print {
          html, body { width: 100% !important; margin: 0 !important; padding: 3mm 4mm !important; }
          .no-print { display: none !important; }
          .page {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print-border { border: none !important; padding-left: 0 !important; background: transparent !important; }
          #page2 { display: none !important; }
          body.print-both #page2 { display: block !important; }
          body.print-both #page1 { page-break-after: always; break-after: page; }
          body.print-p2-only #page1 { display: none !important; }
          body.print-p2-only #page2 { display: block !important; }
          body * { font-weight: bold !important; color: #000 !important; }
          #page1 { font-size: 10px !important; }
          #page1 td, #page1 th { font-size: 10px !important; }

          /* Page 1 — stretch the frame down to fill the A4 sheet */
          #page1 { min-height: 190mm; display: flex !important; flex-direction: column; }
          #page1 > table { flex: 0 0 auto; }
          #page1 > .jc-p1-body { flex: 1 1 auto; }
          #page1 .jc-p1-body > div:first-child { display: flex; flex-direction: column; }
          #page1 .jc-p1-body > div:first-child > table { flex: 1 1 auto; }

          /* Page 2 — compress so it always fits on ONE sheet */
          #page2 { font-size: 8.5px !important; margin-top: 0 !important; page-break-inside: avoid; break-inside: avoid; }
          #page2 td, #page2 th { padding: 1px 3px !important; font-size: 8.5px !important; line-height: 1.5 !important; }
          #page2 tr { height: auto !important; }
          .jc-p2-images { gap: 5px !important; padding: 4px 8px !important; }
          .jc-p2-images > div { aspect-ratio: 3 / 2 !important; }
          #page2 div[style] { font-size: inherit; }
          #page2 img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
          table { width: 100% !important; table-layout: auto; }
          input, textarea { border: none !important; background: transparent !important; outline: none !important; }
          #page2 button { border: none !important; background: transparent !important; padding: 0 !important; box-shadow: none !important; }
          #page2 button .material-symbols-outlined { display: none !important; }
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Nav bar (no-print) ── */}
      <div className="no-print max-w-[1150px] mx-auto mb-4 px-2">
        <div className="flex items-center gap-2">
          <Link to={`/jobcards/${id}`} className="btn-ghost text-sm">← Back</Link>
          <button
            className="btn-ghost text-xs flex items-center gap-1"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="Reload latest data from server"
          >
            <span className={`material-symbols-outlined text-[14px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
            {refreshing ? 'Loading…' : 'Refresh'}
          </button>
          <button className="btn-ghost text-xs" onClick={() => window.print()}>Print Page 1</button>
          <button className="btn-ghost text-xs" onClick={() => { document.body.classList.add('print-p2-only'); window.print(); document.body.classList.remove('print-p2-only'); }}>Print Page 2</button>
          <button className="btn-primary text-sm ml-auto" onClick={() => { document.body.classList.add('print-both'); window.print(); document.body.classList.remove('print-both'); }}>Print Both</button>
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
              {/* SVT logo — left corner */}
              <td style={{ width: 120, padding: '8px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                <SvtLogo size={96} />
              </td>
              {/* Title + company info */}
              <td style={{ padding: '6px 16px', verticalAlign: 'middle' }}>
                <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 20, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}>
                  JOB CARD
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 9, color: '#555', marginBottom: 2 }}>Factory:</div>
                    <div style={{ fontWeight: 900, fontSize: 13 }}>{SVT.name}</div>
                    <div style={{ fontSize: 9 }}>{SVT.addr1}</div>
                    <div style={{ fontSize: 9 }}>{SVT.email}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 9, color: '#555', marginBottom: 2 }}>Registered Office:</div>
                    <div style={{ fontWeight: 900, fontSize: 13 }}>{SVT.name}</div>
                    <div style={{ fontSize: 9 }}>{SVT.addr1}</div>
                    <div style={{ fontSize: 9 }}>{SVT.email}</div>
                  </div>
                </div>
              </td>
              {/* TÜV logo — right corner */}
              <td style={{ width: 120, padding: '8px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                <TuvLogo size={82} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── CUSTOMER + JOB META ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <tbody>
            <tr>
              {/* Customer */}
              <td style={{ width: '52%', padding: '6px 10px', verticalAlign: 'top' }}>
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
              <td style={{ padding: '4px 6px 4px 20px', verticalAlign: 'top' }}>
                <table style={{ borderCollapse: 'collapse' }}>
                  <tbody>
                    {[
                      ['Certificate No.', jc.testCertificates?.[0]?.certNo || jc.certificateNo || '', true],
                      ['Job Card No.',    jc.jobCardNo || '—', false],
                      ['Your PO No.',     jc.yourNo || '—', false],
                      ['Your DC No.',     dcNo, false],
                      ['Issue Date',      formatDate(jc.issueDate) || '—', false],
                      ['Issue By',        jc.issueBy || jc.createdBy?.name || '—', false],
                    ].map(([lbl, val, bold]) => (
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
                    style={{ fontWeight: 800, fontSize: 12, border: '1px dashed #bbb', borderRadius: 2, padding: '1px 6px', outline: 'none', background: 'transparent', width: 140, textAlign: 'center' }}
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
        <div className="jc-p1-body" style={{ display: 'flex', borderBottom: B }}>
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
                      <div style={{ fontWeight: 700, fontSize: 10, display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                        <span>
                          {(() => {
                            let name = it.partName || it.description || '—';
                            const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            if (it.processName) name = name.replace(new RegExp('\\s*[-–]\\s*' + esc(it.processName) + '\\s*$', 'i'), '').trim();
                            if (it.material)    name = name.replace(new RegExp('\\s*[-–]\\s*' + esc(it.material)    + '\\s*$', 'i'), '').trim();
                            return name || '—';
                          })()}
                        </span>
                        {showDrawingNoInPrint && (it.drawingNo || jc.drawingNo) && (() => {
                          const rowLabel = itemLabels[it.id] ?? it.drawingNoLabel ?? 'DRG NO';
                          return (
                            <span style={{ fontSize: 8, fontWeight: 400, color: '#444', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              {showDrawingNoLabelInPrint && (
                                it.id ? (
                                  <input
                                    className="no-print-border"
                                    value={rowLabel}
                                    onChange={e => setItemLabels(prev => ({ ...prev, [it.id]: e.target.value }))}
                                    onBlur={e => saveItemLabel(it.id, e.target.value)}
                                    style={{ width: 50, fontSize: 8, fontWeight: 400, border: '1px dashed #bbb', borderRadius: 2, padding: '0 2px', outline: 'none', background: 'transparent', fontFamily: 'Arial, sans-serif', color: '#444' }}
                                  />
                                ) : <span>{rowLabel}</span>
                              )}
                              <span>{showDrawingNoLabelInPrint && rowLabel.trim() ? '- ' : ''}{it.drawingNo || jc.drawingNo}</span>
                            </span>
                          );
                        })()}
                      </div>
                      {jc.woNo && (
                        <div style={{ fontSize: 8, color: '#444', marginTop: 1 }}>WM NO - {jc.woNo}</div>
                      )}
                    </td>
                    <td style={cellStyle({ textAlign: 'center', fontFamily: 'monospace', fontSize: 10 })}>{it.qty ?? it.quantity ?? '—'}</td>
                    <td style={cellStyle({ textAlign: 'center', fontFamily: 'monospace', fontSize: 10 })}>
                      {it.weight != null ? Number(it.weight).toFixed(3) : (it.totalWeight != null ? Number(it.totalWeight).toFixed(3) : '—')}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: B2, background: '#f8f8f8' }}>
                  <td colSpan={2} style={{ border: B, padding: '3px 6px', fontWeight: 700, textAlign: 'right', fontSize: 9 }}>TOTAL</td>
                  <td style={{ border: B, padding: '3px 6px', fontWeight: 700, textAlign: 'center', fontFamily: 'monospace' }}>{totalQty || '—'}</td>
                  <td style={{ border: B, padding: '3px 6px', fontWeight: 700, textAlign: 'center', fontFamily: 'monospace' }}>{jc.totalWeight ? Number(jc.totalWeight).toFixed(3) : (totalWt ? totalWt.toFixed(3) : '—')}</td>
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
      <div id="page2" className="page max-w-[1150px] mx-auto bg-white shadow-lg mt-4 print:mt-0" style={{ border: B2, fontSize: 10 }}>

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
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 150 }}>
                  <div style={labelStyle({ marginBottom: 4 })}>Incoming Inspection By</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, textAlign: 'center' }}>
                    {inspState.incomingInspectionBy || '—'}
                  </div>
                  <div style={{ ...sigLine, marginTop: 0 }}>Signature</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── HEAT TREATMENT PROCESS ── */}
        <SectionBar>
          HEAT TREATMENT PROCESS &nbsp;&nbsp;
          <span style={{ fontWeight: 400, fontSize: 9 }}>Cycle No: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{jc.heatNo || '—'}</span></span>
        </SectionBar>
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B, tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {[
                ['Equipment', '16%'], ['Process', '20%'], ['Temp / Time', '11%'],
                ['Start Time', '9%'], ['End Time', '9%'], ['Date', '10%'],
                ['Loading By', '10%'], ['Result', '6%'], ['Sign', '9%'],
              ].map(([h, w]) => (
                <th key={h} style={headStyle({ textAlign: 'center', fontSize: 10, padding: '3px 4px', width: w })}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: HT_ROWS }, (_, i) => {
              const hp = insp.heatProcesses?.[i] || {};
              const row = heatProcessRows[i] || { equipment: '', processTypeId: '' };
              return (
                <tr key={i} style={{ height: 24 }}>
                  <td style={cellStyle({ textAlign: 'center', padding: '1px 2px' })}>
                    <SearchSelect
                      value={row.equipment}
                      onChange={v => updateHeatProcessRow(i, 'equipment', v)}
                      options={machines.map(m => ({ value: m.name, label: m.name }))}
                      placeholder="—"
                      useFixed
                      dense
                      className="no-print-border"
                    />
                  </td>
                  <td style={cellStyle({ fontWeight: 700, textAlign: 'center', padding: '1px 2px' })}>
                    <SearchSelect
                      value={row.processTypeId}
                      onChange={v => updateHeatProcessRow(i, 'processTypeId', v)}
                      options={processes.map(p => ({ value: p.id, label: p.name }))}
                      placeholder="—"
                      useFixed
                      dense
                      className="no-print-border"
                    />
                  </td>
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
            <div className="jc-p2-images" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, padding: '6px 10px' }}>
              {[0, 1, 2, 3, 4].map(n => (
                <div key={n} style={{ border: B, aspectRatio: '13 / 10', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', overflow: 'hidden' }}>
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
              <div style={sigLine}>Signature</div>
            </div>
          </div>
        </div>

        {/* ── PAGE 2 FOOTER ── */}
        <div style={{
          display: 'flex', alignItems: 'center', width: '100%', borderTop: B2,
          fontSize: 8, color: '#000', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 10px', borderRight: B2, flexShrink: 0 }}>
            <span>Color Code — WHITE: Regular |</span>
            <span>RED: Rework |</span>
            <span>BLUE: New Development |</span>
            <span>YELLOW: Stress Relieving &amp; Other</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1, padding: '4px 10px' }}>
            <span>QF-PD-01</span>
            <span>Effective Date: 01/04/2019</span>
            <span>Revision: 00</span>
            <span>Page 2 of 2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
