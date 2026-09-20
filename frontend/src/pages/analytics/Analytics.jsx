import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { ArrowRight } from 'lucide-react';
import api from '../../utils/api';
import KpiCard from '../../components/KpiCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#0369A1', '#7c3aed', '#059669', '#D97706', '#DC2626', '#C2410C', '#7C2D12', '#4338ca'];
const STATUS_COLORS = {
  'CREATED': '#756C60', 'IN PROGRESS': '#0369A1', 'SENT FOR JOBWORK': '#0369A1',
  'INSPECTION': '#7c3aed', 'COMPLETED': '#059669', 'ON HOLD': '#DC2626',
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

const deltaBadge = (delta) => ({
  badge: `${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)}% MoM`,
  badgeColor: delta >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800',
});

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
    <div className="page-stack w-full space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3.5 w-56" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
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
    <div className="page-stack w-full space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Business performance overview</p>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link to="/analytics/advanced">
            Advanced charts <ArrowRight />
          </Link>
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="This Month Revenue"
          value={fmt(overview?.revenue.thisMonth || 0)}
          sub={`Total: ${fmt(overview?.revenue.total || 0)}`}
          icon="currency_rupee"
          iconBg="bg-sky-100 text-sky-700"
          {...deltaBadge(revDelta)}
        />
        <KpiCard
          label="Jobs This Month"
          value={overview?.jobs.thisMonth || 0}
          sub={`Total: ${overview?.jobs.total} | Active: ${overview?.jobs.active}`}
          icon="assignment"
          iconBg="bg-violet-100 text-violet-700"
          {...deltaBadge(jobDelta)}
        />
        <KpiCard
          label="Inspection Pass Rate"
          value={`${passRate}%`}
          sub={`Pass: ${overview?.quality.pass} | Fail: ${overview?.quality.fail}`}
          icon="fact_check"
          iconBg="bg-emerald-100 text-emerald-700"
        />
        <KpiCard
          label="Pending Invoices"
          value={overview?.invoices.pending || 0}
          sub={`Paid: ${overview?.invoices.paid} total`}
          icon="receipt_long"
          iconBg="bg-amber-100 text-amber-700"
        />
      </div>

      {/* Revenue + Jobs Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>Invoiced revenue per month</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0369A1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0369A1" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#687689' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11, fill: '#687689' }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<CustomTooltip prefix="₹" />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0369A1" strokeWidth={2} fill="url(#revGrad)" dot={{ r: 3, fill: '#0369A1' }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Job Card Trend</CardTitle>
            <CardDescription>Created vs completed per month</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={jobsData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#687689' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#687689' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="created"   name="Created"   fill="#7c3aed" radius={[3, 3, 0, 0]} maxBarSize={28} />
                <Bar dataKey="completed" name="Completed" fill="#059669" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status + Payment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Job Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Job Status</CardTitle>
            <CardDescription>Current job card mix</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
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
                      <span className="text-[11px] font-bold text-slate-700 tabular-nums">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>Invoice amounts by payment state</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {payment.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">No data</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={payment} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="amount" nameKey="name" paddingAngle={3}>
                      <Cell fill="#DC2626" />
                      <Cell fill="#D97706" />
                      <Cell fill="#059669" />
                    </Pie>
                    <Tooltip formatter={(v) => [fmt(v), 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {payment.map((d, i) => (
                    <div key={`pay-leg-${i}-${d.name}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ['#DC2626','#D97706','#059669'][i % 3] }} />
                        <span className="text-[11px] text-slate-600 font-medium">{d.name}</span>
                        <span className="text-[10px] text-slate-400">({d.count})</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 tabular-nums">{fmt(d.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quality Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Inspection Quality</CardTitle>
            <CardDescription>Pass / fail / conditional per month</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {quality.every(q => q.PASS + q.FAIL + q.CONDITIONAL + q.PENDING === 0) ? (
              <p className="text-xs text-slate-400 text-center py-10">No inspection data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={quality} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#687689' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#687689' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="PASS"        name="Pass"        fill="#059669" radius={[3, 3, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="FAIL"        name="Fail"        fill="#DC2626" radius={[3, 3, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="CONDITIONAL" name="Conditional" fill="#D97706" radius={[3, 3, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Customers + Process Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Customers by Revenue</CardTitle>
            <CardDescription>Highest-billing customers</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {customers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">No invoice data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={customers} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 10, fill: '#687689' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={100} axisLine={false} tickLine={false}
                    tickFormatter={v => v.length > 14 ? v.slice(0, 13) + '…' : v} />
                  <Tooltip content={<CustomTooltip prefix="₹" />} />
                  <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {customers.map((c, i) => <Cell key={`cust-bar-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Process Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Process</CardTitle>
            <CardDescription>Invoiced amount per process type</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {procDist.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">No process data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={procDist} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 10, fill: '#687689' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={110} axisLine={false} tickLine={false}
                    tickFormatter={v => v.length > 15 ? v.slice(0, 14) + '…' : v} />
                  <Tooltip content={<CustomTooltip prefix="₹" />} />
                  <Bar dataKey="amount" name="Revenue" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {procDist.map((p, i) => <Cell key={`proc-bar-${i}`} fill={COLORS[(i + 3) % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Turnaround Time */}
      {turnaround.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Avg Turnaround Time by Customer (days)</CardTitle>
            <CardDescription>Average days from job card to completion</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={turnaround} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#687689' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v.length > 10 ? v.slice(0, 9) + '…' : v} />
                <YAxis tick={{ fontSize: 11, fill: '#687689' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v, n) => [n === 'avgDays' ? `${v} days` : v, n === 'avgDays' ? 'Avg Days' : 'Jobs']}
                  labelFormatter={l => l}
                />
                <Bar dataKey="avgDays" name="Avg Days" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
