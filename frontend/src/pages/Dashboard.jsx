import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

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
    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300/90 transition-all duration-200 block group overflow-hidden">
    <div className="p-5">
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider leading-tight">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
      </div>
      {loading ? (
        <div className="h-8 bg-slate-100 rounded-lg animate-pulse w-16 mb-2" />
      ) : (
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-extrabold text-slate-800 font-headline">{value ?? 0}</span>
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
          )}
        </div>
      )}
      <p className="text-[11px] text-slate-500 font-medium">{sub}</p>
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
  const [invoiceMeta, setInvoiceMeta] = useState({ pending: 0, pendingAmt: 0 });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get('/jobcards/stats'),
      api.get('/jobcards', { params: { limit: 8 } }),
      api.get('/invoices', { params: { paymentStatus: 'PENDING', limit: 100 } }),
    ]).then(([s, c, inv]) => {
      setStats(s.data.data);
      setRecentCards(c.data.data || []);
      const pendingInvs = inv.data.data || [];
      const pendingAmt  = pendingInvs.reduce((sum, i) => sum + parseFloat(i.totalAmount || 0), 0);
      setInvoiceMeta({ pending: inv.data.meta?.total || pendingInvs.length, pendingAmt });
    }).catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 animate-slide-up">

      {/* ── Page Title (industrial header: title + primary CTA, stacks on small screens) ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 font-headline tracking-tight">Production Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">Sheetal Dies &amp; Tools Pvt. Ltd. — live overview</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link to="/jobcards/new" className="btn-primary">
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
          <button onClick={load} className="ml-auto text-xs font-bold hover:underline">Retry</button>
        </div>
      )}

      {/* ── KPIs Row 1 ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Job Cards" value={stats?.total} loading={loading}
          badge="All time" badgeColor="bg-sky-100 text-sky-900"
          sub="All production records" icon="description"
          iconBg="bg-sky-100 text-sky-700"
          to="/jobcards"
        />
        <KpiCard
          label="In Progress" value={stats?.inProgress} loading={loading}
          badge="Floor" badgeColor="bg-blue-100 text-blue-900"
          sub="Currently on machines" icon="precision_manufacturing"
          iconBg="bg-blue-100 text-blue-700"
          to="/jobcards"
        />
        <KpiCard
          label="Pending Job Work" value={stats?.sentForJobwork} loading={loading}
          badge="Outward" badgeColor="bg-amber-100 text-amber-900"
          sub="Sent for heat treatment" icon="local_shipping"
          iconBg="bg-amber-100 text-amber-700"
          to="/jobwork"
        />
        <KpiCard
          label="Quality Alerts" value={stats?.qualityAlerts} loading={loading}
          badge={!loading && stats?.qualityAlerts > 0 ? 'Action!' : 'All Clear'}
          badgeColor={!loading && stats?.qualityAlerts > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}
          sub="Inspection failures" icon="warning"
          iconBg={!loading && stats?.qualityAlerts > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}
          to="/quality/certificates"
        />
      </div>

      {/* ── KPIs Row 2 ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Completed Jobs" value={stats?.completed} loading={loading}
          sub="All time completions" icon="task_alt"
          iconBg="bg-emerald-100 text-emerald-700"
          to="/jobcards"
        />
        <KpiCard
          label="Pending Invoices" value={invoiceMeta.pending} loading={loading}
          badge={invoiceMeta.pending > 0 ? 'Follow up' : 'All clear'}
          badgeColor={invoiceMeta.pending > 0 ? 'bg-orange-100 text-orange-900' : 'bg-emerald-100 text-emerald-800'}
          sub={`₹ ${invoiceMeta.pendingAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })} outstanding`}
          icon="receipt_long"
          iconBg="bg-orange-100 text-orange-700"
          to="/invoices"
        />
        <KpiCard
          label="On Hold" value={stats?.onHold} loading={loading}
          badge={!loading && stats?.onHold > 0 ? 'Review' : 'None'}
          badgeColor={!loading && stats?.onHold > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}
          sub="Jobs paused / blocked" icon="pause_circle"
          iconBg={!loading && stats?.onHold > 0 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"}
          to="/jobcards"
        />
      </div>

      {/* ── Recent Job Cards ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex justify-between items-center border-b border-slate-200/80">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-headline">Recent Job Cards</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Latest production activity</p>
          </div>
          <Link to="/jobcards"
            className="text-xs text-sky-800 font-semibold hover:text-sky-950 flex items-center gap-0.5 transition-colors">
            View All <span className="material-symbols-outlined text-sm">chevron_right</span>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200/80">
                {['Job Card No', 'Part', 'Machine', 'Status', 'Start Date', 'Action'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
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
                    {card.startDate ? new Date(card.startDate).toLocaleDateString('en-IN') : '—'}
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
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {[
          { label: 'New Challan',     icon: 'engineering',   to: '/jobwork/new',              color: 'text-amber-600',  bg: 'bg-amber-50',   ring: 'ring-amber-100' },
          { label: 'New Certificate', icon: 'verified',      to: '/quality/certificates/new', color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
          { label: 'New Invoice',     icon: 'receipt_long',  to: '/invoices/new',             color: 'text-indigo-600', bg: 'bg-indigo-50',  ring: 'ring-indigo-100' },
          { label: 'Manage Parties',  icon: 'group',         to: '/admin/parties',            color: 'text-violet-600', bg: 'bg-violet-50',  ring: 'ring-violet-100' },
        ].map(q => (
          <Link key={q.to} to={q.to}
            className="card flex items-center gap-3 p-4 hover:shadow-card-hover transition-all duration-200 group ring-1 ring-transparent hover:ring-1">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${q.bg} ${q.color} group-hover:scale-110 transition-transform`}>
              <span className="material-symbols-outlined text-[18px]">{q.icon}</span>
            </div>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{q.label}</span>
            <span className="material-symbols-outlined text-slate-300 text-sm ml-auto group-hover:translate-x-0.5 transition-transform">chevron_right</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
