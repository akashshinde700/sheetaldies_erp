import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import HeatCycleStepGraph from '../../components/HeatCycleStepGraph';

// Returns null when the run sheet genuinely has no saved graph — the paper
// form's GRAPH box stays blank in that case, it is not defaulted to a preset.
function asGraph(v) {
  if (!v) return null;
  if (Array.isArray(v)) return v.length ? v : null;
  try { const p = JSON.parse(v); return Array.isArray(p) && p.length ? p : null; } catch { return null; }
}

function SvtLogo({ mm = 13 }) {
  return <img src="/logo.png" alt="SVT" style={{ width: `${mm}mm`, height: `${mm}mm`, objectFit: 'contain', display: 'block' }} />;
}

const BO = '0.6mm solid black';
const B = '0.2mm solid black';
const FONT = 'Arial, Helvetica, sans-serif';

const ROW_H = '6.2mm';

// Item table columns as % of the 76%-wide left column, matching the
// reference layout's proportions.
const COLUMNS = [
  { label: 'SR NO',          w: '5.5%' },
  { label: 'CUSTOMERS',      w: '33.5%' },
  { label: 'JOB CARD NO',    w: '13%' },
  { label: 'JOB DESCRIPTION',w: '17%' },
  { label: 'MTRL',           w: '7%' },
  { label: 'HRC REQ',        w: '8%' },
  { label: 'QTY',            w: '8%' },
  { label: 'W.T',            w: '8%' },
];

const flex = { display: 'flex' };
const lbl  = { fontWeight: 700 };

function Row({ children, h, border = true, last = false }) {
  return (
    <div style={{ ...flex, flexShrink: 0, height: h, borderBottom: last ? 'none' : (border ? B : 'none') }}>
      {children}
    </div>
  );
}

