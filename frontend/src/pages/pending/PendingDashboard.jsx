import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const PENDING_TABS = [
  { key: 's1', label: 'Job Card', dataKey: 'challansNeedJobCard' },
  { key: 's2', label: 'Certificate', dataKey: 'jobCardsNeedCert' },
  { key: 's3', label: 'Invoice', dataKey: 'certsNeedInvoice' },
  { key: 's4', label: 'Payment', dataKey: 'invoicesPendingPayment' },
];

function SectionHeader({ icon, iconBg, iconColor, title, count, countColor }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5 mb-3">
      <div className={`w-6 h-6 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
        <span className={`material-symbols-outlined text-[15px] ${iconColor}`}>{icon}</span>
      </div>
      <h3 className="font-bold text-slate-900 text-sm flex-1 truncate">{title}</h3>
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums shrink-0 ${countColor}`}>
        {count} pending
      </span>
    </div>
  );
}

function EmptyState({ message, hint }) {
  return (
    <div className="flex items-center justify-center gap-2 py-5 text-center flex-wrap">
      <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
      <p className="text-xs font-bold text-emerald-700">{message}</p>
      {hint && <p className="text-[11px] text-slate-400 basis-full sm:basis-auto">{hint}</p>}
    </div>
  );
}

export default function PendingDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState({});
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('svt_pending_tab') || 's1'; } catch { return 's1'; }
  });
  const onTab = (v) => { setTab(v); try { localStorage.setItem('svt_pending_tab', v); } catch { /* ignore */ } };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pending-items'],
    queryFn: async () => {
      const r = await api.get('/analytics/pending-items');
      return r.data.data;
    },
    staleTime: 45 * 1000,        // Data considered fresh for 45 seconds
    refetchInterval: 90 * 1000, // Auto-refetch every 90 seconds
  });

  const summary = data?.summary || {};
  const totalPending = summary.totalPending || 0;

  // ── Create Job Card from Challan ──────────────────────────
  const handleCreateJobCard = async (challanId, challanNo) => {
    setCreating(p => ({ ...p, [`jc_${challanId}`]: true }));
    try {
      const r = await api.post('/jobwork/jobcard-from-challan', { challanId });
      const jcNo = r.data.data?.jobCard?.jobCardNo;
      const jcId = r.data.data?.jobCard?.id;
      toast.success(`Job Card ${jcNo} created from ${challanNo}!`);
      queryClient.invalidateQueries({ queryKey: ['pending-items'] });
      if (jcId) navigate(`/jobcards/${jcId}/edit`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating job card');
    } finally {
      setCreating(p => ({ ...p, [`jc_${challanId}`]: false }));
    }
  };

  // ── Create Certificate from Job Card ─────────────────────
  const handleCreateCert = async (jobCardId, jobCardNo) => {
    setCreating(p => ({ ...p, [`cert_${jobCardId}`]: true }));
    try {
      const r = await api.post('/quality/certificates', { jobCardId });
      const certId = r.data.data?.id;
      toast.success(`Certificate created for ${jobCardNo}!`);
      queryClient.invalidateQueries({ queryKey: ['pending-items'] });
      if (certId) navigate(`/quality/certificates/${certId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating certificate');
    } finally {
      setCreating(p => ({ ...p, [`cert_${jobCardId}`]: false }));
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        <span className="text-sm">Loading pending items...</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-headline tracking-tight">Pending List</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Challan → Job Card → Certificate → Invoice — pending items at each stage
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalPending > 0 && (
            <Badge variant="error" className="tabular-nums">{totalPending} total pending</Badge>
          )}
          <button onClick={() => refetch()} className="btn-outline">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3 border-l-4 border-amber-400">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Challan → Job Card</p>
          <p className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-0.5 tabular-nums">{summary.challansNeedJobCard ?? 0}</p>
          <p className="text-[10px] text-slate-400">awaiting job card</p>
        </div>
        <div className="card p-3 border-l-4 border-violet-400">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Job Card → Certificate</p>
          <p className="text-xl sm:text-2xl font-extrabold text-violet-600 mt-0.5 tabular-nums">{summary.jobCardsNeedCert ?? 0}</p>
          <p className="text-[10px] text-slate-400">awaiting certificate</p>
        </div>
        <div className="card p-3 border-l-4 border-sky-400">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Certificate → Invoice</p>
          <p className="text-xl sm:text-2xl font-extrabold text-sky-600 mt-0.5 tabular-nums">{summary.certsNeedInvoice ?? 0}</p>
          <p className="text-[10px] text-slate-400">awaiting invoice</p>
        </div>
        <div className="card p-3 border-l-4 border-rose-400">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Payment Pending</p>
          <p className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-0.5 tabular-nums">{summary.invoicesPendingPayment ?? 0}</p>
          <p className="text-[10px] text-slate-400 tabular-nums truncate">{formatCurrency(summary.invoiceAmountPending ?? 0)}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={onTab} className="space-y-0">
        <TabsList className="w-full justify-start overflow-x-auto">
          {PENDING_TABS.map((t) => {
            const n = data?.[t.dataKey]?.length ?? 0;
            return (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
                {n > 0 && (
                  <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-100 px-1.5 text-[10px] font-bold text-rose-700">
                    {n}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

      <TabsContent value="s1">
      {/* Section 1: Challans needing Job Card */}
      <div className="card p-4">
        <SectionHeader
          icon="input"
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          title="Challans — Job Card Pending"
          count={data?.challansNeedJobCard?.length ?? 0}
          countColor="bg-amber-100 text-amber-700"
        />
        {!data?.challansNeedJobCard?.length ? (
          <EmptyState message="All caught up!" hint="All inwards have job cards. Go to Job Cards → Certificates to continue." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80">
                  {['Challan No', 'Date', 'Customer', 'Items', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.challansNeedJobCard.map(ch => (
                  <tr key={ch.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-3 py-2">
                      <Link to={`/jobwork/${ch.id}`} className="font-mono text-sky-600 hover:underline font-semibold">
                        {ch.challanNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{formatDate(ch.challanDate)}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{ch.fromParty?.name || '—'}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {ch.items?.map(it => it.material || it.description).filter(Boolean).slice(0, 2).join(', ') || '—'}
                      {ch.items?.length > 2 ? ` +${ch.items.length - 2}` : ''}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="warning">{ch.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleCreateJobCard(ch.id, ch.challanNo)}
                        disabled={creating[`jc_${ch.id}`]}
                        className="btn-primary text-[11px] px-3 py-1.5 h-auto"
                      >
                        {creating[`jc_${ch.id}`]
                          ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                          : <><span className="material-symbols-outlined text-sm">add_card</span> Create Job Card</>
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </TabsContent>

      <TabsContent value="s2">
      {/* Section 2: Job Cards needing Certificate */}
      <div className="card p-4">
        <SectionHeader
          icon="verified"
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
          title="Job Cards — Certificate Pending"
          count={data?.jobCardsNeedCert?.length ?? 0}
          countColor="bg-violet-100 text-violet-700"
        />
        {!data?.jobCardsNeedCert?.length ? (
          <EmptyState message="All caught up!" hint="All job cards have certificates. Go to Invoices to bill completed work." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80">
                  {['Job Card No', 'Customer', 'Material', 'HRC', 'Due Date', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.jobCardsNeedCert.map(jc => {
                  const isOverdue = jc.dueDate && new Date(jc.dueDate) < new Date();
                  return (
                    <tr key={jc.id} className="hover:bg-violet-50/30 transition-colors">
                      <td className="px-3 py-2">
                        <Link to={`/jobcards/${jc.id}`} className="font-mono text-sky-600 hover:underline font-semibold">
                          {jc.jobCardNo}
                        </Link>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">{jc.customer?.name || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{jc.dieMaterial || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{jc.hrcRange || '—'}</td>
                      <td className={`px-3 py-2 font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-600'}`}>
                        {jc.dueDate ? formatDate(jc.dueDate) : '—'}
                        {isOverdue && <span className="ml-1 text-[10px] bg-rose-100 text-rose-600 rounded px-1">Overdue</span>}
                      </td>
                      <td className="px-3 py-2">
                        <Badge className="bg-violet-100 text-violet-700">{jc.status}</Badge>
                      </td>
                      <td className="px-3 py-2 flex items-center gap-1.5">
                        <Link
                          to={`/quality/certificates/new?jobCardId=${jc.id}`}
                          className="btn-outline text-[11px] px-3 py-1.5 h-auto border-violet-200 text-violet-700 hover:bg-violet-50"
                        >
                          <span className="material-symbols-outlined text-sm">verified</span>
                          Certificate
                        </Link>
                        <Link
                          to={`/manufacturing/runsheet/new?jobCardId=${jc.id}`}
                          className="btn-outline text-[11px] px-3 py-1.5 h-auto border-sky-200 text-sky-700 hover:bg-sky-50"
                        >
                          <span className="material-symbols-outlined text-sm">thermostat</span>
                          Run Sheet
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </TabsContent>

      <TabsContent value="s3">
      {/* Section 3: Certificates needing Invoice */}
      <div className="card p-4">
        <SectionHeader
          icon="receipt_long"
          iconBg="bg-sky-50"
          iconColor="text-sky-500"
          title="Certificates — Invoice Pending"
          count={data?.certsNeedInvoice?.length ?? 0}
          countColor="bg-sky-100 text-sky-700"
        />
        {!data?.certsNeedInvoice?.length ? (
          <EmptyState message="All billed!" hint="All approved certificates have invoices. Check Dispatch for pending deliveries." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80">
                  {['Cert No', 'Issue Date', 'Customer', 'Job Card', 'Material', 'Action'].map(h => (
                    <th key={h} className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.certsNeedInvoice.map(cert => (
                  <tr key={cert.id} className="hover:bg-sky-50/30 transition-colors">
                    <td className="px-3 py-2">
                      <Link to={`/quality/certificates/${cert.id}`} className="font-mono text-sky-600 hover:underline font-semibold">
                        {cert.certNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{formatDate(cert.issueDate)}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{cert.customer?.name || '—'}</td>
                    <td className="px-3 py-2">
                      {cert.jobCard ? (
                        <Link to={`/jobcards/${cert.jobCard.id}`} className="font-mono text-sky-500 hover:underline">
                          {cert.jobCard.jobCardNo}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{cert.jobCard?.dieMaterial || '—'}</td>
                    <td className="px-3 py-2">
                      <Link
                        to={cert.jobCard?.id
                          ? `/invoices/new?jobCardId=${cert.jobCard.id}`
                          : `/invoices/new?customerId=${cert.customer?.id}`}
                        className="btn-primary text-[11px] px-3 py-1.5 h-auto"
                      >
                        <span className="material-symbols-outlined text-sm">receipt_long</span>
                        Create Invoice
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </TabsContent>

      <TabsContent value="s4">
      {/* Section 4: Invoices pending payment */}
      <div className="card p-4">
        <SectionHeader
          icon="payments"
          iconBg="bg-rose-50"
          iconColor="text-rose-500"
          title="Invoices — Payment Pending"
          count={data?.invoicesPendingPayment?.length ?? 0}
          countColor="bg-rose-100 text-rose-700"
        />
        {!data?.invoicesPendingPayment?.length ? (
          <EmptyState message="All payments received!" hint="No outstanding invoices. Great work!" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80">
                  {['Invoice No', 'Date', 'Customer', 'Amount', 'Action'].map(h => (
                    <th key={h} className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.invoicesPendingPayment.map(inv => (
                  <tr key={inv.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="px-3 py-2">
                      <Link to={`/invoices/${inv.id}`} className="font-mono text-sky-600 hover:underline font-semibold">
                        {inv.invoiceNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{formatDate(inv.invoiceDate)}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{inv.toParty?.name || '—'}</td>
                    <td className="px-3 py-2 font-bold text-rose-700">{formatCurrency(inv.grandTotal)}</td>
                    <td className="px-3 py-2">
                      <Link to={`/invoices/${inv.id}`} className="btn-outline text-[11px] px-3 py-1.5 h-auto">
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-rose-50/50">
                  <td colSpan={3} className="px-3 py-2 font-bold text-slate-700 text-right text-xs">Total Pending Amount:</td>
                  <td className="px-3 py-2 font-extrabold text-rose-700">{formatCurrency(summary.invoiceAmountPending ?? 0)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
      </TabsContent>
      </Tabs>

    </div>
  );
}
