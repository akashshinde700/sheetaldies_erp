/**
 * Custom React Hooks
 * Common hooks for API calls, local storage, modals, notifications
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from './api';

/**
 * Hook for API calls with loading/error/data states
 * @example
 * const { data, loading, error, refetch } = useAsync(
 *   () => api.get('/api/jobcards')
 * );
 */
export const useAsync = (asyncFunction, immediate = true) => {
  const [state, setState] = useState({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const response = await asyncFunction();
      setState({ data: response.data || response, loading: false, error: null });
      return response.data || response;
    } catch (error) {
      setState({ data: null, loading: false, error });
      throw error;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { ...state, refetch: execute };
};

/**
 * Hook for managing form state
 * @example
 * const { form, handleChange, handleSubmit, reset } = useForm(
 *   { name: '', email: '' },
 *   async (data) => await api.post('/form', data)
 * );
 */
export const useForm = (initialState, onSubmit) => {
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      try {
        const result = await onSubmit(form);
        setSuccess(true);
        return result;
      } catch (err) {
        setError(err.message || 'An error occurred');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [form, onSubmit]
  );

  const reset = useCallback(() => {
    setForm(initialState);
    setError(null);
    setSuccess(false);
  }, [initialState]);

  return { form, setForm, handleChange, handleSubmit, reset, submitting, error, success };
};

/**
 * Hook for local storage persistence
 * @example
 * const [theme, setTheme] = useLocalStorage('theme', 'light');
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
};

/**
 * Hook for toggling boolean states (modals, dropdowns)
 * @example
 * const [isOpen, open, close, toggle] = useToggle(false);
 */
export const useToggle = (initialState = false) => {
  const [state, setState] = useState(initialState);
  const toggle = useCallback(() => setState((s) => !s), []);
  const open = useCallback(() => setState(true), []);
  const close = useCallback(() => setState(false), []);

  return [state, open, close, toggle];
};

/**
 * Hook for previous value
 * Useful for tracking changes
 * @example
 * const prevCount = usePrevious(count);
 */
export const usePrevious = (value) => {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
};

/**
 * Hook for countdown timer
 * @example
 * const { remaining, start, stop, reset } = useCountdown(60);
 */
export const useCountdown = (initialSeconds = 60) => {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const start = useCallback(() => setIsRunning(true), []);
  const stop = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setRemaining(initialSeconds);
  }, [initialSeconds]);

  return { remaining, isRunning, start, stop, reset };
};

/**
 * Hook for async validation (debounced)
 * @example
 * const { validating, error } = useAsyncValidation(
 *   value => api.get(`/validate-gstin/${value}`),
 *   [value],
 *   500 // debounce delay
 * );
 */
export const useAsyncValidation = (validator, dependencies = [], delay = 500) => {
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setValidating(true);
    setError(null);

    timeoutRef.current = setTimeout(async () => {
      try {
        await validator();
        setValidating(false);
      } catch (err) {
        setError(err.message || 'Validation failed');
        setValidating(false);
      }
    }, delay);

    return () => clearTimeout(timeoutRef.current);
  }, dependencies);

  return { validating, error };
};

/**
 * Hook for fetch with retry logic
 * @example
 * const data = useFetchWithRetry('/api/invoices', { retries: 3 });
 */
export const useFetchWithRetry = (url, options = {}) => {
  const { retries = 3, delay = 1000, ...fetchOptions } = options;
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let retryCount = 0;

    const attempt = async () => {
      try {
        const response = await api.get(url, fetchOptions);
        setState({ data: response.data, loading: false, error: null });
      } catch (error) {
        if (retryCount < retries) {
          retryCount++;
          setTimeout(attempt, delay * retryCount); // Exponential backoff
        } else {
          setState({ data: null, loading: false, error });
        }
      }
    };

    attempt();
  }, [url, retries, delay, fetchOptions]);

  return state;
};

/**
 * Hook for window resize
 * @example
 * const { width, height } = useWindowSize();
 */
export const useWindowSize = () => {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
};

/**
 * Hook for click outside detection
 * Useful for closing modals/dropdowns
 * @example
 * const ref = useClickOutside(() => close());
 * <div ref={ref}>Modal Content</div>
 */
export const useClickOutside = (callback) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [callback]);

  return ref;
};

/**
 * Hook for infinite scroll infinite pagination
 * @example
 * const { items, loading, hasMore, lastElementRef } = useInfiniteScroll(
 *   async (cursor) => api.get(`/items?cursor=${cursor}`)
 * );
 */
export const useInfiniteScrolling = (fetchFunction) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);
  const observerTarget = useRef(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const result = await fetchFunction(cursor);
      const newItems = result.data || [];

      setItems((prev) => [...prev, ...newItems]);
      setHasMore(newItems.length > 0);

      if (newItems.length > 0) {
        setCursor(newItems[newItems.length - 1].id);
      }
    } catch (error) {
      console.error('Infinite scroll error:', error);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, hasMore, fetchFunction]);

  useEffect(() => {
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
 * Hook for intersection observer
 * Detects when element enters viewport
 * @example
 * const { ref, inView } = useInView();
 * <div ref={ref}>{inView ? 'Visible' : 'Hidden'}</div>
 */
export const useInView = (options = {}) => {
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [options]);

  return { ref, inView };
};

/**
 * Hook for copying to clipboard
 * @example
 * const { copy, copied } = useClipboard();
 * <button onClick={() => copy(text)}>
 *   {copied ? 'Copied!' : 'Copy'}
 * </button>
 */
export const useClipboard = () => {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, []);

  return { copy, copied };
};

export default {
  useAsync,
  useForm,
  useLocalStorage,
  useToggle,
  usePrevious,
  useCountdown,
  useAsyncValidation,
  useFetchWithRetry,
  useWindowSize,
  useClickOutside,
  useInfiniteScrolling,
  useInView,
  useClipboard,
};
