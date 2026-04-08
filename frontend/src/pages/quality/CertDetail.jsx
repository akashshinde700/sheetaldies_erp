import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';

const STATUS_COLOR = {
  DRAFT:    'bg-slate-100 text-slate-600',
  ISSUED:   'bg-indigo-100 text-indigo-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
};

const RESULT_COLOR = {
  OK:       'text-emerald-700 font-bold',
  'NOT OK': 'text-rose-600 font-bold',
  NA:       'text-slate-400',
  PASS:     'text-emerald-700 font-bold',
  FAIL:     'text-rose-600 font-bold',
};

export default function CertDetail() {
  const { id }    = useParams();
  const [cert,    setCert]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    api.get(`/quality/certificates/${id}`)
      .then(r => setCert(r.data.data))
      .catch(() => setError('Certificate not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="max-w-3xl space-y-4 animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-64" />
      <div className="h-40 bg-slate-100 rounded-xl" />
      <div className="h-32 bg-slate-100 rounded-xl" />
    </div>
  );
  if (error || !cert) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <span className="material-symbols-outlined text-4xl text-slate-300">error</span>
      <p className="text-slate-400 text-sm">{error || 'Certificate not found.'}</p>
      <Link to="/quality/certificates" className="text-indigo-600 text-sm hover:underline">← Back to Certificates</Link>
    </div>
  );

  const rawCycle = cert.effectiveTempCycleData ?? cert.tempCycleData;
  const tempData = rawCycle
    ? (typeof rawCycle === 'string' ? JSON.parse(rawCycle) : rawCycle)
    : [];

  const images = [cert.image1, cert.image2, cert.image3, cert.image4, cert.image5].filter(Boolean);

  return (
    <div className="max-w-3xl space-y-4 animate-slide-up">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/quality/certificates"
          className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-slate-800 font-headline font-mono">{cert.certNo}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Test Certificate — {new Date(cert.issueDate).toLocaleDateString('en-IN')}
          </p>
        </div>
        <Link to={`/quality/certificates/${id}/print`} className="btn-outline">
          <span className="material-symbols-outlined text-sm">print</span> Print / PDF
        </Link>
        <span className={`badge ${STATUS_COLOR[cert.status] || STATUS_COLOR.DRAFT}`}>{cert.status}</span>
      </div>

      {/* Customer + Issued By */}
      <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Customer</p>
          <p className="font-bold text-slate-800">{cert.customer?.name || '—'}</p>
          <p className="text-xs text-slate-500 mt-0.5">{cert.customer?.address}</p>
          {cert.customer?.gstin && <p className="text-xs font-mono text-slate-400 mt-0.5">GSTIN: {cert.customer.gstin}</p>}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Issued By</p>
          <p className="font-bold text-slate-800">{cert.issuedByParty?.name || '—'}</p>
          {cert.issuedByParty?.gstin && <p className="text-xs font-mono text-slate-400 mt-0.5">GSTIN: {cert.issuedByParty.gstin}</p>}
        </div>
        <div className="col-span-2 border-t border-slate-100 pt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {cert.jobCard?.jobCardNo && (
            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Job Card</span>
              <Link to={`/jobcards/${cert.jobCardId}`} className="font-semibold text-indigo-600 hover:underline">{cert.jobCard.jobCardNo}</Link>
            </div>
          )}
          {cert.yourPoNo   && <div><span className="text-xs text-slate-400 block mb-0.5">Your PO No</span><span className="font-semibold">{cert.yourPoNo}</span></div>}
          {cert.yourRefNo  && <div><span className="text-xs text-slate-400 block mb-0.5">Your Ref No</span><span className="font-semibold">{cert.yourRefNo}</span></div>}
          {cert.dieMaterial && <div><span className="text-xs text-slate-400 block mb-0.5">Die Material</span><span className="font-semibold">{cert.dieMaterial}</span></div>}
          {cert.operatorMode && <div><span className="text-xs text-slate-400 block mb-0.5">Operator Mode</span><span className="font-semibold">{cert.operatorMode}</span></div>}
          {cert.packedQty          && <div><span className="text-xs text-slate-400 block mb-0.5">Packed Qty</span><span className="font-semibold">{cert.packedQty}</span></div>}
          {cert.packedBy           && <div><span className="text-xs text-slate-400 block mb-0.5">Packed By</span><span className="font-semibold">{cert.packedBy}</span></div>}
          {cert.approvedBy         && <div><span className="text-xs text-slate-400 block mb-0.5">Approved By</span><span className="font-semibold">{cert.approvedBy}</span></div>}
          {cert.issuedTo           && <div><span className="text-xs text-slate-400 block mb-0.5">Issued To</span><span className="font-semibold">{cert.issuedTo}</span></div>}
          {cert.heatNo             && <div><span className="text-xs text-slate-400 block mb-0.5">Heat No</span><span className="font-semibold font-mono">{cert.heatNo}</span></div>}
          {cert.dispatchMode       && <div><span className="text-xs text-slate-400 block mb-0.5">Dispatch Mode</span><span className="font-semibold">{cert.dispatchMode}</span></div>}
          {cert.dispatchChallanNo  && <div><span className="text-xs text-slate-400 block mb-0.5">Dispatch Challan No</span><span className="font-semibold font-mono">{cert.dispatchChallanNo}</span></div>}
          {cert.dispatchChallanDate && <div><span className="text-xs text-slate-400 block mb-0.5">Dispatch Challan Date</span><span className="font-semibold">{new Date(cert.dispatchChallanDate).toLocaleDateString('en-IN')}</span></div>}
          {cert.dispatchedThrough  && <div><span className="text-xs text-slate-400 block mb-0.5">Dispatched Through</span><span className="font-semibold">{cert.dispatchedThrough}</span></div>}
        </div>
      </div>

      {/* Hardness */}
      {(cert.hardnessMin || cert.hardnessMax) && (
        <div className="card p-5">
          <p className="section-title border-b border-slate-100 pb-2 mb-4">Hardness Requirement</p>
          <div className="flex items-center gap-6">
            <div className="text-center bg-indigo-50 rounded-xl px-6 py-3">
              <p className="text-[10px] text-indigo-400 uppercase font-bold">Min</p>
              <p className="text-2xl font-extrabold text-indigo-800">{cert.hardnessMin ?? '—'}</p>
              <p className="text-xs text-indigo-500">{cert.hardnessUnit}</p>
            </div>
            <span className="text-slate-300 text-2xl">—</span>
            <div className="text-center bg-indigo-50 rounded-xl px-6 py-3">
              <p className="text-[10px] text-indigo-400 uppercase font-bold">Max</p>
              <p className="text-2xl font-extrabold text-indigo-800">{cert.hardnessMax ?? '—'}</p>
              <p className="text-xs text-indigo-500">{cert.hardnessUnit}</p>
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      {cert.items?.length > 0 && (
        <div className="card p-5">
          <p className="section-title border-b border-slate-100 pb-2 mb-4">Items / Parts</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                {['#', 'Description', 'Qty', 'Wt/Pc (kg)', 'Total Wt (kg)', 'Remarks'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {cert.items.map((it, i) => (
                <tr key={it.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-2.5 text-slate-400 font-mono">{i+1}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-800">{it.description}</td>
                  <td className="px-3 py-2.5 text-slate-700">{it.quantity}</td>
                  <td className="px-3 py-2.5 text-slate-600">{it.weightPerPc ?? '—'}</td>
                  <td className="px-3 py-2.5 font-semibold text-slate-700">{it.totalWeight ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{it.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspection Results */}
      {cert.inspectionResults?.length > 0 && (
        <div className="card p-5">
          <p className="section-title border-b border-slate-100 pb-2 mb-4">Inspection Results</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                {['Type', 'Parameter', 'Required', 'Achieved', 'Result', 'Final Inspection'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {cert.inspectionResults.map((ir, i) => (
                <tr key={ir.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-2.5 font-medium text-slate-700">{ir.inspectionType}</td>
                  <td className="px-3 py-2.5 text-slate-600">{ir.parameter || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{ir.requiredValue || '—'}</td>
                  <td className="px-3 py-2.5 font-semibold text-slate-800">{ir.achievedValue || '—'}</td>
                  <td className={`px-3 py-2.5 ${RESULT_COLOR[ir.result] || 'text-slate-600'}`}>{ir.result}</td>
                  <td className="px-3 py-2.5 text-slate-500">{ir.finalInspection || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Temperature Cycle Data */}
      {tempData.length > 0 && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-orange-500 text-[14px]">show_chart</span>
            </div>
            <p className="section-title">Temperature Cycle Data</p>
            {cert.graphSource === 'vht_runsheet' && cert.graphFromRunsheet?.runsheetNumber && (
              <span className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                From VHT Run Sheet {cert.graphFromRunsheet.runsheetNumber}
                {cert.graphFromRunsheet?.id ? (
                  <>
                    {' '}
                    <Link
                      to={`/manufacturing/runsheet/${cert.graphFromRunsheet.id}`}
                      className="underline text-indigo-600"
                    >
                      Open
                    </Link>
                  </>
                ) : null}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-orange-50/30 border-b border-slate-100">
                  {tempData[0] && Object.keys(tempData[0]).map(k => (
                    <th key={k} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left capitalize">
                      {k.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {tempData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-3 py-2.5 text-slate-700">{v ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Images */}
      {images.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-violet-500 text-[14px]">photo_library</span>
            </div>
            <p className="section-title">Inspection Images</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {images.map((img, i) => (
              <a key={i} href={img} target="_blank" rel="noreferrer"
                className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 hover:shadow-md hover:border-indigo-200 transition-all">
                <img src={img} alt={`Image ${i+1}`} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-400 text-right pb-2">
        Created by {cert.createdBy?.name} · {new Date(cert.createdAt).toLocaleString('en-IN')}
      </p>
    </div>
  );
}
