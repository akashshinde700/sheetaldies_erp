/**
 * SearchableList Component
 * Combines search, debouncing, pagination, and filtering
 * Ready-to-use component for JobCardList, PartyList, InvoiceList, etc.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { useDebouncedValue } from '../utils/performance';

/**
 * SearchableList Component
 * @param {Array} items - Full list of items (or paginated items)
 * @param {Function} renderItem - Function to render each item: (item, index) => JSX
 * @param {String} searchPlaceholder - Placeholder for search input
 * @param {Array} searchFields - Fields to search in: ['name', 'email']
 * @param {Function} onSearch - Optional callback for server-side search: (term) => Promise
 * @param {Boolean} enablePagination - Show pagination controls (default: true)
 * @param {Number} pageSize - Items per page (default: 20)
 * @param {Function} onFilterChange - Callback when filters change
 * 
 * @example
 * <SearchableList
 *   items={parties}
 *   renderItem={(party) => <PartyRow party={party} />}
 *   searchPlaceholder="Search by name or GSTIN..."
 *   searchFields={['name', 'gstin']}
 *   enablePagination={true}
 *   pageSize={20}
 * />
 */
export const SearchableList = ({
  items = [],
  renderItem,
  searchPlaceholder = 'Search...',
  searchFields = [],
  onSearch,
  enablePagination = true,
  pageSize = 20,
  onFilterChange,
  className = '',
  emptyMessage = 'No items found',
}) => {
  const [searchTerm, debouncedSearchTerm, setSearchTerm] = useDebouncedValue('', 300);
  const [filteredItems, setFilteredItems] = useState(items);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // Server-side search if provided
  useEffect(() => {
    if (!onSearch || !debouncedSearchTerm) return;

    const performSearch = async () => {
      setLoading(true);
      try {
        const results = await onSearch(debouncedSearchTerm);
        setFilteredItems(results);
        setCurrentPage(0);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearchTerm, onSearch]);

  // Client-side filtering
  const clientFilteredItems = useMemo(() => {
    if (onSearch) return filteredItems; // Use server results if available

    if (!debouncedSearchTerm) return items;

    return items.filter((item) => {
      const searchLower = debouncedSearchTerm.toLowerCase();
      return searchFields.some((field) => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(searchLower);
      });
    });
  }, [items, debouncedSearchTerm, searchFields, filteredItems, onSearch]);

  // Pagination
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = enablePagination
    ? clientFilteredItems.slice(startIndex, endIndex)
    : clientFilteredItems;

  const totalPages = Math.ceil(clientFilteredItems.length / pageSize);

  // Notify parent of filter changes
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({
        searchTerm: debouncedSearchTerm,
        currentPage,
        totalResults: clientFilteredItems.length,
      });
    }
  }, [debouncedSearchTerm, currentPage, clientFilteredItems.length, onFilterChange]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(0);
  };

  const handlePreviousPage = () => {
    setCurrentPage(Math.max(0, currentPage - 1));
    window.scrollTo(0, 0);
  };

  const handleNextPage = () => {
    setCurrentPage(Math.min(totalPages - 1, currentPage + 1));
    window.scrollTo(0, 0);
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              ✕
            </button>
          )}
          {loading && (
            <Loader className="absolute right-3 top-3 text-blue-500 w-5 h-5 animate-spin" />
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        {clientFilteredItems.length} results
        {searchTerm && ` for "${searchTerm}"`}
      </div>

      {/* Items List */}
      <div className="space-y-2 min-h-96">
        {paginatedItems.length > 0 ? (
          paginatedItems.map((item, idx) => renderItem(item, startIndex + idx))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {enablePagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-sm text-gray-600">
            Page {currentPage + 1} of {totalPages}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchableList;
