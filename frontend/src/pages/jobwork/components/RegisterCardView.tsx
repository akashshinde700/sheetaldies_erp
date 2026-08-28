import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Pencil, FileText, ClipboardPlus } from 'lucide-react';
import type { RegisterRow } from '../InwardOutwardRegister';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';

interface RegisterCardViewProps {
  loading: boolean;
  pagedRows: RegisterRow[];
}

const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-slate-200/90 p-4 space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-6 rounded-md" />
      <Skeleton className="h-6 w-16 rounded-md" />
    </div>
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3.5 w-1/2" />
    <Skeleton className="h-12 w-full rounded-lg" />
    <Skeleton className="h-3.5 w-2/3" />
  </div>
);

export default function RegisterCardView({ loading, pagedRows }: RegisterCardViewProps) {
  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 bg-slate-50/50">
      {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
  if (pagedRows.length === 0) return (
    <div className="flex flex-col items-center gap-2 py-10">
      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
        <FileText className="h-5 w-5 text-sky-300" />
      </div>
      <p className="text-sm text-slate-500">No register data.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 bg-slate-50/50">
      {pagedRows.map((r) => (
        <div key={`${r.challanItemId}-${r.srNo}`} className="group bg-white rounded-xl border border-slate-200/90 shadow-card hover:shadow-md hover:border-sky-200 transition-all flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex-none">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-100 text-xs font-bold text-sky-700 tabular-nums">
                {r.srNo}
              </span>
              <Link to={`/jobwork/${r.challanId}`} className="text-xs font-bold text-sky-800 hover:text-sky-950 hover:underline font-mono truncate">
                {r.inwardNo || '—'}
              </Link>
            </div>
            <div className="flex items-center gap-0.5">
              {!r.jobcardNo && (
                <Button variant="ghost" size="icon-sm" asChild
                  className="text-slate-400 hover:text-violet-700 hover:bg-violet-50">
                  <Link to={`/jobcards/new?ref=${encodeURIComponent(r.inwardNo || r.challanNo || String(r.challanId))}`}
                    title="Create Job Card from this inward" aria-label={`Create job card from inward ${r.inwardNo || r.challanId}`}>
                    <ClipboardPlus />
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="icon-sm" asChild
                className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                <Link to={`/jobwork/${r.challanId}`} title="View" aria-label={`View inward ${r.inwardNo || r.challanId}`}>
                  <Eye />
                </Link>
              </Button>
              <Button variant="ghost" size="icon-sm" asChild
                className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                <Link to={`/jobwork/${r.challanId}/edit`} title="Edit" aria-label={`Edit inward ${r.inwardNo || r.challanId}`}>
                  <Pencil />
                </Link>
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-3 flex-grow">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Company</p>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                {r.companyName || '—'}
              </h3>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Challan / Date</p>
              <p className="text-xs font-semibold text-slate-800 font-mono">{r.challanNo || '—'}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {r.challanDate ? new Date(r.challanDate).toLocaleDateString('en-IN') : '—'}
              </p>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Jobcard</p>
                <p className="text-xs font-bold text-slate-700 font-mono">{r.jobcardNo || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
