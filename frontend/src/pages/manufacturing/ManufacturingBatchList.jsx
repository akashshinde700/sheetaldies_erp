import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function ManufacturingBatchList() {
  const [batches, setBatches] = useState([]);
  const [jobcards, setJobcards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    jobCardIds: [],
    batchDate: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  useEffect(() => {
    fetchBatches();
    fetchJobcards();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await api.get('/manufacturing/batches?search=' + searchTerm);
      setBatches(response.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load batches.');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobcards = async () => {
    try {
      const response = await api.get('/jobcards?status=COMPLETED');
      setJobcards(response.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.jobCardIds.length === 0) {
      toast.error('Select at least one job card.');
      return;
    }

    try {
      await api.post('/manufacturing/batches', formData);
      toast.success('Batch created.');
      setShowForm(false);
      setFormData({ jobCardIds: [], batchDate: new Date().toISOString().split('T')[0], remarks: '' });
      fetchBatches();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create batch.');
    }
  };

  const toggleJobcard = (jcId) => {
    if (formData.jobCardIds.includes(jcId)) {
      setFormData({ ...formData, jobCardIds: formData.jobCardIds.filter(id => id !== jcId) });
    } else {
      setFormData({ ...formData, jobCardIds: [...formData.jobCardIds, jcId] });
    }
  };

  return (
    <div className="page-stack-wide">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Manufacturing batches</h1>
          <p className="page-subtitle">Group job cards for production runs</p>
        </div>
        <button type="button" onClick={() => setShowForm(!showForm)} className="btn-primary shrink-0 inline-flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">add</span> New batch
        </button>
      </div>

      {showForm && (
        <div className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 font-headline mb-4">Create batch</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Batch date</label>
              <input type="date" value={formData.batchDate} onChange={(e) => setFormData({ ...formData, batchDate: e.target.value })} className="form-input max-w-xs" required />
            </div>
            <div>
              <label className="form-label">Remarks</label>
              <textarea placeholder="Optional" value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} className="form-input min-h-[88px]" rows={3} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2">Job cards ({formData.jobCardIds.length} selected)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200/80 p-3 bg-slate-50/80">
                {jobcards.map(jc => (
                  <label key={jc.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer text-sm">
                    <input type="checkbox" checked={formData.jobCardIds.includes(jc.id)} onChange={() => toggleJobcard(jc.id)} className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                    <span>{jc.jobCardNo} — {jc.customer?.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary">Create batch</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex items-center gap-2 bg-slate-50/50">
          <span className="material-symbols-outlined text-[20px] text-slate-400 shrink-0">search</span>
          <input type="text" placeholder="Search batches…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyUp={fetchBatches} className="flex-1 form-input border-0 bg-transparent shadow-none focus:ring-0" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200/80">
                <th className="th text-left">Batch</th>
                <th className="th text-center">Job cards</th>
                <th className="th text-left">Date</th>
                <th className="th text-left">Status</th>
                <th className="th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map(batch => (
                <tr key={batch.id} className="tr">
                  <td className="td font-semibold text-slate-800">{batch.batchNumber}</td>
                  <td className="td text-center tabular-nums">{batch.jobCards?.length || 0}</td>
                  <td className="td text-slate-600">{new Date(batch.batchDate).toLocaleDateString()}</td>
                  <td className="td"><span className="badge bg-sky-100 text-sky-900">{batch.status}</span></td>
                  <td className="td text-center">
                    <button type="button" className="p-2 rounded-lg text-sky-800 hover:bg-sky-50 inline-flex" aria-label="Details"><span className="material-symbols-outlined text-[16px]">description</span></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {batches.length === 0 && <div className="p-10 text-center text-slate-500 text-sm">No batches yet</div>}
      </div>
    </div>
  );
}
