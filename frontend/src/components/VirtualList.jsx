/**
 * VirtualList Component
 * Efficiently renders large lists by only rendering visible items
 * Reduces DOM nodes and improves performance dramatically (1000+ items)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Virtual List Component
 * @param {Array} items - Array of items to render
 * @param {Number} itemHeight - Height of each item in pixels
 * @param {Function} renderItem - Function that renders each item: (item, index) => JSX
 * @param {Number} containerHeight - Height of the container in pixels
 * @param {Number} overscan - Number of items to render outside visible area (default: 3)
 * 
 * @example
 * <VirtualList
 *   items={jobcards}
 *   itemHeight={80}
 *   containerHeight={600}
 *   renderItem={(jobcard, idx) => <JobCardRow key={jobcard.id} jobcard={jobcard} />}
 * />
 */
export const VirtualList = ({
  items = [],
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = ''
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;
  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Spacer before visible items */}
      {startIndex > 0 && <div style={{ height: offsetY }} />}

      {/* Visible items */}
      <div>
        {visibleItems.map((item, idx) =>
          renderItem(item, startIndex + idx)
        )}
      </div>

      {/* Spacer after visible items */}
      {endIndex < items.length && (
        <div style={{ height: (items.length - endIndex) * itemHeight }} />
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-500">
          No items to display
        </div>
      )}
    </div>
  );
};

/**
 * Virtual Grid Component
 * Efficiently renders large grids (e.g., image galleries)
 * @param {Array} items - Array of items to render
 * @param {Number} columnCount - Number of columns
 * @param {Number} itemHeight - Height of each item
 * @param {Function} renderItem - Function that renders each item
 * @param {Number} containerHeight - Height of container
 * 
 * @example
 * <VirtualGrid
 *   items={invoices}
 *   columnCount={3}
 *   itemHeight={120}
 *   containerHeight={600}
 *   renderItem={(invoice) => <InvoiceCard invoice={invoice} />}
 * />
 */
export const VirtualGrid = ({
  items = [],
  columnCount = 3,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 2,
  className = ''
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const rowHeight = itemHeight;
  const totalRows = Math.ceil(items.length / columnCount);
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endRow = Math.min(
    totalRows,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
  );

  const startIndex = startRow * columnCount;
  const endIndex = Math.min(items.length, endRow * columnCount);
  const visibleItems = items.slice(startIndex, endIndex);

  const offsetY = startRow * rowHeight;
  const totalHeight = totalRows * rowHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Spacer before visible items */}
      {startRow > 0 && <div style={{ height: offsetY }} />}

      {/* Visible items in grid */}
      <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
        {visibleItems.map((item, idx) =>
          renderItem(item, startIndex + idx)
        )}
      </div>

      {/* Spacer after visible items */}
      {endRow < totalRows && (
        <div style={{ height: (totalRows - endRow) * rowHeight }} />
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-500">
          No items to display
        </div>
      )}
    </div>
  );
};

/**
 * Hook wrapper for VirtualList
 * Simplified API for common use cases
 * 
 * @example
 * const virtualList = useVirtualList(items, 80, 600);
 * <VirtualList {...virtualList} renderItem={(item) => <Item item={item} />} />
 */
export const useVirtualList = (items, itemHeight, containerHeight) => {
  return {
    items,
    itemHeight,
    containerHeight,
  };
};

export default VirtualList;
