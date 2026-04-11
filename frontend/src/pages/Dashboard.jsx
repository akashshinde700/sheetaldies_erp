import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/formatters';

const CARDS_PAGE_SIZE = 10;

const Pagination = ({ page, totalPages, total, limit, setPage }) => (
  <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
    <span className="text-xs text-slate-400">
      {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of <span className="font-semibold">{total}</span>
    </span>
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1}
        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-800 transition-colors"
      >
        <span className="material-symbols-outlined text-sm">chevron_left</span> Prev
      </button>
      <span className="text-xs font-semibold text-slate-500 px-2">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-800 transition-colors"
      >
        Next <span className="material-symbols-outlined text-sm">chevron_right</span>
      </button>
    </div>
  </div>
);

const STATUS_STYLE = {
  CREATED:          'bg-slate-100 text-slate-600',
  IN_PROGRESS:      'bg-blue-100 text-blue-700',
  SENT_FOR_JOBWORK: 'bg-amber-100 text-amber-700',
  INSPECTION:       'bg-violet-100 text-violet-700',
  COMPLETED:        'bg-emerald-100 text-emerald-700',
  ON_HOLD:          'bg-rose-100 text-rose-700',
};

const KpiCard = ({ label, value, sub, icon, iconBg, to, loading, badge, badgeColor }) => (
  <Link to={to || '#'}
    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300/90 transition-all duration-200 block group overflow-hidden min-w-0">
    <div className="p-4 sm:p-5 3xl:p-6">
      <div className="flex justify-between items-start gap-2 mb-3 sm:mb-4">
        <span className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider leading-tight line-clamp-2">{label}</span>
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <span className="material-symbols-outlined text-[17px] sm:text-[18px]">{icon}</span>
        </div>
      </div>
      {loading ? (
        <div className="h-8 bg-slate-100 rounded-lg animate-pulse w-16 mb-2" />
      ) : (
        <div className="flex flex-wrap items-baseline gap-2 mb-1">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-headline tabular-nums">{value ?? 0}</span>
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
          )}
        </div>
      )}
      <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium line-clamp-2">{sub}</p>
    </div>
  </Link>
);

