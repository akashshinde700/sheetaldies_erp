/**
 * API Client with Enhanced Interceptors
 * Handles: JWT refresh, error handling, request/response transformation, file uploads
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

export interface ApiInstance extends AxiosInstance {
  upload: (url: string, formData: FormData | any, onProgress?: ((percent: number) => void) | null) => Promise<AxiosResponse>;
  download: (url: string, filename: string) => Promise<void>;
  batch: <T>(requests: Promise<T>[]) => Promise<T[]>;
}

// Interface for normalized error structure
export interface EnhancedError extends Error {
  code?: string;
  status?: number;
  data?: any;
  response?: AxiosResponse;
  originalError?: AxiosError;
}

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
}) as ApiInstance;

/**
 * Request Interceptor
 * - Use httpOnly auth cookies instead of localStorage tokens
 * - Transform request data
 * - Add request ID for tracking
 */
api.interceptors.request.use(
  (config) => {
    // Cookies-based auth is used for security, so Authorization header is not required.
    // Add request ID for tracing
    config.headers['X-Request-ID'] = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Log request (development only)
    if (import.meta.env.DEV) {
      console.log(`📤 ${config.method.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * - Handle JWT refresh on 401
 * - Format error responses
 * - Transform response data
 */
api.interceptors.response.use(
  (response) => {
    // Log response (development only)
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const response = error.response;

      // Handle 401 Unauthorized - Try refresh token
    const reqUrl = originalRequest.url?.toString() || '';
    const isAuthRoute = reqUrl.includes('/auth/');
    const isRefreshAttempt = reqUrl.includes('/auth/refresh-token');
    const isAuthMe = reqUrl.includes('/auth/me');

    // Never attempt refresh-token for auth endpoints themselves (login/logout/me/etc).
    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshAttempt && !isAuthRoute && !isAuthMe) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data.data || response.data;
        if (accessToken) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        sessionStorage.removeItem('erp_user');
        // Don't hard-redirect here; it can cause reload loops and rate-limit blowups.
        // Let the app routing (PrivateRoute/AuthProvider) handle navigation.
        return Promise.reject(refreshError);
      }
    }

    // Handle 401 without retry
    if (error.response?.status === 401) {
      sessionStorage.removeItem('erp_user');
      // Don't hard-redirect; allow callers to decide.
    }

    // Handle other errors
    const errorMessage = response?.data?.message || error.message || 'An error occurred';
    const errorCode = response?.data?.code || 'UNKNOWN_ERROR';

    // Log error (development only)
    if (import.meta.env.DEV) {
      console.error(`❌ ${error.response?.status || 'ERR'} ${error.config?.url}`);
      console.error(`   Error: ${errorMessage}`);
      console.error(`   Code: ${errorCode}`);
    }

    // Transform error for consistency
    const customError = new Error(errorMessage) as EnhancedError;
    customError.code = errorCode;
    customError.status = response?.status;
    customError.data = response?.data;
    customError.response = response;
    customError.originalError = error;

    return Promise.reject(customError);
  }
);

/**
 * File upload with progress tracking
 * @example
 * const onProgress = (percent) => console.log(`${percent}% uploaded`);
 * await api.upload('/upload', formData, onProgress);
 */
api.upload = (url: string, formData: FormData | any, onProgress: ((percent: number) => void) | null = null) => {
  return api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
};

/**
 * Download file
 * @example
 * await api.download('/invoices/123/pdf', 'invoice-123.pdf');
 */
api.download = async (url: string, filename: string) => {
  try {
    const response = await api.get(url, { responseType: 'blob' });
    const blob = response.data;
    const urlBlob = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = urlBlob;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(urlBlob);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
};

/**
 * Batch requests
 * @example
 * const results = await api.batch([
 *   api.get('/jobcards'),
 *   api.get('/parties')
 * ]);
 */
api.batch = <T>(requests: Promise<T>[]) => Promise.all(requests);

/**
 * Error Handler Utility
 * Provides user-friendly error messages
 */
export const handleError = (error: any) => {
  const code = error.code || error.status;
  const message = error.message || 'An error occurred';

  const errorMap = {
    DUPLICATE_GSTIN: 'This GSTIN is already registered for another party',
    DUPLICATE_PAN: 'This PAN is already registered for another party',
    DUPLICATE_EMAIL: 'This email is already registered',
    DUPLICATE_INVOICE: 'An invoice with this number already exists',
    DUPLICATE_CODE: 'This Code/Reference already exists',
    UNAUTHORIZED: 'Session expired. Please login again',
    FORBIDDEN: 'Access denied: You do not have the required permissions',
    NOT_FOUND: 'The requested resource was not found',
    VALIDATION_ERROR: 'Validation failed. Please check your input',
    RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a while',
    SERVER_ERROR: 'Server or Database error. Please contact admin',
    NETWORK_ERROR: 'Network error. Please check your connection',
  };

  return errorMap[code] || message;
};

/**
 * Success message extractor
 */
export const getSuccessMessage = (response, defaultMsg = 'Success') => {
  return response?.data?.message || defaultMsg;
};

export default api as ApiInstance;
