import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * FormField — consistent label + control + error/hint wrapper.
 * Pure presentation: does not manage state or validation itself.
 */
const FormField = ({ label, htmlFor, required = false, error = null, hint = null, className = '', id, children }) => (
  <div id={id} className={cn('space-y-1.5', id && 'scroll-mt-24', className)}>
    {label && (
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-rose-500 ml-0.5 font-bold" aria-hidden="true">*</span>}
      </Label>
    )}
    {children}
    {error && (
      <p className="flex items-center gap-1 text-xs font-semibold text-rose-600" role="alert">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        {error}
      </p>
    )}
    {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
  </div>
);

export { FormField };
