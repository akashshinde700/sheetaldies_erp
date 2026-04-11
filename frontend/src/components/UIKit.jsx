/**
 * ✅ IMPROVED BUTTON - With loading, disabled, and variant states
 * Replaces repetitive button markup across forms
 */

import { memo } from 'react';

export const Button = memo(({
  type = 'button',
  variant = 'primary', // primary, secondary, outline, ghost, danger
  size = 'md', // sm, md, lg
  loading = false,
  disabled = false,
  icon: Icon = null,
  iconRight: IconRight = null,
  className = '',
  children,
  ...props
}) => {
  const baseClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant] || 'btn-primary';

  const sizeClass = {
    sm: 'px-3 py-2 text-xs gap-1.5',
    md: '',
    lg: 'px-6 py-3 text-base gap-3',
  }[size] || '';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseClass} ${sizeClass} ${loading ? 'btn-loading' : ''} ${className}`.trim()}
      {...props}
    >
      {loading && (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
      )}
      {Icon && !loading && <Icon className="w-5 h-5" />}
      {children}
      {IconRight && !loading && <IconRight className="w-5 h-5" />}
    </button>
  );
});

Button.displayName = 'Button';

/**
 * ✅ FORM FIELD - With label, error, and validation states
 */
export const FormField = memo(({
  label,
  required = false,
  error = null,
  success = null,
  hint = null,
  children,
  className = '',
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {children}
      {error && (
        <div className="form-error">
          <span className="material-symbols-outlined text-base">error</span>
          {error}
        </div>
      )}
      {success && (
        <div className="form-success">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {success}
        </div>
      )}
      {hint && !error && <div className="form-hint">{hint}</div>}
    </div>
  );
});

FormField.displayName = 'FormField';

/**
 * ✅ BADGE - Semantic color variants
 */
export const Badge = memo(({ 
  variant = 'neutral', // success, error, warning, info, neutral
  icon: Icon = null,
  children,
  className = '',
}) => {
  const variantClass = {
    success: 'badge-success',
    error: 'badge-error',
    warning: 'badge-warning',
    info: 'badge-info',
    neutral: 'badge-neutral',
  }[variant] || 'badge-neutral';

  return (
    <span className={`badge ${variantClass} ${className}`.trim()}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

/**
 * ✅ STATUS BADGE - For displaying document/process status
 */
export const StatusBadge = memo(({ 
  status = 'pending', // active, pending, completed, error
  label,
  className = '',
}) => {
  const statusClass = {
    active: 'status-active',
    pending: 'status-pending',
    completed: 'status-completed',
    error: 'status-error',
  }[status] || 'status-pending';

  const iconMap = {
    active: 'check_circle',
    pending: 'schedule',
    completed: 'task_alt',
    error: 'cancel',
  };

  return (
    <span className={`status-badge ${statusClass} ${className}`.trim()}>
      <span className="material-symbols-outlined text-sm">{iconMap[status]}</span>
      {label || status}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

/**
 * ✅ ALERT - Inline alerts with semantic colors
 */
export const Alert = memo(({
  type = 'info', // success, error, warning, info
  icon: Icon = null,
  title,
  children,
  onClose,
  className = '',
}) => {
  const typeClass = {
    success: 'alert-success',
    error: 'alert-error',
    warning: 'alert-warning',
    info: 'alert-info',
  }[type] || 'alert-info';

  const iconMap = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info',
  };

  return (
    <div className={`alert ${typeClass} ${className}`.trim()} role="alert">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined flex-shrink-0 mt-0.5">{iconMap[type]}</span>
        <div className="flex-1 min-w-0">
          {title && <div className="font-bold">{title}</div>}
          {children && <div className="text-sm mt-1">{children}</div>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>
    </div>
  );
});

Alert.displayName = 'Alert';

/**
 * ✅ BREADCRUMB - For navigation context
 */
export const Breadcrumb = memo(({ items, className = '' }) => {
  return (
    <nav className={`flex items-center gap-2 text-sm ${className}`.trim()} aria-label="Breadcrumb">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {idx > 0 && <span className="text-slate-400">/</span>}
          {item.href ? (
            <a
              href={item.href}
              className="text-sky-600 hover:text-sky-700 font-medium transition-colors"
            >
              {item.label}
            </a>
          ) : (
            <span className="text-slate-700">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
});

Breadcrumb.displayName = 'Breadcrumb';

/**
 * ✅ EMPTY STATE - For when there's no data
 */
export const EmptyState = memo(({
  icon: Icon = null,
  title = 'No data found',
  description = 'Try adjusting your filters or creating a new item.',
  action = null,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`.trim()}>
      {Icon ? (
        <Icon className="w-16 h-16 text-slate-300 mb-4" />
      ) : (
        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">
          inbox
        </span>
      )}
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-600 text-center mb-6 max-w-sm">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

export default {
  Button,
  FormField,
  Badge,
  StatusBadge,
  Alert,
  Breadcrumb,
  EmptyState,
};
