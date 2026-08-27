import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef(({ className, invalid = false, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex w-full rounded-lg border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-800',
        'placeholder:text-slate-400 hover:border-slate-300/90',
        'focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400',
        'transition-all duration-200 ease-out resize-none',
        'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-70',
        invalid && 'border-rose-400 bg-rose-50/50 focus:ring-rose-400/30 focus:border-rose-400',
        className
      )}
      style={{ minHeight: '52px', ...props.style }}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
