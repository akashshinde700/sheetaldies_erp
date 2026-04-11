import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { toNum, toInt } from '../../utils/normalize';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function QuoteForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    vendorId: '',
    quoteDate: new Date().toISOString().split('T')[0],
    validUntil: '',
    description: '',
    notes: '',
    paymentTerms: '',
    deliveryDays: '',
    items: [{ description: '', specification: '', quantity: '', unit: 'NOS', unitPrice: '', amount: '', remarks: '' }]
  });

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVendors();
    if (isEditing) {
      fetchQuote();
    }
  }, [id]);

  const fetchVendors = async () => {
    try {
      const response = await api.get('/parties?type=VENDOR');
      setVendors(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    }
  };

  const fetchQuote = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/quotes/${id}`);
      const quote = response.data.data;

      setFormData({
        vendorId: quote.vendorId.toString(),
        quoteDate: new Date(quote.quoteDate).toISOString().split('T')[0],
        validUntil: quote.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : '',
        description: quote.description || '',
        notes: quote.notes || '',
        paymentTerms: quote.paymentTerms || '',
        deliveryDays: quote.deliveryDays?.toString() || '',
        items: quote.items.map(item => ({
          description: item.description || '',
          specification: item.specification || '',
          quantity: item.quantity?.toString() || '',
          unit: item.unit || 'NOS',
          unitPrice: item.unitPrice?.toString() || '',
          amount: item.amount?.toString() || '',
          remarks: item.remarks || ''
        }))
      });
    } catch (err) {
      setError('Failed to fetch quote: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    // Auto-calculate amount
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = toNum(newItems[index].quantity, 0);
      const unitPrice = toNum(newItems[index].unitPrice, 0);
      newItems[index].amount = (quantity * unitPrice).toFixed(2);
    }

    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', specification: '', quantity: '', unit: 'NOS', unitPrice: '', amount: '', remarks: '' }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => {
      return total + toNum(item.amount, 0);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.vendorId) {
      toast.error('Please select a vendor');
      return;
    }

    const validItems = formData.items.filter(item => 
      item.description?.trim() && 
      toNum(item.quantity, 0) > 0 && 
      toNum(item.unitPrice, 0) > 0
    );

    if (!validItems.length) {
      toast.error('At least one item with description, quantity, and unit price is required');
      return;
    }

    try {
      setSaving(true);

      const submitData = {
        ...formData,
        vendorId: toInt(formData.vendorId),
        deliveryDays: formData.deliveryDays ? toInt(formData.deliveryDays) : null,
        totalAmount: calculateTotal(),
        items: validItems.map(item => ({
          ...item,
          quantity: toNum(item.quantity, 0),
          unitPrice: toNum(item.unitPrice, 0),
          amount: toNum(item.amount, 0)
        }))
      };

      if (isEditing) {
        await api.put(`/quotes/${id}`, submitData);
        toast.success('Quote updated successfully!');
      } else {
        await api.post('/quotes', submitData);
        toast.success('Quote created successfully!');
      }

      navigate('/quotes');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save quote');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? 'Edit Quote' : 'Create New Quote'}
          </h1>
          <p className="text-slate-600">Manage supplier quotation details</p>
        </div>
        <button
          onClick={() => navigate('/quotes')}
          className="px-4 py-2 text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor *</label>
              <select
                value={formData.vendorId}
                onChange={(e) => handleInputChange('vendorId', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                required
              >
                <option value="">Select Vendor</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quote Date *</label>
              <input
                type="date"
                value={formData.quoteDate}
                onChange={(e) => handleInputChange('quoteDate', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valid Until</label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => handleInputChange('validUntil', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Days</label>
              <input
                type="number"
                value={formData.deliveryDays}
                onChange={(e) => handleInputChange('deliveryDays', e.target.value)}
                placeholder="e.g., 30"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="Quote description..."
            />
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-1 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm"
            >
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-slate-900">Item {index + 1}</h3>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Specification</label>
                    <input
                      type="text"
                      value={item.specification}
                      onChange={(e) => handleItemChange(index, 'specification', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    >
                      <option value="NOS">NOS</option>
                      <option value="KG">KG</option>
                      <option value="MTR">MTR</option>
                      <option value="LTR">LTR</option>
                      <option value="PCS">PCS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.amount}
                      readOnly
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                    <input
                      type="text"
                      value={item.remarks}
                      onChange={(e) => handleItemChange(index, 'remarks', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-slate-900">Total Amount:</span>
              <span className="text-lg font-bold text-sky-600">
                {formatCurrency(calculateTotal())}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Additional Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
              <textarea
                value={formData.paymentTerms}
                onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="Payment terms and conditions..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/quotes')}
            className="px-6 py-2 text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : (isEditing ? 'Update Quote' : 'Create Quote')}
          </button>
        </div>
      </form>
    </div>
  );
}