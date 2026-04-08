import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Package, CheckCircle } from 'lucide-react';
import api from '../../utils/api';

export default function AdvancedAnalytics() {
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [processData, setProcessData] = useState([]);
  const [invoiceData, setInvoiceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month'); // week, month, quarter

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch multiple analytics endpoints
      const [statsRes, monthlyRes, processRes, invoiceRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get(`/analytics/monthly?range=${dateRange}`),
        api.get('/analytics/by-process'),
        api.get('/analytics/invoices'),
      ]).catch(() => [{ data: { data: {} } }, { data: { data: [] } }, { data: { data: [] } }, { data: { data: [] } }]);

      setStats(statsRes.data?.data || {});
      setMonthlyData(monthlyRes.data?.data || []);
      setProcessData(processRes.data?.data || []);
      setInvoiceData(invoiceRes.data?.data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const StatCard = ({ icon: Icon, label, value, subtext, color }) => (
    <div className="bg-white m rounded-lg p-6 shadow hover:shadow-lg transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-800">{value || 0}</p>
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
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
          </select>
        </div>

        {/* KPI Cards */}
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
            value={`₹${stats?.totalRevenue || 0}`}
            subtext={`${stats?.pendingInvoices || 0} pending`}
            color="bg-green-500"
          />
          <StatCard
            icon={Package}
            label="Total Items Processed"
            value={stats?.totalItemsProcessed}
            subtext={`${stats?.processedThisMonth || 0} this month`}
            color="bg-orange-500"
          />
          <StatCard
            icon={TrendingUp}
            label="Process Efficiency"
            value={`${stats?.efficiency || 0}%`}
            subtext="On-time completion rate"
            color="bg-purple-500"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Trends */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Monthly Trends</h2>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="jobcards" stroke="#3b82f6" name="Job Cards" />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">No data available</p>
            )}
          </div>

          {/* Process Distribution */}
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
                    dataKey="count"
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

        {/* Invoice Analytics */}
        <div className="bg-white rounded-lg p-6 shadow mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Invoice Analytics</h2>
          {invoiceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={invoiceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="invoiced" fill="#3b82f6" name="Invoiced" />
                <Bar dataKey="paid" fill="#10b981" name="Paid" />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available</p>
          )}
        </div>

        {/* Summary Stats Table */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Summary Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-gray-600 text-sm">Avg Processing Time</p>
              <p className="text-2xl font-bold text-gray-800">{stats?.avgProcessingDays || 0} days</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-gray-600 text-sm">Customer Satisfaction</p>
              <p className="text-2xl font-bold text-gray-800">{stats?.satisfaction || 0}%</p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <p className="text-gray-600 text-sm">On-Time Delivery Rate</p>
              <p className="text-2xl font-bold text-gray-800">{stats?.onTimeRate || 0}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
