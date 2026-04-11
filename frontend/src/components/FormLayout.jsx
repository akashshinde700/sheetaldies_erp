/**
 * ✅ FORM LAYOUT - Consistent, well-spaced form structure
 * Use this instead of inline form markup for better consistency
 */

import { memo } from 'react';
import { Button } from './UIKit';

export const FormLayout = memo(({
  onSubmit,
  submitting = false,
  children,
  className = '',
  sections = true, // If true, wraps content in semantic sections
}) => {
  return (
    <form onSubmit={onSubmit} className={`space-y-6 ${className}`.trim()}>
      {sections ? (
        <fieldset disabled={submitting}>
          {children}
        </fieldset>
      ) : (
        children
      )}
    </form>
  );
});

FormLayout.displayName = 'FormLayout';

export const FormSection = memo(({
  title,
  description,
  children,
  className = '',
}) => {
  return (
    <fieldset className={`space-y-4 pb-4 ${className}`.trim()}>
      {title && (
        <legend className="flex flex-col gap-1 pb-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {description && (
            <p className="text-xs text-slate-600">{description}</p>
          )}
        </legend>
      )}
      {children}
    </fieldset>
  );
});

FormSection.displayName = 'FormSection';

export const FormRow = memo(({
  cols = 1, // 1, 2, 3 columns
  children,
  className = '',
}) => {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  }[cols] || 'grid-cols-1';

  return (
    <div className={`grid gap-4 ${gridClass} ${className}`.trim()}>
      {children}
    </div>
  );
});

FormRow.displayName = 'FormRow';

export const FormActions = memo(({
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  submitting = false,
  submitVariant = 'primary',
  secondaryAction = null,
  className = '',
}) => {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 mt-6 ${className}`.trim()}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          variant={submitVariant}
          loading={submitting}
          onClick={onSubmit}
        >
          <span className="material-symbols-outlined">save</span>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            {cancelLabel}
          </Button>
        )}
      </div>
      {secondaryAction && <div>{secondaryAction}</div>}
    </div>
  );
});

FormActions.displayName = 'FormActions';

/**
 * ✅ PAGE HEADER - Consistent header with title + actions
 */
export const PageHeader = memo(({
  title,
  subtitle,
  breadcrumb,
  actions,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {breadcrumb && <div>{breadcrumb}</div>}
      <div className="flex flex-col xs:flex-row xs:items-end xs:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="page-title text-slate-900">{title}</h1>
          {subtitle && <p className="page-subtitle text-slate-600">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 xs:justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
});

PageHeader.displayName = 'PageHeader';

/**
 * ✅ CARD CONTAINER - For organized content grouping
 */
export const CardContainer = memo(({
  title,
  subtitle,
  children,
  actions,
  footer,
  className = '',
}) => {
  return (
    <div className={`card p-4 sm:p-6 ${className}`.trim()}>
      {(title || subtitle || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-5 pb-4 border-b border-slate-200">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-bold text-slate-900">{title}</h2>}
            {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
          </div>
          {actions && <div className="flex gap-2 mt-4 sm:mt-0">{actions}</div>}
        </div>
      )}
      <div className="space-y-4">{children}</div>
      {footer && <div className="mt-5 pt-4 border-t border-slate-200">{footer}</div>}
    </div>
  );
});

CardContainer.displayName = 'CardContainer';

export default {
  FormLayout,
  FormSection,
  FormRow,
  FormActions,
  PageHeader,
  CardContainer,
};
