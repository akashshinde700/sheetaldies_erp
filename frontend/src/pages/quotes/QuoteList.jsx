import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Pagination } from '../../components/Pagination';
import ListSearchInput from '../../components/ListSearchInput';

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

export default function QuoteList() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchQuotes = async (page = 1, search = '', status = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      const trimmedSearch = String(search || '').trim();
      if (trimmedSearch) params.append('search', trimmedSearch);
      if (status) params.append('status', status);

      const response = await api.get(`/quotes?${params}`);
      setQuotes(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setCurrentPage(page);
    } catch (err) {
      setError(err.message || 'Failed to fetch quotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes(1, searchTerm, statusFilter);
  }, [searchTerm, statusFilter]);

  const handlePageChange = (page) => {
    fetchQuotes(page, searchTerm, statusFilter);
  };

  const handleStatusUpdate = async (quoteId, newStatus) => {
    try {
      await api.patch(`/quotes/${quoteId}/status`, { status: newStatus });
      fetchQuotes(currentPage, searchTerm, statusFilter);
    } catch (err) {
      alert('Failed to update quote status: ' + err.message);
    }
  };

  const handleDelete = async (quoteId) => {
    if (!confirm('Are you sure you want to delete this quote?')) return;
    try {
      await api.delete(`/quotes/${quoteId}`);
      fetchQuotes(currentPage, searchTerm, statusFilter);
    } catch (err) {
      alert('Failed to delete quote: ' + err.message);
    }
  };

  const handleConvertToPO = async (quoteId) => {
    try {
      await api.post(`/quotes/${quoteId}/convert-to-po`);
      alert('Quote converted to Purchase Order successfully');
      fetchQuotes(currentPage, searchTerm, statusFilter);
    } catch (err) {
      alert('Failed to convert quote to PO: ' + err.message);
    }
  };

  if (loading && quotes.length === 0) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Supplier Quotes</h1>
          <p className="page-subtitle">Manage supplier quotations and RFQs</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/quotes/new"
            className="btn-primary shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Quote
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
          <div className="flex gap-2 items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search</label>
            <ListSearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search quotes..."
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input text-xs w-auto min-w-[170px]"
            >
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
          {(searchTerm || statusFilter) ? (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                fetchQuotes(1, '', '');
              }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium"
            >
              <span className="material-symbols-outlined text-sm">close</span> Clear
            </button>
          ) : <div />}
      </div>

      {/* Quotes List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {quotes.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <span className="material-symbols-outlined text-4xl mb-2">description</span>
            <p>No quotes found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Quote #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Vendor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Valid Until</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/quotes/${quote.id}`}
                          className="text-sky-600 hover:text-sky-800 font-medium"
                        >
                          {quote.quoteNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-900">{quote.vendor?.name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(quote.quoteDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium">
                        ₹{quote.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[quote.status] || 'bg-gray-100 text-gray-800'}`}>
                          {STATUS_LABELS[quote.status] || quote.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/quotes/${quote.id}`}
                            className="text-slate-600 hover:text-slate-800"
                            title="View"
                          >
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </Link>
                          {quote.status === 'ACCEPTED' && (
                            <button
                              onClick={() => handleConvertToPO(quote.id)}
                              className="text-green-600 hover:text-green-800"
                              title="Convert to PO"
                            >
                              <span className="material-symbols-outlined text-lg">shopping_cart</span>
                            </button>
                          )}
                          {quote.status === 'DRAFT' && (
                            <>
                              <Link
                                to={`/quotes/${quote.id}/edit`}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </Link>
                              <button
                                onClick={() => handleDelete(quote.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}