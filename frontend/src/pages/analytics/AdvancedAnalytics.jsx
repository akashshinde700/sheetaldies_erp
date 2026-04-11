import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import { exportToCsv, exportToExcel } from '../../utils/export';

const fmtMoney = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(n || 0));

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {prefix === '₹' ? fmtMoney(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

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
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);

    const [overview, rev, jobs, proc, invBreakdown, turnaround, material] = await Promise.all([
      safeGet('/analytics/overview'),
      safeGet('/analytics/monthly-revenue'),
      safeGet('/analytics/monthly-jobs'),
      safeGet('/analytics/process-dist'),
      safeGet('/analytics/monthly-invoice-breakdown'),
      safeGet('/analytics/turnaround'),
      safeGet('/analytics/material-analytics'),
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
    setMaterials(Array.isArray(material) ? material.slice(0, 20) : []);

    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const StatCard = ({ icon, label, value, subtext, color }) => (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <span className="material-symbols-outlined text-white text-[20px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-extrabold text-slate-800 leading-none">{value}</p>
        {subtext && <p className="text-[11px] text-slate-400 mt-1">{subtext}</p>}
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

  const exportMaterialData = (type) => {
    if (!materials.length) {
      return;
    }
    const rows = materials.map((row, index) => ({
      SrNo: index + 1,
      Material: row.material,
      TotalAmount: row.totalAmount,
      TotalQuantity: row.totalQuantity,
      InvoiceCount: row.invoiceCount,
      AvgPerInvoice: row.avgPerInvoice,
    }));

    if (type === 'csv') exportToCsv(rows, 'material-analytics');
    else exportToExcel(rows, 'material-analytics');
  };

  return (
    <div className="page-stack w-full space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 font-headline">Advanced Analytics</h2>
          <p className="text-sm text-slate-400 mt-0.5">Deeper trends and breakdowns</p>
        </div>
        <Link
          to="/analytics"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
        >
          ← Back to main analytics
        </Link>
      </div>

      {/* Date Range Selector */}
      <div className="flex gap-3 items-end">
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Time Period</label>
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
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          subtext={`${stats?.pendingChallans || 0} pending · ${stats?.jobsThisMonth || 0} new this month`}
          color="bg-amber-600"
        />
        <StatCard
          icon="trending_up"
          label="Inspection Pass Rate"
          value={`${stats?.efficiency || 0}%`}
          subtext="Share of PASS vs FAIL in incoming inspections"
          color="bg-violet-600"
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trends */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-500 text-[16px]">trending_up</span>
            </div>
            <h3 className="section-title">Monthly Trends</h3>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="jobGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip prefix="₹" />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="jobcards" stroke="#3b82f6" strokeWidth={2} name="Job Cards" dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-400 text-center py-10">No data available</p>
          )}
        </div>

        {/* Process Distribution */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-500 text-[16px]">donut_large</span>
            </div>
            <h3 className="section-title">Process Distribution</h3>
          </div>
          {processData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={processData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name.slice(0, 10)}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="jobs"
                >
                  {processData.map((entry, index) => (
                    <Cell key={`proc-pie-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v} jobs`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-400 text-center py-10">No process data</p>
          )}
        </div>
      </div>

      {/* Invoice Analytics */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-500 text-[16px]">receipt_long</span>
          </div>
          <h3 className="section-title">Invoice Analytics</h3>
        </div>
        {invoiceData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={invoiceData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmtMoney(v)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip prefix="₹" />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="invoiced" fill="#3b82f6" name="Invoiced" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="paid" fill="#10b981" name="Paid" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="pending" fill="#f59e0b" name="Unpaid / Partial" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-slate-400 text-center py-10">No invoice data</p>
        )}
      </div>

      {/* Material-wise Analytics */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-slate-700 text-[16px]">inventory_2</span>
            </div>
            <div>
              <h3 className="section-title">Material-wise Analytics</h3>
              <p className="text-xs text-slate-400">Revenue and quantity by material across invoices</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportMaterialData('xlsx')}
              disabled={!materials.length}
              className="btn-outline"
            >
              Export XLSX
            </button>
            <button
              type="button"
              onClick={() => exportMaterialData('csv')}
              disabled={!materials.length}
              className="btn-secondary"
            >
              Export CSV
            </button>
          </div>
        </div>

        {materials.length > 0 ? (
          <>
            <div className="h-64 mb-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={materials} margin={{ top: 4, right: 20, left: 0, bottom: 0 }} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="material" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={70} />
                  <YAxis tickFormatter={v => fmtMoney(v)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip content={<CustomTooltip prefix="₹" />} />
                  <Bar dataKey="totalAmount" fill="#6366f1" name="Amount" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-3">Material</th>
                    <th className="px-3 py-3 text-right">Invoice Count</th>
                    <th className="px-3 py-3 text-right">Qty</th>
                    <th className="px-3 py-3 text-right">Total Amount</th>
                    <th className="px-3 py-3 text-right">Avg / Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((row, index) => (
                    <tr key={row.material || index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-3 py-3 font-medium text-slate-700">{row.material || 'Unknown'}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{row.invoiceCount}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{row.totalQuantity}</td>
                      <td className="px-3 py-3 text-right text-slate-700">₹{fmtMoney(row.totalAmount)}</td>
                      <td className="px-3 py-3 text-right text-slate-700">₹{fmtMoney(row.avgPerInvoice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400 text-center py-10">No material analytics available yet.</p>
        )}
      </div>

      {/* Summary Insights */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-cyan-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-cyan-500 text-[16px]">insights</span>
          </div>
          <h3 className="section-title">Summary Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-l-4 border-sky-500 pl-4">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2">Avg Turnaround Time</p>
            <p className="text-3xl font-extrabold text-slate-900 font-headline">{stats?.avgProcessingDays || 0} <span className="text-base font-medium text-slate-400">days</span></p>
          </div>
          <div className="border-l-4 border-emerald-500 pl-4">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2">Inspection Pass Rate</p>
            <p className="text-3xl font-extrabold text-slate-900 font-headline">{stats?.inspectionPassPct || 0}<span className="text-base font-medium text-slate-400">%</span></p>
          </div>
          <div className="border-l-4 border-amber-500 pl-4">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2">Invoice Payment Rate</p>
            <p className="text-3xl font-extrabold text-slate-900 font-headline">{stats?.invoicesPaidPct || 0}<span className="text-base font-medium text-slate-400">%</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
