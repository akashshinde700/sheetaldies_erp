import { useState, useCallback } from 'react';

/**
 * CRITICAL FIX: Form Validation Hook
 * Provides form state management with validation
 * Handles: form data, errors, touched fields, submission
 */
export const useFormValidation = (initialValues, onSubmit, validate) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Single field change handler
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setValues(v => ({ ...v, [name]: newValue }));

    // Validate on change if field was touched
    if (touched[name]) {
      const fieldError = validate ? validate(name, newValue) : null;
      setErrors(err => ({ ...err, [name]: fieldError }));
    }
  }, [touched, validate]);

  // Blur handler - marks field as touched and validates
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;

    setTouched(t => ({ ...t, [name]: true }));

    if (validate) {
      const fieldError = validate(name, value);
      setErrors(err => ({ ...err, [name]: fieldError }));
    }
  }, [validate]);

  // Form submission handler
  const handleSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    setSubmitError(null);
    setIsSubmitting(true);

    // Validate all fields
    const allErrors = {};
    if (validate) {
      for (const [key, value] of Object.entries(values)) {
        const fieldError = validate(key, value);
        if (fieldError) {
          allErrors[key] = fieldError;
        }
      }
    }

    // If validation failed, show errors and stop
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setTouched(
        Object.keys(values).reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {})
      );
      setIsSubmitting(false);
      return;
    }

    // Validation passed, call onSubmit callback
    try {
      await onSubmit(values);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit]);

  // Reset form to initial values
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitError(null);
  }, [initialValues]);

  // Set field value programmatically
  const setFieldValue = useCallback((name, value) => {
    setValues(v => ({ ...v, [name]: value }));
  }, []);

  // Set field error programmatically
  const setFieldError = useCallback((name, error) => {
    setErrors(err => ({ ...err, [name]: error }));
  }, []);

  // Set field touched programmatically
  const setFieldTouched = useCallback((name, isTouched) => {
    setTouched(t => ({ ...t, [name]: isTouched }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    setValues,
    setErrors,
    setTouched,
  };
};

/**
 * Common field validators
 */
export const validators = {
  /**
   * Validate GSTIN (15-character format)
   */
  validateGSTIN: (gstin) => {
    if (!gstin) return 'GSTIN is required';
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin) ? null : 'Invalid GSTIN format (should be 15 characters)';
  },

  /**
   * Validate PAN (10-character format)
   */
  validatePAN: (pan) => {
    if (!pan) return null; // Optional field
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan) ? null : 'Invalid PAN format';
  },

  /**
   * Validate email
   */
  validateEmail: (email) => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? null : 'Invalid email format';
  },

  /**
   * Validate phone number (10 digits)
   */
  validatePhone: (phone) => {
    if (!phone) return 'Phone number is required';
    const phoneRegex = /^[0-9]{10}$/;
    const cleaned = phone.replace(/\D/g, '');
    return phoneRegex.test(cleaned) ? null : 'Phone number must be 10 digits';
  },

  /**
   * Validate required string
   */
  validateRequired: (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName} is required`;
    }
    return null;
  },

  /**
   * Validate min length
   */
  validateMinLength: (value, minLen, fieldName = 'Field') => {
    if (value && String(value).length < minLen) {
      return `${fieldName} must be at least ${minLen} characters`;
    }
    return null;
  },

  /**
   * Validate max length
   */
  validateMaxLength: (value, maxLen, fieldName = 'Field') => {
    if (value && String(value).length > maxLen) {
      return `${fieldName} must be at most ${maxLen} characters`;
    }
    return null;
  },

  /**
   * Validate number is within range
   */
  validateNumberRange: (value, min, max, fieldName = 'Value') => {
    if (!value && value !== 0) return `${fieldName} is required`;
    const num = parseFloat(value);
    if (isNaN(num)) return `${fieldName} must be a number`;
    if (num < min) return `${fieldName} must be at least ${min}`;
    if (num > max) return `${fieldName} must be at most ${max}`;
    return null;
  },

  /**
   * Validate positive number
   */
  validatePositive: (value, fieldName = 'Value') => {
    if (!value && value !== 0) return `${fieldName} is required`;
    const num = parseFloat(value);
    if (isNaN(num)) return `${fieldName} must be a number`;
    if (num <= 0) return `${fieldName} must be greater than 0`;
    return null;
  },
};

/**
 * Hook: Use API loading state
 * Manages loading, error, and data state for API calls
 */
export const useApiState = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [success, setSuccess] = useState(false);

  const execute = async (apiCall) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await apiCall();
      setData(result);
      setSuccess(true);
      return result;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setData(null);
    setSuccess(false);
  };

  return { loading, error, data, success, execute, reset };
};

export default useFormValidation;
