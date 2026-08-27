import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Download, X, ScrollText } from 'lucide-react';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const ACTION_VARIANT = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
  MODIFY: 'warning',
};

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

const SkeletonRow = () => (
  <tr>
    <td className="td"><Skeleton className="h-3.5 w-28" /></td>
    <td className="td"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td"><Skeleton className="h-5 w-16 rounded-full" /></td>
    <td className="td"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td"><Skeleton className="h-3.5 w-20" /></td>
    <td className="td"><Skeleton className="h-3.5 w-10" /></td>
  </tr>
);

export default function AuditLogsViewer() {
  const [logs, setLogs] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchUser, setSearchUser] = useState('');
  const [searchAction, setSearchAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewLog, setViewLog] = useState(null);

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
      toast.error('Failed to load dashboard.');
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/audit?userId=${searchUser}&action=${searchAction}`);
      setLogs(response.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load audit logs.');
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
      toast.error('Failed to export audit logs.');
    }
  };

  const tabBtn = (id) =>
    `px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-inset ${
      activeTab === id
        ? 'text-sky-800 border-sky-600 bg-sky-50/50'
        : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50/80'
    }`;

  return (
    <div className="page-stack-wide">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Audit logs</h1>
          <p className="page-subtitle">Activity tracking and export</p>
        </div>
        <Button type="button" variant="outline" onClick={handleExport} className="shrink-0">
          <Download /> Export CSV
        </Button>
      </div>

      <div className="card overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200/80 bg-slate-50/40" role="tablist">
          <button type="button" onClick={() => setActiveTab('dashboard')} className={tabBtn('dashboard')} role="tab" aria-selected={activeTab === 'dashboard'}>
            Dashboard
          </button>
          <button type="button" onClick={() => setActiveTab('all')} className={tabBtn('all')} role="tab" aria-selected={activeTab === 'all'}>
            All logs
          </button>
          <button type="button" onClick={() => setActiveTab('reports')} className={tabBtn('reports')} role="tab" aria-selected={activeTab === 'reports'}>
            Reports
          </button>
        </div>

        {activeTab === 'dashboard' && dashboard && (
          <div className="p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card className="p-4 border-l-4 border-l-sky-500">
                <p className="text-slate-500 text-sm">Today&apos;s actions</p>
                <p className="text-3xl font-bold text-sky-800 tabular-nums font-headline">{dashboard.todayActions}</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-emerald-500">
                <p className="text-slate-500 text-sm">This month</p>
                <p className="text-3xl font-bold text-emerald-800 tabular-nums font-headline">{dashboard.monthActions}</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-violet-500">
                <p className="text-slate-500 text-sm">Top users</p>
                <p className="text-3xl font-bold text-violet-900 tabular-nums font-headline">{dashboard.topUsers.length}</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-amber-500">
                <p className="text-slate-500 text-sm">Resources touched</p>
                <p className="text-3xl font-bold text-amber-900 tabular-nums font-headline">{dashboard.topResources.length}</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4 sm:p-5">
                <h3 className="text-sm font-bold text-slate-800 font-headline mb-3">Most active users</h3>
                <div className="space-y-2">
                  {dashboard.topUsers.map((user, idx) => (
                    <div key={idx} className="flex justify-between items-center gap-2 p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
                      <span className="font-medium text-slate-800 text-sm truncate">{user.userName || `User #${user.userId}`}</span>
                      <Badge variant="info" className="shrink-0 tabular-nums">{user.count} actions</Badge>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-4 sm:p-5">
                <h3 className="text-sm font-bold text-slate-800 font-headline mb-3">Most modified resources</h3>
                <div className="space-y-2">
                  {dashboard.topResources.map((resource, idx) => (
                    <div key={idx} className="flex justify-between items-center gap-2 p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
                      <span className="font-medium text-slate-800 text-sm truncate font-mono">{resource.tableName || resource.resource}</span>
                      <Badge variant="success" className="shrink-0 tabular-nums">{resource.count} changes</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'all' && (
          <div>
            {/* Filter toolbar */}
            <div className="p-3 border-b border-slate-200/80 bg-slate-50/40">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
                <div className="space-y-1 flex-1 min-w-[200px]">
                  <FilterLabel htmlFor="audit-user-filter">User ID</FilterLabel>
                  <Input
                    id="audit-user-filter"
                    type="text"
                    placeholder="Filter by user ID…"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="h-9 min-h-0 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <FilterLabel htmlFor="audit-action-filter">Action</FilterLabel>
                  <select id="audit-action-filter" value={searchAction} onChange={(e) => setSearchAction(e.target.value)} className="form-input text-xs sm:w-44">
                    <option value="">All actions</option>
                    <option value="CREATE">CREATE</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <Button type="button" onClick={fetchLogs} disabled={loading} className="sm:w-auto w-full">
                  {loading ? 'Loading…' : 'Search'}
                </Button>
              </div>
            </div>

            {/* Log table */}
            <div className="table-responsive">
              <table className="w-full text-left min-w-[720px]">
                <thead>
                  <tr>
                    <th className="th">Timestamp</th>
                    <th className="th">User</th>
                    <th className="th">Action</th>
                    <th className="th">Resource</th>
                    <th className="th">IP</th>
                    <th className="th text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/80">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : logs.map((log, idx) => (
                    <tr key={idx} className="tr">
                      <td className="td text-xs text-slate-600 font-mono whitespace-nowrap">{formatDate(log.createdAt, true)}</td>
                      <td className="td text-xs font-medium text-slate-800">{log.user?.name || 'System'}</td>
                      <td className="td">
                        <Badge variant={ACTION_VARIANT[log.action] || 'neutral'} className="px-2 py-0.5 text-[10px]">{log.action}</Badge>
                      </td>
                      <td className="td text-xs text-slate-700 font-mono">{log.tableName}</td>
                      <td className="td text-xs text-slate-500 font-mono">{log.ipAddress}</td>
                      <td className="td text-right">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setViewLog(log)}
                          aria-label={`View log details for ${log.tableName} ${log.action}`}
                          className="h-7 px-2 text-[11px] text-sky-700 hover:text-sky-900 hover:bg-sky-50">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!loading && logs.length === 0 && (
              <div className="px-4 py-10 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                    <ScrollText className="h-5 w-5 text-sky-300" />
                  </div>
                  <p className="text-sm text-slate-500">No logs found</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && dashboard && (
          <div className="p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4 sm:p-5">
                <h3 className="text-sm font-bold text-slate-800 font-headline mb-3">Action-wise report (this month)</h3>
                <div className="space-y-2">
                  {(dashboard.actionBreakdown || []).map((row, idx) => (
                    <div key={idx} className="flex justify-between items-center gap-2 p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
                      <Badge variant={ACTION_VARIANT[row.action] || 'neutral'}>{row.action}</Badge>
                      <span className="font-semibold text-slate-800 tabular-nums">{row.count}</span>
                    </div>
                  ))}
                  {(!dashboard.actionBreakdown || dashboard.actionBreakdown.length === 0) && (
                    <p className="text-xs text-slate-500">No actions in this period.</p>
                  )}
                </div>
              </Card>

              <Card className="p-4 sm:p-5">
                <h3 className="text-sm font-bold text-slate-800 font-headline mb-3">Last 7 days activity</h3>
                <div className="space-y-2">
                  {(dashboard.last7Days || []).map((row, idx) => (
                    <div key={idx} className="flex justify-between items-center gap-2 p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
                      <span className="text-sm text-slate-700 whitespace-nowrap">{formatDate(row.date)}</span>
                      <Badge className="bg-violet-100 text-violet-900 tabular-nums">{row.count}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4 sm:p-5">
                <h3 className="text-sm font-bold text-slate-800 font-headline mb-3">Top users report</h3>
                <div className="space-y-2">
                  {(dashboard.topUsers || []).map((row, idx) => (
                    <div key={idx} className="flex justify-between items-center gap-2 p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{row.userName || `User #${row.userId}`}</p>
                        {row.userEmail && <p className="text-[11px] text-slate-500 truncate">{row.userEmail}</p>}
                      </div>
                      <Badge variant="info" className="tabular-nums">{row.count}</Badge>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4 sm:p-5">
                <h3 className="text-sm font-bold text-slate-800 font-headline mb-3">Resource-wise report</h3>
                <div className="space-y-2">
                  {(dashboard.topResources || []).map((row, idx) => (
                    <div key={idx} className="flex justify-between items-center gap-2 p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
                      <span className="text-sm font-medium text-slate-800 truncate font-mono">{row.tableName || row.resource}</span>
                      <Badge variant="success" className="tabular-nums">{row.count}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {viewLog && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px] p-4 animate-backdrop-in" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-card-elevated border border-slate-200 animate-scale-in">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 leading-none tracking-tight">Audit log details</h3>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setViewLog(null)} aria-label="Close" className="text-slate-400 hover:text-slate-700">
                <X />
              </Button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</p><p className="font-semibold text-slate-800 font-mono whitespace-nowrap mt-0.5">{formatDate(viewLog.createdAt, true)}</p></div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action</p>
                <p className="mt-1"><Badge variant={ACTION_VARIANT[viewLog.action] || 'neutral'}>{viewLog.action || '—'}</Badge></p>
              </div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">User</p><p className="font-semibold text-slate-800 mt-0.5">{viewLog.user?.name || viewLog.userId || 'System'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Table</p><p className="font-semibold text-slate-800 font-mono mt-0.5">{viewLog.tableName || '—'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Record ID</p><p className="font-semibold text-slate-800 font-mono tabular-nums mt-0.5">{viewLog.recordId ?? '—'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">IP</p><p className="font-semibold text-slate-800 font-mono mt-0.5">{viewLog.ipAddress || '—'}</p></div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">New values</p>
                <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-60">{typeof viewLog.newValues === 'string' ? viewLog.newValues : JSON.stringify(viewLog.newValues || {}, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
