import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Plus, Download, Printer, Eye, Trash2, X, AlertCircle, Lock,
  FileDown, FileCheck2, ReceiptText, Banknote, Wrench, Zap, ListChecks, Check, FileUp,
  FileJson, BadgeCheck, Pencil,
} from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../utils/export';
import KpiCard from '../../components/KpiCard';
import { formatCurrency, formatDate } from '../../utils/formatters';
import ListSearchInput from '../../components/ListSearchInput';
import PageNav from '../../components/PageNav';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { RowActions, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/row-actions';

const PAY_VARIANT = {
  PENDING: 'warning',
  PARTIAL: 'info',
  PAID:    'success',
};

const PAGE_LIMIT = 10;

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

const SkeletonRow = () => (
  <tr>
    {Array.from({ length: 9 }, (_, i) => i).map(i => (
      <td key={i} className="td"><Skeleton className="h-3.5 w-full" /></td>
    ))}
  </tr>
);

export default function InvoiceList() {
  const { isAdmin } = useAuth();
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
  const [einvImporting, setEinvImporting] = useState(false);
  const einvFileRef = useRef(null);

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

  // ── GST e-Invoice JSON (portal ke liye) ──
  const IRP_BULK_UPLOAD_URL = 'https://einvoice1.gst.gov.in/Invoice/BulkUpload';

  const doDownloadEInvoiceJson = async (inv) => {
    try {
      const r = await api.get(`/invoices/${inv.id}/einvoice-json`, { responseType: 'blob' });
      const filename = `${inv.invoiceNo.replace(/\//g, '-')}_einvoice.json`;
      const blobUrl = URL.createObjectURL(new Blob([r.data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);

      window.open(IRP_BULK_UPLOAD_URL, '_blank', 'noopener,noreferrer');
      toast.success('JSON download ho gayi. Portal naye tab me khul raha hai — wahan ye file upload kijiye.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'e-Invoice JSON nahi ban payi.');
    }
  };

  const handleDownloadEInvoiceJson = async (inv) => {
    try {
      // Portal ki error report padhne se behtar hai ki dikkat yahin pata chale.
      const check = await api.get(`/invoices/${inv.id}/einvoice-check`);
      const problems = check.data?.data?.problems || [];
      if (problems.length) {
        setConfirmDialog({
          title: `${inv.invoiceNo} — e-Invoice me dikkat`,
          message: problems.join('\n') + '\n\nPhir bhi file download karein? Portal ise reject kar sakta hai.',
          confirmLabel: 'Phir bhi download karo',
          variant: 'primary',
          onConfirm: async () => { setConfirmDialog(null); await doDownloadEInvoiceJson(inv); },
        });
        return;
      }
      await doDownloadEInvoiceJson(inv);
    } catch (err) {
      toast.error(err.response?.data?.message || 'e-Invoice jaanch nahi ho payi.');
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

  // Portal se download ki hui result Excel — usme kai invoices ho sakti hain.
  const handleEInvoiceFile = async (e) => {
    const file = e.target.files?.[0];
    // Input ko turant khali kar dete hain, warna wahi file dobara chunne par
    // onChange chalta hi nahi.
    e.target.value = '';
    if (!file) return;

    setEinvImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post('/invoices/einvoice-import', fd);
      const { updated = [], notFound = [], skipped = [] } = r.data?.data || {};

      if (updated.length) toast.success(`${updated.length} invoice me IRN save ho gaya.`);
      else toast.error('Ek bhi invoice update nahi hui.');

      if (notFound.length || skipped.length) {
        setConfirmDialog({
          title: 'Import ka nateeja',
          message: [
            `Update hui: ${updated.length}`,
            notFound.length ? `\nERP me ye invoice number nahi mile (${notFound.length}):\n${notFound.join(', ')}` : '',
            skipped.length ? `\nIRN khali tha, chhod diya (${skipped.length}):\n${skipped.map(s => s.invoiceNo).join(', ')}` : '',
          ].filter(Boolean).join('\n'),
          confirmLabel: 'Theek hai',
          variant: 'primary',
          onConfirm: () => setConfirmDialog(null),
        });
      }
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Excel import nahi ho payi.');
    } finally {
      setEinvImporting(false);
    }
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
  const hasFilters   = Boolean(search || filter || fromDate || toDate);

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">
      {/* Mark Paid Modal */}
      {paidModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px] px-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card-elevated w-full max-w-sm p-5 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Banknote className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 leading-tight">Mark Invoice as Paid</h3>
                <p className="text-xs text-slate-500 font-mono truncate">{paidModal.invoiceNo}</p>
              </div>
            </div>
            <FormField label="Payment Received Date" htmlFor="paid-date">
              <Input
                id="paid-date"
                type="date"
                value={paidDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setPaidDate(e.target.value)}
              />
            </FormField>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setPaidModal(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmMarkPaid}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 focus-visible:ring-emerald-500">
                <Check /> Confirm Paid
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Tax Invoices</h1>
          <p className="page-subtitle">
            {total > 0 ? `${total} total` : 'GST invoices'}
            {pendingCount > 0 && <span className="ml-2 text-amber-600 font-semibold">· {pendingCount} pending payment</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Setup files belong here, not on one invoice: they are needed once
              per machine, and an invoice locked after Tally hides its own box. */}
          <Button type="button" variant="outline" onClick={() => setShowTallySetup(p => !p)}
            className={showTallySetup ? 'border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100' : ''}>
            <Wrench /> Tally Setup
          </Button>
          {/* Portal ki result Excel ek saath kai invoices ki hoti hai,
              isliye import yahan hai — kisi ek invoice ke page par nahi. */}
          <input
            ref={einvFileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleEInvoiceFile}
          />
          <Button type="button" variant="outline" onClick={() => einvFileRef.current?.click()}
            disabled={einvImporting}
            className="border-sky-300 text-sky-700 hover:bg-sky-50 hover:border-sky-400">
            <FileUp /> {einvImporting ? 'Import ho raha hai…' : 'Import e-Invoice Excel'}
          </Button>
          <Button type="button" variant="outline" onClick={exportInvoices}>
            <Download /> Export Excel
          </Button>
          <Button asChild>
            <Link to="/invoices/new">
              <Plus /> New Invoice
            </Link>
          </Button>
        </div>
      </div>

      {showTallySetup && (
        <Card className="border-violet-200 bg-violet-50/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Wrench className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
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
                <Zap className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-700">Tally Importer (.bat)</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    Desktop pe rakho. Invoice ka XML ispe <strong>drag</strong> karo — seedha Tally me chala jayega.
                  </span>
                </span>
              </a>

              <a href="/tally-masters-setup.xml" download
                className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-violet-300 transition-colors">
                <ListChecks className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
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
          </CardContent>
        </Card>
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

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
            <div className="space-y-1 flex-1 min-w-[220px]">
              <FilterLabel>Search</FilterLabel>
              <ListSearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice, party..."
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <FilterLabel htmlFor="inv-from-date">From</FilterLabel>
              <input id="inv-from-date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                className="form-input text-xs sm:w-36" />
            </div>
            <div className="space-y-1">
              <FilterLabel htmlFor="inv-to-date">To</FilterLabel>
              <input id="inv-to-date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                className="form-input text-xs sm:w-36" />
            </div>
            <div className="space-y-1">
              <FilterLabel htmlFor="inv-status-filter">Status</FilterLabel>
              <select
                id="inv-status-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="form-input text-xs sm:w-40"
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
            {hasFilters && (
              <Button type="button" variant="ghost" size="sm"
                onClick={() => { setSearch(''); setFromDate(''); setToDate(''); setFilter(''); setPage(1); }}
                className="text-slate-500 hover:text-rose-600">
                <X /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={fetchData} className="ml-auto text-xs font-bold hover:underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr>
                <th className="th">Invoice No</th>
                <th className="th">Date</th>
                <th className="th">To Party</th>
                <th className="th hidden sm:table-cell">Challan</th>
                <th className="th hidden sm:table-cell">Job Card</th>
                <th className="th text-right">Total</th>
                <th className="th">Payment</th>
                <th className="th hidden sm:table-cell">Tally</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                        <ReceiptText className="h-5 w-5 text-sky-300" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {search.trim()
                          ? `No invoices found for "${search.trim()}".`
                          : filter ? `No ${filter.toLowerCase()} invoices.` : 'No invoices yet.'}
                      </p>
                      {search.trim() ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/invoices/new?ref=${encodeURIComponent(search.trim())}`}>
                            <Plus /> Create invoice for "{search.trim()}"
                          </Link>
                        </Button>
                      ) : !filter && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/invoices/new">
                            <Plus /> Create first invoice
                          </Link>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : invoices.map(inv => (
                <tr key={inv.id} className="tr group">
                  <td className="td">
                    <Link to={`/invoices/${inv.id}`}
                      className="text-xs font-bold text-sky-800 hover:text-sky-950 hover:underline font-mono">
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
                  <td className="td font-bold text-slate-800 text-right tabular-nums">{formatCurrency(inv.totalAmount)}</td>
                  <td className="td">
                    <Badge variant={PAY_VARIANT[inv.paymentStatus] || 'neutral'} className="px-2 py-0.5 text-[10px]">
                      {inv.paymentStatus}
                    </Badge>
                  </td>
                  <td className="td hidden sm:table-cell">
                    {inv.sentToTally ? (
                      <Badge className="bg-violet-100 text-violet-700 px-2 py-0.5 text-[10px]">
                        <Lock className="h-3 w-3" /> Sent
                      </Badge>
                    ) : inv.xmlDownloadedAt ? (
                      <Badge variant="warning" className="px-2 py-0.5 text-[10px] whitespace-nowrap"
                        title={`Option B — Download XML & Import Manually. Last downloaded ${formatDate(inv.xmlDownloadedAt, true)}.`}>
                        <FileCheck2 className="h-3 w-3" /> XML Downloaded
                      </Badge>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" asChild
                        className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                        <Link to={`/invoices/${inv.id}`} aria-label={`View invoice ${inv.invoiceNo}`}>
                          <Eye />
                        </Link>
                      </Button>
                      <RowActions label={`Actions for invoice ${inv.invoiceNo}`}>
                        <DropdownMenuItem asChild>
                          <Link to={`/invoices/${inv.id}/print`}><Printer /> Print</Link>
                        </DropdownMenuItem>
                        {isAdmin && !inv.sentToTally && !inv.irnNo && (
                          <DropdownMenuItem asChild>
                            <Link to={`/invoices/${inv.id}/edit`}><Pencil /> Edit</Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleDownloadEInvoiceJson(inv)}>
                          {inv.irnNo ? <BadgeCheck /> : <FileJson />}
                          {inv.irnNo ? 'e-Invoice JSON (IRN ready)' : 'Download e-Invoice JSON'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDownloadXml(inv)}>
                          {inv.xmlDownloadedAt ? <FileCheck2 /> : <FileDown />}
                          {inv.xmlDownloadedAt ? 'Tally XML (downloaded)' : 'Download Tally XML'}
                        </DropdownMenuItem>
                        {inv.paymentStatus !== 'PAID' && !inv.sentToTally && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => { setPaidDate(new Date().toISOString().split('T')[0]); setPaidModal({ id: inv.id, invoiceNo: inv.invoiceNo }); }}>
                              <Banknote /> Mark paid
                            </DropdownMenuItem>
                          </>
                        )}
                        {!inv.sentToTally && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem destructive onSelect={() => handleDeleteInvoice(inv)}>
                              <Trash2 /> Delete invoice
                            </DropdownMenuItem>
                          </>
                        )}
                      </RowActions>
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
