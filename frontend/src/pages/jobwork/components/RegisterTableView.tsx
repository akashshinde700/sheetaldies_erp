import { Link } from 'react-router-dom';
import { Eye, Pencil, Printer, Trash2, Loader2, FileText, AlertTriangle } from 'lucide-react';
import type { RegisterRow } from '../InwardOutwardRegister';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';

interface RegisterTableViewProps {
  loading: boolean;
  pagedRows: RegisterRow[];
  onDelete?: (challanId: number) => void;
  deletingId?: number | null;
  onCreateJobCard?: (challanId: number, challanNo: string) => void;
  creatingJcId?: number | null;
}

const SkeletonRow = () => (
  <tr>
    <td className="td"><Skeleton className="h-3.5 w-6" /></td>
    <td className="td"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td"><Skeleton className="h-3.5 w-20" /></td>
    <td className="td"><Skeleton className="h-3.5 w-32" /></td>
    <td className="td"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td"><Skeleton className="h-8 w-36 ml-auto rounded-lg" /></td>
  </tr>
);

const statusOf = (r: RegisterRow): 'DONE' | 'PARTIAL' | 'PENDING' =>
  r.jobCardStatus || (r.jobcardNo && r.jobcardNo !== '-' ? 'DONE' : 'PENDING');

function StatusCell({ r }: { r: RegisterRow }) {
  const st = statusOf(r);
  const count = r.itemCount ?? 0;
  const withJc = r.itemsWithJobCard ?? (st === 'DONE' ? count : 0);
  const pending = r.itemsPending ?? Math.max(0, count - withJc);

  const pill =
    st === 'DONE'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : st === 'PARTIAL'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-100 text-slate-500 border-slate-200';
  const label = st === 'DONE' ? 'Job card done' : st === 'PARTIAL' ? 'Partially carded' : 'No job card';

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${pill}`}>
        {label}
      </span>
      {count > 0 && st !== 'DONE' && (
        <span className="text-[10px] text-slate-400 tabular-nums whitespace-nowrap">
          {withJc} of {count} items · {pending} remaining
        </span>
      )}
      {count > 0 && st === 'DONE' && (
        <span className="text-[10px] text-slate-400 tabular-nums whitespace-nowrap">
          all {count} item{count > 1 ? 's' : ''} carded
        </span>
      )}
    </div>
  );
}

export default function RegisterTableView({
  loading,
  pagedRows,
  onDelete,
  deletingId,
  onCreateJobCard,
  creatingJcId,
}: RegisterTableViewProps) {
  return (
    <div className="table-responsive">
      <table className="w-full text-left table-fixed min-w-[860px]">
        <thead>
          <tr>
            <th className="th w-10">Sr</th>
            <th className="th w-[14%]">Inward No</th>
            <th className="th w-[14%]">Challan No</th>
            <th className="th w-[20%]">Company</th>
            <th className="th w-[18%]">Status</th>
            <th className="th w-[12%] hidden lg:table-cell">Job Card</th>
            <th className="th w-[22%] text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50/80">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          ) : pagedRows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-sky-300" />
                  </div>
                  <p className="text-sm text-slate-500">No register data.</p>
                </div>
              </td>
            </tr>
          ) : pagedRows.map((r) => {
            const st = statusOf(r);
            const busy = creatingJcId === r.challanId;
            return (
              <tr key={`${r.challanItemId}-${r.srNo}`} className="tr group">
                <td className="td text-slate-400 font-mono tabular-nums">{r.srNo}</td>
                <td className="td">
                  <Link
                    to={`/jobwork/${r.challanId}`}
                    className="text-xs font-bold text-sky-800 hover:text-sky-950 hover:underline font-mono"
                  >
                    {r.inwardNo || '—'}
                  </Link>
                </td>
                <td className="td">
                  <span className="text-xs font-semibold text-slate-700 font-mono">{r.challanNo || '—'}</span>
                  {r.challanDate && (
                    <p className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                      {new Date(r.challanDate).toLocaleDateString('en-IN')}
                    </p>
                  )}
                </td>
                <td className="td text-slate-700 font-medium truncate">{r.companyName || '—'}</td>
                <td className="td"><StatusCell r={r} /></td>
                <td className="td hidden lg:table-cell">
                  {r.jobcardNo && r.jobcardNo !== '-' ? (
                    <>
                      <span className="text-xs font-semibold text-slate-700 font-mono">{r.jobcardNo}</span>
                      {r.jobcardDate && (
                        <p className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                          {new Date(r.jobcardDate).toLocaleDateString('en-IN')}
                        </p>
                      )}
                      {r.reworkPending && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                          <AlertTriangle className="h-2.5 w-2.5" /> Rework pending
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-300">—</span>
                  )}
                </td>
                <td className="td">
                  <div className="flex items-center justify-end gap-1.5">
                    {st !== 'DONE' && onCreateJobCard && (
                      <button
                        type="button"
                        onClick={() => onCreateJobCard(r.challanId, r.challanNo)}
                        disabled={busy}
                        className="btn-primary h-auto w-auto p-1.5"
                        title={st === 'PARTIAL' ? 'Card remaining' : 'Create job card from this inward'}
                        aria-label={st === 'PARTIAL' ? 'Card remaining' : 'Create job card from this inward'}
                      >
                        <span className={`material-symbols-outlined text-sm ${busy ? 'animate-spin' : ''}`}>
                          {busy ? 'progress_activity' : 'add_card'}
                        </span>
                      </button>
                    )}
                    <Button variant="ghost" size="icon-sm" asChild
                      className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                      <Link to={`/jobwork/${r.challanId}`} title="View" aria-label={`View inward ${r.inwardNo || r.challanId}`}>
                        <Eye />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon-sm" asChild
                      className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                      <Link to={`/jobwork/${r.challanId}/edit`} title="Edit / Update" aria-label={`Edit inward ${r.inwardNo || r.challanId}`}>
                        <Pencil />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon-sm" asChild
                      className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50">
                      <Link to={`/jobwork/${r.challanId}/print`} target="_blank" title="Print Challan" aria-label={`Print challan for inward ${r.inwardNo || r.challanId}`}>
                        <Printer />
                      </Link>
                    </Button>
                    {onDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(r.challanId)}
                        disabled={deletingId === r.challanId}
                        title="Delete Inward"
                        aria-label={`Delete inward ${r.inwardNo || r.challanId}`}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        {deletingId === r.challanId ? <Loader2 className="animate-spin" /> : <Trash2 />}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
