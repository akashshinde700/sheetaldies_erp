import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../utils/api';

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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Goods Receipt Note (GRN)</h1>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">Create GRN</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Select Purchase Order *</label>
            <select
              value={selectedPO?.id || ''}
              onChange={(e) => handlePOSelect(e.target.value)}
              className="w-full px-4 py-2 border rounded"
              required
            >
              <option value="">-- Choose PO --</option>
              {pos.map(po => (
                <option key={po.id} value={po.id}>
                  {po.poNumber} - {po.vendor?.name} (₹{po.totalAmount?.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {selectedPO && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-blue-50 p-4 rounded">
                <p className="font-bold">{selectedPO.poNumber}</p>
                <p className="text-sm text-gray-600">{selectedPO.vendor?.name}</p>
                <p className="text-sm">Expected: {new Date(selectedPO.expectedDelivery).toLocaleDateString()}</p>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Item</th>
                      <th className="border p-2 text-center">PO Qty</th>
                      <th className="border p-2 text-center">Received</th>
                      <th className="border p-2 text-center">Accepted</th>
                      <th className="border p-2 text-center">Rejected</th>
                      <th className="border p-2 text-left">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poItems.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="border p-2">{item.item?.partNo || item.item?.description}</td>
                        <td className="border p-2 text-center font-bold">{item.quantity}</td>
                        <td className="border p-2">
                          <input
                            type="number"
                            value={item.quantityReceived}
                            onChange={(e) => handleItemUpdate(idx, 'quantityReceived', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-center"
                            placeholder="0"
                          />
                        </td>
                        <td className="border p-2">
                          <input
                            type="number"
                            value={item.quantityAccepted}
                            onChange={(e) => handleItemUpdate(idx, 'quantityAccepted', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-center"
                            placeholder="0"
                          />
                        </td>
                        <td className="border p-2">
                          <input
                            type="number"
                            value={item.quantityRejected}
                            onChange={(e) => handleItemUpdate(idx, 'quantityRejected', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-center"
                            placeholder="0"
                          />
                        </td>
                        <td className="border p-2">
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => handleItemUpdate(idx, 'remarks', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                            placeholder="Quality issues..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <textarea
                placeholder="GRN Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border rounded"
                rows="3"
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  {loading ? 'Creating GRN...' : 'Create GRN & Update Inventory'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPO(null)}
                  className="px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                >
                  Clear
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
