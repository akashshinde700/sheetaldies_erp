/**
 * Pagination Component
 * Provides cursor-based pagination with pre-fetch support
 */

import { useState, useEffect } from 'react';
import api from '../utils/api';

const usePagination = (endpoint, pageSize = 20) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [error, setError] = useState(null);

  const fetchPage = async (pageSize, cursor = null) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('limit', pageSize);
      if (cursor) {
        params.append('cursor', cursor);
      }

      const response = await api.get(`${endpoint}?${params}`);
      const data = response.data?.data || [];

      setItems(data);
      setHasNextPage(data.length === pageSize);
      
      // Next cursor is the ID of last item
      if (data.length > 0) {
        setCursor(data[data.length - 1].id);
      }
    } catch (err) {
      setError(err.message);
      console.error('Pagination error:', err);
    } finally {
      setLoading(false);
    }
  };

  const goToFirstPage = () => {
    setCursor(null);
    fetchPage(pageSize);
  };

  const goToNextPage = () => {
    if (hasNextPage) {
      fetchPage(pageSize, cursor);
    }
  };

  return {
    items,
    loading,
    error,
    hasNextPage,
    goToFirstPage,
    goToNextPage,
  };
};

/**
 * Pagination UI Component
 */
const Pagination = ({ hasNextPage, onNext, onFirst, isLoading }) => {
  return (
    <div className="flex items-center justify-between py-4 border-t border-slate-200">
      <button
        onClick={onFirst}
        disabled={isLoading}
        className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
      >
        ↺ Reset
      </button>

      <span className="text-sm text-slate-500">
        {isLoading ? 'Loading...' : 'End of list'}
      </span>

      <button
        onClick={onNext}
        disabled={!hasNextPage || isLoading}
        className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
      >
        Next ↓
      </button>
    </div>
  );
};

export { usePagination, Pagination };
