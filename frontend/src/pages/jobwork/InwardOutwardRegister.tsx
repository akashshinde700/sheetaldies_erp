import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Download } from 'lucide-react';
import api from '../../utils/api';
import { exportToExcel } from '../../utils/export';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/button';

// Subcomponents
import RegisterFilters from './components/RegisterFilters';
import RegisterTableView from './components/RegisterTableView';
import RegisterCardView from './components/RegisterCardView';
import RegisterPagination from './components/RegisterPagination';
import ConfirmDialog from '../../components/ConfirmDialog';

export interface RegisterRow {
  srNo: number;
  challanId: number;
  challanItemId: number;
  companyName: string;
  material: string;
  inwardNo: string;
  challanNo: string;
  challanDate: string;
  materialInDate: string;
  qty: number;
  weight: number;
  jobcardNo: string;
  jobcardDate: string;
  invoiceNos: string;
  dispatchQty: number;
  dispatchDate: string;
  balQty: number;
  velocity: number;
  delPerfPct: number;
  deliveryPct: number;
}

export default function InwardOutwardRegister() {
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<any>(null);
  const PAGE_SIZE = 10;
  const queryClient = useQueryClient();

  const handleDelete = (challanId: number) => {
    setConfirmDialog({
      title: 'Delete inward?',
      message: 'Delete this inward permanently? This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setDeletingId(challanId);
        try {
          await api.delete(`/jobwork/${challanId}`);
          toast.success('Inward deleted');
          queryClient.invalidateQueries({ queryKey: ['jobwork-register'] });
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to delete');
        } finally {
          setDeletingId(null);
          setConfirmDialog(null);
        }
      },
    });
  };

  const { data: rows = [], isLoading: loading } = useQuery<RegisterRow[]>({
    queryKey: ['jobwork-register'],
    queryFn: async () => {
      const r = await api.get('/jobwork/register', { params: { limit: 500 } });
      return r.data.data || [];
    },
    staleTime: 0,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const hasDateFilter = fromDate || toDate;
    const fromTs = fromDate ? new Date(fromDate).getTime() : null;
    const toTs = toDate ? new Date(toDate).getTime() : null;

    return rows.filter((r) => {
      const matchesSearch = !q || (
        r.companyName?.toLowerCase().includes(q) ||
        r.inwardNo?.toLowerCase().includes(q) ||
        r.challanNo?.toLowerCase().includes(q) ||
        r.material?.toLowerCase().includes(q) ||
        r.jobcardNo?.toLowerCase().includes(q) ||
        r.invoiceNos?.toLowerCase().includes(q)
      );
      if (!matchesSearch) return false;

      if (!hasDateFilter) return true;

      const rowDate = r.challanDate ? new Date(r.challanDate) : null;
      if (!rowDate || Number.isNaN(rowDate.getTime())) return false;

      const rowTs = new Date(
        rowDate.getFullYear(),
        rowDate.getMonth(),
        rowDate.getDate(),
      ).getTime();

      if (fromTs != null && rowTs < fromTs) return false;
      if (toTs != null && rowTs > toTs) return false;
      return true;
    });
  }, [rows, search, fromDate, toDate]);

  useEffect(() => {
    setPage(1);
  }, [search, fromDate, toDate, viewMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const exportRows = () => {
    const sorted = [...filtered].sort((a, b) => (a.inwardNo || '').localeCompare(b.inwardNo || '', 'en', { numeric: true }));
    const data = sorted.map((r, i) => ({
      'Sr No': i + 1,
      'Inward No': r.inwardNo,
      'Company Name': r.companyName,
      Material: r.material,
      'Challan No': r.challanNo,
      'Challan Date': r.challanDate ? new Date(r.challanDate).toLocaleDateString('en-IN') : '',
      'Material In Date': r.materialInDate ? new Date(r.materialInDate).toLocaleDateString('en-IN') : '',
      Qty: r.qty,
      Weight: r.weight,
      'Jobcard No': r.jobcardNo,
      'Jobcard Date': r.jobcardDate ? new Date(r.jobcardDate).toLocaleDateString('en-IN') : '',
      Invoice: r.invoiceNos,
      'Dispatch Qty': r.dispatchQty,
      'Dispatch Date': r.dispatchDate ? new Date(r.dispatchDate).toLocaleDateString('en-IN') : '',
      'Bal Qty': r.balQty,
      Velocity: r.velocity,
      'Del Perf %': r.delPerfPct,
      'Delivery %': r.deliveryPct,
    }));
    exportToExcel(data, 'Inward-Outward-Register');
  };

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Inward + Job Card Register</h1>
          <p className="page-subtitle max-w-3xl">
            Company → Challan → Job Card
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button type="button" variant="outline" onClick={exportRows}>
            <Download /> Export Excel
          </Button>
          <Button asChild>
            <Link to="/jobwork/inward-entry">
              <Plus /> New Inward
            </Link>
          </Button>
        </div>
      </div>

      <RegisterFilters 
        search={search} setSearch={setSearch}
        fromDate={fromDate} setFromDate={setFromDate}
        toDate={toDate} setToDate={setToDate}
        viewMode={viewMode} setViewMode={setViewMode}
      />

      <div className="card overflow-hidden">
        {viewMode === 'table' ? (
          <RegisterTableView loading={loading} pagedRows={pagedRows} onDelete={handleDelete} deletingId={deletingId} />
        ) : (
          <RegisterCardView loading={loading} pagedRows={pagedRows} />
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <RegisterPagination 
          page={page} 
          setPage={setPage} 
          totalPages={totalPages} 
          filteredCount={filtered.length} 
          pageSize={PAGE_SIZE} 
        />
      )}

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
