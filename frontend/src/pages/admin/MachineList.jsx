import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import ListSearchInput from '../../components/ListSearchInput';

export default function MachineList() {
  const PAGE_SIZE = 10;
  const [machines, setMachines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewMachine, setViewMachine] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', type: '', make: '' });

  useEffect(() => {
    fetchMachines();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const response = await api.get('/machines');
      setMachines(response.data.data || []);
    } catch (error) {
      console.error('Error fetching machines:', error);
      toast.error('Failed to load machines.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('Code and name are required.');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/machines/${editingId}`, {
          name: formData.name,
          code: formData.code,
          type: formData.type,
          make: formData.make,
          isActive: true,
        });
        toast.success('Machine updated successfully.');
      } else {
        await api.post('/machines', {
          code: formData.code,
          name: formData.name,
          type: formData.type,
          make: formData.make,
        });
        toast.success('Machine created successfully.');
      }
      setFormData({ code: '', name: '', type: '', make: '' });
      setEditingId(null);
      setShowForm(false);
      fetchMachines();
    } catch (error) {
      console.error('Error saving machine:', error);
      toast.error(error.response?.data?.message || 'Failed to save machine.');
    }
  };

  const handleEdit = (machine) => {
    setFormData({
      code: machine.code,
      name: machine.name,
      type: machine.type || '',
      make: machine.make || '',
    });
    setEditingId(machine.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await api.delete(`/machines/${id}`);
      toast.success('Machine deleted.');
      fetchMachines();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete machine.');
    }
  };

  const filteredMachines = machines.filter((machine) =>
    machine.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredMachines.length / PAGE_SIZE));
  const pagedMachines = filteredMachines.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="page-stack w-full space-y-6 animate-slide-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Machines</h1>
          <p className="page-subtitle">Shop floor equipment master</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            if (editingId) {
              setEditingId(null);
              setFormData({ code: '', name: '', type: '', make: '' });
            }
          }}
          className="btn-primary shrink-0 inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">add</span> Add machine
        </button>
      </div>

      {showForm && (
        <div className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 font-headline mb-4">{editingId ? 'Edit machine' : 'New machine'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Code *" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="form-input" required />
            <input type="text" placeholder="Machine name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" required />
            <input type="text" placeholder="Type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="form-input" />
            <input type="text" placeholder="Make" value={formData.make} onChange={(e) => setFormData({ ...formData, make: e.target.value })} className="form-input" />
            <div className="col-span-1 md:col-span-2 flex flex-wrap gap-2">
              <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setFormData({ code: '', name: '', type: '', make: '' }); }} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] items-end">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search</label>
          <ListSearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search code, name, type..."
          />
        </div>
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium"
          >
            <span className="material-symbols-outlined text-sm">close</span> Clear
          </button>
        )}
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-slate-500 text-sm">Loading…</div>
        ) : filteredMachines.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">No machines found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200/80">
                  <th className="th text-left">Code</th>
                  <th className="th text-left">Name</th>
                  <th className="th text-left">Type</th>
                  <th className="th text-left">Make</th>
                  <th className="th text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedMachines.map((machine) => (
                  <tr key={machine.id} className="tr">
                    <td className="td font-mono font-medium text-slate-800">{machine.code}</td>
                    <td className="td font-medium">{machine.name}</td>
                    <td className="td text-slate-600">{machine.type || '—'}</td>
                    <td className="td text-slate-600">{machine.make || '—'}</td>
                    <td className="td">
                      <div className="flex justify-center gap-1">
                        <button type="button" onClick={() => setViewMachine(machine)} className="p-2 rounded-lg text-slate-700 hover:bg-slate-100" aria-label="View"><span className="material-symbols-outlined text-[18px]">visibility</span></button>
                        <button type="button" onClick={() => handleEdit(machine)} className="p-2 rounded-lg text-sky-800 hover:bg-sky-50" aria-label="Edit"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                        <button type="button" onClick={() => handleDelete(machine.id)} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50" aria-label="Delete"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredMachines.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredMachines.length)} of {filteredMachines.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-outline text-xs disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs font-semibold text-slate-600">{page} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-outline text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {viewMachine && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Machine details</h3>
              <button type="button" onClick={() => setViewMachine(null)} className="btn-ghost">Close</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-slate-400 text-xs">Code</p><p className="font-semibold">{viewMachine.code || '—'}</p></div>
              <div><p className="text-slate-400 text-xs">Name</p><p className="font-semibold">{viewMachine.name || '—'}</p></div>
              <div><p className="text-slate-400 text-xs">Type</p><p className="font-semibold">{viewMachine.type || '—'}</p></div>
              <div><p className="text-slate-400 text-xs">Make</p><p className="font-semibold">{viewMachine.make || '—'}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
