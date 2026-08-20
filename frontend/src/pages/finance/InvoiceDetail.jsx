import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import KpiCard from '../../components/KpiCard';
import { toNum } from '../../utils/normalize';
import { formatCurrency, formatDate } from '../../utils/formatters';
import ConfirmDialog from '../../components/ConfirmDialog';

const PAY_COLOR = {
  PENDING: 'bg-orange-100 text-orange-700',
  PARTIAL: 'bg-sky-100 text-sky-700',
  PAID:    'bg-emerald-100 text-emerald-700',
};

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
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        <span className="text-sm">Loading invoice...</span>
      </div>
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
      <div className="page-header">
        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/invoices"
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-sky-600 hover:border-sky-300 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-slate-800 font-headline font-mono">{inv.invoiceNo}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Tax Invoice — {formatDate(inv.invoiceDate)}</p>
        </div>
        <Link to={`/invoices/${id}/print`} className="btn-outline">
          <span className="material-symbols-outlined text-sm">print</span> Print / PDF
        </Link>
        {inv.sentToTally ? (
          <span className="flex items-center gap-1.5 badge bg-violet-100 text-violet-700">
            <span className="material-symbols-outlined text-sm">lock</span>Sent to Tally
          </span>
        ) : (
          <button onClick={() => setShowTallyBox(p => !p)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            <span className="material-symbols-outlined text-sm">send</span>Tally
          </button>
        )}
        <span className={`badge ${PAY_COLOR[inv.paymentStatus] || 'bg-slate-100 text-slate-600'}`}>{inv.paymentStatus}</span>
        {inv.paymentStatus !== 'PAID' && !inv.sentToTally && (
          <button onClick={markPaid} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : <><span className="material-symbols-outlined text-sm">payments</span> Mark Paid</>}
          </button>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => sendNotification('email')} className="btn-secondary text-xs px-2 py-1">
            <span className="material-symbols-outlined text-sm">email</span> Email
          </button>
        </div>
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

      {/* Tally action box */}
      {!inv.sentToTally && showTallyBox && (
        <div className="card p-5 space-y-4 border border-violet-200 bg-violet-50/50">
          <p className="text-sm font-bold text-violet-800">Send Invoice to Tally</p>
          <p className="text-xs text-violet-600">
            Invoice will be created as a <strong>Sales Voucher</strong> in Tally. Once sent, it will be permanently locked.
          </p>
          {/* Download-and-import comes first: it is the route that works when
              the API runs on a server and Tally sits on someone's desk. */}
          <div className="bg-white rounded-xl border-2 border-violet-300 p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-extrabold text-slate-600 uppercase tracking-widest">Download XML &amp; Import</p>
              <span className="badge bg-violet-100 text-violet-700 text-[10px]">Recommended</span>
            </div>
            <ol className="text-xs text-slate-500 list-decimal ml-4 space-y-0.5">
              <li>Download the XML below</li>
              <li>In Tally, open the company you want the voucher in</li>
              <li><strong>O: Import → Transactions</strong> → pick the file</li>
              <li>Come back and click "Mark as Sent" to lock this invoice</li>
            </ol>
            <div className="flex gap-3 flex-wrap">
              <button onClick={downloadXml} className="flex items-center gap-2 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                <span className="material-symbols-outlined text-sm">download</span>Download Tally XML
              </button>
              <button onClick={markSentToTally} disabled={markLoading}
                className="flex items-center gap-2 border border-violet-400 text-violet-700 px-5 py-2 rounded-xl text-sm font-bold hover:bg-violet-50 disabled:opacity-60">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                {markLoading ? 'Locking...' : 'Mark as Sent (Lock Invoice)'}
              </button>
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
                <span className="material-symbols-outlined text-sm">bolt</span>
                Tally Importer (.bat)
              </a>
              <a href="/tally-masters-setup.xml" download
                className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-violet-700">
                <span className="material-symbols-outlined text-sm">list_alt</span>
                Masters XML
              </a>
              <span className="text-[10px] text-slate-400 basis-full">
                Importer ko Desktop pe rakho aur invoice XML usme drag karo — seedha Tally me chala jayega.
                Masters XML ek baar <span className="font-mono">O: Import → Masters</span> se daalo (ledgers, unit, stock item).
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Direct Push — advanced</p>
            <div className="flex gap-2 items-start text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-sm mt-0.5">info</span>
              <span>
                This push is made by the <strong>API server</strong>, not your browser — so <code className="font-mono">localhost</code> here means the server, not your PC.
                It only works if Tally is reachable from the server over the network. If Tally is open on your own computer, use Download XML above.
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-xs text-slate-500 whitespace-nowrap">Tally URL:</label>
              <input value={tallyUrl} onChange={e => setTallyUrl(e.target.value)}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-300" placeholder="http://localhost:9000" />
            </div>
            <p className="text-[10px] text-slate-400">Tally → F1: Help → Settings → Connectivity → Client/Server configuration → acts as Both, Port 9000</p>
            <button onClick={pushToTally} disabled={pushLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-all">
              <span className="material-symbols-outlined text-sm">bolt</span>
              {pushLoading ? 'Pushing...' : 'Push to Tally Now'}
            </button>
          </div>
        </div>
      )}

      {inv.sentToTally && (
        <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-sm text-violet-700">
          <span className="material-symbols-outlined">lock</span>
          <span>Sent to Tally on <strong>{formatDate(inv.sentToTallyAt, true)}</strong>. Invoice is permanently locked.</span>
        </div>
      )}

      {/* Party + Refs */}
      <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">From (Issuer)</p>
          <p className="font-bold text-slate-800">{inv.fromParty?.name}
            {inv.fromParty?.partyCode && <span className="ml-2 text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{inv.fromParty.partyCode}</span>}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{inv.fromParty?.address}</p>
          {inv.fromParty?.gstin && <p className="text-xs text-slate-600 mt-0.5 font-mono">GSTIN: <strong>{inv.fromParty.gstin}</strong></p>}
          {inv.fromParty?.pan   && <p className="text-xs text-slate-500">PAN: {inv.fromParty.pan}</p>}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">To (Customer)</p>
          <p className="font-bold text-slate-800">{inv.toParty?.name}
            {inv.toParty?.partyCode && <span className="ml-2 text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{inv.toParty.partyCode}</span>}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{inv.toParty?.address}</p>
          {inv.toParty?.gstin && <p className="text-xs text-slate-600 mt-0.5 font-mono">GSTIN: <strong>{inv.toParty.gstin}</strong></p>}
          {inv.toParty?.pan   && <p className="text-xs text-slate-500">PAN: {inv.toParty.pan}</p>}
        </div>
        <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-xs text-slate-400 block mb-0.5">Invoice Date</span><span className="font-semibold">{formatDate(inv.invoiceDate)}</span></div>
          {inv.dispatchDate    && <div><span className="text-xs text-slate-400 block mb-0.5">Dispatch Date</span><span className="font-semibold">{formatDate(inv.dispatchDate)}</span></div>}
          {inv.challan         && <div><span className="text-xs text-slate-400 block mb-0.5">Linked Challan</span><span className="font-semibold text-sky-600">{inv.challan.challanNo}</span></div>}
          {inv.challanRef      && <div><span className="text-xs text-slate-400 block mb-0.5">Challan Ref</span><span className="font-semibold">{inv.challanRef}</span></div>}
          {inv.poRef           && <div><span className="text-xs text-slate-400 block mb-0.5">PO Ref</span><span className="font-semibold">{inv.poRef}</span></div>}
          {inv.jobCardRef      && <div><span className="text-xs text-slate-400 block mb-0.5">Job Card Ref</span><span className="font-semibold">{inv.jobCardRef}</span></div>}
          {inv.otherReferences && <div><span className="text-xs text-slate-400 block mb-0.5">Other References</span><span className="font-semibold">{inv.otherReferences}</span></div>}
          {inv.dispatchDocNo   && <div><span className="text-xs text-slate-400 block mb-0.5">Dispatch Doc No</span><span className="font-semibold font-mono">{inv.dispatchDocNo}</span></div>}
          {inv.eWayBillNo      && <div><span className="text-xs text-slate-400 block mb-0.5">E-Way Bill No</span><span className="font-semibold font-mono">{inv.eWayBillNo}</span></div>}
          {inv.paidDate        && <div><span className="text-xs text-slate-400 block mb-0.5">Paid Date</span><span className="font-semibold text-emerald-700">{formatDate(inv.paidDate)}</span></div>}
          {inv.paymentRef      && <div><span className="text-xs text-slate-400 block mb-0.5">Payment Ref</span><span className="font-semibold">{inv.paymentRef}</span></div>}
        </div>
      </div>

      {/* e-Invoice Details (IRN/Ack No/Ack Date) — manually entered after
          submitting this invoice to the government e-invoice portal outside
          this system; the print page's QR code is generated from these. */}
      <div className="card p-5">
        <p className="section-title border-b border-slate-100 pb-2 mb-3">e-Invoice Details (IRN)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label">IRN</label>
            <input type="text" value={eInvoice.irnNo} onChange={e => setEInvoice(p => ({ ...p, irnNo: e.target.value }))}
              className="form-input font-mono text-xs" placeholder="Paste IRN from e-invoice portal" />
          </div>
          <div>
            <label className="form-label">Ack No</label>
            <input type="text" value={eInvoice.ackNo} onChange={e => setEInvoice(p => ({ ...p, ackNo: e.target.value }))}
              className="form-input font-mono text-xs" placeholder="Acknowledgement no." />
          </div>
          <div>
            <label className="form-label">Ack Date</label>
            <input type="date" value={eInvoice.ackDate} onChange={e => setEInvoice(p => ({ ...p, ackDate: e.target.value }))}
              className="form-input text-xs" />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={saveEInvoice} disabled={savingEInvoice} className="btn-outline text-xs disabled:opacity-50">
            {savingEInvoice ? 'Saving...' : 'Save e-Invoice Details'}
          </button>
        </div>
      </div>

      {/* Sibling Invoices */}
      {siblings.length > 0 && (
        <div className="card p-5">
          <p className="section-title border-b border-slate-100 pb-2 mb-3">
            Other Invoices from Same Challan ({inv.challan?.challanNo})
          </p>
          <div className="space-y-2">
            {siblings.map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm border border-slate-100 rounded-xl px-4 py-2.5 hover:bg-slate-50 transition-colors">
                <Link to={`/invoices/${s.id}`} className="font-mono text-sky-600 hover:underline">{s.invoiceNo}</Link>
                <span className="text-slate-500 text-xs">{formatDate(s.createdAt)}</span>
                <span className="font-semibold text-slate-700">{formatCurrency(s.totalAmount)}</span>
                <span className={`badge text-[10px] ${PAY_COLOR[s.paymentStatus] || 'bg-slate-100 text-slate-600'}`}>{s.paymentStatus}</span>
                {s.sentToTally && <span className="badge text-[10px] bg-violet-100 text-violet-700">TALLY SENT</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-line dispatched vs balance summary */}
      {billingStatus?.lineStatus?.length > 0 && (
        <div className="card p-5">
          <p className="section-title border-b border-slate-100 pb-2 mb-3">Per-line Dispatched vs Balance Summary</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase">Line</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase">Description</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase">Total Qty</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase">Dispatched</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billingStatus.lineStatus.map((ln, idx) => (
                  <tr key={ln.challanItemId} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">{ln.description || '-'}</td>
                    <td className="px-3 py-2 text-right">{ln.totalQty}</td>
                    <td className="px-3 py-2 text-right">{ln.dispatchedQty ?? '-'}</td>
                    <td className="px-3 py-2 text-right font-bold">{ln.remainingQty}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 font-bold">Total</td>
                  <td className="px-3 py-2 text-right font-bold">{billingStatus.totalQty}</td>
                  <td className="px-3 py-2 text-right font-bold">{billingStatus.totalDispatchedQty ?? '-'}</td>
                  <td className="px-3 py-2 text-right font-bold">{billingStatus.totalRemainingQty}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Line Items */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
          <p className="section-title">Services / Items</p>
          <span className="text-[10px] text-slate-400 font-semibold italic">E &amp; O E</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-sky-50/30 border-b border-slate-100">
                {['Sr.','Description','Material','HRC','WO No','SAC No','Qty','UOM','Weight (kg)','Rate ₹','Amount ₹'].map(h=>(
                  <th key={h} className="px-2 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                ))}
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
                        <td colSpan={11} className="px-2 py-1.5 text-[10px] font-extrabold text-sky-700 uppercase tracking-wider">{grp.label}</td>
                      </tr>
                    )}
                    {grp.items.map(it => {
                      srNo++;
                      return (
                        <tr key={it.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-2 py-2.5 text-slate-400 text-center font-mono">{srNo}</td>
                          <td className="px-2 py-2.5 font-medium text-slate-800">{it.description}</td>
                          <td className="px-2 py-2.5 text-slate-600">{it.material || '—'}</td>
                          <td className="px-2 py-2.5 text-slate-600">{it.hrc || '—'}</td>
                          <td className="px-2 py-2.5 text-slate-600">{it.woNo || '—'}</td>
                          <td className="px-2 py-2.5 font-mono text-slate-500">{it.hsnSac || '—'}</td>
                          <td className="px-2 py-2.5 text-slate-600 text-right">{it.quantity}</td>
                          <td className="px-2 py-2.5 text-slate-500">{it.unit || 'KGS'}</td>
                          <td className="px-2 py-2.5 text-slate-600 text-right">{it.weight ? toNum(it.weight, 0).toFixed(3) : '—'}</td>
                          <td className="px-2 py-2.5 text-slate-600 text-right">{formatCurrency(it.rate)}</td>
                          <td className="px-2 py-2.5 font-bold text-slate-800 text-right">{formatCurrency(it.amount)}</td>
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
            <div className="flex justify-between"><span className="text-slate-500">Total Value</span><span className="font-semibold text-slate-700">{formatCurrency(inv.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Transport / Freight</span><span className="text-slate-700">{formatCurrency(inv.transportFreight)}</span></div>
            {toNum(inv.cgstAmount, 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">CGST ({inv.cgstRate}%)</span><span>{formatCurrency(inv.cgstAmount)}</span></div>}
            {toNum(inv.sgstAmount, 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">SGST ({inv.sgstRate}%)</span><span>{formatCurrency(inv.sgstAmount)}</span></div>}
            {toNum(inv.igstAmount, 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">IGST ({inv.igstRate}%)</span><span>{formatCurrency(inv.igstAmount)}</span></div>}
            {toNum(inv.tcsRate, 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">TCS ({inv.tcsRate}%)</span><span>{formatCurrency(inv.tcsAmount)}</span></div>}
            {toNum(inv.extraAmt, 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">Extra Amt</span><span>{formatCurrency(inv.extraAmt)}</span></div>}
            <div className="flex justify-between font-extrabold text-base border-t border-slate-200 pt-2.5">
              <span className="text-slate-800">Grand Total</span>
              <span className="text-sky-700">{formatCurrency(inv.grandTotal ?? inv.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* HSN/SAC Tax Summary */}
        {inv.items?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="section-title mb-3">Tax Summary (HSN/SAC wise)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-sky-50/30">
                    <th className="px-3 py-2.5 text-left   text-[10px] font-bold text-slate-500 uppercase">HSN/SAC</th>
                    <th className="px-3 py-2.5 text-right  text-[10px] font-bold text-slate-500 uppercase">Taxable Value</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">CGST Rate</th>
                    <th className="px-3 py-2.5 text-right  text-[10px] font-bold text-slate-500 uppercase">CGST Amt</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">SGST Rate</th>
                    <th className="px-3 py-2.5 text-right  text-[10px] font-bold text-slate-500 uppercase">SGST Amt</th>
                    {toNum(inv.igstRate, 0) > 0 && <>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">IGST Rate</th>
                      <th className="px-3 py-2.5 text-right  text-[10px] font-bold text-slate-500 uppercase">IGST Amt</th>
                    </>}
                    <th className="px-3 py-2.5 text-right  text-[10px] font-bold text-slate-500 uppercase">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
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
                      <tr key={hsn} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2 font-mono text-slate-700">{hsn}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(taxable)}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{inv.cgstRate}%</td>
                        <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(cgstAmt)}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{inv.sgstRate}%</td>
                        <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(sgstAmt)}</td>
                        {toNum(inv.igstRate, 0) > 0 && <>
                          <td className="px-3 py-2 text-center text-slate-600">{inv.igstRate}%</td>
                          <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(igstAmt)}</td>
                        </>}
                        <td className="px-3 py-2 text-right font-bold text-slate-800">{formatCurrency(totalTax)}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                    <td className="px-3 py-2 text-slate-700">Total</td>
                    <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(inv.subtotal)}</td>
                    <td /><td className="px-3 py-2 text-right text-slate-700">{formatCurrency(inv.cgstAmount)}</td>
                    <td /><td className="px-3 py-2 text-right text-slate-700">{formatCurrency(inv.sgstAmount)}</td>
                    {toNum(inv.igstRate, 0) > 0 && <>
                      <td /><td className="px-3 py-2 text-right text-slate-700">{formatCurrency(inv.igstAmount)}</td>
                    </>}
                    <td className="px-3 py-2 text-right text-sky-700">{formatCurrency(toNum(inv.cgstAmount, 0)+toNum(inv.sgstAmount, 0)+toNum(inv.igstAmount, 0))}</td>
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
              <p className="text-[10px] text-slate-400 uppercase font-bold">Amount Chargeable (in words)</p>
              <p className="text-sm font-bold text-slate-800">{inv.amountInWords}</p>
            </div>
          )}
          {inv.taxAmountInWords && (
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Tax Amount (in words)</p>
              <p className="text-sm font-semibold text-slate-700">{inv.taxAmountInWords}</p>
            </div>
          )}
        </div>
      </div>

      {/* Declaration + Bank + Signatures */}
      <div className="card p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {inv.fromParty?.vatTin && <p className="text-xs text-slate-600"><span className="font-bold">Company's VAT TIN:</span> {inv.fromParty.vatTin}</p>}
            {inv.fromParty?.cstNo  && <p className="text-xs text-slate-600"><span className="font-bold">Company's CST No:</span> {inv.fromParty.cstNo}</p>}
            {inv.fromParty?.pan    && <p className="text-xs text-slate-600"><span className="font-bold">Company's PAN:</span> {inv.fromParty.pan}</p>}
            <div className="mt-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Declaration</p>
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
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Company Bank Details</p>
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
      </div>

      <p className="text-[11px] text-slate-400 text-right pb-2">
        Created by {inv.createdBy?.name} · {formatDate(inv.createdAt, true)}
      </p>

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
