import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import { toNum, toInt } from '../../utils/normalize';
import SearchSelect from '../../components/SearchSelect';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/ui/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_OPTIONS = ['DRAFT', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED'];

const EMPTY_ITEM = {
  itemId: '',
  sourceChallanItemId: '',
  description: '',
  quantity: '',
  weightKg: '',
  remarks: '',
};

const GroupTitle = ({ children }) => (
  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{children}</p>
);

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
    <div className="font-app w-full space-y-4 pb-4">
      <PageHeader
        title={isEdit ? 'Edit dispatch challan' : 'New dispatch challan'}
        backTo="/dispatch"
        breadcrumbs={[{ label: 'Dispatch', to: '/dispatch' }, { label: isEdit ? 'Edit' : 'New' }]}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Challan Details</CardTitle>
            <CardDescription>Dispatch date, parties, transport and status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ── Basics & parties ── */}
            <div className="space-y-3">
              <GroupTitle>Challan &amp; Parties</GroupTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                <FormField label="Challan Date" htmlFor="dcChallanDate" required>
                  <Input
                    id="dcChallanDate"
                    type="date"
                    required
                    value={formData.challanDate}
                    onChange={(e) => handleChange('challanDate', e.target.value)}
                  />
                </FormField>
                <FormField label="From Party" required>
                  <SearchSelect
                    value={String(formData.fromPartyId || '')}
                    onChange={v => handleChange('fromPartyId', v)}
                    options={(parties || []).map(p => ({ value: p.id, label: p.name }))}
                    placeholder="Select from party"
                    required
                    className="w-full"
                  />
                </FormField>
                <FormField label="To Party" required>
                  <SearchSelect
                    value={String(formData.toPartyId || '')}
                    onChange={v => handleChange('toPartyId', v)}
                    options={(parties || []).map(p => ({ value: p.id, label: p.name }))}
                    placeholder="Select to party"
                    required
                    className="w-full"
                  />
                </FormField>
                <FormField label="Jobwork Challan" hint="Optional — links dispatch back to the inward challan">
                  <SearchSelect
                    value={String(formData.jobworkChallanId || '')}
                    onChange={v => handleChange('jobworkChallanId', v)}
                    options={[{ value: '', label: 'Optional link' }, ...(jobworkChallans || []).map(j => ({ value: j.id, label: j.challanNo || `JW-${j.id}` }))]}
                    placeholder="Optional link"
                    className="w-full"
                  />
                </FormField>
              </div>
            </div>

            {/* ── Transport & status ── */}
            <div className="space-y-3">
              <GroupTitle>Transport &amp; Status</GroupTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                <FormField label="Dispatch Mode" htmlFor="dcDispatchMode">
                  <Input
                    id="dcDispatchMode"
                    value={formData.dispatchMode}
                    onChange={(e) => handleChange('dispatchMode', e.target.value)}
                    placeholder="Transport / courier"
                  />
                </FormField>
                <FormField label="Vehicle No" htmlFor="dcVehicleNo">
                  <Input
                    id="dcVehicleNo"
                    value={formData.vehicleNo}
                    onChange={(e) => handleChange('vehicleNo', e.target.value)}
                    placeholder="MH12 AB 1234"
                  />
                </FormField>
                <FormField label="Status">
                  <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Remarks" htmlFor="dcRemarks" className="sm:col-span-2 lg:col-span-3">
                  <Textarea
                    id="dcRemarks"
                    rows={2}
                    value={formData.remarks}
                    onChange={(e) => handleChange('remarks', e.target.value)}
                    style={{ minHeight: '72px' }}
                  />
                </FormField>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>Items</CardTitle>
              <CardDescription>{items.length} item{items.length !== 1 ? 's' : ''} on this dispatch</CardDescription>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addItem}>
              <Plus /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200/90 bg-white overflow-hidden">
                {/* Row header */}
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-100 text-xs font-bold text-sky-700 tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 truncate">
                      {item.description || 'New item'}
                    </span>
                  </div>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeItem(idx)}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      aria-label={`Remove item ${idx + 1}`}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                    {formData.jobworkChallanId && (
                      <FormField label="Source Challan Line" className="sm:col-span-2 lg:col-span-3">
                        <SearchSelect
                          value={String(item.sourceChallanItemId || '')}
                          onChange={v => updateItem(idx, 'sourceChallanItemId', v)}
                          options={(selectedJwItems || []).map(chIt => ({
                            value: chIt.id,
                            label: `${chIt.description || `Line ${chIt.id}`} (Qty ${chIt.quantity})`,
                          }))}
                          placeholder="Select line"
                          useFixed
                          className="w-full"
                        />
                      </FormField>
                    )}
                    <FormField label="Item">
                      <SearchSelect
                        value={String(item.itemId || '')}
                        onChange={v => updateItem(idx, 'itemId', v)}
                        options={(itemsMaster || []).map(m => ({ value: m.id, label: m.partNo || m.description || `Item ${m.id}` }))}
                        placeholder="Select item"
                        useFixed
                        className="w-full"
                      />
                    </FormField>
                    <FormField label="Description" className="sm:col-span-2">
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        placeholder="Part / item description"
                        className="font-semibold"
                      />
                    </FormField>
                    <FormField label="Qty">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        placeholder="0"
                        className="text-right tabular-nums"
                      />
                    </FormField>
                    <FormField label="Weight (kg)">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={item.weightKg}
                        onChange={(e) => updateItem(idx, 'weightKg', e.target.value)}
                        placeholder="0.00"
                        className="text-right tabular-nums"
                      />
                    </FormField>
                    <FormField label="Item Remarks" className="sm:col-span-2 lg:col-span-3">
                      <Input
                        value={item.remarks}
                        onChange={(e) => updateItem(idx, 'remarks', e.target.value)}
                        placeholder="Optional"
                      />
                    </FormField>
                  </div>
                </div>
              </div>
            ))}

            {/* Totals */}
            <div className="rounded-xl bg-slate-50 p-4 space-y-2 sm:max-w-sm sm:ml-auto">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total Qty</span>
                <span className="font-semibold tabular-nums text-slate-800">{totalQty.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total Weight</span>
                <span className="font-semibold tabular-nums text-slate-800">{totalWeight.toFixed(2)} kg</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
          <Button type="button" variant="outline" onClick={() => navigate('/dispatch')}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={loading}>
            {loading ? 'Saving…' : isEdit ? 'Update challan' : 'Create challan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
