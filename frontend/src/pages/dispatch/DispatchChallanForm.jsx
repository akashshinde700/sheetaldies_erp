import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { toNum, toInt } from '../../utils/normalize';

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
    const jwId = formData.jobworkChallanId ? Number(formData.jobworkChallanId) : null;
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
        toast.error('Failed to load dispatch challan');
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
      toast.error('From Party and To Party are required.');
      return;
    }
    const validItems = items.filter((it) => (it.itemId || it.description?.trim()) && toNum(it.quantity, 0) > 0);
    if (validItems.length === 0) {
      toast.error('At least one item with quantity is required.');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        challanDate: formData.challanDate,
        fromPartyId: toInt(formData.fromPartyId),
        toPartyId: toInt(formData.toPartyId),
        jobworkChallanId: formData.jobworkChallanId ? toInt(formData.jobworkChallanId) : null,
        dispatchMode: formData.dispatchMode || null,
        vehicleNo: formData.vehicleNo || null,
        remarks: formData.remarks || null,
        status: formData.status,
        items: validItems.map((it) => ({
          itemId: it.itemId ? toInt(it.itemId) : null,
          sourceChallanItemId: it.sourceChallanItemId ? toInt(it.sourceChallanItemId) : null,
          description: it.description || '',
          quantity: toNum(it.quantity, 0),
          weightKg: toNum(it.weightKg, 0),
          remarks: it.remarks || '',
        })),
      };
      if (isEdit) {
        await api.put(`/dispatch-challans/${id}`, payload);
        toast.success('Dispatch challan updated successfully!');
      } else {
        await api.post('/dispatch-challans', payload);
        toast.success('Dispatch challan created successfully!');
      }
      navigate('/dispatch');
    } catch (err) {
      console.error('Error saving challan:', err);
      toast.error(err.response?.data?.message || 'Failed to save dispatch challan');
    } finally {
      setLoading(false);
    }
  };

  const totalQty = items.reduce((sum, it) => sum + toNum(it.quantity, 0), 0);
  const totalWeight = items.reduce((sum, it) => sum + toNum(it.weightKg, 0), 0);

  return (
    <div className="page-stack w-full space-y-6">
      <button type="button" onClick={() => navigate('/dispatch')} className="btn-ghost -ml-2 inline-flex items-center gap-2 text-sky-800">
        <span className="material-symbols-outlined text-[20px]">arrow_back</span> Back to dispatch challans
      </button>

      <div className="card p-5 sm:p-6">
        <h1 className="page-title mb-1">{isEdit ? 'Edit dispatch challan' : 'New dispatch challan'}</h1>
        <p className="page-subtitle mb-6">Parties, transport, and line items</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b border-slate-200/80 pb-6">
            <h2 className="text-sm font-bold text-slate-800 font-headline mb-4">Challan details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Challan date *</label>
                <input type="date" required value={formData.challanDate} onChange={(e) => handleChange('challanDate', e.target.value)} className="form-input w-full" />
              </div>
              <div>
                <label className="form-label">From party *</label>
                <select required value={formData.fromPartyId} onChange={(e) => handleChange('fromPartyId', e.target.value)} className="form-input w-full">
                  <option value="">Select from party</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">To party *</label>
                <select required value={formData.toPartyId} onChange={(e) => handleChange('toPartyId', e.target.value)} className="form-input w-full">
                  <option value="">Select to party</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Jobwork challan</label>
                <select value={formData.jobworkChallanId} onChange={(e) => handleChange('jobworkChallanId', e.target.value)} className="form-input w-full">
                  <option value="">Optional link</option>
                  {jobworkChallans.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.challanNo || `JW-${j.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Dispatch mode</label>
                <input
                  value={formData.dispatchMode}
                  onChange={(e) => handleChange('dispatchMode', e.target.value)}
                  className="form-input w-full"
                  placeholder="Transport / courier"
                />
              </div>
              <div>
                <label className="form-label">Vehicle no.</label>
                <input value={formData.vehicleNo} onChange={(e) => handleChange('vehicleNo', e.target.value)} className="form-input w-full" />
              </div>
              <div>
                <label className="form-label">Status</label>
                <select value={formData.status} onChange={(e) => handleChange('status', e.target.value)} className="form-input w-full">
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="form-label">Remarks</label>
                <textarea rows={2} value={formData.remarks} onChange={(e) => handleChange('remarks', e.target.value)} className="form-input w-full min-h-[72px]" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-800 font-headline">Items</h2>
              <button type="button" onClick={addItem} className="btn-primary inline-flex items-center gap-2 shrink-0">
                <span className="material-symbols-outlined text-[16px]">add</span> Add item
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 rounded-xl border border-slate-200/80 bg-slate-50/60">
                {formData.jobworkChallanId && (
                  <div className="md:col-span-2">
                    <label className="form-label text-xs">Source challan line</label>
                    <select
                      value={item.sourceChallanItemId || ''}
                      onChange={(e) => updateItem(idx, 'sourceChallanItemId', e.target.value)}
                      className="form-input w-full text-sm"
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
                  <label className="form-label text-xs">Item</label>
                  <select value={item.itemId} onChange={(e) => updateItem(idx, 'itemId', e.target.value)} className="form-input w-full text-sm">
                    <option value="">Select item</option>
                    {itemsMaster.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.partNo || m.description || `Item ${m.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="form-label text-xs">Description</label>
                  <input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} className="form-input w-full text-sm" />
                </div>
                <div>
                  <label className="form-label text-xs">Qty</label>
                  <input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} className="form-input w-full text-sm tabular-nums" />
                </div>
                <div>
                  <label className="form-label text-xs">Weight (kg)</label>
                  <input type="number" min="0" step="0.01" value={item.weightKg} onChange={(e) => updateItem(idx, 'weightKg', e.target.value)} className="form-input w-full text-sm tabular-nums" />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={() => removeItem(idx)} className="btn-danger w-full inline-flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">delete</span> Remove
                  </button>
                </div>
                <div className="md:col-span-6">
                  <label className="form-label text-xs">Item remarks</label>
                  <input value={item.remarks} onChange={(e) => updateItem(idx, 'remarks', e.target.value)} className="form-input w-full text-sm" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-200/80 pt-5">
            <div className="text-sm text-slate-600">
              <span className="mr-4 tabular-nums">
                Total qty: <strong className="text-slate-900">{totalQty.toFixed(2)}</strong>
              </span>
              <span className="tabular-nums">
                Total weight: <strong className="text-slate-900">{totalWeight.toFixed(2)} kg</strong>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate('/dispatch')} className="btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
                {loading ? 'Saving…' : isEdit ? 'Update challan' : 'Create challan'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
