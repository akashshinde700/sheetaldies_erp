import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';

function asArrayJson(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return []; }
  }
  return [];
}

function num(v) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function computeHardnessDecision({ requiredMin, requiredMax, achievedMin, achievedMax }) {
  if (requiredMin == null || requiredMax == null || achievedMin == null || achievedMax == null) return 'NA';
  if (achievedMax < requiredMin) return 'FAIL';
  if (achievedMin > requiredMax) return 'FAIL';
  if (achievedMin >= requiredMin && achievedMax <= requiredMax) return 'PASS';
  return 'CONDITIONAL';
}

function TempCycleGraph({ points }) {
  const pts = points
    .map(p => ({ x: num(p.time), y: num(p.temp) }))
    .filter(p => p.x != null && p.y != null)
    .sort((a, b) => a.x - b.x);

  if (pts.length < 2) return <div className="text-[10px] text-slate-500">No graph data.</div>;

  const w = 760;
  const h = 200;
  const pad = 26;
  const minX = Math.min(...pts.map(p => p.x));
  const maxX = Math.max(...pts.map(p => p.x));
  const minY = Math.min(...pts.map(p => p.y), 0);
  const maxY = Math.max(...pts.map(p => p.y));
  const sx = (x) => pad + ((x - minX) / (maxX - minX || 1)) * (w - pad * 2);
  const sy = (y) => h - pad - ((y - minY) / (maxY - minY || 1)) * (h - pad * 2);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(2)} ${sy(p.y).toFixed(2)}`).join(' ');

  const gridLines = 4;
  const yLines = Array.from({ length: gridLines + 1 }, (_, i) => i);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[180px]">
      <rect x="0" y="0" width={w} height={h} fill="white" />
      {/* grid */}
      {yLines.map(i => {
        const y = pad + (i * (h - pad * 2)) / gridLines;
        return <line key={i} x1={pad} x2={w - pad} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
      })}
      <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="#94a3b8" strokeWidth="1.2" />
      <line x1={pad} x2={pad} y1={pad} y2={h - pad} stroke="#94a3b8" strokeWidth="1.2" />
      {/* path */}
      <path d={d} fill="none" stroke="#111827" strokeWidth="2" />
      {pts.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="3.2" fill="#111827" />
      ))}
    </svg>
  );
}

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
    const tempPoints = asArrayJson(cert?.effectiveTempCycleData ?? cert?.tempCycleData);

    const jobInspection = cert?.jobCard?.inspection;
    const requiredMin = num(jobInspection?.requiredHardnessMin ?? cert?.hardnessMin);
    const requiredMax = num(jobInspection?.requiredHardnessMax ?? cert?.hardnessMax);

    const achievedMain = num(jobInspection?.achievedHardness);
    const afterReadings = [
      num(jobInspection?.hardnessAfter1),
      num(jobInspection?.hardnessAfter2),
      num(jobInspection?.hardnessAfter3),
      num(jobInspection?.hardnessAfter4),
    ].filter(v => v != null);

    const achievedVals = [achievedMain, ...afterReadings].filter(v => v != null);
    const achievedMin = achievedVals.length ? Math.min(...achievedVals) : null;
    const achievedMax = achievedVals.length ? Math.max(...achievedVals) : null;

    const decision = computeHardnessDecision({ requiredMin, requiredMax, achievedMin, achievedMax });

    return { tempPoints, requiredMin, requiredMax, achievedMin, achievedMax, decision };
  }, [cert]);

  if (loading) return <div className="text-slate-400">Loading…</div>;
  if (error || !cert) return (
    <div className="space-y-2">
      <p className="text-slate-500 text-sm">{error || 'Certificate not found.'}</p>
      <Link to="/quality/certificates" className="text-indigo-600 text-sm hover:underline">← Back</Link>
    </div>
  );

  const customer = cert.customer || cert.jobCard?.customer;
  const companyName = 'SHITAL VACUUM TREAT PVT LTD.';
  const companyAddr = 'Plot No.84/1, Sector No.10, PCNTDA, Bhosari, Pune';
  const companyEmail = 'info@shitalgroup.com';

  const totalQty = (cert.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const totalWt = (cert.items || []).reduce((s, it) => s + (num(it.totalWeight) || 0), 0);

  const decisionBadge =
    derived.decision === 'PASS' ? 'PASS' :
    derived.decision === 'FAIL' ? 'FAIL' :
    derived.decision === 'CONDITIONAL' ? 'CONDITIONAL' : '—';

  const dispatch = cert.jobCard || {};
  const dispatchModeLine = [
    dispatch.dispatchByOurVehicle ? 'By Our Vehicle' : null,
    dispatch.dispatchByCourier ? 'By Courier' : null,
    dispatch.collectedByCustomer ? 'Collected by Customer' : null,
  ].filter(Boolean).join(' / ') || (cert.dispatchMode || '—');

  const hardnessText = (v) => v == null ? '—' : String(v);
  const unit = cert.hardnessUnit || cert.jobCard?.inspection?.hardnessUnit || 'HRC';

  return (
    <div className="bg-slate-100 py-6 print:bg-white print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page { box-shadow: none !important; margin: 0 !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print max-w-[900px] mx-auto mb-3 flex items-center gap-2">
        <Link to={`/quality/certificates/${id}`} className="btn-ghost">← Back</Link>
        <button className="btn-primary ml-auto" type="button" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <div className="page max-w-[900px] mx-auto bg-white shadow-lg border border-slate-200">
        <div className="p-6">
          {/* Header */}
          <div className="grid grid-cols-3 items-start gap-4">
            <div className="text-xs">
              <div className="font-extrabold text-sm">{companyName}</div>
              <div className="text-slate-700">{companyAddr}</div>
              <div className="text-slate-700">{companyEmail}</div>
            </div>
            <div className="text-center">
              <div className="font-extrabold text-xl tracking-wide">TEST CERTIFICATE</div>
              <div className="text-[11px] text-slate-500 mt-1">Heat Treatment Test Certificate</div>
            </div>
            <div className="text-xs text-right">
              <div><span className="text-slate-500">Certificate No:</span> <span className="font-mono font-bold">{cert.certNo}</span></div>
              <div><span className="text-slate-500">Job Card No:</span> <span className="font-mono">{cert.jobCard?.jobCardNo || '—'}</span></div>
              <div><span className="text-slate-500">Your PO No:</span> <span className="font-mono">{cert.yourPoNo || '—'}</span></div>
              <div><span className="text-slate-500">Your DC No:</span> <span className="font-mono">{cert.yourRefNo || '—'}</span></div>
              <div><span className="text-slate-500">Issue Date:</span> <span className="font-mono">{new Date(cert.issueDate).toLocaleDateString('en-IN')}</span></div>
              <div><span className="text-slate-500">Issue By:</span> <span className="font-mono">{cert.checkedBy || cert.createdBy?.name || '—'}</span></div>
            </div>
          </div>

          <div className="mt-4 border border-slate-900">
            {/* Customer + Dispatch */}
            <div className="grid grid-cols-2 border-b border-slate-900">
              <div className="p-3 text-xs border-r border-slate-900">
                <div className="font-bold">Customer's:</div>
                <div className="font-extrabold">{customer?.name || '—'}</div>
                <div className="text-[11px]">{customer?.address || '—'}</div>
              </div>
              <div className="p-3 text-xs">
                <div className="font-bold">DISPATCH MODE:</div>
                <div className="text-[11px]">{dispatchModeLine}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="font-bold">Material:</span> {cert.dieMaterial || cert.jobCard?.dieMaterial || '—'}</div>
                  <div><span className="font-bold">Heat Treatment:</span> {cert.operatorMode || '—'}</div>
                  <div><span className="font-bold">HRC:</span> {hardnessText(derived.requiredMin)}–{hardnessText(derived.requiredMax)} {unit}</div>
                  <div><span className="font-bold">Result:</span> <span className="font-extrabold">{decisionBadge}</span></div>
                </div>
              </div>
            </div>

            {/* Items + Special instruction */}
            <div className="grid grid-cols-[1fr_240px] border-b border-slate-900">
              <div className="border-r border-slate-900">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-900">
                      <th className="p-2 text-left w-10">Item</th>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-center w-28">Quantity (Pcs)</th>
                      <th className="p-2 text-center w-28">Weight (Kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cert.items || []).map((it, i) => (
                      <tr key={it.id} className="border-b border-slate-200">
                        <td className="p-2 font-mono">{i + 1}</td>
                        <td className="p-2 whitespace-pre-wrap">{it.description}</td>
                        <td className="p-2 text-center font-mono">{it.quantity}</td>
                        <td className="p-2 text-center font-mono">{num(it.totalWeight) != null ? num(it.totalWeight).toFixed(3) : '—'}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="p-2 font-bold" colSpan={2}>Total</td>
                      <td className="p-2 text-center font-bold font-mono">{totalQty}</td>
                      <td className="p-2 text-center font-bold font-mono">{totalWt ? totalWt.toFixed(3) : '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="p-2 text-xs">
                <div className="font-bold border-b border-slate-900 pb-1 mb-2">Special Instruction</div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span>CERTIFICATE</span><span>{cert.specInstrCertificate ? '✓' : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>MPI REPORT</span><span>{cert.specInstrMpiReport ? '✓' : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>PROCESS GRAPH</span><span>{cert.specInstrProcessGraph ? '✓' : '—'}</span>
                  </div>
                </div>
                <div className="mt-3 text-[11px]">
                  <div className="font-bold">Remarks</div>
                  <div className="min-h-[80px] border border-slate-300 mt-1 p-1">{cert.specialRequirements || '—'}</div>
                </div>
              </div>
            </div>

            {/* Final inspection + graph */}
            <div className="p-3">
              <div className="grid grid-cols-[260px_1fr_220px] gap-3 items-start">
                <div className="text-xs">
                  <div className="font-bold mb-1">FINAL INSPECTION</div>
                  <div className="grid grid-cols-2 gap-x-2 text-[11px]">
                    <div>Normal</div><div>{cert.catNormal ? '✓' : '—'}</div>
                    <div>Welded</div><div>{cert.catWelded ? '✓' : '—'}</div>
                    <div>Crack/Crack Risk</div><div>{cert.catCrackRisk ? '✓' : '—'}</div>
                    <div>Distortion Risk</div><div>{cert.catDistortionRisk ? '✓' : '—'}</div>
                    <div>Critical Finishing</div><div>{cert.catCriticalFinishing ? '✓' : '—'}</div>
                    <div>Dent/Damage</div><div>{cert.catDentDamage ? '✓' : '—'}</div>
                    <div>Rusty</div><div>{cert.catRusty ? '✓' : '—'}</div>
                    <div>Others</div><div>{cert.catOthers ? '✓' : '—'}</div>
                  </div>
                </div>

                <div className="text-xs">
                  <div className="font-bold mb-1">HEAT TREATMENT PROCESS</div>
                  <div className="border border-slate-900 p-2">
                    <TempCycleGraph points={derived.tempPoints} />
                    {cert.graphSource === 'vht_runsheet' && cert.graphFromRunsheet?.runsheetNumber && (
                      <div className="text-[9px] text-slate-600 mt-1">
                        Curve from VHT Run Sheet <span className="font-mono font-semibold">{cert.graphFromRunsheet.runsheetNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                      <span>TIME (MINUTE) →</span>
                      <span>TEMP (°C)</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs">
                  <div className="border border-slate-900">
                    <div className="border-b border-slate-900 p-2">
                      <div className="font-bold text-[11px]">REQUIRE HARDNESS</div>
                      <div className="font-mono font-extrabold">{hardnessText(derived.requiredMin)}–{hardnessText(derived.requiredMax)} {unit}</div>
                    </div>
                    <div className="border-b border-slate-900 p-2">
                      <div className="font-bold text-[11px]">ACHIEVED HARDNESS</div>
                      <div className="font-mono font-extrabold">{hardnessText(derived.achievedMin)}–{hardnessText(derived.achievedMax)} {unit}</div>
                    </div>
                    <div className="p-2 min-h-[64px]">
                      <div className="font-bold text-[11px]">APPROVED BY</div>
                      <div className="text-[11px]">{cert.approvedBy || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[cert.image1, cert.image2, cert.image3].filter(Boolean).slice(0, 3).map((img, i) => (
                  <div key={i} className="border border-slate-900 h-[120px] flex items-center justify-center overflow-hidden">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {([cert.image1, cert.image2, cert.image3].filter(Boolean).length === 0) && (
                  <div className="col-span-3 text-[10px] text-slate-500">No job images attached.</div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-3 text-[10px] text-slate-600 flex justify-between">
            <div>Document: QF-QA-04 · Effective Date: 01/04/2019</div>
            <div>Revision: 00 · Page: 1 of 1</div>
          </div>
        </div>
      </div>
    </div>
  );
}

