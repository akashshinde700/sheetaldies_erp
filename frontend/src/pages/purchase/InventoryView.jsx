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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Inventory Management</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Total Items in Stock</p>
            <p className="text-3xl font-bold text-blue-600">{inventory.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Total Quantity</p>
            <p className="text-3xl font-bold text-green-600">{inventory.reduce((sum, i) => sum + (i.quantityOnHand || 0), 0)}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow border-l-4 border-yellow-400">
            <p className="text-gray-600 text-sm">Low Stock Alerts</p>
            <p className="text-3xl font-bold text-yellow-600">{lowStock.length}</p>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStock.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
            <div className="flex gap-2 items-start">
              <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <h3 className="font-bold text-yellow-800">Low Stock Alert</h3>
                <p className="text-sm text-yellow-700">{lowStock.length} items are below reorder level</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 font-medium ${activeTab === 'all' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            >
              All Items ({inventory.length})
            </button>
            <button
              onClick={() => setActiveTab('low-stock')}
              className={`px-6 py-3 font-medium ${activeTab === 'low-stock' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            >
              Low Stock ({lowStock.length})
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b flex items-center gap-2">
            <Search size={20} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyUp={fetchInventory}
              className="flex-1 px-3 py-2 border rounded"
            />
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Item Name</th>
                <th className="px-4 py-2 text-center">On Hand</th>
                <th className="px-4 py-2 text-center">Reorder Level</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-left">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map(item => {
                const isLow = item.quantityOnHand <= (item.reorderLevel || 10);
                return (
                  <tr key={item.id} className={`border-b hover:bg-gray-50 ${isLow ? 'bg-yellow-50' : ''}`}>
                    <td className="px-4 py-2">{item.item?.partNo || item.item?.description}</td>
                    <td className="px-4 py-2 text-center font-bold">{item.quantityOnHand || 0}</td>
                    <td className="px-4 py-2 text-center">{item.reorderLevel}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {isLow ? '⚠️ LOW' : '✓ OK'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {item.lastRestockDate ? new Date(item.lastRestockDate).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {displayData.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No items found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
