/**
 * Frontend Performance Utilities
 * Debouncing, throttling, and optimization helpers
 */

import React from 'react';

/**
 * Debounce function - delays function execution
 * Useful for: search inputs, filter changes
 * @param {Function} func - Function to debounce
 * @param {Number} delay - Delay in milliseconds (default: 300ms)
 * @returns {Function} - Debounced function
 * 
 * @example
 * const debouncedSearch = debounce(async (term) => {
 *   const results = await api.get(`/search?q=${term}`);
 *   setResults(results);
 * }, 500);
 * 
 * <input onChange={(e) => debouncedSearch(e.target.value)} />
 */
export const debounce = (func, delay = 300) => {
  let timeoutId;
  
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

/**
 * Throttle function - limits function execution frequency
 * Useful for: scroll events, resize events
 * @param {Function} func - Function to throttle
 * @param {Number} limit - Time between executions in milliseconds (default: 300ms)
 * @returns {Function} - Throttled function
 * 
 * @example
 * const throttledScroll = throttle(() => {
 *   console.log('Scrolling...');
 * }, 1000);
 * 
 * window.addEventListener('scroll', throttledScroll);
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  
  return function throttled(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Hook for debounced state
 * Useful for: search inputs with API calls
 * 
 * @example
 * const [searchTerm, debouncedSearchTerm, setSearchTerm] = useDebouncedValue('', 500);
 * 
 * useEffect(() => {
 *   if (debouncedSearchTerm) {
 *     searchAPI(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 * 
 * <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
 */
export const useDebouncedValue = (initialValue = '', delay = 300) => {
  const [value, setValue] = React.useState(initialValue);
  const [debouncedValue, setDebouncedValue] = React.useState(initialValue);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return [value, debouncedValue, setValue];
};

/**
 * Hook for lazy loading images
 * @example
 * const imageRef = useImageLazyLoad();
 * <img ref={imageRef} data-src="/path/to/image.jpg" src="/placeholder.jpg" />
 */
export const useImageLazyLoad = () => {
  const ref = React.useRef();

  React.useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return ref;
};

/**
 * Hook for infinite scroll
 * Automatically loads more items when user scrolls to bottom
 * 
 * @example
 * const { items, loading, hasMore } = useInfiniteScroll(
 *   async (cursor) => {
 *     const res = await api.get(`/items?cursor=${cursor}`);
 *     return res.data;
 *   },
 *   20 // pageSize
 * );
 * 
 * <div>
 *   {items.map(item => <ItemCard key={item.id} item={item} />)}
 *   {loading && <Spinner />}
 * </div>
 */
export const useInfiniteScroll = (fetchFunction, pageSize) => {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [cursor, setCursor] = React.useState(null);
  const [hasMore, setHasMore] = React.useState(true);
  const observerTarget = React.useRef(null);

  const loadMore = React.useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const result = await fetchFunction(cursor);
      const newItems = result.data || [];
      
      setItems((prev) => [...prev, ...newItems]);
      setHasMore(newItems.length === pageSize);
      
      if (newItems.length > 0) {
        setCursor(newItems[newItems.length - 1].id);
      }
    } catch (err) {
      console.error('Infinite scroll error:', err);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, hasMore, pageSize, fetchFunction]);

  // Observer for scroll detection
  React.useEffect(() => {
    if (!observerTarget.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMore();
      }
    });

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loading]);

  return { items, loading, hasMore, observerTarget };
};

/**
 * Memoized filtering helper
 * Prevents unnecessary re-renders during filtering
 */
export const useFilteredItems = (items, filterFunction) => {
  return React.useMemo(() => {
    return items.filter(filterFunction);
  }, [items, filterFunction]);
};

/**
 * Performance monitoring hook
 * Logs component render times in development
 * 
 * @example
 * usePerformanceMonitor('InvoiceList');
 */
export const usePerformanceMonitor = (componentName) => {
  const renderTime = React.useRef(Date.now());

  React.useEffect(() => {
    if (import.meta.env.DEV) {
      const duration = Date.now() - renderTime.current;
      console.log(`⏱️ ${componentName} rendered in ${duration}ms`);
    }
  });
};
