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
    CREATE: 'bg-emerald-100 text-emerald-800',
    UPDATE: 'bg-sky-100 text-sky-900',
    DELETE: 'bg-rose-100 text-rose-800',
    MODIFY: 'bg-amber-100 text-amber-900',
  };

  const tabBtn = (id) =>
    `px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
      activeTab === id
        ? 'text-sky-800 border-sky-600 bg-sky-50/50'
        : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50/80'
    }`;

  return (
    <div className="page-stack-wide">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Audit logs</h1>
          <p className="page-subtitle">Activity tracking and export</p>
        </div>
        <button type="button" onClick={handleExport} className="btn-outline shrink-0 inline-flex items-center gap-2">
          <Download size={20} /> Export CSV
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-200/80 bg-slate-50/40">
          <button type="button" onClick={() => setActiveTab('dashboard')} className={tabBtn('dashboard')}>
            Dashboard
          </button>
          <button type="button" onClick={() => setActiveTab('all')} className={tabBtn('all')}>
            All logs
          </button>
        </div>

        {activeTab === 'dashboard' && dashboard && (
          <div className="p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 border-l-4 border-l-sky-500 shadow-sm">
                <p className="text-slate-500 text-sm">Today&apos;s actions</p>
                <p className="text-3xl font-bold text-sky-800 tabular-nums font-headline">{dashboard.todayActions}</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 border-l-4 border-l-emerald-500 shadow-sm">
                <p className="text-slate-500 text-sm">This month</p>
                <p className="text-3xl font-bold text-emerald-800 tabular-nums font-headline">{dashboard.monthActions}</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 border-l-4 border-l-violet-500 shadow-sm">
                <p className="text-slate-500 text-sm">Top users</p>
                <p className="text-3xl font-bold text-violet-900 tabular-nums font-headline">{dashboard.topUsers.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 border-l-4 border-l-amber-500 shadow-sm">
                <p className="text-slate-500 text-sm">Resources touched</p>
                <p className="text-3xl font-bold text-amber-900 tabular-nums font-headline">{dashboard.topResources.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card p-4 sm:p-5">
                <h3 className="text-sm font-bold text-slate-800 font-headline mb-3">Most active users</h3>
                <div className="space-y-2">
                  {dashboard.topUsers.map((user, idx) => (
                    <div key={idx} className="flex justify-between items-center gap-2 p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
                      <span className="font-medium text-slate-800 text-sm truncate">{user.userId}</span>
                      <span className="badge bg-sky-100 text-sky-900 shrink-0 tabular-nums">{user.count} actions</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card p-4 sm:p-5">
                <h3 className="text-sm font-bold text-slate-800 font-headline mb-3">Most modified resources</h3>
                <div className="space-y-2">
                  {dashboard.topResources.map((resource, idx) => (
                    <div key={idx} className="flex justify-between items-center gap-2 p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
                      <span className="font-medium text-slate-800 text-sm truncate">{resource.resource}</span>
                      <span className="badge bg-emerald-100 text-emerald-900 shrink-0 tabular-nums">{resource.count} changes</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'all' && (
          <div>
            <div className="p-4 border-b border-slate-200/80 bg-slate-50/40">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Filter by user ID…"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="flex-1 form-input"
                />
                <select value={searchAction} onChange={(e) => setSearchAction(e.target.value)} className="form-input sm:w-44 shrink-0">
                  <option value="">All actions</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <button type="button" onClick={fetchLogs} disabled={loading} className="btn-primary sm:w-auto w-full disabled:opacity-50">
                  {loading ? 'Loading…' : 'Search'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200/80">
                    <th className="th text-left">Timestamp</th>
                    <th className="th text-left">User</th>
                    <th className="th text-left">Action</th>
                    <th className="th text-left">Resource</th>
                    <th className="th text-left">Status</th>
                    <th className="th text-left">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log, idx) => (
                    <tr key={idx} className="tr">
                      <td className="td text-xs text-slate-600 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="td font-medium text-slate-800">{log.userId}</td>
                      <td className="td">
                        <span className={`badge font-semibold ${actionColors[log.action] || 'bg-slate-100 text-slate-700'}`}>{log.action}</span>
                      </td>
                      <td className="td text-slate-700">{log.resource}</td>
                      <td className="td">
                        <span
                          className={`badge ${
                            log.status === 200 || log.status === 201 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="td text-xs text-slate-500 font-mono">{log.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {logs.length === 0 && <div className="p-10 text-center text-slate-500 text-sm">No logs found</div>}
          </div>
        )}
      </div>
    </div>
  );
}
