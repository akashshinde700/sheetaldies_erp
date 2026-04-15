import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency } from '../../utils/formatters';

function SectionHeader({ icon, iconBg, iconColor, title, count, countColor }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
      <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center`}>
        <span className={`material-symbols-outlined text-[18px] ${iconColor}`}>{icon}</span>
      </div>
      <h3 className="font-extrabold text-slate-800 text-sm flex-1">{title}</h3>
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${countColor}`}>
        {count} pending
      </span>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-slate-300">
      <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
      <p className="text-xs font-semibold">{message}</p>
    </div>
  );
}

export default function PendingDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pending-items'],
    queryFn: async () => {
      const r = await api.get('/analytics/pending-items');
      return r.data.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
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
      if (jcId) navigate(`/jobcards/${jcId}`);
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
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Pending List</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Challan → Job Card → Certificate → Invoice — har stage ka pending
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalPending > 0 && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-rose-100 text-rose-700">
              {totalPending} total pending
            </span>
          )}
          <button onClick={() => refetch()} className="btn-outline">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 border-l-4 border-amber-400">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Challan → Job Card</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{summary.challansNeedJobCard ?? 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">awaiting job card</p>
        </div>
        <div className="card p-4 border-l-4 border-violet-400">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Job Card → Certificate</p>
          <p className="text-2xl font-extrabold text-violet-600 mt-1">{summary.jobCardsNeedCert ?? 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">awaiting certificate</p>
        </div>
        <div className="card p-4 border-l-4 border-sky-400">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Certificate → Invoice</p>
          <p className="text-2xl font-extrabold text-sky-600 mt-1">{summary.certsNeedInvoice ?? 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">awaiting invoice</p>
        </div>
        <div className="card p-4 border-l-4 border-rose-400">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Pending</p>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">{summary.invoicesPendingPayment ?? 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{formatCurrency(summary.invoiceAmountPending ?? 0)}</p>
        </div>
      </div>

      {/* Section 1: Challans needing Job Card */}
      <div className="card p-5">
        <SectionHeader
          icon="input"
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          title="Challans — Job Card Banana Baaki Hai"
          count={data?.challansNeedJobCard?.length ?? 0}
          countColor="bg-amber-100 text-amber-700"
        />
        {!data?.challansNeedJobCard?.length ? (
          <EmptyState message="Sab challans ka job card ban gaya!" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-amber-50/30 border-b border-slate-100">
                  {['Challan No', 'Date', 'Customer', 'Items', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.challansNeedJobCard.map(ch => (
                  <tr key={ch.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <Link to={`/jobwork/${ch.id}`} className="font-mono text-indigo-600 hover:underline font-semibold">
                        {ch.challanNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{formatDate(ch.challanDate)}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{ch.fromParty?.name || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {ch.items?.map(it => it.material || it.description).filter(Boolean).slice(0, 2).join(', ') || '—'}
                      {ch.items?.length > 2 ? ` +${ch.items.length - 2}` : ''}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="badge bg-amber-100 text-amber-700">{ch.status}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => handleCreateJobCard(ch.id, ch.challanNo)}
                        disabled={creating[`jc_${ch.id}`]}
                        className="btn-primary text-[11px] px-3 py-1.5 h-auto"
                      >
                        {creating[`jc_${ch.id}`]
                          ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                          : <><span className="material-symbols-outlined text-sm">add_card</span> Job Card Banao</>
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

      {/* Section 2: Job Cards needing Certificate */}
      <div className="card p-5">
        <SectionHeader
          icon="verified"
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
          title="Job Cards — Certificate Banana Baaki Hai"
          count={data?.jobCardsNeedCert?.length ?? 0}
          countColor="bg-violet-100 text-violet-700"
        />
        {!data?.jobCardsNeedCert?.length ? (
          <EmptyState message="Sab job cards ka certificate ban gaya!" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-violet-50/30 border-b border-slate-100">
                  {['Job Card No', 'Customer', 'Material', 'HRC', 'Due Date', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.jobCardsNeedCert.map(jc => {
                  const isOverdue = jc.dueDate && new Date(jc.dueDate) < new Date();
                  return (
                    <tr key={jc.id} className="hover:bg-violet-50/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <Link to={`/jobcards/${jc.id}`} className="font-mono text-indigo-600 hover:underline font-semibold">
                          {jc.jobCardNo}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">{jc.customer?.name || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{jc.dieMaterial || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{jc.hrcRange || '—'}</td>
                      <td className={`px-3 py-2.5 font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-600'}`}>
                        {jc.dueDate ? formatDate(jc.dueDate) : '—'}
                        {isOverdue && <span className="ml-1 text-[10px] bg-rose-100 text-rose-600 rounded px-1">Overdue</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="badge bg-violet-100 text-violet-700">{jc.status}</span>
                      </td>
                      <td className="px-3 py-2.5 flex items-center gap-1.5">
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

      {/* Section 3: Certificates needing Invoice */}
      <div className="card p-5">
        <SectionHeader
          icon="receipt_long"
          iconBg="bg-sky-50"
          iconColor="text-sky-500"
          title="Certificates — Invoice Banana Baaki Hai"
          count={data?.certsNeedInvoice?.length ?? 0}
          countColor="bg-sky-100 text-sky-700"
        />
        {!data?.certsNeedInvoice?.length ? (
          <EmptyState message="Sab approved certificates ka invoice ban gaya!" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-sky-50/30 border-b border-slate-100">
                  {['Cert No', 'Issue Date', 'Customer', 'Job Card', 'Material', 'Action'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.certsNeedInvoice.map(cert => (
                  <tr key={cert.id} className="hover:bg-sky-50/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <Link to={`/quality/certificates/${cert.id}`} className="font-mono text-indigo-600 hover:underline font-semibold">
                        {cert.certNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{formatDate(cert.issueDate)}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{cert.customer?.name || '—'}</td>
                    <td className="px-3 py-2.5">
                      {cert.jobCard ? (
                        <Link to={`/jobcards/${cert.jobCard.id}`} className="font-mono text-indigo-500 hover:underline">
                          {cert.jobCard.jobCardNo}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{cert.jobCard?.dieMaterial || '—'}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        to={`/invoices/new?customerId=${cert.customer?.id}`}
                        className="btn-primary text-[11px] px-3 py-1.5 h-auto"
                      >
                        <span className="material-symbols-outlined text-sm">receipt_long</span>
                        Invoice Banao
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 4: Invoices pending payment */}
      <div className="card p-5">
        <SectionHeader
          icon="payments"
          iconBg="bg-rose-50"
          iconColor="text-rose-500"
          title="Invoices — Payment Baaki Hai"
          count={data?.invoicesPendingPayment?.length ?? 0}
          countColor="bg-rose-100 text-rose-700"
        />
        {!data?.invoicesPendingPayment?.length ? (
          <EmptyState message="Koi payment pending nahi!" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-rose-50/30 border-b border-slate-100">
                  {['Invoice No', 'Date', 'Customer', 'Amount', 'Action'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.invoicesPendingPayment.map(inv => (
                  <tr key={inv.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <Link to={`/invoices/${inv.id}`} className="font-mono text-indigo-600 hover:underline font-semibold">
                        {inv.invoiceNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{formatDate(inv.invoiceDate)}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{inv.toParty?.name || '—'}</td>
                    <td className="px-3 py-2.5 font-bold text-rose-700">{formatCurrency(inv.grandTotal)}</td>
                    <td className="px-3 py-2.5">
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
                  <td colSpan={3} className="px-3 py-2.5 font-bold text-slate-700 text-right text-xs">Total Pending Amount:</td>
                  <td className="px-3 py-2.5 font-extrabold text-rose-700">{formatCurrency(summary.invoiceAmountPending ?? 0)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
