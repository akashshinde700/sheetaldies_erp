import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../utils/api';

function formatCurrency2(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''));
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

export default function GoodsReceiptForm() {
  const [pos, setPos] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poItems, setPoItems] = useState([]);
  const [grnData, setGrnData] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPOs();
  }, []);

  const fetchPOs = async () => {
    try {
      const response = await api.get('/purchase?status=DRAFT');
      setPos(response.data.data || []);
    } catch (error) {
      console.error(error);
      alert('Failed to load POs');
    }
  };

  const handlePOSelect = (poId) => {
    const po = pos.find(p => p.id === poId);
    setSelectedPO(po);
    if (po?.items) {
      setPoItems(po.items.map(item => ({
        ...item,
        quantityReceived: 0,
        quantityAccepted: 0,
        quantityRejected: 0,
        remarks: ''
      })));
    }
  };

  const handleItemUpdate = (idx, field, value) => {
    const newItems = [...poItems];
    newItems[idx][field] = value;
    setPoItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPO || poItems.length === 0) {
      alert('Select PO and add items');
      return;
    }

    if (poItems.some(item => item.quantityAccepted === 0 && item.quantityReceived === 0)) {
      alert('Enter quantities for all items');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        purchaseOrderId: selectedPO.id,
        notes,
        items: poItems.map(item => ({
          itemId: item.itemId,
          quantityReceived: parseFloat(item.quantityReceived),
          quantityAccepted: parseFloat(item.quantityAccepted),
          quantityRejected: parseFloat(item.quantityRejected || 0),
          remarks: item.remarks
        }))
      };

      await api.post(`/purchase/${selectedPO.id}/grn`, payload);
      alert('GRN created and inventory updated!');
      setSelectedPO(null);
      setPoItems([]);
      setNotes('');
    } catch (error) {
      alert('Failed to create GRN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up w-full max-w-6xl mx-auto">
      <div>
        <h1 className="page-title">Goods Receipt (GRN)</h1>
        <p className="page-subtitle">Receive against draft purchase orders and update stock</p>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900 font-headline mb-4">Create GRN</h2>

        <div className="mb-6">
          <label className="form-label">Purchase order *</label>
          <select
            value={selectedPO?.id || ''}
            onChange={(e) => handlePOSelect(e.target.value)}
            className="form-input"
            required
          >
            <option value="">Choose PO…</option>
            {pos.map(po => (
              <option key={po.id} value={po.id}>
                {po.poNumber} — {po.vendor?.name} (₹{formatCurrency2(po.totalAmount)})
              </option>
            ))}
          </select>
        </div>

        {selectedPO && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl border border-sky-200/80 bg-sky-50/60 p-4">
              <p className="font-bold text-slate-900">{selectedPO.poNumber}</p>
              <p className="text-sm text-slate-600">{selectedPO.vendor?.name}</p>
              <p className="text-sm text-slate-500">Expected: {new Date(selectedPO.expectedDelivery).toLocaleDateString()}</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-sky-50/80 border-b border-slate-200/80">
                    <th className="th text-left">Item</th>
                    <th className="th text-center">PO Qty</th>
                    <th className="th text-center">Received</th>
                    <th className="th text-center">Accepted</th>
                    <th className="th text-center">Rejected</th>
                    <th className="th text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {poItems.map((item, idx) => (
                    <tr key={idx} className="tr">
                      <td className="td">{item.item?.partNo || item.item?.description}</td>
                      <td className="td text-center font-semibold">{item.quantity}</td>
                      <td className="td">
                        <input type="number" value={item.quantityReceived} onChange={(e) => handleItemUpdate(idx, 'quantityReceived', e.target.value)} className="form-input py-2 text-center text-sm" placeholder="0" />
                      </td>
                      <td className="td">
                        <input type="number" value={item.quantityAccepted} onChange={(e) => handleItemUpdate(idx, 'quantityAccepted', e.target.value)} className="form-input py-2 text-center text-sm" placeholder="0" />
                      </td>
                      <td className="td">
                        <input type="number" value={item.quantityRejected} onChange={(e) => handleItemUpdate(idx, 'quantityRejected', e.target.value)} className="form-input py-2 text-center text-sm" placeholder="0" />
                      </td>
                      <td className="td">
                        <input type="text" value={item.remarks} onChange={(e) => handleItemUpdate(idx, 'remarks', e.target.value)} className="form-input py-2 text-sm" placeholder="Notes…" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <label className="form-label">GRN notes</label>
              <textarea placeholder="Optional notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="form-input min-h-[88px]" rows={3} />
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
                {loading ? 'Creating…' : 'Create GRN & update inventory'}
              </button>
              <button type="button" onClick={() => setSelectedPO(null)} className="btn-ghost">Clear</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
