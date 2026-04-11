import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { exportToExcel } from '../../utils/export';

// Subcomponents
import RegisterFilters from './components/RegisterFilters';
import RegisterTableView from './components/RegisterTableView';
import RegisterCardView from './components/RegisterCardView';
import RegisterPagination from './components/RegisterPagination';

export interface RegisterRow {
  srNo: number;
  challanId: number;
  challanItemId: number;
  companyName: string;
  material: string;
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
  const PAGE_SIZE = 10;

  const { data: rows = [], isLoading: loading } = useQuery<RegisterRow[]>({
    queryKey: ['jobwork-register'],
    queryFn: async () => {
      const r = await api.get('/jobwork/register', { params: { limit: 500 } });
      return r.data.data || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const hasDateFilter = fromDate || toDate;
    const fromTs = fromDate ? new Date(fromDate).getTime() : null;
    const toTs = toDate ? new Date(toDate).getTime() : null;

    return rows.filter((r) => {
      const matchesSearch = !q || (
        r.companyName?.toLowerCase().includes(q) ||
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
    const data = filtered.map((r) => ({
      'Sr No': r.srNo,
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
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Inward / Outward Register</h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-3xl leading-relaxed">
            Company → Challan → Material in → Process → Invoice → Dispatch → Balance & performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/jobwork/new" className="btn-primary whitespace-nowrap">
            <span className="material-symbols-outlined text-[18px] shrink-0">add</span>
            Add Challan
          </Link>
          <button type="button" onClick={exportRows} className="btn-outline whitespace-nowrap">
            <span className="material-symbols-outlined text-[18px] shrink-0">file_download</span>
            Export Excel
          </button>
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
          <RegisterTableView loading={loading} pagedRows={pagedRows} />
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
    </div>
  );
}
