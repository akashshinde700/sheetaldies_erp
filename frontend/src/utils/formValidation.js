/**
 * Comprehensive Frontend Form Validation Utilities
 * Handles error display, loading states, unsaved changes detection
 * Location: frontend/src/utils/formValidation.js (NEW)
 */

export const FormValidationUtils = {
  /**
   * Validate form field with custom rules
   */
  validateField: (name, value, rules) => {
    if (!rules) return null;
    
    // Check required
    if (rules.required && !value) {
      return `${rules.label || name} is required`;
    }
    
    // Check email format
    if (rules.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Invalid email format';
      }
    }
    
    // Check phone (10 digits)
    if (rules.type === 'phone' && value) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(value.replace(/\D/g, ''))) {
        return 'Phone must be 10 digits';
      }
    }
    
    // Check GSTIN (15 chars)
    if (rules.type === 'gstin' && value) {
      if (value.length !== 15) {
        return 'GSTIN must be 15 characters';
      }
    }
    
    // Check PAN (10 chars)
    if (rules.type === 'pan' && value) {
      if (value.length !== 10) {
        return 'PAN must be 10 characters';
      }
    }
    
    // Check min/max length
    if (rules.minLength && value && value.length < rules.minLength) {
      return `${rules.label || name} must be at least ${rules.minLength} characters`;
    }
    if (rules.maxLength && value && value.length > rules.maxLength) {
      return `${rules.label || name} must be at most ${rules.maxLength} characters`;
    }
    
    // Check decimal places
    if (rules.type === 'decimal' && value) {
      const decimalRegex = /^\d+(\.\d{0,2})?$/;
      if (!decimalRegex.test(value)) {
        return 'Must be a valid decimal with max 2 places';
      }
    }
    
    // Check positive number
    if (rules.type === 'positive' && value) {
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) {
        return 'Must be a positive number';
      }
    }
    
    // Check min/max value
    if (rules.min !== undefined && value !== '' && parseFloat(value) < rules.min) {
      return `${rules.label || name} must be at least ${rules.min}`;
    }
    if (rules.max !== undefined && value !== '' && parseFloat(value) > rules.max) {
      return `${rules.label || name} must be at most ${rules.max}`;
    }
    
    return null;
  },

  /**
   * Validate entire form
   */
  validateForm: (formData, validationRules) => {
    const errors = {};
    
    for (const fieldName in validationRules) {
      const rules = validationRules[fieldName];
      const value = formData[fieldName];
      const error = FormValidationUtils.validateField(fieldName, value, rules);
      
      if (error) {
        errors[fieldName] = error;
      }
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  },

  /**
   * Format API error response
   */
  formatApiError: (error) => {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  },

  /**
   * Handle API validation errors
   */
  handleApiValidationErrors: (error) => {
    const errors = {};
    
    if (error.response?.data?.errors) {
      error.response.data.errors.forEach(err => {
        if (err.field) {
          errors[err.field] = err.message;
        }
      });
    }
    
    return errors;
  },

  /**
   * Handle unsaved changes warning
   */
  hasUnsavedChanges: (original, current) => {
    return JSON.stringify(original) !== JSON.stringify(current);
  },

  /**
   * Debounce function for input validation
   */
  debounce: (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * Format form data for sending to API
   */
  formatFormData: (formData, options = {}) => {
    const formatted = { ...formData };
    
    // Convert string numbers to actual numbers
    if (options.numberFields) {
      options.numberFields.forEach(field => {
        if (field in formatted && formatted[field]) {
          formatted[field] = parseFloat(formatted[field]);
        }
      });
    }
    
    // Convert dates to ISO string
    if (options.dateFields) {
      options.dateFields.forEach(field => {
        if (field in formatted && formatted[field]) {
          formatted[field] = new Date(formatted[field]).toISOString();
        }
      });
    }
    
    return formatted;
  },
};

export default FormValidationUtils;