const TableSkeleton = ({ rows = 4, cols = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="animate-pulse">
        {Array.from({ length: cols }).map((_, j) => (
          <td key={j} className="px-4 py-3.5">
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
  const [invoiceMeta, setInvoiceMeta] = useState({ pending: 0, pendingAmt: 0 });
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
        const [s, inv] = await Promise.all([
          api.get('/jobcards/stats'),
          api.get('/invoices', { params: { paymentStatus: 'PENDING', limit: 100 } }),
        ]);
        if (cancelled) return;
        setStats(s.data.data);
        const pendingInvs = inv.data.data || [];
        const pendingAmt = pendingInvs.reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);
        setInvoiceMeta({ pending: inv.data.pagination?.total || pendingInvs.length, pendingAmt });
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
      api.get('/invoices', { params: { paymentStatus: 'PENDING', limit: 100 } }),
    ]).then(([s, c, inv]) => {
      setStats(s.data.data);
      setRecentCards(c.data.data || []);
      setCardsTotal(c.data.pagination?.total ?? 0);
      const pendingInvs = inv.data.data || [];
      const pendingAmt = pendingInvs.reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);
      setInvoiceMeta({ pending: inv.data.pagination?.total || pendingInvs.length, pendingAmt });
    }).catch(() => setError('Failed to load dashboard data.'))
      .finally(() => {
        setKpiLoading(false);
        setCardsLoading(false);
      });
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-slide-up min-w-0 w-full">

      {/* ── Page Title (industrial header: title + primary CTA, stacks on small screens) ── */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-end sm:justify-between min-w-0">
        <div className="min-w-0 pr-1">
          <h2 className="text-lg xs:text-xl sm:text-2xl font-extrabold text-slate-900 font-headline tracking-tight">
            Production Dashboard
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 leading-snug">Sheetal Dies &amp; Tools Pvt. Ltd. — live overview</p>
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

      {/* ── KPIs Row 1 ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 3xl:gap-5">
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
      </div>

      {/* ── KPIs Row 2 ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 3xl:gap-5">
        <KpiCard
          label="Completed Jobs" value={stats?.completed} loading={kpiLoading}
          sub="All time completions" icon="task_alt"
          iconBg="bg-emerald-100 text-emerald-700"
          to="/jobcards"
        />
        <KpiCard
          label="Pending Invoices" value={invoiceMeta.pending} loading={kpiLoading}
          badge={invoiceMeta.pending > 0 ? 'Follow up' : 'All clear'}
          badgeColor={invoiceMeta.pending > 0 ? 'bg-orange-100 text-orange-900' : 'bg-emerald-100 text-emerald-800'}
          sub={`${formatCurrency(invoiceMeta.pendingAmt)} outstanding`}
          icon="receipt_long"
          iconBg="bg-orange-100 text-orange-700"
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
        <div className="px-3 sm:px-5 py-3 sm:py-4 flex flex-col xs:flex-row xs:justify-between xs:items-center gap-2 border-b border-slate-200/80">
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
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <div className="w-14 h-14 rounded-xl bg-sky-100 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-2xl text-sky-400">description</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">No job cards yet.</p>
                    <Link to="/jobcards/new"
                      className="inline-flex items-center gap-1 text-xs text-sky-800 font-semibold hover:underline">
                      <span className="material-symbols-outlined text-sm">add</span> Create first job card
                    </Link>
                  </td>
                </tr>
              ) : recentCards.map(card => (
                <tr key={card.id} className="tr">
                  <td className="td">
                    <Link to={`/jobcards/${card.id}`}
                      className="text-xs font-bold text-sky-800 hover:text-sky-950 hover:underline font-mono">
                      {card.jobCardNo}
                    </Link>
                  </td>
                  <td className="td">
                    <p className="text-xs font-semibold text-slate-700">{card.part?.description}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{card.part?.partNo}</p>
                  </td>
                  <td className="td">{card.machine?.name || card.machine?.code || '—'}</td>
                  <td className="td">
                    <span className={`badge ${STATUS_STYLE[card.status] || 'bg-slate-100 text-slate-600'}`}>
                      {card.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="td text-slate-500">
                    {formatDate(card.startDate)}
                  </td>
                  <td className="td">
                    <div className="flex gap-3">
                      <Link to={`/jobcards/${card.id}`}
                        className="text-xs text-sky-800 font-semibold hover:underline">Edit</Link>
                      <Link to={`/jobcards/${card.id}/inspection`}
                        className="text-xs text-slate-700 font-semibold hover:underline">Inspect</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!cardsLoading && cardsTotal > 0 && (
          <Pagination
            page={cardsPage}
            totalPages={cardsTotalPages}
            total={cardsTotal}
            limit={CARDS_PAGE_SIZE}
            setPage={setCardsPage}
          />
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 3xl:gap-4">
        {[
          { label: 'New Challan',     icon: 'engineering',   to: '/jobwork/new',              color: 'text-amber-600',  bg: 'bg-amber-50',   ring: 'ring-amber-100' },
          { label: 'New Certificate', icon: 'verified',      to: '/quality/certificates/new', color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
          { label: 'New Invoice',     icon: 'receipt_long',  to: '/invoices/new',             color: 'text-indigo-600', bg: 'bg-indigo-50',  ring: 'ring-indigo-100' },
          { label: 'Manage Parties',  icon: 'group',         to: '/admin/parties',            color: 'text-violet-600', bg: 'bg-violet-50',  ring: 'ring-violet-100' },
        ].map(q => (
          <Link key={q.to} to={q.to}
            className={`card flex items-center gap-2 sm:gap-3 p-3 sm:p-4 min-w-0 border border-slate-200/90 hover:shadow-card-hover transition-all duration-200 group ring-1 ring-transparent ${q.ring} hover:ring-2`}>
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${q.bg} ${q.color} group-hover:scale-110 transition-transform`}>
              <span className="material-symbols-outlined text-[17px] sm:text-[18px]">{q.icon}</span>
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors truncate">{q.label}</span>
            <span className="material-symbols-outlined text-slate-300 text-sm ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform">chevron_right</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
