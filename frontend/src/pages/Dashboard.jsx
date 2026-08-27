import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { formatDate } from '../utils/formatters';
import KpiCard from '../components/KpiCard';
import PageNav from '../components/PageNav';
import { statusColor } from '../utils/statusColors';

const CARDS_PAGE_SIZE = 10;

const TableSkeleton = ({ rows = 4, cols = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="animate-pulse">
        {Array.from({ length: cols }).map((_, j) => (
          <td key={j} className="px-4 py-2.5">
            <div className={`h-3 bg-slate-100 rounded ${j === 0 ? 'w-24' : j === 1 ? 'w-32' : 'w-16'}`} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export default function Dashboard() {
  const [stats,       setStats]       = useState(null);
  const [recentCards, setRecentCards] = useState([]);
  const [cardsTotal,  setCardsTotal]  = useState(0);
  const [cardsPage,   setCardsPage]   = useState(1);
  const [invoiceMeta, setInvoiceMeta] = useState({ pending: 0, partial: 0, overdue: 0 });
  const [kpiLoading,  setKpiLoading]  = useState(true);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [error,       setError]       = useState(null);

  const cardsTotalPages = Math.max(1, Math.ceil(cardsTotal / CARDS_PAGE_SIZE));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setKpiLoading(true);
      setError(null);
      try {
        const [s, overview] = await Promise.all([
          api.get('/jobcards/stats'),
          api.get('/analytics/overview'),
        ]);
        if (cancelled) return;
        setStats(s.data.data);
        const inv = overview.data.data?.invoices || {};
        setInvoiceMeta({
          pending: inv.pending || 0,
          partial: inv.partial || 0,
          overdue: inv.overdue || 0,
        });
      } catch {
        if (!cancelled) setError('Failed to load dashboard data.');
      } finally {
        if (!cancelled) setKpiLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCardsLoading(true);
      try {
        const c = await api.get('/jobcards', { params: { page: cardsPage, limit: CARDS_PAGE_SIZE } });
        if (cancelled) return;
        setRecentCards(c.data.data || []);
        setCardsTotal(c.data.pagination?.total ?? 0);
      } catch {
        if (!cancelled) setError('Failed to load recent job cards.');
      } finally {
        if (!cancelled) setCardsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [cardsPage]);

  const retryAll = () => {
    setKpiLoading(true);
    setCardsLoading(true);
    setError(null);
    Promise.all([
      api.get('/jobcards/stats'),
      api.get('/jobcards', { params: { page: cardsPage, limit: CARDS_PAGE_SIZE } }),
      api.get('/analytics/overview'),
    ]).then(([s, c, overview]) => {
      setStats(s.data.data);
      setRecentCards(c.data.data || []);
      setCardsTotal(c.data.pagination?.total ?? 0);
      const inv = overview.data.data?.invoices || {};
      setInvoiceMeta({
        pending: inv.pending || 0,
        partial: inv.partial || 0,
        overdue: inv.overdue || 0,
      });
    }).catch(() => setError('Failed to load dashboard data.'))
      .finally(() => {
        setKpiLoading(false);
        setCardsLoading(false);
      });
  };

  return (
    <div className="space-y-4 animate-slide-up min-w-0 w-full">

      {/* ── Page Title (industrial header: title + primary CTA, stacks on small screens) ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between min-w-0">
        <div className="min-w-0 pr-1">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-headline tracking-tight">
            Production Dashboard
          </h2>
          <p className="text-slate-500 text-xs mt-0.5 leading-snug">Sheetal Dies &amp; Tools Pvt. Ltd. — live overview</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto">
          <Link to="/jobcards/new" className="btn-primary w-full sm:w-auto justify-center">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Job Card
          </Link>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
          <span className="material-symbols-outlined text-lg">error</span>
          {error}
          <button type="button" onClick={retryAll} className="ml-auto text-xs font-bold hover:underline">Retry</button>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total Job Cards" value={stats?.total} loading={kpiLoading}
          badge="All time" badgeColor="bg-sky-100 text-sky-900"
          sub="All production records" icon="description"
          iconBg="bg-sky-100 text-sky-700"
          to="/jobcards"
        />
        <KpiCard
          label="In Progress" value={stats?.inProgress} loading={kpiLoading}
          badge="Floor" badgeColor="bg-blue-100 text-blue-900"
          sub="Currently on machines" icon="precision_manufacturing"
          iconBg="bg-blue-100 text-blue-700"
          to="/jobcards"
        />
        <KpiCard
          label="Pending Job Work" value={stats?.sentForJobwork} loading={kpiLoading}
          badge="Outward" badgeColor="bg-amber-100 text-amber-900"
          sub="Sent for heat treatment" icon="local_shipping"
          iconBg="bg-amber-100 text-amber-700"
          to="/jobwork"
        />
        <KpiCard
          label="Quality Alerts" value={stats?.qualityAlerts} loading={kpiLoading}
          badge={!kpiLoading && stats?.qualityAlerts > 0 ? 'Action!' : 'All Clear'}
          badgeColor={!kpiLoading && stats?.qualityAlerts > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}
          sub="Inspection failures" icon="warning"
          iconBg={!kpiLoading && stats?.qualityAlerts > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}
          to="/quality/certificates"
        />
        <KpiCard
          label="Completed Jobs" value={stats?.completed} loading={kpiLoading}
          sub="All time completions" icon="task_alt"
          iconBg="bg-emerald-100 text-emerald-700"
          to="/jobcards"
        />
        <KpiCard
          label="Pending Invoices" value={invoiceMeta.pending} loading={kpiLoading}
          badge={invoiceMeta.partial > 0 ? `${invoiceMeta.partial} Partial` : invoiceMeta.pending > 0 ? 'Follow up' : 'All clear'}
          badgeColor={invoiceMeta.partial > 0 ? 'bg-amber-100 text-amber-900' : invoiceMeta.pending > 0 ? 'bg-orange-100 text-orange-900' : 'bg-emerald-100 text-emerald-800'}
          sub={`${invoiceMeta.partial > 0 ? `${invoiceMeta.partial} partial · ` : ''}Tap to view`}
          icon="receipt_long"
          iconBg="bg-orange-100 text-orange-700"
          to="/invoices"
        />
        <KpiCard
          label="Overdue Invoices" value={invoiceMeta.overdue} loading={kpiLoading}
          badge={invoiceMeta.overdue > 0 ? 'Overdue!' : 'All clear'}
          badgeColor={invoiceMeta.overdue > 0 ? 'bg-rose-100 text-rose-900' : 'bg-emerald-100 text-emerald-800'}
          sub="Unpaid &gt;30 days — follow up"
          icon="schedule"
          iconBg={invoiceMeta.overdue > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}
          to="/invoices"
        />
        <KpiCard
          label="On Hold" value={stats?.onHold} loading={kpiLoading}
          badge={!kpiLoading && stats?.onHold > 0 ? 'Review' : 'None'}
          badgeColor={!kpiLoading && stats?.onHold > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}
          sub="Jobs paused / blocked" icon="pause_circle"
          iconBg={!kpiLoading && stats?.onHold > 0 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"}
          to="/jobcards"
        />
      </div>

      {/* ── Recent Job Cards ── */}
      <div className="card overflow-hidden min-w-0">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col xs:flex-row xs:justify-between xs:items-center gap-2 border-b border-slate-200/80">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-headline">Recent Job Cards</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {cardsTotal > 0 ? `${cardsTotal} total · page ${cardsPage} of ${cardsTotalPages}` : 'Latest production activity'}
            </p>
          </div>
          <Link to="/jobcards"
            className="text-xs text-sky-800 font-semibold hover:text-sky-950 flex items-center gap-0.5 transition-colors">
            View All <span className="material-symbols-outlined text-sm">chevron_right</span>
          </Link>
        </div>
        <div className="overflow-x-auto overscroll-x-contain -mx-0 touch-pan-x">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-200/80">
                {['Job Card No', 'Part', 'Machine', 'Status', 'Start Date', 'Action'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cardsLoading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : recentCards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center">
                    <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center mx-auto mb-2">
                      <span className="material-symbols-outlined text-lg text-sky-400">description</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1.5">No job cards yet.</p>
                    <Link to="/jobcards/new"
                      className="inline-flex items-center gap-1 text-xs text-sky-800 font-semibold hover:underline">
                      <span className="material-symbols-outlined text-sm">add</span> Create first job card
                    </Link>
                  </td>
                </tr>
              ) : recentCards.map(card => {
                const isOverdue = card.dueDate && card.status !== 'COMPLETED' && new Date(card.dueDate) < new Date();
                return (
                <tr key={card.id} className={`tr ${isOverdue ? 'bg-rose-50/40' : ''}`}>
                  <td className="td">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link to={`/jobcards/${card.id}`}
                        className="text-xs font-bold text-sky-800 hover:text-sky-950 hover:underline font-mono">
                        {card.jobCardNo}
                      </Link>
                      {isOverdue && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 text-[10px] font-bold">
                          <span className="material-symbols-outlined text-[11px]">schedule</span>
                          Overdue
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="td">
                    <p className="text-xs font-bold text-slate-700">{card.part?.partNo}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{card.part?.description}</p>
                  </td>
                  <td className="td">{card.machine?.name || card.machine?.code || '—'}</td>
                  <td className="td">
                    <span className={`badge ${statusColor(card.status)}`}>
                      {card.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="td text-slate-500">
                    {formatDate(card.startDate)}
                  </td>
                  <td className="td">
                    <div className="flex gap-3">
                      <Link to={`/jobcards/${card.id}/edit`}
                        className="text-xs text-sky-800 font-semibold hover:underline">Edit</Link>
                      <Link to={`/jobcards/${card.id}/inspection`}
                        className="text-xs text-slate-700 font-semibold hover:underline">Inspect</Link>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!cardsLoading && cardsTotal > 0 && (
          <PageNav
            page={cardsPage}
            totalPages={cardsTotalPages}
            total={cardsTotal}
            limit={CARDS_PAGE_SIZE}
            setPage={setCardsPage}
          />
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'New Inward Entry', icon: 'engineering', to: '/jobwork/inward-entry', color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'New Certificate', icon: 'verified',      to: '/quality/certificates/new', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'New Invoice',     icon: 'receipt_long',  to: '/invoices/new',             color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'Manage Parties',  icon: 'group',         to: '/admin/parties',            color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(q => (
          <Link key={q.to} to={q.to}
            className="card flex items-center gap-2.5 p-3 min-w-0 border border-slate-200/90 hover:border-slate-300 hover:shadow transition-all duration-150 group">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${q.bg} ${q.color}`}>
              <span className="material-symbols-outlined text-[16px]">{q.icon}</span>
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors truncate">{q.label}</span>
            <span className="material-symbols-outlined text-slate-300 text-sm ml-auto shrink-0">chevron_right</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
