const fs = require('fs');
const path = require('path');

const content = `import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import api from '../../utils/api';

export default function MachineList() {
  const [machines, setMachines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', type: '', make: '' });

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const response = await api.get('/machines');
      setMachines(response.data.data || []);
    } catch (error) {
      console.error('Error fetching machines:', error);
      alert('Failed to load machines');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      alert('Code and Name are required');
      return;
    }

    try {
      if (editingId) {
        await api.put(\`/machines/\${editingId}\`, {
          name: formData.name,
          code: formData.code,
          type: formData.type,
          make: formData.make,
          isActive: true,
        });
        alert('Machine updated successfully');
      } else {
        await api.post('/machines', {
          code: formData.code,
          name: formData.name,
          type: formData.type,
          make: formData.make,
        });
        alert('Machine created successfully');
      }
      setFormData({ code: '', name: '', type: '', make: '' });
      setEditingId(null);
      setShowForm(false);
      fetchMachines();
    } catch (error) {
      console.error('Error saving machine:', error);
      alert(error.response?.data?.message || 'Failed to save machine');
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
      await api.delete(\`/machines/\${id}\`);
      alert('Machine deleted');
      fetchMachines();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete');
    }
  };

  const filteredMachines = machines.filter((machine) =>
    machine.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Machines Management</h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (editingId) {
                setEditingId(null);
                setFormData({ code: '', name: '', type: '', make: '' });
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus size={20} /> Add Machine
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Machine' : 'New Machine'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Code *"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="px-4 py-2 border rounded"
                required
              />
              <input
                type="text"
                placeholder="Machine Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-4 py-2 border rounded"
                required
              />
              <input
                type="text"
                placeholder="Type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="px-4 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Make"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="px-4 py-2 border rounded"
              />
              <div className="col-span-1 md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ code: '', name: '', type: '', make: '' });
                  }}
                  className="px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center gap-2">
            <Search size={20} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search machines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredMachines.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No machines found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Machine Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Make</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMachines.map((machine) => (
                  <tr key={machine.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{machine.code}</td>
                    <td className="px-4 py-3">{machine.name}</td>
                    <td className="px-4 py-3">{machine.type || '-'}</td>
                    <td className="px-4 py-3">{machine.make || '-'}</td>
                    <td className="px-4 py-3 flex justify-center gap-2">
                      <button
                        onClick={() => handleEdit(machine)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(machine.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
`;

const filepath = path.resolve(__dirname, '../frontend/src/pages/admin/MachineList.jsx');
fs.writeFileSync(filepath, content, 'utf8');
console.log('Written to:', filepath);
console.log('Lines:', content.split('\\n').length);
console.log('Last 5 lines:');
console.log(content.split('\\n').slice(-6).join('\\n'));
