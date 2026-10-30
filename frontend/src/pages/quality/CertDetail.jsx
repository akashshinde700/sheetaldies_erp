import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Printer, ReceiptText, FileText, AlertCircle, LineChart, Images,
} from 'lucide-react';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_VARIANT = {
  DRAFT:    'neutral',
  ISSUED:   'info',
  APPROVED: 'success',
};

const RESULT_COLOR = {
  OK:       'text-emerald-700 font-bold',
  'NOT OK': 'text-rose-600 font-bold',
  NA:       'text-slate-400',
  PASS:     'text-emerald-700 font-bold',
  FAIL:     'text-rose-600 font-bold',
};

const Def = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
    <div className="text-sm font-semibold text-slate-800 break-words">{children}</div>
  </div>
);

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
    <div className="page-stack w-full space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
  if (error || !cert) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="h-9 w-9 text-slate-300" />
      <p className="text-slate-400 text-sm">{error || 'Certificate not found.'}</p>
      <Button variant="outline" size="sm" asChild>
        <Link to="/quality/certificates">
          <ArrowLeft /> Back to Certificates
        </Link>
      </Button>
    </div>
  );

  const rawCycle = cert.effectiveTempCycleData ?? cert.tempCycleData;
  const tempData = rawCycle
    ? (typeof rawCycle === 'string' ? JSON.parse(rawCycle) : rawCycle)
    : [];

  const images = [cert.image1, cert.image2, cert.image3, cert.image4, cert.image5].filter(Boolean);

  return (
    <div className="page-stack w-full space-y-4 animate-slide-up">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="icon-sm" asChild
            className="text-slate-400 hover:text-sky-700 border border-slate-200 bg-white shrink-0 mt-0.5">
            <Link to="/quality/certificates" title="Back to certificates" aria-label="Back to certificates">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title font-mono">{cert.certNo}</h1>
              <Badge variant={STATUS_VARIANT[cert.status] || 'neutral'} className="px-2 py-0.5 text-[10px]">
                {cert.status}
              </Badge>
            </div>
            <p className="page-subtitle">Test Certificate • {formatDate(cert.issueDate)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button variant="outline" asChild>
            <Link to={`/quality/certificates/${id}/print`}>
              <Printer /> Print / PDF
            </Link>
          </Button>
          <Button variant="outline" asChild
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400">
            <Link
              to={cert.jobCardId
                ? `/invoices/new?jobCardId=${cert.jobCardId}`
                : `/invoices/new?customerId=${cert.customerId}`}
            >
              <ReceiptText /> Create Invoice
            </Link>
          </Button>
          {cert.jobCardId && (
            <Button variant="outline" asChild
              className="border-sky-200 text-sky-700 hover:bg-sky-50 hover:border-sky-300">
              <Link to={`/jobcards/${cert.jobCardId}`}>
                <FileText /> Job Card
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Customer + Issued By */}
      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Customer</p>
            <p className="text-sm font-bold text-slate-800">{cert.customer?.name || '—'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{cert.customer?.address}</p>
            {cert.customer?.gstin && <p className="text-xs font-mono text-slate-400 mt-0.5">GSTIN: {cert.customer.gstin}</p>}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Issued By</p>
            <p className="text-sm font-bold text-slate-800">{cert.issuedByParty?.name || '—'}</p>
            {cert.issuedByParty?.gstin && <p className="text-xs font-mono text-slate-400 mt-0.5">GSTIN: {cert.issuedByParty.gstin}</p>}
          </div>
          <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-3 grid grid-cols-2 md:grid-cols-3 gap-4">
            {cert.jobCard?.jobCardNo && (
              <Def label="Job Card">
                <Link to={`/jobcards/${cert.jobCardId}`} className="text-sky-700 hover:text-sky-900 hover:underline">{cert.jobCard.jobCardNo}</Link>
              </Def>
            )}
            {cert.yourPoNo    && <Def label="Your PO No">{cert.yourPoNo}</Def>}
            {cert.yourRefNo   && <Def label="Your Ref No">{cert.yourRefNo}</Def>}
            {cert.dieMaterial && <Def label="Die Material">{cert.dieMaterial}</Def>}
            {cert.operatorMode && <Def label="Operator Mode">{cert.operatorMode}</Def>}
            {cert.packedQty   && <Def label="Packed Qty">{cert.packedQty}</Def>}
            {cert.packedBy    && <Def label="Packed By">{cert.packedBy}</Def>}
            {cert.approvedBy  && <Def label="Approved By">{cert.approvedBy}</Def>}
            {cert.issuedTo    && <Def label="Issued To">{cert.issuedTo}</Def>}
            {cert.heatNo      && <Def label="Cycle No"><span className="font-mono">{cert.heatNo}</span></Def>}
            {(() => {
              const jc = cert.jobCard || {};
              const byVehicle   = jc.dispatchByOurVehicle  || (cert.dispatchedThrough || '').includes('Our Vehicle');
              const byCourier   = jc.dispatchByCourier      || (cert.dispatchedThrough || '').includes('Courier');
              const collected   = jc.collectedByCustomer    || (cert.dispatchedThrough || '').includes('Collected');
              if (!byVehicle && !byCourier && !collected && !cert.dispatchedThrough) return null;
              return (
                <div className="col-span-2 md:col-span-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dispatch Mode</p>
                  <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-800">
                    {byVehicle && <span>☑ By Our Vehicle</span>}
                    {byCourier && <span>☑ By Courier</span>}
                    {collected && <span>☑ Collected by Customer</span>}
                  </div>
                </div>
              );
            })()}
            {cert.dispatchChallanNo   && <Def label="Dispatch Challan No"><span className="font-mono">{cert.dispatchChallanNo}</span></Def>}
            {cert.dispatchChallanDate && <Def label="Dispatch Challan Date">{formatDate(cert.dispatchChallanDate)}</Def>}
          </div>
        </CardContent>
      </Card>

      {/* Categorization & Process */}
      {(() => {
        const cats = [
          ['catNormal',            'Normal'],
          ['catCrackRisk',         'Crack Risk'],
          ['catDistortionRisk',    'Distortion Risk'],
          ['catCriticalFinishing', 'Critical Finishing'],
          ['catDentDamage',        'Dent / Damage'],
          ['catCavity',            'Cavity'],
          ['catOthers',            'Others'],
        ].filter(([k]) => cert[k]);
        const procs = [
          ['procStressRelieving', 'Stress Relieving'],
          ['procHardening',       'Hardening'],
          ['procTempering',       'Tempering'],
          ['procAnnealing',       'Annealing'],
          ['procBrazing',         'Brazing'],
          ['procPlasmaNitriding', 'Plasma Nitriding'],
          ['procSubZero',         'Sub Zero'],
          ['procSoakClean',       'Soak Clean'],
        ].filter(([k]) => cert[k]);
        if (!cats.length && !procs.length) return null;
        return (
          <Card>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {cats.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Categorization</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cats.map(([, label]) => (
                      <Badge key={label} className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold">{label}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {procs.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Process</p>
                  <div className="flex flex-wrap gap-1.5">
                    {procs.map(([, label]) => (
                      <Badge key={label} className="bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 text-[11px] font-semibold">{label}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Special Instructions / Delivery / Requirements / Precautions */}
      {(cert.specInstrCertificate || cert.specInstrMpiReport || cert.specInstrProcessGraph ||
        cert.deliveryDate || cert.specialRequirements || cert.precautions) && (
        <Card>
          <CardContent className="space-y-4">
            {(cert.specInstrCertificate || cert.specInstrMpiReport || cert.specInstrProcessGraph) && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Special Instructions</p>
                <div className="flex flex-wrap gap-1.5">
                  {cert.specInstrCertificate  && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold">☑ Certificate</Badge>}
                  {cert.specInstrMpiReport    && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold">☑ MPI Report</Badge>}
                  {cert.specInstrProcessGraph && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold">☑ Process Graph</Badge>}
                </div>
              </div>
            )}
            {cert.deliveryDate && (
              <Def label="Delivery Date">{formatDate(cert.deliveryDate)}</Def>
            )}
            {cert.specialRequirements && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Special Requirements</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{cert.specialRequirements}</p>
              </div>
            )}
            {cert.precautions && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Precautions</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{cert.precautions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hardness */}
      {(cert.hardnessMin || cert.hardnessMax) && (
        <Card>
          <CardHeader>
            <CardTitle>Hardness Requirement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="text-center bg-sky-50 rounded-xl px-6 py-3">
                <p className="text-[10px] text-sky-400 uppercase font-bold tracking-wider">Min</p>
                <p className="text-2xl font-extrabold text-sky-800 tabular-nums">{cert.hardnessMin ?? '—'}</p>
                <p className="text-xs text-sky-500">{cert.hardnessUnit}</p>
              </div>
              <span className="text-slate-300 text-2xl">—</span>
              <div className="text-center bg-sky-50 rounded-xl px-6 py-3">
                <p className="text-[10px] text-sky-400 uppercase font-bold tracking-wider">Max</p>
                <p className="text-2xl font-extrabold text-sky-800 tabular-nums">{cert.hardnessMax ?? '—'}</p>
                <p className="text-xs text-sky-500">{cert.hardnessUnit}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      {cert.items?.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Items / Parts</CardTitle>
          </CardHeader>
          <div className="table-responsive">
            <table className="w-full text-left min-w-[460px]">
              <thead>
                <tr>
                  <th className="th">#</th>
                  <th className="th">Description</th>
                  <th className="th text-right">Qty</th>
                  <th className="th text-right">Wt/Pc (kg)</th>
                  <th className="th text-right">Total Wt (kg)</th>
                  <th className="th">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {cert.items.map((it, i) => (
                  <tr key={it.id} className="tr">
                    <td className="td text-slate-400 font-mono">{i+1}</td>
                    <td className="td font-medium text-slate-800">{it.description}</td>
                    <td className="td text-slate-700 text-right tabular-nums">{it.quantity}</td>
                    <td className="td text-slate-600 text-right tabular-nums">{it.weightPerPc ?? '—'}</td>
                    <td className="td font-semibold text-slate-700 text-right tabular-nums">{it.totalWeight ?? '—'}</td>
                    <td className="td text-slate-500">{it.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Distortion Before/After */}
      {(cert.distortionBefore || cert.distortionAfter) && (() => {
        const parse = v => {
          if (!v) return [];
          const arr = typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch { return []; } })() : (Array.isArray(v) ? v : []);
          return arr.map(x => x != null && typeof x === 'object' ? (x.val ?? x.value ?? '') : x);
        };
        const before = parse(cert.distortionBefore);
        const after  = parse(cert.distortionAfter);
        const len = Math.max(before.length, after.length);
        if (!len) return null;
        return (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Distortion Measurement</CardTitle>
            </CardHeader>
            <div className="table-responsive">
              <table className="w-full text-left min-w-[380px]">
                <thead>
                  <tr>
                    <th className="th">Point</th>
                    <th className="th text-right">Before HT (mm)</th>
                    <th className="th text-right">After HT (mm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/80">
                  {Array.from({ length: len }, (_, i) => (
                    <tr key={i} className="tr">
                      <td className="td text-slate-400 font-mono">{i + 1}</td>
                      <td className="td text-slate-700 text-right tabular-nums">{before[i] ?? '—'}</td>
                      <td className="td text-slate-700 text-right tabular-nums">{after[i]  ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })()}

      {/* Inspection Results */}
      {cert.inspectionResults?.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Inspection Results</CardTitle>
          </CardHeader>
          <div className="table-responsive">
            <table className="w-full text-left min-w-[520px]">
              <thead>
                <tr>
                  {['Type', 'Parameter', 'Required', 'Achieved', 'Result', 'Final Inspection'].map(h => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {cert.inspectionResults.map((ir) => (
                  <tr key={ir.id} className="tr">
                    <td className="td font-medium text-slate-700">{ir.inspectionType}</td>
                    <td className="td text-slate-600">{ir.parameter || '—'}</td>
                    <td className="td text-slate-600">{ir.requiredValue || '—'}</td>
                    <td className="td font-semibold text-slate-800">{ir.achievedValue || '—'}</td>
                    <td className={`td ${RESULT_COLOR[ir.result] || 'text-slate-600'}`}>{ir.result}</td>
                    <td className="td text-slate-500">{ir.finalInspection || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Temperature Cycle Data */}
      {tempData.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="flex-row flex-wrap items-center gap-2 space-y-0">
            <div className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
              <LineChart className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <CardTitle>Temperature Cycle Data</CardTitle>
            {cert.graphSource === 'vht_runsheet' && cert.graphFromRunsheet?.runsheetNumber && (
              <span className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                From VHT Run Sheet {cert.graphFromRunsheet.runsheetNumber}
                {cert.graphFromRunsheet?.id ? (
                  <>
                    {' '}
                    <Link
                      to={`/manufacturing/runsheet/${cert.graphFromRunsheet.id}`}
                      className="underline text-sky-600"
                    >
                      Open
                    </Link>
                  </>
                ) : null}
              </span>
            )}
          </CardHeader>
          <div className="table-responsive">
            <table className="w-full text-left">
              <thead>
                <tr>
                  {tempData[0] && Object.keys(tempData[0]).map(k => (
                    <th key={k} className="th capitalize">
                      {k.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {tempData.map((row, i) => (
                  <tr key={i} className="tr">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="td text-slate-700 tabular-nums">{v ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Images */}
      {images.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <div className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
              <Images className="h-3.5 w-3.5 text-violet-500" />
            </div>
            <CardTitle>Inspection Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {images.map((img, i) => (
                <a key={i} href={img} target="_blank" rel="noreferrer"
                  className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 hover:shadow-md hover:border-sky-200 transition-all">
                  <img src={img} alt={`Image ${i+1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-[11px] text-slate-400 text-right pb-2">
        Created by {cert.createdBy?.name} · {formatDate(cert.createdAt, true)}
      </p>
    </div>
  );
}
