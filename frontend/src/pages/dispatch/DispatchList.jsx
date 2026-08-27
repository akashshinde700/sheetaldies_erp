import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Printer, Trash2, X, Truck } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import KpiCard from '../../components/KpiCard';
import { formatDate } from '../../utils/formatters';
import ListSearchInput from '../../components/ListSearchInput';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// draft = neutral, sent = info, received = warning, complete = success, cancelled = error
const STATUS_VARIANT = {
  DRAFT:     'neutral',
  SENT:      'info',
  RECEIVED:  'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

const SkeletonRow = () => (
  <tr>
    <td className="td"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td">
      <Skeleton className="h-3.5 w-28 mb-1.5" />
      <Skeleton className="h-2.5 w-20" />
    </td>
    <td className="td hidden sm:table-cell"><Skeleton className="h-3.5 w-8 ml-auto" /></td>
    <td className="td hidden sm:table-cell"><Skeleton className="h-3.5 w-20" /></td>
    <td className="td"><Skeleton className="h-5 w-16 rounded-full" /></td>
    <td className="td"><Skeleton className="h-3.5 w-20 ml-auto" /></td>
  </tr>
);

export default function DispatchChallanList() {
  const [challans, setChallans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: 'all' });
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchChallans = async () => {
      try {
        setLoading(true);
        const response = await api.get('/dispatch-challans', {
          signal: controller.signal,
          params: {
            ...(filters.status !== 'all' ? { status: filters.status } : {}),
            ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
          }
        });
        setChallans(response.data.data || []);
      } catch (error) {
        if (error?.name !== 'CanceledError') toast.error('Failed to load dispatch challans.');
      } finally {
        setLoading(false);
      }
    };
    fetchChallans();
    return () => controller.abort();
  }, [filters, searchTerm]);

  const handleDelete = (id) => {
    setConfirmDialog({
      title: 'Delete dispatch challan?',
      message: 'This will permanently delete this dispatch challan.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/dispatch-challans/${id}`);
          toast.success('Dispatch challan deleted.');
          setChallans(prev => prev.filter(c => c.id !== id));
        } catch (error) {
          toast.error(error?.response?.data?.message || 'Failed to delete dispatch challan.');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const hasFilters = Boolean(searchTerm || filters.status !== 'all');

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Dispatch Challans</h1>
          <p className="page-subtitle">Outward delivery documents</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button asChild>
            <Link to="/dispatch/new">
              <Plus /> New Challan
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Dispatch challans"
          value={challans.length}
          sub="Loaded records"
          icon="local_shipping"
          iconBg="bg-amber-100 text-amber-700"
        />
        <KpiCard
          label="Completed"
          value={challans.filter(c => c.status === 'COMPLETED').length}
          sub="Finished deliveries"
          icon="task_alt"
          iconBg="bg-emerald-100 text-emerald-700"
        />
        <KpiCard
          label="Sent"
          value={challans.filter(c => c.status === 'SENT').length}
          sub="Outbound challans"
          icon="schedule"
          iconBg="bg-blue-100 text-blue-700"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
            <div className="space-y-1 flex-1 min-w-[220px]">
              <FilterLabel>Search</FilterLabel>
              <ListSearchInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Challan no or customer..."
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <FilterLabel htmlFor="dispatch-status-filter">Status</FilterLabel>
              <select
                id="dispatch-status-filter"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="form-input text-xs sm:w-44"
              >
                <option value="all">All</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="RECEIVED">Received</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilters({ status: 'all' });
                }}
                className="text-slate-500 hover:text-rose-600"
              >
                <X /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-left min-w-[560px]">
            <thead>
              <tr>
                <th className="th">Challan</th>
                <th className="th">From / To</th>
                <th className="th hidden sm:table-cell text-right">Items</th>
                <th className="th hidden sm:table-cell">Dispatch Date</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Truck className="h-5 w-5 text-amber-300" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {hasFilters ? 'No challans match your filters.' : 'No dispatch challans yet.'}
                      </p>
                      {!hasFilters && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/dispatch/new">
                            <Plus /> Create first challan
                          </Link>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : challans.map((challan) => (
                <tr key={challan.id} className="tr">
                  <td className="td">
                    <Link to={`/dispatch/${challan.id}`}
                      className="font-bold text-sky-800 hover:text-sky-950 hover:underline font-mono">
                      {challan.challanNo}
                    </Link>
                  </td>
                  <td className="td">
                    <div className="font-semibold text-slate-800 truncate max-w-[140px]">{challan.fromParty?.name || '—'}</div>
                    <div className="text-slate-400 text-[10px] mt-0.5 truncate max-w-[140px]">↓ to: {challan.toParty?.name || '—'}</div>
                  </td>
                  <td className="td text-slate-600 hidden sm:table-cell text-right tabular-nums">{challan.itemCount || 0}</td>
                  <td className="td text-slate-500 hidden sm:table-cell whitespace-nowrap">
                    {formatDate(challan.challanDate)}
                  </td>
                  <td className="td">
                    <Badge variant={STATUS_VARIANT[challan.status] || 'neutral'}>{challan.status}</Badge>
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon-sm" asChild
                        className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                        <Link to={`/dispatch/${challan.id}`} title="View" aria-label={`View challan ${challan.challanNo}`}>
                          <Eye />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon-sm" asChild
                        className="text-slate-400 hover:text-sky-700">
                        <Link to={`/dispatch/${challan.id}/print`} target="_blank" title="Print" aria-label={`Print challan ${challan.challanNo}`}>
                          <Printer />
                        </Link>
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm"
                        onClick={() => handleDelete(challan.id)}
                        title="Delete" aria-label={`Delete challan ${challan.challanNo}`}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
