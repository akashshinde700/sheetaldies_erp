import { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const ROLES = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'];

const ROLE_COLOR = {
  ADMIN:    'bg-rose-50 text-rose-700 border border-rose-200',
  MANAGER:  'bg-orange-50 text-orange-700 border border-orange-200',
  OPERATOR: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  VIEWER:   'bg-slate-100 text-slate-600 border border-slate-200',
};

const ROLE_ICON = {
  ADMIN:    { icon: 'admin_panel_settings', bg: 'bg-rose-50 text-rose-500',    top: 'border-t-rose-400'    },
  MANAGER:  { icon: 'manage_accounts',      bg: 'bg-orange-50 text-orange-500', top: 'border-t-orange-400'  },
  OPERATOR: { icon: 'engineering',          bg: 'bg-indigo-50 text-indigo-500', top: 'border-t-indigo-400'  },
  VIEWER:   { icon: 'visibility',           bg: 'bg-slate-100 text-slate-500',  top: 'border-t-slate-300'   },
};

const ROLE_DESC = {
  ADMIN:    'Full access — can manage users, prices, all data',
  MANAGER:  'Can create invoices, challans, manage parties',
  OPERATOR: 'Can create job cards, inspections, certificates',
  VIEWER:   'Read-only access — cannot create or edit anything',
};

const EMPTY_NEW = { name: '', email: '', role: 'OPERATOR' };

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

  const resetPassword = async (u) => {
    if (!window.confirm(`Reset password for ${u.name}? A new temporary password will be emailed to ${u.email}.`)) return;
    try {
      await api.put(`/auth/users/${u.id}`, { resetPassword: true });
      toast.success(`New password sent to ${u.email}.`);
    } catch { toast.error('Error resetting password.'); }
  };

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">User Management</h2>
          <p className="text-xs text-slate-400 mt-0.5">Create users and assign roles — Admin only</p>
        </div>
        <button type="button" onClick={() => setShowNew(p => !p)} className="btn-primary">
          <span className="material-symbols-outlined text-sm">{showNew ? 'close' : 'person_add'}</span>
          {showNew ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {/* Role Reference Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ROLES.map(r => {
          const meta = ROLE_ICON[r];
          return (
            <div key={r} className={`bg-white rounded-xl p-4 shadow-sm border-t-2 ${meta.top}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${meta.bg}`}>
                  <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
                </div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${ROLE_COLOR[r]}`}>{r}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{ROLE_DESC[r]}</p>
            </div>
          );
        })}
      </div>

      {/* New User Form */}
      {showNew && (
        <div className="card border-2 border-indigo-200 p-5">
          <h3 className="text-sm font-extrabold text-slate-700 mb-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-600 text-[14px]">person_add</span>
            </div>
            Create New User
          </h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Full Name *</label>
              <input value={newForm.name} onChange={e => setNewForm(p => ({...p, name: e.target.value}))}
                required className="form-input" placeholder="Ravi Kumar" />
            </div>
            <div>
              <label className="form-label">Email *</label>
              <input type="email" value={newForm.email} onChange={e => setNewForm(p => ({...p, email: e.target.value}))}
                required className="form-input" placeholder="ravi@sheetaldies.com" />
            </div>
            <div>
              <label className="form-label">Role *</label>
              <select value={newForm.role} onChange={e => setNewForm(p => ({...p, role: e.target.value}))} className="form-input">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-span-3">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 text-xs text-indigo-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">info</span>
                A temporary password will be auto-generated and sent to the user's email. They can change it after first login.
              </div>
            </div>
            <div className="col-span-3 flex gap-3">
              <button type="submit" disabled={creating} className="btn-primary disabled:opacity-60">
                {creating
                  ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Creating...</>
                  : <><span className="material-symbols-outlined text-sm">person_add</span> Create User</>
                }
              </button>
              <button type="button" onClick={() => setShowNew(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                {['User', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="th whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({length: 3}).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[1,2,3,4,5,6].map(j => (
                      <td key={j} className="px-5 py-4"><div className="h-3 bg-slate-100 rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : users.map(u => (
                <tr key={u.id} className={`tr ${!u.isActive ? 'opacity-50' : ''}`}>

                  {/* Name */}
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        {editId === u.id ? (
                          <input value={editName} onChange={e => setEditName(e.target.value)}
                            className="border border-indigo-300 rounded-lg px-2 py-1 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                        )}
                        {u.id === me?.id && <p className="text-[10px] text-indigo-500 font-bold">You</p>}
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="td text-xs text-slate-500">{u.email}</td>

                  {/* Role */}
                  <td className="td">
                    {editId === u.id && u.id !== me?.id ? (
                      <select value={editRole} onChange={e => setEditRole(e.target.value)}
                        className="border border-indigo-300 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-300">
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
                    <span className={`badge ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Last Login */}
                  <td className="td text-xs text-slate-400">
                    {u.lastLogin
                      ? new Date(u.lastLogin).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
                      : 'Never'}
                  </td>

                  {/* Actions */}
                  <td className="td">
                    <div className="flex items-center gap-3 flex-wrap">
                      {editId === u.id ? (
                        <>
                          <button type="button" onClick={() => saveEdit(u.id)} disabled={saving}
                            className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-60">
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button type="button" onClick={() => setEditId(null)}
                            className="text-xs text-slate-500 hover:text-slate-700 font-semibold">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEdit(u)}
                            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                            <span className="material-symbols-outlined text-sm">edit</span> Edit
                          </button>
                          <button type="button" onClick={() => setViewUser(u)}
                            className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:underline">
                            <span className="material-symbols-outlined text-sm">visibility</span> View
                          </button>
                          <button type="button" onClick={() => resetPassword(u)}
                            className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline">
                            <span className="material-symbols-outlined text-sm">lock_reset</span> Reset PW
                          </button>
                          {u.id !== me?.id && (
                            <button type="button" onClick={() => toggleActive(u)}
                              className={`flex items-center gap-1 text-xs font-semibold hover:underline ${u.isActive ? 'text-rose-400 hover:text-rose-600' : 'text-emerald-600 hover:text-emerald-700'}`}>
                              <span className="material-symbols-outlined text-sm">{u.isActive ? 'person_off' : 'person'}</span>
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
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

      <p className="text-[11px] text-slate-400">
        Total {users.length} users · {users.filter(u => u.isActive).length} active
      </p>

      {viewUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">User details</h3>
              <button type="button" onClick={() => setViewUser(null)} className="btn-ghost">Close</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-slate-400 text-xs">Name</p><p className="font-semibold">{viewUser.name || '—'}</p></div>
              <div><p className="text-slate-400 text-xs">Email</p><p className="font-semibold">{viewUser.email || '—'}</p></div>
              <div><p className="text-slate-400 text-xs">Role</p><p className="font-semibold">{viewUser.role || '—'}</p></div>
              <div><p className="text-slate-400 text-xs">Status</p><p className="font-semibold">{viewUser.isActive ? 'Active' : 'Inactive'}</p></div>
              <div><p className="text-slate-400 text-xs">Last Login</p><p className="font-semibold">{viewUser.lastLogin ? new Date(viewUser.lastLogin).toLocaleString() : 'Never'}</p></div>
              <div><p className="text-slate-400 text-xs">Created</p><p className="font-semibold">{viewUser.createdAt ? new Date(viewUser.createdAt).toLocaleString() : '—'}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
