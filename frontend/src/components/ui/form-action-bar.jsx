import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * FormActionBar — one sticky action row per form/tab.
 *
 * Desktop: sticks to the bottom of the scroll area.
 * Mobile: full-width, safe-area aware.
 *
 * <FormActionBar
 *   dirty={isDirty}
 *   submitting={saving}
 *   onCancel={() => navigate(-1)}
 *   submitLabel="Save job card"
 *   secondary={<Button variant="outline">Print</Button>}
 *   note="Weight is saved with this form."
 * />
 *
 * Put <FormActionBarSpacer /> at the end of the scrolling content so the
 * sticky bar never covers the last field.
 */
export function FormActionBar({
  onCancel,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  submitting = false,
  disabled = false,
  dirty,
  destructive = false,
  secondary = null,
  note = null,
  formId,
  className,
}) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-30 mt-6 rounded-xl border border-slate-200 bg-white/95 shadow-card backdrop-blur',
        'px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        'sm:px-5',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type={formId ? 'submit' : 'button'}
          form={formId}
          onClick={formId ? undefined : onSubmit}
          loading={submitting}
          disabled={disabled || submitting}
          variant={destructive ? 'danger' : 'primary'}
        >
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            {cancelLabel}
          </Button>
        )}
        {typeof dirty === 'boolean' && (
          <span
            className={cn(
              'font-app-mono text-xs',
              dirty ? 'text-amber-600' : 'text-slate-400'
            )}
          >
            {dirty ? '● Unsaved changes' : 'All changes saved'}
          </span>
        )}
        {secondary && <div className="ml-auto flex items-center gap-2">{secondary}</div>}
      </div>
      {note && <p className="mt-1.5 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

export function FormActionBarSpacer() {
  return <div aria-hidden style={{ height: 'var(--action-bar-h)' }} />;
}
