import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  UserPlus, X, Pencil, Eye, KeyRound, UserX, UserCheck, Info,
  ShieldCheck, UserCog, HardHat, Loader2,
} from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ROLES = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'];

const ROLE_COLOR = {
  ADMIN:    'bg-rose-50 text-rose-700 border border-rose-200',
  MANAGER:  'bg-orange-50 text-orange-700 border border-orange-200',
  OPERATOR: 'bg-sky-50 text-sky-700 border border-sky-200',
  VIEWER:   'bg-slate-100 text-slate-600 border border-slate-200',
};

const ROLE_ICON = {
  ADMIN:    { Icon: ShieldCheck, bg: 'bg-rose-50 text-rose-500',     top: 'border-t-rose-400'   },
  MANAGER:  { Icon: UserCog,     bg: 'bg-orange-50 text-orange-500', top: 'border-t-orange-400' },
  OPERATOR: { Icon: HardHat,     bg: 'bg-sky-50 text-sky-500',       top: 'border-t-sky-400'    },
  VIEWER:   { Icon: Eye,         bg: 'bg-slate-100 text-slate-500',  top: 'border-t-slate-300'  },
};

const ROLE_DESC = {
  ADMIN:    'Full access — can manage users, prices, all data',
  MANAGER:  'Can create invoices, challans, manage parties',
  OPERATOR: 'Can create job cards, inspections, certificates',
  VIEWER:   'Read-only access — cannot create or edit anything',
};

const EMPTY_NEW = { name: '', email: '', role: 'OPERATOR' };

const SkeletonRow = () => (
  <tr>
    <td className="td"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-3.5 w-28" /></div></td>
    <td className="td"><Skeleton className="h-3.5 w-40" /></td>
    <td className="td"><Skeleton className="h-5 w-20 rounded-full" /></td>
    <td className="td"><Skeleton className="h-5 w-14 rounded-full" /></td>
    <td className="td"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td"><Skeleton className="h-3.5 w-40" /></td>
  </tr>
);

