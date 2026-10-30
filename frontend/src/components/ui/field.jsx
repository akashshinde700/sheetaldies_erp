import * as React from 'react';
import { Controller } from 'react-hook-form';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

/**
 * FieldShell — label + control + hint/error, with the accessibility
 * wiring done once: generated id, htmlFor, aria-describedby, aria-invalid.
 *
 * Pass the control as a single child element; it receives id / aria-*
 * automatically. `required` renders the `*` — derive it from your zod
 * schema, don't hand-place it.
 */
export const FieldShell = React.forwardRef(function FieldShell(
  { label, required = false, error = null, hint = null, className = '', id: idProp, children },
  ref
) {
  const reactId = React.useId();
  const id = idProp || `f-${reactId}`;
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errId : null, hint && !error ? hintId : null].filter(Boolean).join(' ') || undefined;

  const control = React.isValidElement(children)
    ? React.cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        invalid: error ? true : children.props.invalid,
      })
    : children;

  return (
    <div ref={ref} className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="ml-0.5 font-bold text-rose-500" aria-hidden="true">*</span>}
        </Label>
      )}
      {control}
      {error && (
        <p id={errId} role="alert" className="flex items-center gap-1 text-xs font-semibold text-rose-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {hint && !error && <p id={hintId} className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
});

/**
 * Field — react-hook-form bound. Give it `control`, `name`, `label`, and a
 * `render` that returns the control element; validation state flows in
 * from RHF automatically.
 *
 * <Field control={control} name="quantity" label="Quantity" required
 *   render={(field) => <Input type="number" {...field} />} />
 */
export function Field({ control, name, label, required, hint, className, render, rules }) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <FieldShell
          label={label}
          required={required}
          hint={hint}
          className={className}
          error={fieldState.error?.message}
        >
          {render(field, fieldState)}
        </FieldShell>
      )}
    />
  );
}

/**
 * FormErrorSummary — focusable list shown on failed submit. Pass RHF's
 * `formState.errors` and a `fieldLabels` map. Clicking an item focuses the
 * field (by name -> element id convention `f-<name>` or the element's own id).
 */
export const FormErrorSummary = React.forwardRef(function FormErrorSummary(
  { errors, labels = {}, className, onJump },
  ref
) {
  const entries = flattenErrors(errors);
  const localRef = React.useRef(null);
  const rootRef = ref || localRef;

  React.useEffect(() => {
    if (entries.length && rootRef.current) rootRef.current.focus();
  }, [entries.length]); // eslint-disable-line

  if (!entries.length) return null;

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="alert"
      className={cn(
        'rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400',
        className
      )}
    >
      <p className="flex items-center gap-2 font-bold text-rose-800">
        <AlertCircle className="h-4 w-4" />
        {entries.length === 1 ? 'Fix 1 field to continue' : `Fix ${entries.length} fields to continue`}
      </p>
      <ul className="mt-2 space-y-1">
        {entries.map(({ name, message }) => (
          <li key={name}>
            <button
              type="button"
              className="text-left font-medium text-rose-700 underline underline-offset-2 hover:text-rose-900"
              onClick={() => (onJump ? onJump(name) : focusField(name))}
            >
              {labels[name] || prettifyName(name)}: {message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});

function flattenErrors(errors, prefix = '') {
  const out = [];
  for (const [key, val] of Object.entries(errors || {})) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (val?.message) out.push({ name, message: val.message });
    else if (val && typeof val === 'object') out.push(...flattenErrors(val, name));
  }
  return out;
}

function prettifyName(name) {
  return name
    .replace(/\.\d+\./g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function focusField(name) {
  const el =
    document.getElementById(`f-${name}`) ||
    document.querySelector(`[name="${CSS.escape(name)}"]`) ||
    document.getElementById(name);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => el.focus?.({ preventScroll: true }), 150);
  }
}

export { focusField };
