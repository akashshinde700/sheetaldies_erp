import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Printer, Lock, Send, Banknote, Mail, Download, CheckCircle2,
  Zap, ListChecks, Info,
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import KpiCard from '../../components/KpiCard';
import { toNum } from '../../utils/normalize';
import { formatCurrency, formatDate } from '../../utils/formatters';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

const PAY_COLOR = {
  PENDING: 'bg-orange-100 text-orange-700',
  PARTIAL: 'bg-sky-100 text-sky-700',
  PAID:    'bg-emerald-100 text-emerald-700',
};

const PAY_VARIANT = {
  PENDING: 'warning',
  PARTIAL: 'info',
  PAID:    'success',
};

const Def = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
    <div className="text-sm font-semibold text-slate-800 break-words">{children}</div>
  </div>
);

export default function InvoiceDetail() {
  const { id }    = useParams();
  const [inv,          setInv]          = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [tallyUrl,     setTallyUrl]     = useState('http://localhost:9000');
  const [pushLoading,  setPushLoading]  = useState(false);
  const [markLoading,  setMarkLoading]  = useState(false);
  const [showTallyBox, setShowTallyBox] = useState(false);
  const [billingStatus, setBillingStatus] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [eInvoice, setEInvoice] = useState({ irnNo: '', ackNo: '', ackDate: '' });
  const [savingEInvoice, setSavingEInvoice] = useState(false);

  useEffect(() => {
    api.get(`/invoices/${id}`)
      .then(r => {
        setInv(r.data.data);
        setEInvoice({
          irnNo: r.data.data.irnNo || '',
          ackNo: r.data.data.ackNo || '',
          ackDate: r.data.data.ackDate ? r.data.data.ackDate.slice(0, 10) : '',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const saveEInvoice = async () => {
    setSavingEInvoice(true);
    try {
      await api.patch(`/invoices/${id}/einvoice`, eInvoice);
      setInv(p => ({ ...p, ...eInvoice }));
      toast.success('e-Invoice details saved.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save e-invoice details.');
    } finally {
      setSavingEInvoice(false);
    }
  };

  useEffect(() => {
    if (!inv?.challanId) return;
    api.get(`/invoices/challan/${inv.challanId}/billing-status`)
      .then(r => setBillingStatus(r.data.data || null))
      .catch(() => setBillingStatus(null));
  }, [inv?.challanId]);

  const markPaid = async () => {
    setSaving(true);
    try {
      await api.patch(`/invoices/${id}/payment`, { paymentStatus: 'PAID', paidDate: new Date().toISOString().split('T')[0] });
      toast.success('Marked as Paid.');
      setInv(p => ({ ...p, paymentStatus: 'PAID' }));
    } catch { toast.error('Error updating payment.'); }
    finally { setSaving(false); }
  };

  const pushToTally = () => {
    setConfirmDialog({
      title: 'Push invoice to Tally?',
      message: `Push invoice to Tally at "${tallyUrl}"?\n\nMake sure:\n• Tally is open\n• HTTP server is enabled\n• Customer ledger "${inv.toParty?.name}" exists in Tally\n\nAfter push the invoice will be permanently locked.`,
      confirmLabel: 'Push to Tally',
      variant: 'primary',
      icon: 'send',
      onConfirm: async () => {
        setPushLoading(true);
        try {
          const r = await api.post(`/invoices/${id}/send-to-tally`, { tallyUrl });
          toast.success(r.data.message || 'Pushed to Tally!');
          setInv(p => ({ ...p, sentToTally: true, sentToTallyAt: new Date().toISOString() }));
          setShowTallyBox(false);
        } catch (err) {
          const msg = err.response?.data?.message || 'Connection failed.';
          const hint = err.response?.data?.hint || '';
          toast.error(msg, { duration: 6000 });
          if (hint) toast(hint, { icon: '💡', duration: 8000 });
        } finally { setPushLoading(false); setConfirmDialog(null); }
      },
    });
  };

  const downloadXml = () => {
    api.get(`/invoices/${id}/tally-xml`, { responseType: 'blob' }).then(r => {
      const filename = `${inv.invoiceNo.replace(/\//g, '-')}_tally.xml`;
      const blobUrl  = URL.createObjectURL(new Blob([r.data], { type: 'application/xml' }));
      const a        = document.createElement('a');
      a.href         = blobUrl;
      a.download     = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    }).catch(() => toast.error('Error generating XML.'));
  };

  // ── GST e-Invoice: JSON portal par upload karne ke liye ──
  // Portal ka bulk-upload page. Download ke saath hi khul jaata hai taaki
  // file turant wahan daali ja sake.
  const IRP_BULK_UPLOAD_URL = 'https://einvoice1.gst.gov.in/Invoice/BulkUpload';

  const downloadEInvoiceJson = async () => {
    try {
      // Pehle jaanch — portal ki error report padhne se behtar hai ki
      // dikkat yahin pata chal jaye.
      const check = await api.get(`/invoices/${id}/einvoice-check`);
      const problems = check.data?.data?.problems || [];

      if (problems.length) {
        setConfirmDialog({
          title: 'e-Invoice has issues',
          message: problems.join('\n') + '\n\nDownload the file anyway? The portal may reject it.',
          confirmLabel: 'Download anyway',
          variant: 'primary',
          onConfirm: () => { setConfirmDialog(null); doDownloadEInvoiceJson(); },
        });
        return;
      }
      doDownloadEInvoiceJson();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not check the e-Invoice details.');
    }
  };

  const doDownloadEInvoiceJson = async () => {
    try {
      const r = await api.get(`/invoices/${id}/einvoice-json`, { responseType: 'blob' });
      const filename = `${inv.invoiceNo.replace(/\//g, '-')}_einvoice.json`;
      const blobUrl = URL.createObjectURL(new Blob([r.data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);

      window.open(IRP_BULK_UPLOAD_URL, '_blank', 'noopener,noreferrer');
      toast.success('JSON downloaded. The portal is opening in a new tab — upload this file there.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not build the e-Invoice JSON.');
    }
  };

  const sendNotification = async (type) => {
    const to = type === 'email' ? inv.toParty?.email : inv.toParty?.phone;
    if (!to) {
      toast.error(`No ${type === 'email' ? 'email' : 'phone'} found for customer.`);
      return;
    }

    const message = `Invoice ${inv.invoiceNo} of ${formatCurrency(inv.grandTotal)} has been generated. Please check the ERP system.`;

    try {
      const r = await api.post(`/invoices/${id}/notify`, { type, to, message });
      toast.success(r.data.message || 'Notification sent.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Notification failed.');
    }
  };

  const markSentToTally = () => {
    setConfirmDialog({
      title: 'Mark as sent to Tally?',
      message: 'This will lock the invoice permanently.',
      confirmLabel: 'Lock Invoice',
      variant: 'danger',
      icon: 'lock',
      onConfirm: async () => {
        setMarkLoading(true);
        try {
          const r = await api.post(`/invoices/${id}/mark-sent-to-tally`);
          toast.success(r.data.message || 'Invoice locked.');
          setInv(p => ({ ...p, sentToTally: true, sentToTallyAt: new Date().toISOString() }));
          setShowTallyBox(false);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error.');
        } finally { setMarkLoading(false); setConfirmDialog(null); }
      },
    });
  };

  if (loading) return (
    <div className="page-stack w-full space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
  if (!inv) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm text-slate-400">Invoice not found.</p>
    </div>
  );

  const siblings = inv.siblingInvoices || [];

  return (
    <div className="page-stack w-full space-y-4 animate-slide-up">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="icon-sm" asChild
            className="text-slate-400 hover:text-sky-700 border border-slate-200 bg-white shrink-0 mt-0.5">
            <Link to="/invoices" title="Back to invoices" aria-label="Back to invoices">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title font-mono">{inv.invoiceNo}</h1>
              <Badge variant={PAY_VARIANT[inv.paymentStatus] || 'neutral'} className="px-2 py-0.5 text-[10px]">
                {inv.paymentStatus}
              </Badge>
              {inv.sentToTally && (
                <Badge className="bg-violet-100 text-violet-700 px-2 py-0.5 text-[10px]">
                  <Lock className="h-3 w-3" /> Sent to Tally
                </Badge>
              )}
            </div>
            <p className="page-subtitle">Tax Invoice — {formatDate(inv.invoiceDate)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button variant="outline" asChild>
            <Link to={`/invoices/${id}/print`}>
              <Printer /> Print / PDF
            </Link>
          </Button>
          {!inv.sentToTally && (
            <Button type="button" onClick={() => setShowTallyBox(p => !p)}
              className="bg-gradient-to-br from-violet-600 to-indigo-500 hover:from-violet-700 hover:to-indigo-600 shadow-violet-600/20 focus-visible:ring-violet-400">
              <Send /> Tally
            </Button>
          )}
          {inv.paymentStatus !== 'PAID' && !inv.sentToTally && (
            <Button type="button" onClick={markPaid} disabled={saving} loading={saving}>
              {saving ? 'Saving...' : <><Banknote /> Mark Paid</>}
            </Button>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={() => sendNotification('email')}>
            <Mail /> Email
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Invoice total"
          value={formatCurrency(inv.grandTotal ?? inv.totalAmount)}
          sub="Grand total"
          icon="receipt_long"
          iconBg="bg-sky-100 text-sky-700"
        />
        <KpiCard
          label="Payment status"
          value={inv.paymentStatus}
          sub="Current invoice state"
          icon="paid"
          iconBg="bg-emerald-100 text-emerald-700"
          badge={inv.paymentStatus}
          badgeColor={PAY_COLOR[inv.paymentStatus] || 'bg-slate-100 text-slate-600'}
        />
        <KpiCard
          label="Invoice date"
          value={formatDate(inv.invoiceDate)}
          sub={inv.dueDate ? `Due ${formatDate(inv.dueDate)}` : 'No due date'}
          icon="event"
          iconBg="bg-slate-100 text-slate-700"
        />
      </div>

      {/* GST e-Invoice box — kram me Tally se pehle: pehle IRN, phir Tally. */}
      <Card className="border-sky-200 bg-sky-50/50">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div>
            <p className="text-sm font-bold text-sky-800">GST e-Invoice (IRN)</p>
            <p className="text-xs text-sky-600 mt-0.5">
              Upload the JSON to the portal, generate the IRN and e-Way Bill there, then import the result Excel back from the Invoices page.
            </p>
          </div>

          {inv.irnNo ? (
            <div className="bg-white rounded-xl border-2 border-emerald-300 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">IRN received</p>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div className="sm:col-span-2">
                  <dt className="text-slate-400 font-semibold uppercase text-[10px]">IRN</dt>
                  <dd className="font-mono text-slate-700 break-all">{inv.irnNo}</dd>
                </div>
                {inv.ackNo && (
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase text-[10px]">Ack No.</dt>
                    <dd className="font-mono text-slate-700">{inv.ackNo}</dd>
                  </div>
                )}
                {inv.eWayBillNo && (
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase text-[10px]">e-Way Bill No.</dt>
                    <dd className="font-mono text-slate-700">{inv.eWayBillNo}</dd>
                  </div>
                )}
              </dl>
            </div>
          ) : (
            <div className="bg-white rounded-xl border-2 border-sky-300 p-4 space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">JSON for the portal</p>
              <ol className="text-xs text-slate-500 list-decimal ml-4 space-y-0.5">
                <li>Download the JSON below — the portal opens by itself in a new tab</li>
                <li>On the portal, use <strong>Choose File → Upload</strong> to send this JSON</li>
                <li>Generate the IRN and e-Way Bill, then download the result Excel</li>
                <li>Bring that Excel back in from <strong>Invoices</strong> → "Import e-Invoice Excel"</li>
              </ol>
              <Button type="button" onClick={downloadEInvoiceJson}
                className="bg-gradient-to-br from-sky-600 to-cyan-500 hover:from-sky-700 hover:to-cyan-600 shadow-sky-600/20 focus-visible:ring-sky-400">
                <Download /> Download e-Invoice JSON
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tally action box */}
      {!inv.sentToTally && showTallyBox && (
        <Card className="border-violet-200 bg-violet-50/50">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div>
              <p className="text-sm font-bold text-violet-800">Send Invoice to Tally</p>
              <p className="text-xs text-violet-600 mt-0.5">
                Invoice will be created as a <strong>Sales Voucher</strong> in Tally. Once sent, it will be permanently locked.
              </p>
            </div>
            {/* Download-and-import comes first: it is the route that works when
                the API runs on a server and Tally sits on someone's desk. */}
            <div className="bg-white rounded-xl border-2 border-violet-300 p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Download XML &amp; Import</p>
                <Badge className="bg-violet-100 text-violet-700 px-2 py-0.5 text-[10px]">Recommended</Badge>
              </div>
              <ol className="text-xs text-slate-500 list-decimal ml-4 space-y-0.5">
                <li>Download the XML below</li>
                <li>In Tally, open the company you want the voucher in</li>
                <li><strong>O: Import → Transactions</strong> → pick the file</li>
                <li>Come back and click "Mark as Sent" to lock this invoice</li>
              </ol>
              <div className="flex gap-2 flex-wrap">
                <Button type="button" onClick={downloadXml}
                  className="bg-gradient-to-br from-violet-600 to-indigo-500 hover:from-violet-700 hover:to-indigo-600 shadow-violet-600/20 focus-visible:ring-violet-400">
                  <Download /> Download Tally XML
                </Button>
                <Button type="button" variant="outline" onClick={markSentToTally} disabled={markLoading}
                  className="border-violet-300 text-violet-700 hover:bg-violet-50 hover:border-violet-400">
                  <CheckCircle2 />
                  {markLoading ? 'Locking...' : 'Mark as Sent (Lock Invoice)'}
                </Button>
              </div>
              <p className="text-[10px] text-slate-400">
                The ledgers and stock item named on the invoice must already exist in that Tally company — Tally never creates them on import.
              </p>

              {/* Both are plain static files, so a normal link is enough — no
                  script-driven download that the browser might block. */}
              <div className="border-t border-slate-100 pt-2.5 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">One-time setup</span>
                <a href="/Tally-Import.bat" download
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-violet-700">
                  <Zap className="h-3.5 w-3.5" />
                  Tally Importer (.bat)
                </a>
                <a href="/tally-masters-setup.xml" download
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-violet-700">
                  <ListChecks className="h-3.5 w-3.5" />
                  Masters XML
                </a>
                <span className="text-[10px] text-slate-400 basis-full">
                  Importer ko Desktop pe rakho aur invoice XML usme drag karo — seedha Tally me chala jayega.
                  Masters XML ek baar <span className="font-mono">O: Import → Masters</span> se daalo (ledgers, unit, stock item).
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Direct Push — advanced</p>
              <div className="flex gap-2 items-start text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  This push is made by the <strong>API server</strong>, not your browser — so <code className="font-mono">localhost</code> here means the server, not your PC.
                  It only works if Tally is reachable from the server over the network. If Tally is open on your own computer, use Download XML above.
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <label htmlFor="tally-url" className="text-xs text-slate-500 whitespace-nowrap">Tally URL:</label>
                <Input id="tally-url" value={tallyUrl} onChange={e => setTallyUrl(e.target.value)}
                  className="flex-1 font-mono text-xs" placeholder="http://localhost:9000" />
              </div>
              <p className="text-[10px] text-slate-400">Tally → F1: Help → Settings → Connectivity → Client/Server configuration → acts as Both, Port 9000</p>
              <Button type="button" variant="outline" onClick={pushToTally} disabled={pushLoading}>
                <Zap />
                {pushLoading ? 'Pushing...' : 'Push to Tally Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {inv.sentToTally && (
        <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-sm text-violet-700">
          <Lock className="h-4 w-4 shrink-0" />
          <span>Sent to Tally on <strong>{formatDate(inv.sentToTallyAt, true)}</strong>. Invoice is permanently locked.</span>
        </div>
      )}

      {/* Party + Refs */}
      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">From (Issuer)</p>
            <p className="text-sm font-bold text-slate-800">{inv.fromParty?.name}
              {inv.fromParty?.partyCode && <span className="ml-2 text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{inv.fromParty.partyCode}</span>}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{inv.fromParty?.address}</p>
            {inv.fromParty?.gstin && <p className="text-xs text-slate-600 mt-0.5 font-mono">GSTIN: <strong>{inv.fromParty.gstin}</strong></p>}
            {inv.fromParty?.pan   && <p className="text-xs text-slate-500">PAN: {inv.fromParty.pan}</p>}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">To (Customer)</p>
            <p className="text-sm font-bold text-slate-800">{inv.toParty?.name}
              {inv.toParty?.partyCode && <span className="ml-2 text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{inv.toParty.partyCode}</span>}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{inv.toParty?.address}</p>
            {inv.toParty?.gstin && <p className="text-xs text-slate-600 mt-0.5 font-mono">GSTIN: <strong>{inv.toParty.gstin}</strong></p>}
            {inv.toParty?.pan   && <p className="text-xs text-slate-500">PAN: {inv.toParty.pan}</p>}
          </div>
          <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-3 grid grid-cols-2 md:grid-cols-3 gap-4">
            <Def label="Invoice Date">{formatDate(inv.invoiceDate)}</Def>
            {inv.dispatchDate    && <Def label="Dispatch Date">{formatDate(inv.dispatchDate)}</Def>}
            {inv.challan         && <Def label="Linked Challan"><span className="text-sky-700">{inv.challan.challanNo}</span></Def>}
            {inv.challanRef      && <Def label="Challan Ref">{inv.challanRef}</Def>}
            {inv.poRef           && <Def label="PO Ref">{inv.poRef}</Def>}
            {inv.jobCardRef      && <Def label="Job Card Ref">{inv.jobCardRef}</Def>}
            {inv.otherReferences && <Def label="Other References">{inv.otherReferences}</Def>}
            {inv.dispatchDocNo   && <Def label="Dispatch Doc No"><span className="font-mono">{inv.dispatchDocNo}</span></Def>}
            {inv.eWayBillNo      && <Def label="E-Way Bill No"><span className="font-mono">{inv.eWayBillNo}</span></Def>}
            {inv.paidDate        && <Def label="Paid Date"><span className="text-emerald-700">{formatDate(inv.paidDate)}</span></Def>}
            {inv.paymentRef      && <Def label="Payment Ref">{inv.paymentRef}</Def>}
          </div>
        </CardContent>
      </Card>

      {/* e-Invoice Details (IRN/Ack No/Ack Date) — manually entered after
          submitting this invoice to the government e-invoice portal outside
          this system; the print page's QR code is generated from these. */}
      <Card>
        <CardHeader>
          <CardTitle>e-Invoice Details (IRN)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="IRN" htmlFor="einv-irn">
              <Input id="einv-irn" type="text" value={eInvoice.irnNo}
                onChange={e => setEInvoice(p => ({ ...p, irnNo: e.target.value }))}
                className="font-mono text-xs" placeholder="Paste IRN from e-invoice portal" />
            </FormField>
            <FormField label="Ack No" htmlFor="einv-ackno">
              <Input id="einv-ackno" type="text" value={eInvoice.ackNo}
                onChange={e => setEInvoice(p => ({ ...p, ackNo: e.target.value }))}
                className="font-mono text-xs" placeholder="Acknowledgement no." />
            </FormField>
            <FormField label="Ack Date" htmlFor="einv-ackdate">
              <Input id="einv-ackdate" type="date" value={eInvoice.ackDate}
                onChange={e => setEInvoice(p => ({ ...p, ackDate: e.target.value }))}
                className="text-xs" />
            </FormField>
          </div>
          <div className="flex justify-end mt-3">
            <Button type="button" variant="outline" size="sm" onClick={saveEInvoice} disabled={savingEInvoice}>
              {savingEInvoice ? 'Saving...' : 'Save e-Invoice Details'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sibling Invoices */}
      {siblings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Other Invoices from Same Challan ({inv.challan?.challanNo})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {siblings.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-2 flex-wrap text-sm border border-slate-100 rounded-xl px-4 py-2.5 hover:bg-slate-50 transition-colors">
                <Link to={`/invoices/${s.id}`} className="font-mono text-xs font-bold text-sky-700 hover:text-sky-900 hover:underline">{s.invoiceNo}</Link>
                <span className="text-slate-500 text-xs">{formatDate(s.createdAt)}</span>
                <span className="font-semibold text-slate-700 tabular-nums">{formatCurrency(s.totalAmount)}</span>
                <Badge variant={PAY_VARIANT[s.paymentStatus] || 'neutral'} className="px-2 py-0.5 text-[10px]">{s.paymentStatus}</Badge>
                {s.sentToTally && <Badge className="bg-violet-100 text-violet-700 px-2 py-0.5 text-[10px]">TALLY SENT</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Per-line dispatched vs balance summary */}
      {billingStatus?.lineStatus?.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Per-line Dispatched vs Balance Summary</CardTitle>
          </CardHeader>
          <div className="table-responsive">
            <table className="w-full text-left min-w-[480px]">
              <thead>
                <tr>
                  <th className="th">Line</th>
                  <th className="th">Description</th>
                  <th className="th text-right">Total Qty</th>
                  <th className="th text-right">Dispatched</th>
                  <th className="th text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {billingStatus.lineStatus.map((ln, idx) => (
                  <tr key={ln.challanItemId} className="tr">
                    <td className="td text-slate-400 font-mono">{idx + 1}</td>
                    <td className="td text-slate-700">{ln.description || '-'}</td>
                    <td className="td text-right tabular-nums">{ln.totalQty}</td>
                    <td className="td text-right tabular-nums">{ln.dispatchedQty ?? '-'}</td>
                    <td className="td text-right tabular-nums font-bold">{ln.remainingQty}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="td" />
                  <td className="td font-bold">Total</td>
                  <td className="td text-right tabular-nums font-bold">{billingStatus.totalQty}</td>
                  <td className="td text-right tabular-nums font-bold">{billingStatus.totalDispatchedQty ?? '-'}</td>
                  <td className="td text-right tabular-nums font-bold">{billingStatus.totalRemainingQty}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Line Items */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Services / Items</CardTitle>
          <span className="text-[10px] text-slate-400 font-semibold italic">E &amp; O E</span>
        </CardHeader>
        <CardContent>
          <div className="table-responsive -mx-4 sm:-mx-5">
            <table className="w-full text-left min-w-[760px]">
              <thead>
                <tr>
                  {['Sr.','Description','Material','HRC','WO No','SAC No'].map(h => (
                    <th key={h} className="th whitespace-nowrap">{h}</th>
                  ))}
                  <th className="th text-right">Qty</th>
                  <th className="th">UOM</th>
                  <th className="th text-right whitespace-nowrap">Weight (kg)</th>
                  <th className="th text-right">Rate ₹</th>
                  <th className="th text-right">Amount ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {(() => {
                  const groups = {};
                  (inv.items || []).forEach((it, idx) => {
                    const key = it.processType?.name || it.processTypeId || '__none__';
                    if (!groups[key]) groups[key] = { label: it.processType?.name || null, items: [] };
                    groups[key].items.push({ ...it, _idx: idx });
                  });
                  let srNo = 0;
                  return Object.values(groups).map((grp, gi) => (
                    <>
                      {grp.label && (
                        <tr key={`grp-${gi}`} className="bg-sky-50/50">
                          <td colSpan={11} className="px-4 py-1.5 text-[10px] font-extrabold text-sky-700 uppercase tracking-wider">{grp.label}</td>
                        </tr>
                      )}
                      {grp.items.map(it => {
                        srNo++;
                        return (
                          <tr key={it.id} className="tr">
                            <td className="td text-slate-400 font-mono">{srNo}</td>
                            <td className="td font-medium text-slate-800">{it.description}</td>
                            <td className="td text-slate-600">{it.material || '—'}</td>
                            <td className="td text-slate-600">{it.hrc || '—'}</td>
                            <td className="td text-slate-600">{it.woNo || '—'}</td>
                            <td className="td font-mono text-slate-500">{it.hsnSac || '—'}</td>
                            <td className="td text-slate-600 text-right tabular-nums">{it.quantity}</td>
                            <td className="td text-slate-500">{it.unit || 'KGS'}</td>
                            <td className="td text-slate-600 text-right tabular-nums">{it.weight ? toNum(it.weight, 0).toFixed(3) : '—'}</td>
                            <td className="td text-slate-600 text-right tabular-nums">{formatCurrency(it.rate)}</td>
                            <td className="td font-bold text-slate-800 text-right tabular-nums">{formatCurrency(it.amount)}</td>
                          </tr>
                        );
                      })}
                    </>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
            <div className="w-full max-w-sm space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Total Value</span><span className="font-semibold text-slate-700 tabular-nums">{formatCurrency(inv.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Transport / Freight</span><span className="text-slate-700 tabular-nums">{formatCurrency(inv.transportFreight)}</span></div>
              {toNum(inv.cgstAmount, 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">CGST ({inv.cgstRate}%)</span><span className="tabular-nums">{formatCurrency(inv.cgstAmount)}</span></div>}
              {toNum(inv.sgstAmount, 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">SGST ({inv.sgstRate}%)</span><span className="tabular-nums">{formatCurrency(inv.sgstAmount)}</span></div>}
              {toNum(inv.igstAmount, 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">IGST ({inv.igstRate}%)</span><span className="tabular-nums">{formatCurrency(inv.igstAmount)}</span></div>}
              {toNum(inv.tcsRate, 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">TCS ({inv.tcsRate}%)</span><span className="tabular-nums">{formatCurrency(inv.tcsAmount)}</span></div>}
              {toNum(inv.extraAmt, 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">Extra Amt</span><span className="tabular-nums">{formatCurrency(inv.extraAmt)}</span></div>}
              <div className="flex justify-between font-extrabold text-base border-t border-slate-200 pt-2.5">
                <span className="text-slate-800">Grand Total</span>
                <span className="text-sky-700 tabular-nums">{formatCurrency(inv.grandTotal ?? inv.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* HSN/SAC Tax Summary */}
          {inv.items?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Tax Summary (HSN/SAC wise)</p>
              <div className="table-responsive">
                <table className="w-full text-left min-w-[560px] border border-slate-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr>
                      <th className="th">HSN/SAC</th>
                      <th className="th text-right">Taxable Value</th>
                      <th className="th text-center">CGST Rate</th>
                      <th className="th text-right">CGST Amt</th>
                      <th className="th text-center">SGST Rate</th>
                      <th className="th text-right">SGST Amt</th>
                      {toNum(inv.igstRate, 0) > 0 && <>
                        <th className="th text-center">IGST Rate</th>
                        <th className="th text-right">IGST Amt</th>
                      </>}
                      <th className="th text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50/80">
                    {Object.entries(
                      (inv.items || []).reduce((acc, it) => {
                        const key = it.hsnSac || '—';
                        if (!acc[key]) acc[key] = 0;
                        acc[key] += toNum(it.amount, 0);
                        return acc;
                      }, {})
                    ).map(([hsn, taxable]) => {
                      const cgstAmt = taxable * toNum(inv.cgstRate, 0) / 100;
                      const sgstAmt = taxable * toNum(inv.sgstRate, 0) / 100;
                      const igstAmt = taxable * toNum(inv.igstRate, 0) / 100;
                      const totalTax = cgstAmt + sgstAmt + igstAmt;
                      return (
                        <tr key={hsn} className="tr">
                          <td className="td font-mono text-slate-700">{hsn}</td>
                          <td className="td text-right tabular-nums text-slate-700">{formatCurrency(taxable)}</td>
                          <td className="td text-center tabular-nums text-slate-600">{inv.cgstRate}%</td>
                          <td className="td text-right tabular-nums text-slate-600">{formatCurrency(cgstAmt)}</td>
                          <td className="td text-center tabular-nums text-slate-600">{inv.sgstRate}%</td>
                          <td className="td text-right tabular-nums text-slate-600">{formatCurrency(sgstAmt)}</td>
                          {toNum(inv.igstRate, 0) > 0 && <>
                            <td className="td text-center tabular-nums text-slate-600">{inv.igstRate}%</td>
                            <td className="td text-right tabular-nums text-slate-600">{formatCurrency(igstAmt)}</td>
                          </>}
                          <td className="td text-right tabular-nums font-bold text-slate-800">{formatCurrency(totalTax)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                      <td className="td text-slate-700">Total</td>
                      <td className="td text-right tabular-nums text-slate-700">{formatCurrency(inv.subtotal)}</td>
                      <td /><td className="td text-right tabular-nums text-slate-700">{formatCurrency(inv.cgstAmount)}</td>
                      <td /><td className="td text-right tabular-nums text-slate-700">{formatCurrency(inv.sgstAmount)}</td>
                      {toNum(inv.igstRate, 0) > 0 && <>
                        <td /><td className="td text-right tabular-nums text-slate-700">{formatCurrency(inv.igstAmount)}</td>
                      </>}
                      <td className="td text-right tabular-nums text-sky-700">{formatCurrency(toNum(inv.cgstAmount, 0)+toNum(inv.sgstAmount, 0)+toNum(inv.igstAmount, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Amount in words */}
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
            {inv.amountInWords && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount Chargeable (in words)</p>
                <p className="text-sm font-bold text-slate-800">{inv.amountInWords}</p>
              </div>
            )}
            {inv.taxAmountInWords && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tax Amount (in words)</p>
                <p className="text-sm font-semibold text-slate-700">{inv.taxAmountInWords}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Declaration + Bank + Signatures */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {inv.fromParty?.vatTin && <p className="text-xs text-slate-600"><span className="font-bold">Company's VAT TIN:</span> {inv.fromParty.vatTin}</p>}
              {inv.fromParty?.cstNo  && <p className="text-xs text-slate-600"><span className="font-bold">Company's CST No:</span> {inv.fromParty.cstNo}</p>}
              {inv.fromParty?.pan    && <p className="text-xs text-slate-600"><span className="font-bold">Company's PAN:</span> {inv.fromParty.pan}</p>}
              <div className="mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Declaration</p>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed italic">
                  We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-[10px] text-slate-400">Customer's Seal and Signature</p>
                <div className="h-12" />
              </div>
            </div>
            <div className="space-y-3">
              {(inv.fromParty?.bankName || inv.fromParty?.accountNo) && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Company Bank Details</p>
                  {inv.fromParty?.bankAccountHolder && <p className="text-xs text-slate-700"><span className="font-semibold">A/c Holder:</span> {inv.fromParty.bankAccountHolder}</p>}
                  {inv.fromParty?.bankName          && <p className="text-xs text-slate-700"><span className="font-semibold">Bank:</span> {inv.fromParty.bankName}</p>}
                  {inv.fromParty?.accountNo         && <p className="text-xs text-slate-700"><span className="font-semibold">A/c No:</span> {inv.fromParty.accountNo}</p>}
                  {inv.fromParty?.ifscCode          && <p className="text-xs text-slate-700"><span className="font-semibold">IFSC:</span> {inv.fromParty.ifscCode}</p>}
                  {inv.fromParty?.swiftCode         && <p className="text-xs text-slate-700"><span className="font-semibold">SWIFT:</span> {inv.fromParty.swiftCode}</p>}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs font-bold text-slate-700 text-right">For {inv.fromParty?.name}</p>
                <div className="h-12" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Prepared by</span>
                  <span>Verified by</span>
                  <span>Authorised Signatory</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center mt-4 pt-3 border-t border-slate-100 space-y-0.5">
            <p className="text-[10px] text-slate-400">Date & Time: {formatDate(inv.createdAt, true)}</p>
            <p className="text-[10px] font-bold text-slate-500">SUBJECT TO 1 JURISDICTION</p>
            <p className="text-[10px] text-slate-400">This is a Computer Generated Invoice</p>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-slate-400 text-right pb-2">
        Created by {inv.createdBy?.name} · {formatDate(inv.createdAt, true)}
      </p>

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
