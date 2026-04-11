import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-orange-100 text-orange-800'
};

const STATUS_LABELS = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired'
};

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isManager } = useAuth();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchQuote();
  }, [id]);

  const fetchQuote = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/quotes/${id}`);
      setQuote(response.data.data);
    } catch (err) {
      setError('Failed to fetch quote: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await api.patch(`/quotes/${id}/status`, { status: newStatus });
      fetchQuote();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleConvertToPO = async () => {
    if (!confirm('Are you sure you want to convert this quote to a Purchase Order?')) return;
    try {
      await api.post(`/quotes/${id}/convert-to-po`);
      alert('Quote converted to Purchase Order successfully');
      navigate('/purchase');
    } catch (err) {
      alert('Failed to convert to PO: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this quote? This action cannot be undone.')) return;
    try {
      await api.delete(`/quotes/${id}`);
      navigate('/quotes');
    } catch (err) {
      alert('Failed to delete quote: ' + err.message);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quote_${quote.quoteNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download PDF: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error || 'Quote not found'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{quote.quoteNumber}</h1>
          <p className="text-slate-600">Supplier Quote Details</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Download PDF
          </button>
          {quote.status === 'ACCEPTED' && isManager && (
            <button
              onClick={handleConvertToPO}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Convert to PO
            </button>
          )}
          {quote.status === 'DRAFT' && isManager && (
            <>
              <Link
                to={`/quotes/${id}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/quotes')}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Back to List
          </button>
        </div>
      </div>

      {/* Status and Actions */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${STATUS_COLORS[quote.status] || 'bg-gray-100 text-gray-800'}`}>
              {STATUS_LABELS[quote.status] || quote.status}
            </span>
            {quote.status === 'DRAFT' && isManager && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusUpdate('SENT')}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Mark as Sent
                </button>
              </div>
            )}
            {quote.status === 'SENT' && isManager && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusUpdate('ACCEPTED')}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleStatusUpdate('REJECTED')}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
          <div className="text-sm text-slate-600">
            Created by {quote.createdBy?.name} on {new Date(quote.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
            <p className="text-slate-900 font-medium">{quote.vendor?.name}</p>
            <p className="text-slate-600 text-sm">{quote.vendor?.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quote Date</label>
            <p className="text-slate-900">{new Date(quote.quoteDate).toLocaleDateString()}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valid Until</label>
            <p className="text-slate-900">
              {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'Not specified'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Days</label>
            <p className="text-slate-900">
              {quote.deliveryDays ? `${quote.deliveryDays} days` : 'Not specified'}
            </p>
          </div>
        </div>

        {quote.description && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <p className="text-slate-900">{quote.description}</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Items</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Specification</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {quote.items?.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-slate-900">{item.description}</td>
                  <td className="px-4 py-3 text-slate-600">{item.specification || '-'}</td>
                  <td className="px-4 py-3 text-slate-900">{item.quantity}</td>
                  <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                  <td className="px-4 py-3 text-slate-900">
                    ₹{parseFloat(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-slate-900 font-medium">
                    ₹{parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan="5" className="px-4 py-3 text-right font-semibold text-slate-900">Total Amount:</td>
                <td className="px-4 py-3 font-bold text-sky-600">
                  ₹{quote.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Additional Details */}
      {(quote.paymentTerms || quote.notes) && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Additional Details</h2>

          <div className="space-y-4">
            {quote.paymentTerms && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
                <p className="text-slate-900 whitespace-pre-wrap">{quote.paymentTerms}</p>
              </div>
            )}

            {quote.notes && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <p className="text-slate-900 whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attachments */}
      {quote.attachments && quote.attachments.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Attachments</h2>

          <div className="space-y-2">
            {quote.attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-600">attach_file</span>
                  <div>
                    <p className="font-medium text-slate-900">{attachment.fileName}</p>
                    <p className="text-sm text-slate-600">
                      {(attachment.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button className="text-sky-600 hover:text-sky-800">
                  <span className="material-symbols-outlined">download</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}