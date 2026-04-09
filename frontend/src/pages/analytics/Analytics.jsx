import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../../utils/api';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];
const STATUS_COLORS = {
  'CREATED': '#94a3b8', 'IN PROGRESS': '#6366f1', 'SENT FOR JOBWORK': '#f59e0b',
  'INSPECTION': '#8b5cf6', 'COMPLETED': '#10b981', 'ON HOLD': '#ef4444',
};

const fmt = (n) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
};

/** Merge duplicate `name` rows so Recharts bar keys stay unique (e.g. same customer twice). */
function mergeByName(rows, valueKey) {
  const m = new Map();
  for (const r of rows || []) {
    const name = (r?.name != null && String(r.name).trim()) || 'Unknown';
    const add = Number(r[valueKey]) || 0;
    m.set(name, (m.get(name) || 0) + add);
  }
  return [...m.entries()].map(([name, v]) => ({ name, [valueKey]: v }));
}

const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {prefix === '₹' ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const KCard = ({ label, value, sub, icon, color, delta }) => (
  <div className="card p-5 flex items-start gap-4">
    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <span className="material-symbols-outlined text-white text-[20px]">{icon}</span>
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
      <p className="text-2xl font-extrabold text-slate-800 leading-none">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
      {delta !== undefined && (
        <p className={`text-[11px] font-semibold mt-1 ${delta >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}% vs last month
        </p>
      )}
    </div>
  </div>
);

export default function Analytics() {
  const [overview,   setOverview]   = useState(null);
  const [revData,    setRevData]    = useState([]);
  const [jobsData,   setJobsData]   = useState([]);
  const [statusDist, setStatusDist] = useState([]);
  const [customers,  setCustomers]  = useState([]);
  const [procDist,   setProcDist]   = useState([]);
  const [quality,    setQuality]    = useState([]);
  const [turnaround, setTurnaround] = useState([]);
  const [payment,    setPayment]    = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ov, rev, jbs, st, cust, proc, qual, turn, pay] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/monthly-revenue'),
          api.get('/analytics/monthly-jobs'),
          api.get('/analytics/job-status'),
          api.get('/analytics/top-customers'),
          api.get('/analytics/process-dist'),
          api.get('/analytics/quality-trend'),
          api.get('/analytics/turnaround'),
          api.get('/analytics/payment-status'),
        ]);
        setOverview(ov.data.data);
        setRevData(rev.data.data);
        setJobsData(jbs.data.data);
        setStatusDist(st.data.data.filter(d => d.value > 0));
        setCustomers(mergeByName(cust.data.data, 'revenue'));
        setProcDist(mergeByName(proc.data.data, 'amount'));
        setQuality(qual.data.data);
        setTurnaround(turn.data.data);
        setPayment(pay.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        <span className="text-sm font-medium">Loading analytics...</span>
      </div>
    </div>
  );

  const revDelta = overview?.revenue.lastMonth
    ? ((overview.revenue.thisMonth - overview.revenue.lastMonth) / overview.revenue.lastMonth) * 100
    : 0;
  const jobDelta = overview?.jobs.lastMonth
    ? ((overview.jobs.thisMonth - overview.jobs.lastMonth) / overview.jobs.lastMonth) * 100
    : 0;
  const totalQual = (overview?.quality.pass || 0) + (overview?.quality.fail || 0);
  const passRate  = totalQual > 0 ? ((overview.quality.pass / totalQual) * 100).toFixed(1) : '—';

  return (
    <div className="space-y-6 animate-slide-up max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 font-headline">Analytics</h2>
          <p className="text-sm text-slate-400 mt-0.5">Business performance overview</p>
        </div>
        <Link
          to="/analytics/advanced"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
        >
          Advanced charts →
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KCard
          label="This Month Revenue"
          value={fmt(overview?.revenue.thisMonth || 0)}
          sub={`Total: ${fmt(overview?.revenue.total || 0)}`}
          icon="currency_rupee"
          color="bg-indigo-500"
          delta={revDelta}
        />
        <KCard
          label="Jobs This Month"
          value={overview?.jobs.thisMonth || 0}
          sub={`Total: ${overview?.jobs.total} | Active: ${overview?.jobs.active}`}
          icon="assignment"
          color="bg-violet-500"
          delta={jobDelta}
        />
        <KCard
          label="Inspection Pass Rate"
          value={`${passRate}%`}
          sub={`Pass: ${overview?.quality.pass} | Fail: ${overview?.quality.fail}`}
          icon="fact_check"
          color="bg-emerald-500"
        />
        <KCard
          label="Pending Invoices"
          value={overview?.invoices.pending || 0}
          sub={`Paid: ${overview?.invoices.paid} total`}
          icon="receipt_long"
          color="bg-amber-500"
        />
      </div>

      {/* Revenue + Jobs Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Revenue */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-500 text-[16px]">bar_chart</span>
            </div>
            <h3 className="section-title">Monthly Revenue</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
              <Tooltip content={<CustomTooltip prefix="₹" />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Jobs */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-violet-500 text-[16px]">trending_up</span>
            </div>
            <h3 className="section-title">Job Card Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={jobsData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="created"   name="Created"   fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status + Payment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Job Status Distribution */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-slate-500 text-[16px]">donut_large</span>
            </div>
            <h3 className="section-title">Job Status</h3>
          </div>
          {statusDist.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">No data</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {statusDist.map((d, i) => (
                      <Cell key={`status-pie-${i}`} fill={Object.values(STATUS_COLORS)[i % 6]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {statusDist.map((d, i) => (
                  <div key={`status-leg-${i}-${d.name}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: Object.values(STATUS_COLORS)[i % 6] }} />
                      <span className="text-[11px] text-slate-600 font-medium">{d.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Payment Status */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-500 text-[16px]">payments</span>
            </div>
            <h3 className="section-title">Payment Status</h3>
          </div>
          {payment.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">No data</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={payment} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="amount" nameKey="name" paddingAngle={3}>
                    <Cell fill="#ef4444" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip formatter={(v) => [fmt(v), 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {payment.map((d, i) => (
                  <div key={`pay-leg-${i}-${d.name}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ['#ef4444','#f59e0b','#10b981'][i % 3] }} />
                      <span className="text-[11px] text-slate-600 font-medium">{d.name}</span>
                      <span className="text-[10px] text-slate-400">({d.count})</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">{fmt(d.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Quality Trend */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-500 text-[16px]">verified</span>
            </div>
            <h3 className="section-title">Inspection Quality</h3>
          </div>
          {quality.every(q => q.PASS + q.FAIL + q.CONDITIONAL + q.PENDING === 0) ? (
            <p className="text-xs text-slate-400 text-center py-10">No inspection data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={quality} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="PASS"        name="Pass"        fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar dataKey="FAIL"        name="Fail"        fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar dataKey="CONDITIONAL" name="Conditional" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Customers + Process Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Customers */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-cyan-500 text-[16px]">groups</span>
            </div>
            <h3 className="section-title">Top Customers by Revenue</h3>
          </div>
          {customers.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">No invoice data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={customers} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={100} axisLine={false} tickLine={false}
                  tickFormatter={v => v.length > 14 ? v.slice(0, 13) + '…' : v} />
                <Tooltip content={<CustomTooltip prefix="₹" />} />
                <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {customers.map((c, i) => <Cell key={`cust-bar-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Process Distribution */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-500 text-[16px]">manufacturing</span>
            </div>
            <h3 className="section-title">Revenue by Process</h3>
          </div>
          {procDist.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">No process data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={procDist} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={110} axisLine={false} tickLine={false}
                  tickFormatter={v => v.length > 15 ? v.slice(0, 14) + '…' : v} />
                <Tooltip content={<CustomTooltip prefix="₹" />} />
                <Bar dataKey="amount" name="Revenue" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {procDist.map((p, i) => <Cell key={`proc-bar-${i}`} fill={COLORS[(i + 3) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Turnaround Time */}
      {turnaround.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-rose-500 text-[16px]">schedule</span>
            </div>
            <h3 className="section-title">Avg Turnaround Time by Customer (days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={turnaround} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => v.length > 10 ? v.slice(0, 9) + '…' : v} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v, n) => [n === 'avgDays' ? `${v} days` : v, n === 'avgDays' ? 'Avg Days' : 'Jobs']}
                labelFormatter={l => l}
              />
              <Bar dataKey="avgDays" name="Avg Days" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={35} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
