import React, { useState, useEffect } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import api from '../../utils/api';

export default function InventoryView() {
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchInventory();
    fetchLowStock();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/purchase/inventory/list?search=' + searchTerm);
      setInventory(response.data.data || []);
    } catch (error) {
      console.error(error);
      alert('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStock = async () => {
    try {
      const response = await api.get('/purchase/inventory/low-stock');
      setLowStock(response.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const displayData = activeTab === 'low-stock' ? lowStock : inventory;

  return (
    <div className="page-stack">
      <div>
        <h1 className="page-title">Inventory</h1>
        <p className="page-subtitle">On-hand quantities and reorder alerts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">SKU rows</p>
          <p className="text-3xl font-extrabold text-sky-800 font-headline mt-1">{inventory.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total on hand</p>
          <p className="text-3xl font-extrabold text-emerald-700 font-headline mt-1">
            {inventory.reduce((sum, i) => sum + (i.quantityOnHand || 0), 0)}
          </p>
        </div>
        <div className="card p-5 border-l-4 border-amber-400">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Low stock</p>
          <p className="text-3xl font-extrabold text-amber-700 font-headline mt-1">{lowStock.length}</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex gap-3 items-start">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-bold text-amber-900 text-sm">Low stock</h3>
            <p className="text-sm text-amber-800/90">{lowStock.length} items at or below reorder level</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-5 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'all'
                ? 'text-sky-800 border-b-2 border-sky-600 bg-sky-50/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All ({inventory.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('low-stock')}
            className={`px-5 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'low-stock'
                ? 'text-sky-800 border-b-2 border-sky-600 bg-sky-50/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Low stock ({lowStock.length})
          </button>
        </div>

        <div className="p-4 border-b border-slate-200/80 flex items-center gap-2 bg-slate-50/50">
          <Search size={20} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search items…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyUp={fetchInventory}
            className="flex-1 form-input border-0 bg-transparent shadow-none focus:ring-0"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200/80">
                <th className="th text-left">Item</th>
                <th className="th text-center">On hand</th>
                <th className="th text-center">Reorder</th>
                <th className="th text-center">Status</th>
                <th className="th text-left">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayData.map(item => {
                const isLow = item.quantityOnHand <= (item.reorderLevel || 10);
                return (
                  <tr key={item.id} className={`tr ${isLow ? 'bg-amber-50/40' : ''}`}>
                    <td className="td font-medium text-slate-800">{item.item?.partNo || item.item?.description}</td>
                    <td className="td text-center font-semibold tabular-nums">{item.quantityOnHand || 0}</td>
                    <td className="td text-center text-slate-600">{item.reorderLevel}</td>
                    <td className="td text-center">
                      <span className={`badge ${isLow ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {isLow ? 'Low' : 'OK'}
                      </span>
                    </td>
                    <td className="td text-slate-500 text-xs">
                      {item.lastRestockDate ? new Date(item.lastRestockDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {displayData.length === 0 && !loading && (
          <div className="p-10 text-center text-slate-500 text-sm">No items found</div>
        )}
      </div>
    </div>
  );
}
