import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../utils/export';
import KpiCard from '../../components/KpiCard';
import { formatCurrency, formatDate } from '../../utils/formatters';
import ListSearchInput from '../../components/ListSearchInput';
import PageNav from '../../components/PageNav';
import ConfirmDialog from '../../components/ConfirmDialog';

const PAY_STYLE = {
  PENDING: 'bg-orange-100 text-orange-700',
  PARTIAL: 'bg-sky-100 text-sky-700',
  PAID:    'bg-emerald-100 text-emerald-700',
};

const PAGE_LIMIT = 10;

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {Array.from({ length: 11 }, (_, i) => i).map(i => (
      <td key={i} className="px-4 py-3.5"><div className="h-3 bg-slate-100 rounded w-full" /></td>
    ))}
  </tr>
);

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate,   setToDate]   = useState('');
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const [paidModal, setPaidModal] = useState(null); // { id, invoiceNo }
  const [paidDate,  setPaidDate]  = useState(() => new Date().toISOString().split('T')[0]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showTallySetup, setShowTallySetup] = useState(false);

  const fetchData = useCallback((signal) => {
    setLoading(true); setError(null);
    api.get('/invoices', {
      signal,
      params: {
        paymentStatus: filter || undefined,
        search: search.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        limit: PAGE_LIMIT,
      },
    })
      .then(r => { setInvoices(r.data.data || []); setTotal(r.data.pagination?.total || 0); })
      .catch(err => { if (err?.name !== 'CanceledError') setError('Failed to load invoices.'); })
      .finally(() => setLoading(false));
  }, [filter, search, fromDate, toDate, page]);

  useEffect(() => { setPage(1); }, [filter, search, fromDate, toDate]);
  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const confirmMarkPaid = async () => {
    if (!paidModal) return;
    try {
      await api.patch(`/invoices/${paidModal.id}/payment`, { paymentStatus: 'PAID', paidDate: paidDate });
      toast.success('Marked as paid.');
      setInvoices(p => p.map(inv => inv.id === paidModal.id ? { ...inv, paymentStatus: 'PAID', paidDate } : inv));
      setPaidModal(null);
    } catch { toast.error('Error updating payment.'); }
  };

  const doDownloadXml = async (inv) => {
    try {
      const r = await api.get(`/invoices/${inv.id}/tally-xml`, { responseType: 'blob' });
      const filename  = `${inv.invoiceNo.replace(/\//g, '-')}_tally.xml`;
      const blobUrl   = URL.createObjectURL(new Blob([r.data], { type: 'application/xml' }));
      const a         = document.createElement('a');
      a.href          = blobUrl;
      a.download      = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
      setInvoices(p => p.map(i => i.id === inv.id ? { ...i, xmlDownloadedAt: new Date().toISOString() } : i));
    } catch {
      toast.error('Error generating XML.');
    }
  };

  const handleDownloadXml = (inv) => {
    if (inv.xmlDownloadedAt) {
      setConfirmDialog({
        title: 'Download Tally XML again?',
        message: `This invoice's Tally XML was already downloaded on ${formatDate(inv.xmlDownloadedAt, true)}.\n\nImporting it into Tally a second time may create a duplicate voucher.`,
        confirmLabel: 'Download Again',
        variant: 'danger',
        onConfirm: async () => { await doDownloadXml(inv); setConfirmDialog(null); },
      });
      return;
    }
    doDownloadXml(inv);
  };

  const handleDeleteInvoice = (inv) => {
    setConfirmDialog({
      title: 'Delete invoice?',
      message: `Delete invoice ${inv.invoiceNo} permanently? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/invoices/${inv.id}`);
          toast.success(`Invoice ${inv.invoiceNo} deleted.`);
          setInvoices(p => p.filter(i => i.id !== inv.id));
          setTotal(t => Math.max(0, t - 1));
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to delete invoice.');
        } finally { setConfirmDialog(null); }
      },
    });
  };

  const exportInvoices = async () => {
    try {
      const baseParams = {
        paymentStatus: filter || undefined,
        search: search.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      };
      const exportLimit = 100;
      const allInvoices = [];
      let exportPage = 1;
      let totalPages = 1;

      do {
        const response = await api.get('/invoices', {
          params: { ...baseParams, page: exportPage, limit: exportLimit },
        });
        const pageRows = response.data.data || [];
        allInvoices.push(...pageRows);
        totalPages = response.data.pagination?.pages || 1;
        exportPage += 1;
      } while (exportPage <= totalPages);

      const rows = allInvoices.map(inv => ({
        'Invoice No': inv.invoiceNo,
        'Invoice Date': formatDate(inv.invoiceDate),
        'Customer': inv.toParty?.name || inv.toPartyName || '',
        'Challan': inv.challan?.challanNo || inv.challanRef || '',
        'Job Card': inv.jobCardRef || '',
        'Subtotal': inv.subtotal,
        'CGST': inv.cgstAmount,
        'SGST': inv.sgstAmount,
        'IGST': inv.igstAmount,
        'Total': inv.totalAmount,
        'Status': inv.paymentStatus,
        'Tally Sent': inv.sentToTally ? 'YES' : 'NO',
      }));
      if (!rows.length) {
        toast.error('No invoices to export.');
        return;
      }
      exportToExcel(rows, `Invoice-Export`);
      toast.success('Invoice data exported to Excel.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export invoices.');
    }
  };

  const totalPages   = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const pendingCount = invoices.filter(i => i.paymentStatus === 'PENDING').length;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Mark Paid Modal */}
      {paidModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600 text-xl">payments</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Mark Invoice as Paid</h3>
                <p className="text-xs text-slate-500 font-mono">{paidModal.invoiceNo}</p>
              </div>
            </div>
            <div>
              <label className="form-label">Payment Received Date</label>
              <input
                type="date"
                value={paidDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setPaidDate(e.target.value)}
                className="form-input w-full"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setPaidModal(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={confirmMarkPaid} className="btn-primary flex-1 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 hover:border-emerald-700">
                <span className="material-symbols-outlined text-sm">check</span> Confirm Paid
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Tax Invoices</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {total > 0 ? `${total} total` : 'GST invoices'}
            {pendingCount > 0 && <span className="ml-2 text-orange-500 font-semibold">· {pendingCount} pending payment</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Setup files belong here, not on one invoice: they are needed once
              per machine, and an invoice locked after Tally hides its own box. */}
          <button type="button" onClick={() => setShowTallySetup(p => !p)}
            className={`btn-outline ${showTallySetup ? 'border-violet-300 text-violet-700 bg-violet-50' : ''}`}>
            <span className="material-symbols-outlined text-sm">download_for_offline</span> Tally Setup
          </button>
          <button onClick={exportInvoices} className="btn-outline">
            <span className="material-symbols-outlined text-sm">file_download</span> Export Excel
          </button>
          <Link to="/invoices/new" className="btn-primary">
            <span className="material-symbols-outlined text-sm">add</span> New Invoice
          </Link>
        </div>
      </div>

      {showTallySetup && (
        <div className="card p-4 sm:p-5 border border-violet-200 bg-violet-50/40 space-y-3">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-violet-500 text-[18px]">handyman</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-violet-800">Tally Setup — ek baar ka kaam</p>
              <p className="text-[11px] text-violet-600 mt-0.5">
                Har naye computer par ek baar. Roz ki invoice ke liye ye zaroori nahi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a href="/Tally-Import.bat" download
              className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-violet-300 transition-colors">
              <span className="material-symbols-outlined text-violet-500">bolt</span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-slate-700">Tally Importer (.bat)</span>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  Desktop pe rakho. Invoice ka XML ispe <strong>drag</strong> karo — seedha Tally me chala jayega.
                </span>
              </span>
            </a>

            <a href="/tally-masters-setup.xml" download
              className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-violet-300 transition-colors">
              <span className="material-symbols-outlined text-violet-500">list_alt</span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-slate-700">Masters XML</span>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  Tally me <span className="font-mono">O: Import → Masters</span> — ledgers, <span className="font-mono">Kgs</span> unit
                  aur stock item ban jayenge.
                </span>
              </span>
            </a>
          </div>

          <p className="text-[10px] text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <strong>Dhyan do:</strong> agar tumhare Tally me sales/tax ledgers <em>pehle se</em> kisi aur naam se hain
            (jaise <span className="font-mono">Output CGST</span>), to Masters XML mat daalo — warna duplicate ledger ban jayenge.
            Us case me party ke form me <strong>Tally Ledger Name</strong> bhar do.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Total invoices"
          value={total}
          sub="All invoices"
          icon="receipt_long"
          iconBg="bg-sky-100 text-sky-700"
        />
        <KpiCard
          label="Paid invoices"
          value={invoices.filter(inv => inv.paymentStatus === 'PAID').length}
          sub="Marked paid on page"
          icon="paid"
          iconBg="bg-emerald-100 text-emerald-700"
        />
        <KpiCard
          label="Pending payment"
          value={pendingCount}
          sub="Needs follow-up"
          badge={pendingCount > 0 ? 'Pending' : 'Clear'}
          badgeColor={pendingCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'}
          icon="schedule"
          iconBg="bg-amber-100 text-amber-700"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] items-end">
          <ListSearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice, party..."
          />
          <div className="flex gap-2 items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="form-input text-xs" />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="form-input text-xs" />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="form-input text-xs w-auto min-w-[170px]"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
          {(search || filter || fromDate || toDate) && (
            <button
              onClick={() => { setSearch(''); setFromDate(''); setToDate(''); setFilter(''); setPage(1); }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium"
            >
              <span className="material-symbols-outlined text-sm">close</span> Clear
            </button>
          )}
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
          <table className="w-full text-left min-w-[520px]">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-sky-50/30 border-b border-slate-100">
                <th className="th">Invoice No</th>
                <th className="th">Date</th>
                <th className="th">To Party</th>
                <th className="th hidden sm:table-cell">Challan</th>
                <th className="th hidden sm:table-cell">Job Card</th>
                <th className="th hidden md:table-cell">Subtotal</th>
                <th className="th hidden md:table-cell">GST</th>
                <th className="th">Total</th>
                <th className="th">Payment</th>
                <th className="th hidden sm:table-cell">Tally</th>
                <th className="th">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({length: 5}).map((_, i) => <SkeletonRow key={i} />)
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-2xl text-sky-300">receipt_long</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">
                      {search.trim()
                        ? `No invoices found for "${search.trim()}".`
                        : filter ? `No ${filter.toLowerCase()} invoices.` : 'No invoices yet.'}
                    </p>
                    {search.trim() ? (
                      <Link
                        to={`/invoices/new?ref=${encodeURIComponent(search.trim())}`}
                        className="inline-flex items-center gap-1 text-xs text-sky-600 font-semibold hover:underline"
                      >
                        <span className="material-symbols-outlined text-sm">add</span> Create invoice for "{search.trim()}"
                      </Link>
                    ) : !filter && (
                      <Link to="/invoices/new" className="inline-flex items-center gap-1 text-xs text-sky-600 font-semibold hover:underline">
                        <span className="material-symbols-outlined text-sm">add</span> Create first invoice
                      </Link>
                    )}
                  </td>
                </tr>
              ) : invoices.map(inv => (
                <tr key={inv.id} className="tr">
                  <td className="td">
                    <Link to={`/invoices/${inv.id}`}
                      className="text-xs font-bold text-sky-600 hover:underline font-mono">
                      {inv.invoiceNo}
                    </Link>
                  </td>
                  <td className="td text-slate-500 whitespace-nowrap">
                    {formatDate(inv.invoiceDate)}
                  </td>
                  <td className="td font-medium text-slate-700 truncate max-w-[150px]">{inv.toParty?.name}</td>
                  <td className="td text-slate-500 font-mono text-[11px] hidden sm:table-cell">
                    {inv.challan?.challanNo || inv.challanRef || '—'}
                  </td>
                  <td className="td text-slate-500 font-mono text-[11px] hidden sm:table-cell">
                    {inv.jobCardRef || '—'}
                  </td>
                  <td className="td text-slate-600 hidden md:table-cell">{formatCurrency(inv.subtotal)}</td>
                  <td className="td text-slate-500 hidden md:table-cell">
                    {formatCurrency(Number(inv.cgstAmount || 0) + Number(inv.sgstAmount || 0) + Number(inv.igstAmount || 0))}
                  </td>
                  <td className="td font-bold text-slate-800">{formatCurrency(inv.totalAmount)}</td>
                  <td className="td">
                    <span className={`badge ${PAY_STYLE[inv.paymentStatus] || 'bg-slate-100 text-slate-600'}`}>
                      {inv.paymentStatus}
                    </span>
                  </td>
                  <td className="td hidden sm:table-cell">
                    {inv.sentToTally ? (
                      <span className="badge bg-violet-100 text-violet-700">
                        <span className="material-symbols-outlined text-[12px]">lock</span> Sent
                      </span>
                    ) : inv.xmlDownloadedAt ? (
                      <span
                        className="badge bg-amber-100 text-amber-700 whitespace-nowrap"
                        title={`Option B — Download XML & Import Manually. Last downloaded ${formatDate(inv.xmlDownloadedAt, true)}.`}
                      >
                        <span className="material-symbols-outlined text-[12px]">download_done</span> XML Downloaded
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="td">
                    <div className="flex gap-2 items-center">
                      <Link to={`/invoices/${inv.id}/print`}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition-all"
                        title="Print Invoice">
                        <span className="material-symbols-outlined text-[18px]">print</span>
                      </Link>
                      <Link to={`/invoices/${inv.id}`}
                        title="View"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition-all">
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </Link>
                      <button
                        onClick={() => handleDownloadXml(inv)}
                        title={inv.xmlDownloadedAt
                          ? `Already downloaded on ${formatDate(inv.xmlDownloadedAt, true)} — click to download again`
                          : 'Download Tally XML — Option B: Download XML & Import Manually'}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-slate-100 ${
                          inv.xmlDownloadedAt ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-violet-600'
                        }`}>
                        <span className="material-symbols-outlined text-[18px]">
                          {inv.xmlDownloadedAt ? 'download_done' : 'download'}
                        </span>
                      </button>
                      {inv.paymentStatus !== 'PAID' && !inv.sentToTally && (
                        <button
                          onClick={() => { setPaidDate(new Date().toISOString().split('T')[0]); setPaidModal({ id: inv.id, invoiceNo: inv.invoiceNo }); }}
                          className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                          Mark Paid
                        </button>
                      )}
                      {!inv.sentToTally && (
                        <button
                          onClick={() => handleDeleteInvoice(inv)}
                          title="Delete Invoice"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && total > 0 && (
          <PageNav page={page} totalPages={totalPages} total={total} limit={PAGE_LIMIT} setPage={setPage} />
        )}
      </div>

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
