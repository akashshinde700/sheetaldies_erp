import { Link } from 'react-router-dom';
import { Eye, Pencil, Printer, Trash2, Loader2, FileText, ClipboardPlus } from 'lucide-react';
import type { RegisterRow } from '../InwardOutwardRegister';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';

interface RegisterTableViewProps {
  loading: boolean;
  pagedRows: RegisterRow[];
  onDelete?: (challanId: number) => void;
  deletingId?: number | null;
}

const SkeletonRow = () => (
  <tr>
    <td className="td"><Skeleton className="h-3.5 w-6" /></td>
    <td className="td"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td"><Skeleton className="h-3.5 w-20" /></td>
    <td className="td"><Skeleton className="h-3.5 w-32" /></td>
    <td className="td hidden md:table-cell"><Skeleton className="h-3.5 w-20" /></td>
    <td className="td"><Skeleton className="h-7 w-28 ml-auto rounded-lg" /></td>
  </tr>
);

export default function RegisterTableView({ loading, pagedRows, onDelete, deletingId }: RegisterTableViewProps) {
  return (
    <div className="table-responsive">
      <table className="w-full text-left table-fixed min-w-[680px]">
        <thead>
          <tr>
            <th className="th w-12">Sr</th>
            <th className="th w-[18%]">Inward No</th>
            <th className="th w-[18%]">Challan No</th>
            <th className="th w-[26%]">Company</th>
            <th className="th w-[16%] hidden md:table-cell">Job Card</th>
            <th className="th w-[20%] text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50/80">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          ) : pagedRows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-sky-300" />
                  </div>
                  <p className="text-sm text-slate-500">No register data.</p>
                </div>
              </td>
            </tr>
          ) : pagedRows.map((r) => (
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
              <td className="td hidden md:table-cell">
                <span className="text-xs font-semibold text-slate-700 font-mono">{r.jobcardNo || '—'}</span>
                {r.jobcardDate && (
                  <p className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                    {new Date(r.jobcardDate).toLocaleDateString('en-IN')}
                  </p>
                )}
              </td>
              <td className="td">
                <div className="flex items-center justify-end gap-0.5">
                  {!r.jobcardNo && (
                    <Button variant="ghost" size="icon-sm" asChild
                      className="text-slate-400 hover:text-violet-700 hover:bg-violet-50">
                      <Link
                        to={`/jobcards/new?ref=${encodeURIComponent(r.inwardNo || r.challanNo || String(r.challanId))}`}
                        title="Create Job Card from this inward"
                        aria-label={`Create job card from inward ${r.inwardNo || r.challanId}`}
                      >
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
