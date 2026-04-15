/**
 * API Error Handler & Loading State Manager
 * File: frontend/src/hooks/useFormSubmit.js (NEW)
 * Handles error display, loading states, unsaved changes detection
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import FormValidationUtils from '../utils/formValidation';

export const useFormSubmit = (onSubmit, options = {}) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const originalDataRef = useRef(null);

  // ✅ Handle form submission with loading + error states
  const handleSubmit = useCallback(
    async (formData) => {
      try {
        setLoading(true);
        setErrors({});
        setGeneralError(null);
        setSuccess(false);

        // Validate locally first
        if (options.validationRules) {
          const validationErrors = FormValidationUtils.validateForm(
            formData,
            options.validationRules
          );
          if (validationErrors) {
            setErrors(validationErrors);
            setLoading(false);
            return { success: false, errors: validationErrors };
          }
        }

        // Call submit handler
        const result = await onSubmit(formData);

        if (result.success) {
          setSuccess(true);
          setHasUnsavedChanges(false);
          originalDataRef.current = formData;
          
          // Show success message for 3 seconds
          setTimeout(() => setSuccess(false), 3000);
          return result;
        } else {
          if (result.errors) {
            setErrors(result.errors);
          } else {
            setGeneralError(result.message || 'An error occurred');
          }
          return result;
        }
      } catch (error) {
        console.error('Form submission error:', error);
        
        const apiErrors = FormValidationUtils.handleApiValidationErrors(error);
        if (Object.keys(apiErrors).length > 0) {
          setErrors(apiErrors);
        } else {
          const message = FormValidationUtils.formatApiError(error);
          setGeneralError(message);
        }
        
        return { success: false, message: generalError };
      } finally {
        setLoading(false);
      }
    },
    [onSubmit, options.validationRules]
  );

  // ✅ Track unsaved changes
  const handleFieldChange = useCallback((fieldName, newValue, currentFormData) => {
    if (!originalDataRef.current) {
      originalDataRef.current = currentFormData;
    }
    
    const changed = FormValidationUtils.hasUnsavedChanges(
      originalDataRef.current,
      { ...currentFormData, [fieldName]: newValue }
    );
    
    setHasUnsavedChanges(changed);
  }, []);

  // ✅ Warn user before leaving if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // ✅ Clear error for specific field
  const clearError = useCallback((fieldName) => {
    setErrors(prev => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  }, []);

  // ✅ Clear general error
  const clearGeneralError = useCallback(() => {
    setGeneralError(null);
  }, []);

  // ✅ Reset form state
  const resetForm = useCallback((formData) => {
    setErrors({});
    setGeneralError(null);
    setSuccess(false);
    setHasUnsavedChanges(false);
    originalDataRef.current = formData;
  }, []);

  return {
    loading,
    errors,
    generalError,
    success,
    hasUnsavedChanges,
    handleSubmit,
    handleFieldChange,
    clearError,
    clearGeneralError,
    resetForm,
  };
};

/**
 * Form Error Display Component
 */
export const FormErrorDisplay = ({ fieldName, errors, custom }) => {
  const error = errors?.[fieldName];
  if (!error && !custom) return null;

  return (
    <div className="mt-1 text-sm text-red-600">
      {error || custom}
    </div>
  );
};

/**
 * Form Success Message Component
 */
export const FormSuccessMessage = ({ message, show }) => {
  if (!show) return null;

  return (
    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      <p className="text-green-800">{message || 'Saved successfully!'}</p>
    </div>
  );
};

/**
 * Form Loading Button Component
 */
export const FormLoadingButton = ({ loading, children, disabled, ...props }) => {
  return (
    <button
      disabled={loading || disabled}
      className={`
        px-4 py-2 rounded font-medium transition
        ${loading || disabled
          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
        }
      `}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin">⌛</span> Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

/**
 * Unsaved Changes Warning Component
 */
export const UnsavedChangesWarning = ({ show, onConfirm, onCancel }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm">
        <h2 className="text-lg font-semibold mb-4">Unsaved Changes</h2>
        <p className="text-gray-600 mb-6">
          You have unsaved changes. Do you want to leave without saving?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Leave Without Saving
          </button>
        </div>
      </div>
    </div>
  );
};

export default useFormSubmit;
