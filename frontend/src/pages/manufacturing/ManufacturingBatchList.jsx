import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, FileText } from 'lucide-react';
import api from '../../utils/api';

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
      alert('Failed to load batches');
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
      alert('Select at least 1 job card');
      return;
    }

    try {
      await api.post('/manufacturing/batches', formData);
      alert('Batch created');
      setShowForm(false);
      setFormData({ jobCardIds: [], batchDate: new Date().toISOString().split('T')[0], remarks: '' });
      fetchBatches();
    } catch (error) {
      alert('Failed to create batch');
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Manufacturing Batches</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus size={20} /> New Batch
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">Create Manufacturing Batch</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  value={formData.batchDate}
                  onChange={(e) => setFormData({ ...formData, batchDate: e.target.value })}
                  className="px-4 py-2 border rounded"
                  required
                />
              </div>
              <textarea
                placeholder="Remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                rows="3"
              />
              <div>
                <h3 className="font-bold mb-3">Select Job Cards ({formData.jobCardIds.length} selected)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-3 bg-gray-50">
                  {jobcards.map(jc => (
                    <label key={jc.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.jobCardIds.includes(jc.id)}
                        onChange={() => toggleJobcard(jc.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{jc.jobCardNo} - {jc.customer?.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">Create Batch</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 bg-gray-400 text-white rounded">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center gap-2">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search batches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyUp={fetchBatches}
              className="flex-1 px-3 py-2 border rounded"
            />
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Batch No</th>
                <th className="px-4 py-2 text-center">Job Cards</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => (
                <tr key={batch.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold">{batch.batchNumber}</td>
                  <td className="px-4 py-2 text-center">{batch.jobCards?.length || 0}</td>
                  <td className="px-4 py-2">{new Date(batch.batchDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2"><span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">{batch.status}</span></td>
                  <td className="px-4 py-2 text-center">
                    <button className="text-blue-600 hover:text-blue-800"><FileText size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {batches.length === 0 && <div className="p-8 text-center text-gray-500">No batches yet</div>}
        </div>
      </div>
    </div>
  );
}
