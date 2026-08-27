import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Printer, Pencil, ClipboardCheck, BadgeCheck } from 'lucide-react';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import { PageHeader } from '@/components/ui/page-header';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const API_BASE = import.meta.env.VITE_API_URL || '';

/** Read-only definition row. Renders nothing when the value is empty. */
function Row({ label, value, mono, span, always }) {
  const empty = value == null || value === '' || value === '—';
  if (empty && !always) return null;
  return (
    <div className={span ? 'sm:col-span-2 lg:col-span-3' : ''}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-sm text-slate-800 ${mono ? 'font-app-mono' : ''} ${empty ? 'text-slate-400' : ''}`}>
        {empty ? '—' : value}
      </dd>
    </div>
  );
}

function Section({ title, children, cols = 3 }) {
  const grid = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' }[cols] || 'sm:grid-cols-2 lg:grid-cols-3';
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <dl className={`grid grid-cols-1 gap-x-6 gap-y-4 ${grid}`}>{children}</dl>
      </CardContent>
    </Card>
  );
}

const YESNO = (v) => (v ? 'Yes' : null);

export default function JobCardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jc, setJc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get(`/jobcards/${id}`)
      .then((r) => { if (!cancelled) setJc(r.data.data); })
      .catch(() => { if (!cancelled) setError('Could not load this job card.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="font-app w-full space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !jc) {
    return (
      <div className="font-app w-full">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error || 'Job card not found.'}{' '}
          <button onClick={() => navigate('/jobcards')} className="font-bold underline">Back to list</button>
        </div>
      </div>
    );
  }

  const challan = jc.challanItemLinks?.[0]?.challan || jc.challans?.[0] || null;
  const linkedItems = jc.challanItemLinks?.length
    ? jc.challanItemLinks
    : (jc.challans?.flatMap((c) => c.items || []) || []);
  const insp = jc.inspection || null;
  const customerName = jc.customer?.name || jc.customerNameSnapshot || '';
  const machineName = jc.machine?.name || jc.machine?.code || '';

  const dispatchModes = [
    jc.dispatchByOurVehicle && 'By our vehicle',
    jc.dispatchByCourier && 'By courier',
    jc.collectedByCustomer && 'Collected by customer',
  ].filter(Boolean).join(', ');

  const specialInstr = [
    jc.specInstrCert && 'Certificate',
    jc.specInstrMPIRep && 'MPI report',
    jc.specInstrGraph && 'Process graph',
  ].filter(Boolean).join(', ');

  const catFlags = insp && [
    insp.catNormal && 'Normal', insp.catWelded && 'Welded', insp.catCrackRisk && 'Crack risk',
    insp.catDistortionRisk && 'Distortion risk', insp.catCriticalFinishing && 'Critical finishing',
    insp.catDentDamage && 'Dent / damage', insp.catRusty && 'Rusty', insp.catCavity && 'Cavity',
    insp.catOthers && 'Others',
  ].filter(Boolean).join(', ');

  const procFlags = insp && [
    insp.procStressRelieving && 'Stress relieving', insp.procHardening && 'Hardening',
    insp.procTempering && 'Tempering', insp.procAnnealing && 'Annealing', insp.procBrazing && 'Brazing',
    insp.procPlasmaNitriding && 'Plasma nitriding', insp.procSubZero && 'Sub-zero', insp.procSoakClean && 'Soak clean',
  ].filter(Boolean).join(', ');

  const images = [1, 2, 3, 4, 5]
    .map((n) => jc[`image${n}`])
    .filter(Boolean)
    .map((u) => (u.startsWith('http') ? u : `${API_BASE}${u}`));

  return (
    <div className="font-app w-full space-y-4 pb-6">
      <PageHeader
        title={`Job Card ${jc.jobCardNo || ''}`.trim()}
        backTo="/jobcards"
        breadcrumbs={[{ label: 'Job Cards', to: '/jobcards' }, { label: jc.jobCardNo || 'Detail' }]}
        meta={
          <>
            <StatusPill status={jc.status} />
            {challan?.inwardNo && (
              <span>
                Inward{' '}
                {challan.id ? (
                  <Link to={`/jobwork/${challan.id}`} className="font-app-mono font-semibold text-sky-700 hover:underline">
                    {challan.inwardNo}
                  </Link>
                ) : (
                  <span className="font-app-mono font-semibold text-slate-700">{challan.inwardNo}</span>
                )}
              </span>
            )}
            {jc.partName && <span className="text-slate-600">{jc.partName}</span>}
            {jc.updatedAt && <span className="text-slate-400">Updated {formatDate(jc.updatedAt)}</span>}
          </>
        }
        actions={
          <>
            <Button asChild variant="outline"><Link to={`/jobcards/${id}/inspection`}><ClipboardCheck /> Inspection</Link></Button>
            <Button asChild variant="outline"><Link to={`/jobcards/${id}/print`}><Printer /> Print</Link></Button>
            <Button asChild variant="outline">
              <Link to={`/quality/certificates/new?jobCardId=${id}`}><BadgeCheck /> Certificate</Link>
            </Button>
            <Button asChild><Link to={`/jobcards/${id}/edit`}><Pencil /> Edit</Link></Button>
          </>
        }
      />

      <Section title="Customer & company" cols={2}>
        <Row label="Customer" value={customerName} always />
        <Row label="Contact email" value={jc.contactEmail} mono />
        <Row label="Customer address" value={jc.customerAddressSnapshot} span />
      </Section>

      <Section title="Production">
        <Row label="Quantity" value={jc.quantity} mono always />
        <Row label="Total weight (kg)" value={jc.totalWeight != null ? Number(jc.totalWeight).toFixed(3) : null} mono always />
        <Row label="Hardness range" value={jc.hrcRange} mono />
        <Row label="Machine" value={machineName} />
        <Row label="Operator" value={jc.operatorName} />
        <Row label="Operation no" value={jc.operationNo} mono />
        <Row label="Drawing no" value={jc.drawingNo} mono />
        <Row label="WO no" value={jc.woNo} mono />
        <Row label="Die / your no" value={jc.dieNo || jc.yourNo} mono />
        <Row label="Heat no" value={jc.heatNo} mono />
        <Row label="Die material" value={jc.dieMaterial} />
      </Section>

      <Section title="Heat treatment">
        <Row label="Heat treatment specification" value={jc.operationMode} />
        <Row label="Operation mode" value={jc.operationMode2 || jc.operatorMode} />
        <Row label="Specification" value={jc.specification} span />
        <Row label="Special requirements" value={jc.specialRequirements} span />
        <Row label="Precautions" value={jc.precautions} span />
      </Section>

      <Section title="Dates & issue">
        <Row label="Received date" value={formatDate(jc.receivedDate)} />
        <Row label="Start date" value={formatDate(jc.startDate)} />
        <Row label="Due date" value={formatDate(jc.dueDate)} />
        <Row label="End date" value={formatDate(jc.endDate)} />
        <Row label="Issue date" value={formatDate(jc.issueDate)} />
        <Row label="Issued by" value={jc.issueBy} />
      </Section>

      <Section title="Dispatch & documents">
        <Row label="Dispatch mode" value={dispatchModes || jc.dispatchMode} />
        <Row label="Special instructions" value={specialInstr} />
        <Row label="Certificate no" value={jc.certificateNo} mono />
        <Row label="Control plan no" value={jc.controlPlanNo} mono />
        <Row label="Document no" value={jc.documentNo} mono />
        <Row label="Revision" value={[jc.revisionNo, formatDate(jc.revisionDate) !== '—' ? formatDate(jc.revisionDate) : null].filter(Boolean).join(' · ')} mono />
        <Row label="Page no" value={jc.pageNo} mono />
      </Section>

      {linkedItems.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Linked items ({linkedItems.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Drawing no</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Weight (kg)</th>
                    <th className="px-3 py-2">Material</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {linkedItems.map((it) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 font-medium text-slate-800">{it.partName || it.description || '—'}</td>
                      <td className="px-3 py-2 font-app-mono text-slate-500">{it.drawingNo || '—'}</td>
                      <td className="px-3 py-2 text-right font-app-mono text-slate-700">{it.quantity ?? '—'}</td>
                      <td className="px-3 py-2 text-right font-app-mono text-amber-700">
                        {it.weight ? Number(it.weight).toFixed(3) : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{it.material || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Incoming inspection</span>
            <Button asChild variant="outline" size="sm"><Link to={`/jobcards/${id}/inspection`}>Open</Link></Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!insp ? (
            <p className="text-sm text-slate-500">No inspection recorded yet.</p>
          ) : (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Row label="Status" value={<StatusPill status={insp.inspectionStatus} size="sm" />} always />
              <Row label="Inspected by" value={insp.inspectedBy} />
              <Row label="Inspection date" value={formatDate(insp.inspectionDate)} />
              <Row label="Required hardness" value={[insp.requiredHardnessMin, insp.requiredHardnessMax].filter((v) => v != null && v !== '').join(' – ')} mono />
              <Row label="Achieved hardness" value={insp.achievedHardness} mono />
              <Row label="Categorization" value={catFlags} span />
              <Row label="Process" value={procFlags} span />
              <Row label="Visual — before / after" value={[insp.visualBefore && 'before', insp.visualAfter && 'after'].filter(Boolean).join(' / ')} />
              <Row label="MPI" value={insp.mpiNil ? 'Nil' : [insp.mpiBefore && 'before', insp.mpiAfter && 'after'].filter(Boolean).join(' / ')} />
              <Row label="Remarks" value={insp.remarks} span />
            </dl>
          )}
        </CardContent>
      </Card>

      {images.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Part photos</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {images.map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg border border-slate-200">
                  <img src={src} alt={`Part photo ${i + 1}`} className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
