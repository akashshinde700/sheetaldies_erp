import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';

const fmtMoney = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(n || 0));

async function safeGet(url) {
  try {
    const res = await api.get(url);
    return res.data?.data ?? null;
  } catch (e) {
    console.error('AdvancedAnalytics:', url, e);
    return null;
  }
}

function mergeMonthlySeries(revenueRows, jobRows) {
  const byMonth = new Map();
  for (const r of revenueRows || []) {
    byMonth.set(r.month, {
      month: r.month,
      revenue: r.revenue || 0,
      jobcards: 0,
    });
  }
  for (const j of jobRows || []) {
    const row = byMonth.get(j.month);
    if (row) row.jobcards = j.created || 0;
  }
  return Array.from(byMonth.values());
}

export default function AdvancedAnalytics() {
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [processData, setProcessData] = useState([]);
  const [invoiceData, setInvoiceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);

    const [overview, rev, jobs, proc, invBreakdown, turnaround] = await Promise.all([
      safeGet('/analytics/overview'),
      safeGet('/analytics/monthly-revenue'),
      safeGet('/analytics/monthly-jobs'),
      safeGet('/analytics/process-dist'),
      safeGet('/analytics/monthly-invoice-breakdown'),
      safeGet('/analytics/turnaround'),
    ]);

    if (overview) {
      const q = overview.quality || {};
      const pass = q.pass || 0;
      const fail = q.fail || 0;
      const totalQ = pass + fail;
      const avgTurn =
        turnaround && turnaround.length
          ? Math.round(
              turnaround.reduce((s, r) => s + (r.avgDays || 0), 0) / turnaround.length
            )
          : 0;
      const invPaid = overview.invoices?.paid || 0;
      const invPend = overview.invoices?.pending || 0;
      const invN = invPaid + invPend;

      setStats({
        totalJobCards: overview.jobs?.total,
        completedJobCards: overview.jobs?.completed,
        totalRevenue: overview.revenue?.total,
        pendingInvoices: overview.invoices?.pending,
        totalChallans: overview.challans?.total,
        pendingChallans: overview.challans?.pending,
        jobsThisMonth: overview.jobs?.thisMonth,
        efficiency: totalQ > 0 ? Math.round((pass / totalQ) * 100) : 0,
        avgProcessingDays: avgTurn,
        inspectionPassPct: totalQ > 0 ? Math.round((pass / totalQ) * 100) : 0,
        invoicesPaidPct: invN > 0 ? Math.round((invPaid / invN) * 100) : 0,
      });
    } else {
      setStats(null);
    }

    const merged = mergeMonthlySeries(rev, jobs);
    const take = dateRange === 'week' ? 1 : dateRange === 'month' ? 3 : 12;
    setMonthlyData(merged.slice(-take));
    setProcessData(Array.isArray(proc) ? proc : []);
    setInvoiceData(Array.isArray(invBreakdown) ? invBreakdown.slice(-take) : []);

    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const StatCard = ({ icon, label, value, subtext, color }) => (
    <div className="card p-5 card-interactive">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-headline">{value ?? 0}</p>
          {subtext && <p className="text-xs text-slate-500 mt-2 leading-snug">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl shrink-0 shadow-sm ${color}`}>
          <span className="material-symbols-outlined text-[22px] text-white">{icon}</span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm gap-2">
        <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
        Loading analytics…
      </div>
    );
  }

  return (
    <div className="page-stack">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="page-title">Advanced analytics</h1>
            <p className="page-subtitle">Deeper trends and breakdowns</p>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="form-input w-full sm:w-auto min-w-[14rem]"
          >
            <option value="week">Last 7 Days (≈ latest month)</option>
            <option value="month">Last 30 Days (≈ 3 months)</option>
            <option value="quarter">Last 90 Days (12 months)</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon="check_circle"
            label="Total Job Cards"
            value={stats?.totalJobCards}
            subtext={`${stats?.completedJobCards || 0} completed`}
            color="bg-slate-800"
          />
          <StatCard
            icon="currency_rupee"
            label="Total Revenue"
            value={`₹${fmtMoney(stats?.totalRevenue)}`}
            subtext={`${stats?.pendingInvoices || 0} invoices pending payment`}
            color="bg-emerald-600"
          />
          <StatCard
            icon="inventory_2"
            label="Challans"
            value={stats?.totalChallans}
            subtext={`${stats?.pendingChallans || 0} pending · ${stats?.jobsThisMonth || 0} new job cards this month`}
            color="bg-amber-600"
          />
          <StatCard
            icon="trending_up"
            label="Inspection pass rate"
            value={`${stats?.efficiency || 0}%`}
            subtext="Share of PASS vs FAIL in incoming inspections"
            color="bg-violet-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5 sm:p-6">
            <h2 className="text-sm font-bold text-slate-800 font-headline mb-4">Monthly trends</h2>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(v, name) =>
                      name === 'Revenue' ? `₹${fmtMoney(v)}` : v
                    }
                  />
                  <Legend />
                  <Line type="monotone" dataKey="jobcards" stroke="#3b82f6" name="Job Cards" />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-12 text-sm">No data available</p>
            )}
          </div>

          <div className="card p-5 sm:p-6">
            <h2 className="text-sm font-bold text-slate-800 font-headline mb-4">Process distribution</h2>
            {processData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={processData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="jobs"
                  >
                    {processData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-12 text-sm">No data available</p>
            )}
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="text-sm font-bold text-slate-800 font-headline mb-4">Invoice analytics</h2>
          {invoiceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={invoiceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v) => `₹${fmtMoney(v)}`} />
                <Legend />
                <Bar dataKey="invoiced" fill="#3b82f6" name="Invoiced" />
                <Bar dataKey="paid" fill="#10b981" name="Paid" />
                <Bar dataKey="pending" fill="#f59e0b" name="Unpaid / partial" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-12 text-sm">No data available</p>
          )}
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="text-sm font-bold text-slate-800 font-headline mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-l-4 border-sky-500 pl-4">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Avg turnaround</p>
              <p className="text-2xl font-extrabold text-slate-900 font-headline">{stats?.avgProcessingDays || 0} days</p>
            </div>
            <div className="border-l-4 border-emerald-500 pl-4">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Inspection pass</p>
              <p className="text-2xl font-extrabold text-slate-900 font-headline">{stats?.inspectionPassPct || 0}%</p>
            </div>
            <div className="border-l-4 border-amber-500 pl-4">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Invoices paid</p>
              <p className="text-2xl font-extrabold text-slate-900 font-headline">{stats?.invoicesPaidPct || 0}%</p>
            </div>
          </div>
        </div>
    </div>
  );
}