export default function UserManagement() {
  const { user: me } = useAuth();
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showNew,  setShowNew]  = useState(false);
  const [newForm,  setNewForm]  = useState({ ...EMPTY_NEW });
  const [creating, setCreating] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editName, setEditName] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/auth/users')
      .then(r => setUsers(r.data.data || []))
      .catch(() => toast.error('Failed to load users.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/auth/users', newForm);
      toast.success(`User "${newForm.name}" created. Login credentials sent by email.`);
      setShowNew(false);
      setNewForm({ ...EMPTY_NEW });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating user.');
    } finally { setCreating(false); }
  };

  const startEdit = (u) => { setEditId(u.id); setEditRole(u.role); setEditName(u.name); };

  const saveEdit = async (userId) => {
    setSaving(true);
    try {
      await api.put(`/auth/users/${userId}`, { name: editName, role: editRole });
      toast.success('User updated.');
      setEditId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating user.');
    } finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    if (u.id === me?.id) { toast.error('Cannot deactivate yourself.'); return; }
    try {
      await api.patch(`/auth/users/${u.id}/toggle`);
      toast.success(`${u.name} ${u.isActive ? 'deactivated' : 'activated'}.`);
      load();
    } catch { toast.error('Error.'); }
  };

  const resetPassword = (u) => {
    setConfirmDialog({
      title: 'Reset password?',
      message: `A new temporary password will be generated for ${u.name} and emailed to ${u.email}.`,
      confirmLabel: 'Reset Password',
      variant: 'primary',
      icon: 'lock_reset',
      onConfirm: async () => {
        try {
          await api.put(`/auth/users/${u.id}`, { resetPassword: true });
          toast.success(`New password sent to ${u.email}.`);
        } catch { toast.error('Error resetting password.'); }
        finally { setConfirmDialog(null); }
      },
    });
  };

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Create users and assign roles — Admin only</p>
        </div>
        <Button type="button" variant={showNew ? 'outline' : 'primary'} onClick={() => setShowNew(p => !p)} className="shrink-0">
          {showNew ? <X /> : <UserPlus />}
          {showNew ? 'Cancel' : 'Add User'}
        </Button>
      </div>

      {/* Role Reference Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ROLES.map(r => {
          const meta = ROLE_ICON[r];
          const RoleIcon = meta.Icon;
          return (
            <Card key={r} className={`p-4 border-t-2 ${meta.top}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${meta.bg}`}>
                  <RoleIcon className="h-3.5 w-3.5" />
                </div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${ROLE_COLOR[r]}`}>{r}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{ROLE_DESC[r]}</p>
            </Card>
          );
        })}
      </div>

      {/* New User Form */}
      {showNew && (
        <Card className="border-sky-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-sky-50 flex items-center justify-center">
                <UserPlus className="h-3.5 w-3.5 text-sky-600" />
              </div>
              Create New User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <FormField label="Full Name" htmlFor="user-name" required>
                <Input id="user-name" value={newForm.name} onChange={e => setNewForm(p => ({...p, name: e.target.value}))}
                  required placeholder="Ravi Kumar" />
              </FormField>
              <FormField label="Email" htmlFor="user-email" required>
                <Input id="user-email" type="email" value={newForm.email} onChange={e => setNewForm(p => ({...p, email: e.target.value}))}
                  required placeholder="ravi@sheetaldies.com" />
              </FormField>
              <FormField label="Role" required>
                <Select value={newForm.role} onValueChange={v => setNewForm(p => ({...p, role: v}))}>
                  <SelectTrigger aria-label="Role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <div className="col-span-1 sm:col-span-2 md:col-span-3">
                <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-sky-700 flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0" />
                  A temporary password will be auto-generated and sent to the user's email. They can change it after first login.
                </div>
              </div>
              <div className="col-span-1 sm:col-span-2 md:col-span-3 flex flex-wrap gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? <><Loader2 className="animate-spin" /> Creating...</> : <><UserPlus /> Create User</>}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-left min-w-[720px]">
            <thead>
              <tr>
                {['User', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="th whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
              ) : users.map(u => (
                <tr key={u.id} className={`tr ${!u.isActive ? 'opacity-50' : ''}`}>

                  {/* Name */}
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-slate-800">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        {editId === u.id ? (
                          <Input value={editName} onChange={e => setEditName(e.target.value)}
                            aria-label={`Edit name for ${u.name}`}
                            className="h-8 min-h-0 text-sm w-36" />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                        )}
                        {u.id === me?.id && <p className="text-[10px] text-sky-500 font-bold">You</p>}
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="td text-xs text-slate-500">{u.email}</td>

                  {/* Role */}
                  <td className="td">
                    {editId === u.id && u.id !== me?.id ? (
                      <select value={editRole} onChange={e => setEditRole(e.target.value)}
                        aria-label={`Change role for ${u.name}`}
                        className="form-input h-8 min-h-0 py-1 text-xs font-bold w-32">
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${ROLE_COLOR[u.role]}`}>
                        {u.role}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="td">
                    <Badge variant={u.isActive ? 'success' : 'error'} className="px-2 py-0.5 text-[10px]">
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>

                  {/* Last Login */}
                  <td className="td text-xs text-slate-400 whitespace-nowrap">
                    {u.lastLogin ? formatDate(u.lastLogin, true) : 'Never'}
                  </td>

                  {/* Actions */}
                  <td className="td">
                    <div className="flex items-center gap-0.5 flex-wrap">
                      {editId === u.id ? (
                        <>
                          <Button type="button" size="sm" onClick={() => saveEdit(u.id)} disabled={saving}
                            className="bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-400">
                            {saving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEditId(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => startEdit(u)}
                            title="Edit" aria-label={`Edit user ${u.name}`}
                            className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                            <Pencil />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setViewUser(u)}
                            title="View" aria-label={`View user ${u.name}`}
                            className="text-slate-400 hover:text-slate-700">
                            <Eye />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => resetPassword(u)}
                            title="Reset password" aria-label={`Reset password for ${u.name}`}
                            className="text-slate-400 hover:text-amber-600 hover:bg-amber-50">
                            <KeyRound />
                          </Button>
                          {u.id !== me?.id && (
                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => toggleActive(u)}
                              title={u.isActive ? 'Deactivate' : 'Activate'}
                              aria-label={`${u.isActive ? 'Deactivate' : 'Activate'} user ${u.name}`}
                              className={u.isActive
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}>
                              {u.isActive ? <UserX /> : <UserCheck />}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 tabular-nums">
        Total {users.length} users · {users.filter(u => u.isActive).length} active
      </p>

      {/* View modal */}
      {viewUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px] p-4 animate-backdrop-in" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-card-elevated border border-slate-200 animate-scale-in">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 leading-none tracking-tight">User details</h3>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setViewUser(null)} aria-label="Close" className="text-slate-400 hover:text-slate-700">
                <X />
              </Button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</p><p className="font-semibold text-slate-800 mt-0.5">{viewUser.name || '—'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p><p className="font-semibold text-slate-800 mt-0.5">{viewUser.email || '—'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</p><p className="font-semibold text-slate-800 mt-0.5">{viewUser.role || '—'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p><p className="font-semibold text-slate-800 mt-0.5">{viewUser.isActive ? 'Active' : 'Inactive'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Login</p><p className="font-semibold text-slate-800 whitespace-nowrap mt-0.5">{formatDate(viewUser.lastLogin, true)}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created</p><p className="font-semibold text-slate-800 whitespace-nowrap mt-0.5">{formatDate(viewUser.createdAt, true)}</p></div>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
