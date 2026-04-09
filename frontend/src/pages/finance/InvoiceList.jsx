import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../utils/export';

const PAY_STYLE = {
  PENDING: 'bg-orange-100 text-orange-700',
  PARTIAL: 'bg-sky-100 text-sky-700',
  PAID:    'bg-emerald-100 text-emerald-700',
};

const PAGE_LIMIT = 10;

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[1,2,3,4,5,6,7,8,9,10].map(i => (
      <td key={i} className="px-4 py-3.5"><div className="h-3 bg-slate-100 rounded w-full" /></td>
    ))}
  </tr>
);

const Pagination = ({ page, totalPages, total, limit, setPage }) => (
  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
    <span className="text-xs text-slate-400">
      {(page-1)*limit+1}–{Math.min(page*limit, total)} of <span className="font-semibold">{total}</span>
    </span>
    <div className="flex items-center gap-1.5">
      <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors">
        <span className="material-symbols-outlined text-sm">chevron_left</span> Prev
      </button>
      <span className="text-xs font-semibold text-slate-500 px-2">{page} / {totalPages}</span>
      <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors">
        Next <span className="material-symbols-outlined text-sm">chevron_right</span>
      </button>
    </div>
  </div>
);

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filter,   setFilter]   = useState('');
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);

  const fetchData = useCallback(() => {
    setLoading(true); setError(null);
    api.get('/invoices', { params: { paymentStatus: filter || undefined, page, limit: PAGE_LIMIT } })
      .then(r => { setInvoices(r.data.data || []); setTotal(r.data.meta?.total || 0); })
      .catch(() => setError('Failed to load invoices.'))
      .finally(() => setLoading(false));
  }, [filter, page]);

  useEffect(() => { setPage(1); }, [filter]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const markPaid = async (id) => {
    try {
      await api.patch(`/invoices/${id}/payment`, { paymentStatus: 'PAID', paidDate: new Date().toISOString().split('T')[0] });
      toast.success('Marked as paid.');
      setInvoices(p => p.map(inv => inv.id === id ? { ...inv, paymentStatus: 'PAID' } : inv));
    } catch { toast.error('Error updating payment.'); }
  };

  const exportInvoices = () => {
    if (!invoices.length) { toast.error('No invoices to export.'); return; }
    const rows = invoices.map(inv => ({
      'Invoice No': inv.invoiceNo,
      'Invoice Date': inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : '',
      'Customer': inv.toParty?.name || inv.toPartyName || '',
      'Challan': inv.challan?.challanNo || inv.challanRef || '',
      'Subtotal': inv.subtotal,
      'CGST': inv.cgstAmount,
      'SGST': inv.sgstAmount,
      'IGST': inv.igstAmount,
      'Total': inv.totalAmount,
      'Status': inv.paymentStatus,
      'Tally Sent': inv.sentToTally ? 'YES' : 'NO',
    }));
    exportToExcel(rows, `Invoice-Export`);
    toast.success('Invoice data exported to Excel.');
  };

  const totalPages   = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const pendingCount = invoices.filter(i => i.paymentStatus === 'PENDING').length;

  const FILTER_OPTS = [
    { val: '',        label: 'All' },
    { val: 'PENDING', label: 'Pending' },
    { val: 'PARTIAL', label: 'Partial' },
    { val: 'PAID',    label: 'Paid' },
  ];

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Tax Invoices</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {total > 0 ? `${total} total` : 'GST invoices'}
            {pendingCount > 0 && <span className="ml-2 text-orange-500 font-semibold">· {pendingCount} pending payment</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportInvoices}
            className="btn-outline">
            <span className="material-symbols-outlined text-sm">file_download</span> Export Excel
          </button>
          <Link to="/invoices/new" className="btn-primary">
            <span className="material-symbols-outlined text-sm">add</span> New Invoice
          </Link>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {FILTER_OPTS.map(f => (
          <button key={f.val} onClick={() => setFilter(f.val)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-150 ${
              filter === f.val
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
          <span className="material-symbols-outlined text-lg">error</span>
          {error}
          <button onClick={fetchData} className="ml-auto text-xs font-bold hover:underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                {['Invoice No', 'Date', 'To Party', 'Challan', 'Subtotal', 'GST', 'Total', 'Payment', 'Tally', 'Action'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({length: 5}).map((_, i) => <SkeletonRow key={i} />)
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-2xl text-indigo-300">receipt_long</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">
                      {filter ? `No ${filter.toLowerCase()} invoices.` : 'No invoices yet.'}
                    </p>
                    {!filter && (
                      <Link to="/invoices/new" className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                        <span className="material-symbols-outlined text-sm">add</span> Create first invoice
                      </Link>
                    )}
                  </td>
                </tr>
              ) : invoices.map(inv => (
                <tr key={inv.id} className="tr">
                  <td className="td">
                    <Link to={`/invoices/${inv.id}`}
                      className="text-xs font-bold text-indigo-600 hover:underline font-mono">
                      {inv.invoiceNo}
                    </Link>
                  </td>
                  <td className="td text-slate-500 whitespace-nowrap">
                    {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                  </td>
                  <td className="td font-medium text-slate-700 truncate max-w-[150px]">{inv.toParty?.name}</td>
                  <td className="td text-slate-500 font-mono text-[11px]">
                    {inv.challan?.challanNo || inv.challanRef || '—'}
                  </td>
                  <td className="td text-slate-600">₹ {Number(inv.subtotal || 0).toLocaleString('en-IN')}</td>
                  <td className="td text-slate-500">
                    ₹ {(Number(inv.cgstAmount || 0)+Number(inv.sgstAmount || 0)+Number(inv.igstAmount || 0)).toLocaleString('en-IN')}
                  </td>
                  <td className="td font-bold text-slate-800">₹ {Number(inv.totalAmount || 0).toLocaleString('en-IN')}</td>
                  <td className="td">
                    <span className={`badge ${PAY_STYLE[inv.paymentStatus] || 'bg-slate-100 text-slate-600'}`}>
                      {inv.paymentStatus}
                    </span>
                  </td>
                  <td className="td">
                    {inv.sentToTally
                      ? <span className="badge bg-violet-100 text-violet-700">
                          <span className="material-symbols-outlined text-[12px]">lock</span> Sent
                        </span>
                      : <span className="text-slate-300 text-xs">—</span>
                    }
                  </td>
                  <td className="td">
                    <div className="flex gap-2 items-center">
                      <Link to={`/invoices/${inv.id}`}
                        className="text-xs font-semibold text-indigo-600 hover:underline">View</Link>
                      {inv.paymentStatus !== 'PAID' && !inv.sentToTally && (
                        <>
                          <span className="text-slate-200">·</span>
                          <button onClick={() => markPaid(inv.id)}
                            className="text-xs font-semibold text-emerald-600 hover:underline">Paid</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && total > 0 && (
          <Pagination page={page} totalPages={totalPages} total={total} limit={PAGE_LIMIT} setPage={setPage} />
        )}
      </div>
    </div>
  );
}
