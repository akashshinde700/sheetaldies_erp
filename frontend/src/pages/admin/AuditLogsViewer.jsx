import React, { useState, useEffect } from 'react';
import { Search, Download } from 'lucide-react';
import api from '../../utils/api';

export default function AuditLogsViewer() {
  const [logs, setLogs] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchUser, setSearchUser] = useState('');
  const [searchAction, setSearchAction] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboard();
    if (activeTab === 'all') fetchLogs();
  }, [activeTab]);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/audit/dashboard');
      setDashboard(response.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/audit?userId=${searchUser}&action=${searchAction}`);
      setLogs(response.data.data || []);
    } catch (error) {
      console.error(error);
      alert('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/audit/export?format=csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      alert('Failed to export');
    }
  };

  const actionColors = {
    CREATE: 'bg-green-100 text-green-700',
    UPDATE: 'bg-blue-100 text-blue-700',
    DELETE: 'bg-red-100 text-red-700',
    MODIFY: 'bg-yellow-100 text-yellow-700'
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Audit Logs & Activity Tracking</h1>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Download size={20} /> Export CSV
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-3 font-medium ${activeTab === 'dashboard' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 font-medium ${activeTab === 'all' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            >
              All Logs
            </button>
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && dashboard && (
            <div className="p-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded border-l-4 border-blue-500">
                  <p className="text-gray-600 text-sm">Today's Actions</p>
                  <p className="text-3xl font-bold text-blue-600">{dashboard.todayActions}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded border-l-4 border-green-500">
                  <p className="text-gray-600 text-sm">This Month</p>
                  <p className="text-3xl font-bold text-green-600">{dashboard.monthActions}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded border-l-4 border-purple-500">
                  <p className="text-gray-600 text-sm">Top Users</p>
                  <p className="text-3xl font-bold text-purple-600">{dashboard.topUsers.length}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded border-l-4 border-orange-500">
                  <p className="text-gray-600 text-sm">Resources Modified</p>
                  <p className="text-3xl font-bold text-orange-600">{dashboard.topResources.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Users */}
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-bold mb-4">Most Active Users</h3>
                  <div className="space-y-2">
                    {dashboard.topUsers.map((user, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium">{user.userId}</span>
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">{user.count} actions</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Resources */}
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-bold mb-4">Most Modified Resources</h3>
                  <div className="space-y-2">
                    {dashboard.topResources.map((resource, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium">{resource.resource}</span>
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">{resource.count} changes</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All Logs Tab */}
          {activeTab === 'all' && (
            <div>
              <div className="p-4 border-b space-y-3">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Filter by User ID..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded"
                  />
                  <select
                    value={searchAction}
                    onChange={(e) => setSearchAction(e.target.value)}
                    className="px-3 py-2 border rounded"
                  >
                    <option value="">All Actions</option>
                    <option value="CREATE">CREATE</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  <button
                    onClick={fetchLogs}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {loading ? 'Loading...' : 'Search'}
                  </button>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left">Timestamp</th>
                    <th className="px-4 py-2 text-left">User</th>
                    <th className="px-4 py-2 text-left">Action</th>
                    <th className="px-4 py-2 text-left">Resource</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-2 font-medium">{log.userId}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${actionColors[log.action] || 'bg-gray-100'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2">{log.resource}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${log.status === 200 || log.status === 201 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">{log.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {logs.length === 0 && (
                <div className="p-8 text-center text-gray-500">No logs found</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