function Cell({ w, bold, last, children, style }) {
  return (
    <div style={{
      width: w, display: 'flex', alignItems: 'center',
      borderRight: last ? 'none' : B,
      padding: '0 1mm',
      fontWeight: bold ? 700 : 400,
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function VHTRunsheetPrint() {
  const { id } = useParams();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const p = document.title; document.title = ' '; return () => { document.title = p; }; }, []);

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
  const DATA_ROWS = Math.max(16, items.length);
  // The right column (FIXTURES/T.C./INSTRUCTION) stays a fixed 9 rows,
  // independent of the left item table's row count — matching the paper
  // form — so CYCLE PARAMETERS + GRAPH below it keep enough height. A row
  // count tied to DATA_ROWS (up to 16+) would crush the graph down to a
  // sliver.
  const RIGHT_ROWS = 9;

  return (
    <div className="min-h-screen bg-white print:p-0 p-4" style={{ fontFamily: FONT }}>
      <style>{`
        @page { size: A4 landscape; margin: 5mm; }
        * , *::before, *::after { box-sizing: border-box; }
        @media print {
          .no-print { display: none !important; }
          html, body { margin: 0 !important; padding: 0 !important; overflow: visible !important; }
          body { background: white !important; }
          .print-scale { zoom: 0.97; }
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

      <div className="print-scale" style={{
        width: '285mm', height: '198mm', margin: '0 auto', border: BO, fontFamily: FONT,
        fontSize: '2.6mm', lineHeight: 1.2, display: 'flex', flexDirection: 'column',
      }}>

        {/* ================= HEADER ================= */}
        {/* Logo column width = 14% of the 76% left container (30.3mm) — the
            same as the HT CYCLE NO label cell below, so the divider right
            after the logo continues straight down as the label/value divider
            in the info block, instead of landing at an unrelated position. */}
        <div style={{ ...flex, flexShrink: 0, height: '16mm', borderBottom: BO }}>
          <div style={{ ...flex, width: '30.3mm', alignItems: 'center', justifyContent: 'center', borderRight: B }}>
            <SvtLogo mm={13} />
          </div>
          <div style={{ ...flex, flex: 1, alignItems: 'center', justifyContent: 'center', borderRight: B }}>
            <h1 style={{ fontSize: '6.5mm', fontWeight: 700, letterSpacing: '0.3mm', margin: 0 }}>VHT RUN SHEET</h1>
          </div>
          <div style={{ ...flex, width: '24%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 1mm' }}>
            <span style={{ fontSize: '4.2mm', fontWeight: 700, lineHeight: 1.25 }}>SHITAL VACUUM</span>
            <span style={{ fontSize: '4.2mm', fontWeight: 700, lineHeight: 1.25 }}>TREAT PVT. LTD.</span>
          </div>
        </div>

        {/* ================= INFO BLOCK ================= */}
        {/* Column widths (14/25/13/17/11/20 = 100%) are chosen so the three
            label|value pairs' group boundaries land at 39% and 69% of this
            76% container — exactly where JOB CARD NO and MTRL start in the
            item table below — keeping every vertical divider continuous
            from the header down through the body. */}
        <div style={{ ...flex, flexShrink: 0, height: '21mm', borderBottom: BO }}>
          <div style={{ ...flex, width: '76%', flexDirection: 'column', borderRight: B }}>
            <div style={{ ...flex, flex: 1 }}>
              <Cell w="14%" bold>HT CYCLE NO :</Cell>
              <Cell w="25%">{row.runsheetNumber}</Cell>
              <Cell w="13%" bold>DATE:-</Cell>
              <Cell w="17%">{formatDate(row.runDate)}</Cell>
              <Cell w="11%" bold>FURNACE:-</Cell>
              <Cell w="20%" last>{row.furnace?.name || row.furnace?.code || ''}</Cell>
            </div>
            <div style={{ ...flex, flex: 1, borderTop: B }}>
              <Cell w="14%" bold>CYCLE START TIME:</Cell>
              <Cell w="25%">{row.cycleStartTime || ''}</Cell>
              <Cell w="13%" bold>CYCLE END TIME:-</Cell>
              <Cell w="17%">{row.cycleEndTime || ''}</Cell>
              <Cell w="11%" bold>TOTAL TIME:-</Cell>
              <Cell w="20%" last>{row.totalTimeDisplay || ''}</Cell>
            </div>
            <div style={{ ...flex, flex: 1, borderTop: B }}>
              <Cell w="14%" bold>M.R START:-</Cell>
              <Cell w="25%">{row.mrStart ?? ''}</Cell>
              <Cell w="13%" bold>M.R END :-</Cell>
              <Cell w="17%">{row.mrEnd ?? ''}</Cell>
              <Cell w="11%" bold>TOTAL M.R</Cell>
              <Cell w="20%" last>{row.totalMr ?? ''}</Cell>
            </div>
          </div>
          <div style={{ ...flex, width: '24%', flexDirection: 'column' }}>
            <div style={{ ...flex, height: '7mm', alignItems: 'center', justifyContent: 'center', borderBottom: B, textAlign: 'center', fontWeight: 700, padding: '0 1mm' }}>
              LOADING OPERATOR NAME:-
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              {row.loadingOperatorName || ''}
            </div>
          </div>
        </div>

        {/* ================= MAIN BODY ================= */}
        <div style={{ ...flex, flex: 1, minHeight: 0, borderBottom: BO }}>

          {/* -------- LEFT (76%): item table + check points + signatures -------- */}
          <div style={{ ...flex, width: '76%', flexDirection: 'column', borderRight: B }}>

            {/* column headers */}
            <div style={{ ...flex, flexShrink: 0, height: '8mm', background: '#f2f2f2', borderBottom: B }}>
              {COLUMNS.map((col, i) => (
                <Cell key={col.label} w={col.w} bold last={i === COLUMNS.length - 1}
                  style={{ justifyContent: 'center', textAlign: 'center', fontSize: '2.3mm' }}>
                  {col.label}
                </Cell>
              ))}
            </div>

            {/* data rows */}
            {Array.from({ length: DATA_ROWS }).map((_, i) => {
              const it = items[i];
              return (
                <div key={i} style={{ ...flex, flexShrink: 0, height: ROW_H, borderBottom: B }}>
                  <Cell w={COLUMNS[0].w} style={{ justifyContent: 'center', fontSize: '2.3mm' }}>{it ? i + 1 : ''}</Cell>
                  <Cell w={COLUMNS[1].w} style={{ fontSize: '2.3mm' }}>{it ? (it.customerName || it.jobCard?.customer?.name || '') : ''}</Cell>
                  <Cell w={COLUMNS[2].w} style={{ fontSize: '2.1mm', fontFamily: 'monospace' }}>{it ? (it.jobCard?.jobCardNo || '') : ''}</Cell>
                  <Cell w={COLUMNS[3].w} style={{ fontSize: '2.3mm' }}>{it ? (it.jobDescription || it.item?.description || '') : ''}</Cell>
                  <Cell w={COLUMNS[4].w} style={{ justifyContent: 'center', fontSize: '2.3mm' }}>{it ? (it.materialGrade || '') : ''}</Cell>
                  <Cell w={COLUMNS[5].w} style={{ justifyContent: 'center', fontSize: '2.3mm' }}>{it ? (it.hrcRequired || '') : ''}</Cell>
                  <Cell w={COLUMNS[6].w} style={{ justifyContent: 'center', fontSize: '2.3mm' }}>{it ? it.quantity : ''}</Cell>
                  <Cell w={COLUMNS[7].w} last style={{ justifyContent: 'flex-end', fontSize: '2.3mm', fontFamily: 'monospace' }}>
                    {it?.weightKg != null ? Number(it.weightKg).toFixed(3) : ''}
                  </Cell>
                </div>
              );
            })}

            {/* check points block header — reuses QTY/W.T column widths to show totals */}
            <div style={{ ...flex, flexShrink: 0, height: '6.6mm', borderBottom: B, background: '#f2f2f2' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', borderRight: B, paddingLeft: '1mm', fontWeight: 700 }}>
                CHECK POINTS:-
              </div>
              <Cell w="8%" bold style={{ justifyContent: 'center', textAlign: 'center' }}>{totalQty || ''}</Cell>
              <Cell w="8%" last style={{ justifyContent: 'flex-end', fontFamily: 'monospace', fontWeight: 700 }}>
                {totalWt > 0 ? totalWt.toFixed(3) : ''}
              </Cell>
            </div>

            <Row h="6.6mm">
              <Cell w="42%" bold pad>1) GAS PRESSURE:- <span style={{ fontWeight: 400, marginLeft: '1mm' }}>{row.gasPressure || ''}</span></Cell>
              <Cell w="28%" bold pad>WATER CIRCULATION:-</Cell>
              <Cell w="30%" last>{row.waterCirculationFrom || ''}</Cell>
            </Row>
            <Row h="6.6mm">
              <Cell w="25%" bold pad>2) POWER FAILURE:-</Cell>
              <Cell w="8%" bold pad>FROM:-</Cell>
              <Cell w="14%">{row.powerFailureFrom || ''}</Cell>
              <Cell w="8%" bold pad>TO :-</Cell>
              <Cell w="18%">{row.powerFailureTo || ''}</Cell>
              <Cell w="27%" last />
            </Row>
            <Row h="6.6mm">
              <Cell w="100%" bold pad last>3) OTHER :- <span style={{ fontWeight: 400, marginLeft: '1mm' }}>{row.otherCheckpoint || ''}</span></Cell>
            </Row>
            <Row h="6.6mm">
              <Cell w="100%" pad last style={{ fontSize: '2.4mm' }}>
                4) After processing within 24 hrs, Supervisor shall verify process parameter (graph) &amp; sign below.
                {row.verificationNote && <span style={{ fontWeight: 700, marginLeft: '2mm' }}>{row.verificationNote}</span>}
              </Cell>
            </Row>
            <Row h="6.6mm">
              <Cell w="100%" bold pad last>Remark:- <span style={{ fontWeight: 400, marginLeft: '1mm' }}>{row.remarks || ''}</span></Cell>
            </Row>

            <div style={{ ...flex, flex: 1, minHeight: 0 }}>
              <Cell w="16%" bold pad>OPERATORS SIGN:-</Cell>
              <Cell w="26%">{row.operatorSign || ''}</Cell>
              <Cell w="26%" bold pad>PROD. SUPERVISOR SIGN:-</Cell>
              <Cell w="32%" last>{row.supervisorSign || ''}</Cell>
            </div>
          </div>

          {/* -------- RIGHT (24%): fixtures / cycle parameters / graph -------- */}
          <div style={{ ...flex, width: '24%', flexDirection: 'column' }}>
            <div style={{ ...flex, flexShrink: 0, height: '8mm', borderBottom: B, background: '#f2f2f2' }}>
              <Cell w="32%" bold style={{ justifyContent: 'center', textAlign: 'center', fontSize: '2.3mm' }}>FIXTURES</Cell>
              <Cell w="36%" bold style={{ justifyContent: 'center', textAlign: 'center', fontSize: '2.3mm' }}>T.C. POSITION</Cell>
              <Cell w="32%" bold last style={{ justifyContent: 'center', textAlign: 'center', fontSize: '2.3mm' }}>INSTRUCTION</Cell>
            </div>

            <div style={{ flexShrink: 0, height: `calc(${ROW_H} * ${RIGHT_ROWS})`, borderBottom: B, display: 'flex', flexDirection: 'column' }}>
              {Array.from({ length: RIGHT_ROWS }).map((_, i) => {
                const it = items[i];
                return (
                  <div key={i} style={{ ...flex, flexShrink: 0, height: ROW_H }}>
                    <Cell w="32%" last style={{ border: 'none', fontSize: '2.2mm', alignItems: 'flex-start', paddingTop: '0.6mm' }}>{it?.fixtures || ''}</Cell>
                    <Cell w="36%" last style={{ border: 'none', fontSize: '2.2mm', alignItems: 'flex-start', paddingTop: '0.6mm' }}>{it?.tcPosition || ''}</Cell>
                    <Cell w="32%" last style={{ border: 'none', fontSize: '2.2mm', alignItems: 'flex-start', paddingTop: '0.6mm' }}>{it?.instruction || ''}</Cell>
                  </div>
                );
              })}
            </div>

            <div style={{ flexShrink: 0, height: '6.6mm', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: B, fontWeight: 700, fontSize: '2.5mm' }}>
              CYCLE PARAMETERS
            </div>
            <div style={{ flexShrink: 0, height: '7mm', display: 'flex', alignItems: 'center', borderBottom: B, paddingLeft: '1mm', fontWeight: 700, fontSize: '2.3mm' }}>
              Type Of Hardening:- <span style={{ fontWeight: 400, marginLeft: '1mm' }}>{row.hardeningType || row.tempProfile || ''}</span>
            </div>
            <div style={{ flexShrink: 0, height: '7mm', display: 'flex', alignItems: 'center', borderBottom: B, paddingLeft: '1mm', fontWeight: 700, fontSize: '2.3mm' }}>
              Quenching Pressure:- <span style={{ fontWeight: 400, marginLeft: '1mm' }}>{row.quenchPressureBar != null ? `${row.quenchPressureBar} bar` : ''}</span>
            </div>
            <div style={{ flexShrink: 0, height: '7mm', display: 'flex', alignItems: 'center', paddingLeft: '1mm', fontWeight: 700, fontSize: '2.3mm' }}>
              Fan Speed in :- <span style={{ fontWeight: 400, marginLeft: '1mm' }}>{row.fanRpm != null ? `${row.fanRpm} RPM` : ''}</span>
            </div>

            <div style={{ flex: 1, minHeight: '30mm', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderTop: B }}>
              <div style={{ fontWeight: 700, fontSize: '2.5mm', textAlign: 'center', padding: '1mm 0 0.5mm', flexShrink: 0 }}>GRAPH</div>
              <div style={{ flex: 1, minHeight: 0, padding: '0 1mm 1mm' }}>
                <HeatCycleStepGraph segments={graph} stroke="#000" viewW={280} viewH={320} />
              </div>
            </div>
          </div>
        </div>

        {/* ================= FOOTER ================= */}
        <div style={{ ...flex, flexShrink: 0, height: '7mm', alignItems: 'center', fontWeight: 700, fontSize: '2.4mm' }}>
          <span style={{ width: '14%', paddingLeft: '1mm' }}>QF/PD/02</span>
          <span style={{ width: '24%' }}>REV. NO:- {row.docRevNo || '01'}</span>
          <span style={{ width: '34%' }}>EFFECTIVE DATE: {row.docEffectiveDate ? formatDate(row.docEffectiveDate) : '01/08/2021'}</span>
          <span style={{ width: '28%', textAlign: 'right', paddingRight: '2mm' }}>PAGE {row.docPageOf || '1 OF 2'}</span>
        </div>
      </div>
    </div>
  );
}
