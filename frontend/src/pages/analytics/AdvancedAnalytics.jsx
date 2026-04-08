import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Package, CheckCircle } from 'lucide-react';
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

  const StatCard = ({ icon: Icon, label, value, subtext, color }) => (
    <div className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-800">{value ?? 0}</p>
          {subtext && <p className="text-xs text-gray-500 mt-2">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="p-6 text-center">Loading analytics...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Advanced Analytics Dashboard</h1>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border rounded bg-white"
          >
            <option value="week">Last 7 Days (≈ latest month)</option>
            <option value="month">Last 30 Days (≈ 3 months)</option>
            <option value="quarter">Last 90 Days (12 months)</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={CheckCircle}
            label="Total Job Cards"
            value={stats?.totalJobCards}
            subtext={`${stats?.completedJobCards || 0} completed`}
            color="bg-blue-500"
          />
          <StatCard
            icon={DollarSign}
            label="Total Revenue"
            value={`₹${fmtMoney(stats?.totalRevenue)}`}
            subtext={`${stats?.pendingInvoices || 0} invoices pending payment`}
            color="bg-green-500"
          />
          <StatCard
            icon={Package}
            label="Challans"
            value={stats?.totalChallans}
            subtext={`${stats?.pendingChallans || 0} pending · ${stats?.jobsThisMonth || 0} new job cards this month`}
            color="bg-orange-500"
          />
          <StatCard
            icon={TrendingUp}
            label="Inspection pass rate"
            value={`${stats?.efficiency || 0}%`}
            subtext="Share of PASS vs FAIL in incoming inspections"
            color="bg-purple-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Monthly Trends</h2>
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
              <p className="text-gray-500 text-center py-12">No data available</p>
            )}
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Process Distribution</h2>
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
              <p className="text-gray-500 text-center py-12">No data available</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Invoice Analytics</h2>
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
            <p className="text-gray-500 text-center py-12">No data available</p>
          )}
        </div>

        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Summary Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-gray-600 text-sm">Avg turnaround (sample)</p>
              <p className="text-2xl font-bold text-gray-800">{stats?.avgProcessingDays || 0} days</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-gray-600 text-sm">Inspection pass rate</p>
              <p className="text-2xl font-bold text-gray-800">{stats?.inspectionPassPct || 0}%</p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <p className="text-gray-600 text-sm">Invoices marked paid</p>
              <p className="text-2xl font-bold text-gray-800">{stats?.invoicesPaidPct || 0}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
