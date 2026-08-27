import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Download, Table2 } from 'lucide-react';
import api from '../../utils/api';
import { exportToCsv, exportToExcel } from '../../utils/export';
import KpiCard from '../../components/KpiCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const fmtMoney = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(n || 0));

const COLORS = ['#2563eb', '#7c3aed', '#047857', '#b45309', '#e11d48', '#0e7490', '#a04606', '#4338ca'];

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

  if (loading) {
    return (
      <div className="page-stack w-full space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3.5 w-44" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
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
    <div className="page-stack w-full space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Advanced Analytics</h1>
          <p className="page-subtitle">Deeper trends and breakdowns</p>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link to="/analytics">
            <ArrowLeft /> Back to main analytics
          </Link>
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-3">
          <div className="space-y-1 sm:w-64">
            <label htmlFor="adv-time-period" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Time Period
            </label>
            <select
              id="adv-time-period"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="form-input text-xs w-full"
            >
              <option value="week">Last 7 Days (≈ latest month)</option>
              <option value="month">Last 30 Days (≈ 3 months)</option>
              <option value="quarter">Last 90 Days (12 months)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total Job Cards"
          value={stats?.totalJobCards}
          sub={`${stats?.completedJobCards || 0} completed`}
          icon="check_circle"
          iconBg="bg-slate-100 text-slate-700"
        />
        <KpiCard
          label="Total Revenue"
          value={`₹${fmtMoney(stats?.totalRevenue)}`}
          sub={`${stats?.pendingInvoices || 0} invoices pending payment`}
          icon="currency_rupee"
          iconBg="bg-emerald-100 text-emerald-700"
        />
        <KpiCard
          label="Challans"
          value={stats?.totalChallans}
          sub={`${stats?.pendingChallans || 0} pending · ${stats?.jobsThisMonth || 0} new this month`}
          icon="inventory_2"
          iconBg="bg-amber-100 text-amber-700"
        />
        <KpiCard
          label="Inspection Pass Rate"
          value={`${stats?.efficiency || 0}%`}
          sub="Share of PASS vs FAIL in incoming inspections"
          icon="trending_up"
          iconBg="bg-violet-100 text-violet-700"
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>Job cards and revenue over the selected period</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
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
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#687689' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#687689' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip prefix="₹" />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="jobcards" stroke="#3b82f6" strokeWidth={2} name="Job Cards" dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="revenue" stroke="#047857" strokeWidth={2} name="Revenue" dot={{ r: 3, fill: '#047857' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 text-center py-10">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Process Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Process Distribution</CardTitle>
            <CardDescription>Share of jobs per process type</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
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
          </CardContent>
        </Card>
      </div>

      {/* Invoice Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Analytics</CardTitle>
          <CardDescription>Invoiced vs paid vs pending amounts per month</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {invoiceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={invoiceData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#687689' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtMoney(v)} tick={{ fontSize: 11, fill: '#687689' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<CustomTooltip prefix="₹" />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="invoiced" fill="#3b82f6" name="Invoiced" radius={[3, 3, 0, 0]} maxBarSize={28} />
                <Bar dataKey="paid" fill="#047857" name="Paid" radius={[3, 3, 0, 0]} maxBarSize={28} />
                <Bar dataKey="pending" fill="#b45309" name="Unpaid / Partial" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-400 text-center py-10">No invoice data</p>
          )}
        </CardContent>
      </Card>

      {/* Material-wise Analytics */}
      <Card>
        <CardHeader className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Material-wise Analytics</CardTitle>
            <CardDescription className="mt-1">Revenue and quantity by material across invoices</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportMaterialData('xlsx')}
              disabled={!materials.length}
            >
              <Table2 /> Export XLSX
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => exportMaterialData('csv')}
              disabled={!materials.length}
            >
              <Download /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {materials.length > 0 ? (
            <>
              <div className="h-64 mb-5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={materials} margin={{ top: 4, right: 20, left: 0, bottom: 0 }} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="material" tick={{ fontSize: 11, fill: '#687689' }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={70} />
                    <YAxis tickFormatter={v => fmtMoney(v)} tick={{ fontSize: 11, fill: '#687689' }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<CustomTooltip prefix="₹" />} />
                    <Bar dataKey="totalAmount" fill="#2563eb" name="Amount" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="table-responsive -mx-4 sm:-mx-5">
                <table className="w-full text-left min-w-[520px]">
                  <thead>
                    <tr>
                      <th className="th">Material</th>
                      <th className="th text-right">Invoice Count</th>
                      <th className="th text-right">Qty</th>
                      <th className="th text-right">Total Amount</th>
                      <th className="th text-right">Avg / Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50/80">
                    {materials.map((row, index) => (
                      <tr key={row.material || index} className="tr">
                        <td className="td font-medium text-slate-700">{row.material || 'Unknown'}</td>
                        <td className="td text-right text-slate-600 tabular-nums">{row.invoiceCount}</td>
                        <td className="td text-right text-slate-600 tabular-nums">{row.totalQuantity}</td>
                        <td className="td text-right text-slate-700 tabular-nums">₹{fmtMoney(row.totalAmount)}</td>
                        <td className="td text-right text-slate-700 tabular-nums">₹{fmtMoney(row.avgPerInvoice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 text-center py-10">No material analytics available yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Summary Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Summary Insights</CardTitle>
          <CardDescription>Key operational rates at a glance</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-l-4 border-sky-500 pl-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Avg Turnaround Time</p>
              <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{stats?.avgProcessingDays || 0} <span className="text-base font-medium text-slate-400">days</span></p>
            </div>
            <div className="border-l-4 border-emerald-500 pl-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Inspection Pass Rate</p>
              <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{stats?.inspectionPassPct || 0}<span className="text-base font-medium text-slate-400">%</span></p>
            </div>
            <div className="border-l-4 border-amber-500 pl-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Invoice Payment Rate</p>
              <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{stats?.invoicesPaidPct || 0}<span className="text-base font-medium text-slate-400">%</span></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
