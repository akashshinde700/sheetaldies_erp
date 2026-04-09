import { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const BLANK = { code:'', name:'', description:'', hsnSacCode:'998898', pricePerKg:'', pricePerPc:'', minCharge:'', gstRate:'18', isActive: true };

export default function ProcessPricing() {
  const [processes, setProcesses] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(null);
  const [showNew,   setShowNew]   = useState(false);
  const [newForm,   setNewForm]   = useState({ ...BLANK });
  const [saving,    setSaving]    = useState(false);

  const fetchProcesses = () => {
    setLoading(true);
    api.get('/processes').then(r => setProcesses(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchProcesses(); }, []);

  const handleEdit = (proc) => setEditing({ ...proc, pricePerKg: proc.pricePerKg || '', pricePerPc: proc.pricePerPc || '', minCharge: proc.minCharge || '' });

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/processes/${editing.id}`, editing);
      toast.success(`${editing.name} updated.`);
      setEditing(null);
      fetchProcesses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating.');
    } finally { setSaving(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/processes', newForm);
      toast.success(`Process "${newForm.name}" created.`);
      setShowNew(false);
      setNewForm({ ...BLANK });
      fetchProcesses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating.');
    } finally { setSaving(false); }
  };

  const handleToggle = async (id, name, current) => {
    try {
      await api.patch(`/processes/${id}/toggle`);
      toast.success(`${name} ${current ? 'deactivated' : 'activated'}.`);
      fetchProcesses();
    } catch { toast.error('Error toggling.'); }
  };

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Process Pricing</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage heat treatment process rates — changes reflect in all new invoices.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <span className="material-symbols-outlined text-sm">add</span> New Process
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-500 text-xl mt-0.5">info</span>
        <div>
          <p className="text-xs font-bold text-amber-800">Admin Pricing Control</p>
          <p className="text-xs text-amber-700 mt-0.5">Changing the price here will auto-fill in new Tax Invoices when you select a process type. Existing invoices are not affected.</p>
        </div>
      </div>

      {/* New Process Form */}
      {showNew && (
        <div className="card border-2 border-indigo-200 p-5">
          <h3 className="text-sm font-extrabold text-slate-700 mb-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-600 text-[14px]">add_circle</span>
            </div>
            Create New Process Type
          </h3>
          <form onSubmit={handleCreate} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="form-label">Code *</label>
              <input value={newForm.code} onChange={e => setNewForm(p => ({...p, code: e.target.value.toUpperCase()}))}
                required className="form-input" placeholder="VHT" />
            </div>
            <div className="col-span-2">
              <label className="form-label">Name *</label>
              <input value={newForm.name} onChange={e => setNewForm(p => ({...p, name: e.target.value}))}
                required className="form-input" placeholder="Vacuum Heat Treatment" />
            </div>
            <div>
              <label className="form-label">HSN/SAC</label>
              <input value={newForm.hsnSacCode} onChange={e => setNewForm(p => ({...p, hsnSacCode: e.target.value}))}
                className="form-input" />
            </div>
            <div>
              <label className="form-label">Price/KG (₹)</label>
              <input type="number" value={newForm.pricePerKg} onChange={e => setNewForm(p => ({...p, pricePerKg: e.target.value}))}
                className="form-input" placeholder="120.00" />
            </div>
            <div>
              <label className="form-label">Price/PC (₹)</label>
              <input type="number" value={newForm.pricePerPc} onChange={e => setNewForm(p => ({...p, pricePerPc: e.target.value}))}
                className="form-input" placeholder="—" />
            </div>
            <div>
              <label className="form-label">Min Charge (₹)</label>
              <input type="number" value={newForm.minCharge} onChange={e => setNewForm(p => ({...p, minCharge: e.target.value}))}
                className="form-input" placeholder="500.00" />
            </div>
            <div>
              <label className="form-label">GST Rate (%)</label>
              <select value={newForm.gstRate} onChange={e => setNewForm(p => ({...p, gstRate: e.target.value}))} className="form-input">
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div className="col-span-4">
              <label className="form-label">Description</label>
              <input value={newForm.description} onChange={e => setNewForm(p => ({...p, description: e.target.value}))}
                className="form-input" placeholder="Process description..." />
            </div>
            <div className="col-span-4 flex gap-3 mt-1">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                {saving
                  ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Creating...</>
                  : <><span className="material-symbols-outlined text-sm">save</span> Create Process</>
                }
              </button>
              <button type="button" onClick={() => setShowNew(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Processes Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                {['Code', 'Process Name', 'HSN/SAC', 'Price/KG', 'Price/PC', 'Min Charge', 'GST %', 'Status', 'Actions'].map(h => (
                  <th key={h} className="th whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    <span className="text-sm">Loading processes...</span>
                  </div>
                </td></tr>
              ) : processes.map(proc => (
                <tr key={proc.id} className={`tr ${!proc.isActive ? 'opacity-50' : ''}`}>
                  {editing?.id === proc.id ? (
                    <>
                      <td className="td"><span className="text-xs font-mono font-bold text-slate-600">{proc.code}</span></td>
                      <td className="td">
                        <input value={editing.name} onChange={e => setEditing(p => ({...p, name: e.target.value}))}
                          className="border border-indigo-300 rounded-lg px-2 py-1.5 text-xs w-44 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                      </td>
                      <td className="td">
                        <input value={editing.hsnSacCode || ''} onChange={e => setEditing(p => ({...p, hsnSacCode: e.target.value}))}
                          className="border border-indigo-300 rounded-lg px-2 py-1.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-xs">₹</span>
                          <input type="number" value={editing.pricePerKg} onChange={e => setEditing(p => ({...p, pricePerKg: e.target.value}))}
                            className="border border-indigo-300 rounded-lg px-2 py-1.5 text-xs w-20 text-right focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                        </div>
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-xs">₹</span>
                          <input type="number" value={editing.pricePerPc} onChange={e => setEditing(p => ({...p, pricePerPc: e.target.value}))}
                            className="border border-indigo-300 rounded-lg px-2 py-1.5 text-xs w-20 text-right focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                        </div>
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-xs">₹</span>
                          <input type="number" value={editing.minCharge} onChange={e => setEditing(p => ({...p, minCharge: e.target.value}))}
                            className="border border-indigo-300 rounded-lg px-2 py-1.5 text-xs w-20 text-right focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                        </div>
                      </td>
                      <td className="td">
                        <select value={editing.gstRate} onChange={e => setEditing(p => ({...p, gstRate: e.target.value}))}
                          className="border border-indigo-300 rounded-lg px-2 py-1.5 text-xs w-16 focus:outline-none focus:ring-1 focus:ring-indigo-300">
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="td" colSpan={2}>
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} disabled={saving}
                            className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-60">
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={() => setEditing(null)}
                            className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200">
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="td">
                        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{proc.code}</span>
                      </td>
                      <td className="td">
                        <p className="text-xs font-semibold text-slate-800">{proc.name}</p>
                        {proc.description && <p className="text-[10px] text-slate-400 truncate max-w-[160px] mt-0.5">{proc.description}</p>}
                      </td>
                      <td className="td text-xs text-slate-500 font-mono">{proc.hsnSacCode || '—'}</td>
                      <td className="td text-xs font-bold text-slate-800">{proc.pricePerKg ? `₹ ${Number(proc.pricePerKg).toLocaleString('en-IN')}` : '—'}</td>
                      <td className="td text-xs text-slate-600">{proc.pricePerPc ? `₹ ${Number(proc.pricePerPc).toLocaleString('en-IN')}` : '—'}</td>
                      <td className="td text-xs text-slate-500">{proc.minCharge ? `₹ ${Number(proc.minCharge).toLocaleString('en-IN')}` : '—'}</td>
                      <td className="td">
                        <span className="badge bg-indigo-50 text-indigo-700">{proc.gstRate}%</span>
                      </td>
                      <td className="td">
                        <span className={`badge ${proc.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {proc.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="td">
                        <div className="flex gap-3">
                          <button onClick={() => handleEdit(proc)}
                            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                            <span className="material-symbols-outlined text-sm">edit</span> Edit
                          </button>
                          <button onClick={() => handleToggle(proc.id, proc.name, proc.isActive)}
                            className={`text-xs font-semibold hover:underline ${proc.isActive ? 'text-rose-400 hover:text-rose-600' : 'text-emerald-600 hover:text-emerald-700'}`}>
                            {proc.isActive ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 text-right">
        Last updated prices are tracked per-process. Changes are recorded in audit log.
      </p>
    </div>
  );
}
