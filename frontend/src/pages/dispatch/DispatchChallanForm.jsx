import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import api from '../../utils/api';

const STATUS_OPTIONS = ['DRAFT', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED'];

const EMPTY_ITEM = {
  itemId: '',
  sourceChallanItemId: '',
  description: '',
  quantity: '',
  weightKg: '',
  remarks: '',
};

export default function DispatchChallanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState([]);
  const [itemsMaster, setItemsMaster] = useState([]);
  const [jobworkChallans, setJobworkChallans] = useState([]);
  const [selectedJwItems, setSelectedJwItems] = useState([]);

  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    challanDate: today,
    fromPartyId: '',
    toPartyId: '',
    jobworkChallanId: '',
    dispatchMode: '',
    vehicleNo: '',
    remarks: '',
    status: 'DRAFT',
  });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  useEffect(() => {
    api.get('/parties').then((r) => setParties(r.data.data || []));
    api.get('/items').then((r) => setItemsMaster(r.data.data || []));
    api
      .get('/jobwork')
      .then((r) => setJobworkChallans(r.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const jwId = formData.jobworkChallanId ? parseInt(formData.jobworkChallanId, 10) : null;
    if (!jwId) { setSelectedJwItems([]); return; }
    api.get(`/jobwork/${jwId}`)
      .then(r => setSelectedJwItems(r.data.data?.items || []))
      .catch(() => setSelectedJwItems([]));
  }, [formData.jobworkChallanId]);

  useEffect(() => {
    if (!id) return;
    const fetchChallan = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/dispatch-challans/${id}`);
        const data = res.data.data || res.data;
        setFormData({
          challanDate: data.challanDate ? new Date(data.challanDate).toISOString().split('T')[0] : today,
          fromPartyId: data.fromPartyId ? String(data.fromPartyId) : '',
          toPartyId: data.toPartyId ? String(data.toPartyId) : '',
          jobworkChallanId: data.jobworkChallanId ? String(data.jobworkChallanId) : '',
          dispatchMode: data.dispatchMode || '',
          vehicleNo: data.vehicleNo || '',
          remarks: data.remarks || '',
          status: data.status || 'DRAFT',
        });
        if (data.items?.length) {
          setItems(
            data.items.map((it) => ({
              itemId: it.itemId ? String(it.itemId) : '',
              sourceChallanItemId: it.sourceChallanItemId ? String(it.sourceChallanItemId) : '',
              description: it.description || '',
              quantity: it.quantity != null ? String(it.quantity) : '',
              weightKg: it.weightKg != null ? String(it.weightKg) : '',
              remarks: it.remarks || '',
            }))
          );
        }
      } catch (err) {
        console.error('Error fetching challan:', err);
        alert('Failed to load dispatch challan');
      } finally {
        setLoading(false);
      }
    };
    fetchChallan();
  }, [id, today]);

  const handleChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'itemId' && value) {
        const master = itemsMaster.find((m) => String(m.id) === String(value));
        if (master) updated[index].description = master.description || master.partNo || '';
      }
      if (field === 'sourceChallanItemId') {
        const chIt = selectedJwItems.find((x) => String(x.id) === String(value));
        if (chIt) {
          updated[index].description = chIt.description || '';
          if (chIt.itemId) updated[index].itemId = String(chIt.itemId);
          if (chIt.quantity != null) updated[index].quantity = String(chIt.quantity);
          if (chIt.weight != null) updated[index].weightKg = String(chIt.weight);
        }
      }
      return updated;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (index) => setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fromPartyId || !formData.toPartyId) {
      alert('From Party and To Party are required.');
      return;
    }
    const validItems = items.filter((it) => it.itemId || it.description?.trim());
    if (validItems.length === 0) {
      alert('At least one item is required.');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        challanDate: formData.challanDate,
        fromPartyId: parseInt(formData.fromPartyId, 10),
        toPartyId: parseInt(formData.toPartyId, 10),
        jobworkChallanId: formData.jobworkChallanId ? parseInt(formData.jobworkChallanId, 10) : null,
        dispatchMode: formData.dispatchMode || null,
        vehicleNo: formData.vehicleNo || null,
        remarks: formData.remarks || null,
        status: formData.status,
        items: validItems.map((it) => ({
          itemId: it.itemId ? parseInt(it.itemId, 10) : null,
          sourceChallanItemId: it.sourceChallanItemId ? parseInt(it.sourceChallanItemId, 10) : null,
          description: it.description || '',
          quantity: parseFloat(it.quantity) || 0,
          weightKg: parseFloat(it.weightKg) || 0,
          remarks: it.remarks || '',
        })),
      };
      if (isEdit) {
        await api.put(`/dispatch-challans/${id}`, payload);
        alert('Dispatch challan updated successfully!');
      } else {
        await api.post('/dispatch-challans', payload);
        alert('Dispatch challan created successfully!');
      }
      navigate('/dispatch');
    } catch (err) {
      console.error('Error saving challan:', err);
      alert(err.response?.data?.message || 'Failed to save dispatch challan');
    } finally {
      setLoading(false);
    }
  };

  const totalQty = items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0), 0);
  const totalWeight = items.reduce((sum, it) => sum + (parseFloat(it.weightKg) || 0), 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/dispatch')}
          className="flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft size={20} /> Back to Dispatch Challans
        </button>

        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold mb-6">{isEdit ? 'Edit Dispatch Challan' : 'New Dispatch Challan'}</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b pb-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Challan Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Challan Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.challanDate}
                    onChange={(e) => handleChange('challanDate', e.target.value)}
                    className="w-full px-4 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">From Party *</label>
                  <select
                    required
                    value={formData.fromPartyId}
                    onChange={(e) => handleChange('fromPartyId', e.target.value)}
                    className="w-full px-4 py-2 border rounded"
                  >
                    <option value="">Select From Party</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">To Party *</label>
                  <select
                    required
                    value={formData.toPartyId}
                    onChange={(e) => handleChange('toPartyId', e.target.value)}
                    className="w-full px-4 py-2 border rounded"
                  >
                    <option value="">Select To Party</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Jobwork Challan</label>
                  <select
                    value={formData.jobworkChallanId}
                    onChange={(e) => handleChange('jobworkChallanId', e.target.value)}
                    className="w-full px-4 py-2 border rounded"
                  >
                    <option value="">Select Jobwork Challan</option>
                    {jobworkChallans.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.challanNo || `JW-${j.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Dispatch Mode</label>
                  <input
                    value={formData.dispatchMode}
                    onChange={(e) => handleChange('dispatchMode', e.target.value)}
                    className="w-full px-4 py-2 border rounded"
                    placeholder="Transport / Courier"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Vehicle No</label>
                  <input
                    value={formData.vehicleNo}
                    onChange={(e) => handleChange('vehicleNo', e.target.value)}
                    className="w-full px-4 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-4 py-2 border rounded"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium mb-2">Remarks</label>
                  <textarea
                    rows={2}
                    value={formData.remarks}
                    onChange={(e) => handleChange('remarks', e.target.value)}
                    className="w-full px-4 py-2 border rounded"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-700">Items</h2>
                <button type="button" onClick={addItem} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  <Plus size={16} /> Add Item
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 border rounded-lg bg-gray-50">
                  {formData.jobworkChallanId && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium mb-1">Source Challan Line</label>
                      <select
                        value={item.sourceChallanItemId || ''}
                        onChange={(e) => updateItem(idx, 'sourceChallanItemId', e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      >
                        <option value="">Select line</option>
                        {selectedJwItems.map((chIt) => (
                          <option key={chIt.id} value={chIt.id}>
                            {chIt.description || `Line ${chIt.id}`} (Qty {chIt.quantity})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium mb-1">Item</label>
                    <select
                      value={item.itemId}
                      onChange={(e) => updateItem(idx, 'itemId', e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="">Select Item</option>
                      {itemsMaster.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name || m.partNo || `Item ${m.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1">Description</label>
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Qty</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Weight (Kg)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.weightKg}
                      onChange={(e) => updateItem(idx, 'weightKg', e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={() => removeItem(idx)} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100">
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                  <div className="md:col-span-6">
                    <label className="block text-xs font-medium mb-1">Item Remarks</label>
                    <input
                      value={item.remarks}
                      onChange={(e) => updateItem(idx, 'remarks', e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t pt-4">
              <div className="text-sm text-gray-600">
                <span className="mr-4">Total Qty: <strong>{totalQty.toFixed(2)}</strong></span>
                <span>Total Weight: <strong>{totalWeight.toFixed(2)} Kg</strong></span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => navigate('/dispatch')} className="px-4 py-2 border rounded hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60">
                  {loading ? 'Saving...' : isEdit ? 'Update Challan' : 'Create Challan'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
