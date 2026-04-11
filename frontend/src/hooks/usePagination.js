/**
 * Pagination Hook & Utilities for React
 * Handles client-side pagination with page navigation
 */

import { useState, useEffect } from 'react';

/**
 * usePagination Hook
 * @param {Array} items - All items to paginate
 * @param {Number} itemsPerPage - Items per page (default: 20)
 * @returns {Object} Pagination state and methods
 */
export const usePagination = (items = [], itemsPerPage = 20) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);
  
  // Reset to page 1 if items decrease
  useEffect(() => {
    if (currentPage > Math.ceil(items.length / itemsPerPage)) {
      setCurrentPage(1);
    }
  }, [items.length, itemsPerPage]);
  
  return {
    currentPage,
    setCurrentPage,
    currentItems,
    totalPages,
    totalItems: items.length,
    itemsPerPage,
    startIndex: startIndex + 1,
    endIndex: Math.min(endIndex, items.length),
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    goToPage: (page) => setCurrentPage(Math.max(1, Math.min(page, totalPages))),
    nextPage: () => setCurrentPage(prev => Math.min(prev + 1, totalPages)),
    prevPage: () => setCurrentPage(prev => Math.max(prev - 1, 1)),
  };
};

/**
 * Pagination Component
 * Usage:
 * const pagination = usePagination(items, 20);
 * <Pagination {...pagination} />
 */
export const Pagination = ({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  goToPage,
  nextPage,
  prevPage,
  hasNextPage,
  hasPrevPage,
  showSummary = true,
}) => {
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
      {/* Summary */}
      {showSummary && (
        <div className="text-sm text-slate-600">
          Showing <span className="font-semibold">{startIndex}</span> to{' '}
          <span className="font-semibold">{endIndex}</span> of{' '}
          <span className="font-semibold">{totalItems}</span> items
        </div>
      )}
      
      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Previous */}
        <button
          onClick={prevPage}
          disabled={!hasPrevPage}
          className="px-3 py-2 rounded border border-slate-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
        >
          ← Previous
        </button>
        
        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let page;
            if (totalPages <= 5) {
              page = i + 1;
            } else if (currentPage <= 3) {
              page = i + 1;
            } else if (currentPage >= totalPages - 2) {
              page = totalPages - 4 + i;
            } else {
              page = currentPage - 2 + i;
            }
            
            return (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`w-8 h-8 rounded text-sm font-medium transition ${
                  currentPage === page
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>
        
        {/* Next */}
        <button
          onClick={nextPage}
          disabled={!hasNextPage}
          className="px-3 py-2 rounded border border-slate-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

/**
 * Server Pagination Hook (for API with limit/offset)
 * @param {Number} defaultPage - Starting page (default: 1)
 * @param {Number} itemsPerPage - Items per page (default: 20)
 */
export const useServerPagination = (defaultPage = 1, itemsPerPage = 20) => {
  const [page, setPage] = useState(defaultPage);
  const [total, setTotal] = useState(0);
  
  const totalPages = Math.ceil(total / itemsPerPage);
  const offset = (page - 1) * itemsPerPage;
  
  return {
    page,
    setPage,
    offset,
    limit: itemsPerPage,
    total,
    setTotal,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: () => setPage(prev => Math.min(prev + 1, totalPages)),
    prevPage: () => setPage(prev => Math.max(prev - 1, 1)),
    goToPage: (p) => setPage(Math.max(1, Math.min(p, totalPages))),
  };
};

export default usePagination;
