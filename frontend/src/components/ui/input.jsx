import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(({ className, type = 'text', invalid = false, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex w-full min-h-[40px] sm:min-h-0 sm:h-8 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1 text-[13px] text-slate-800 dark:border-neutral-300/40 dark:bg-neutral-100 dark:text-neutral-900',
        'placeholder:text-slate-400 hover:border-slate-300/90',
        'focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400',
        'transition-all duration-200 ease-out',
        'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-70 dark:disabled:bg-neutral-200 dark:disabled:text-neutral-600',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        invalid && 'border-rose-400 bg-rose-50/50 focus:ring-rose-400/30 focus:border-rose-400',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
