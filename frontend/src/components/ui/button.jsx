import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-slate-900 text-white shadow-sm shadow-slate-900/20 hover:bg-slate-800 hover:shadow-md focus-visible:ring-slate-400 dark:bg-primary-600 dark:hover:bg-primary-700 dark:shadow-primary-950/30',
        secondary:
          'border border-sky-200/90 bg-sky-100 text-sky-950 hover:bg-sky-200/90 hover:border-sky-300 hover:shadow-sm focus-visible:ring-sky-400 dark:border-info-700 dark:bg-info-950 dark:text-info-100 dark:hover:bg-info-900',
        outline:
          'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm focus-visible:ring-slate-300 dark:border-neutral-300/40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200/70',
        ghost:
          'text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-300 dark:text-neutral-700 dark:hover:bg-neutral-200/70 dark:hover:text-neutral-900',
        danger:
          'bg-rose-600 text-white shadow-sm shadow-rose-600/20 hover:bg-rose-700 hover:shadow-md focus-visible:ring-rose-500 dark:bg-danger-600 dark:hover:bg-danger-500',
        link: 'text-sky-700 underline-offset-4 hover:underline focus-visible:ring-sky-400',
      },
      size: {
        sm: 'min-h-[40px] sm:min-h-0 sm:h-8 px-3 text-xs rounded-md',
        md: 'min-h-[44px] sm:min-h-0 sm:h-9 px-4 py-2',
        lg: 'min-h-[48px] sm:min-h-0 sm:h-11 px-6 rounded-xl text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={asChild ? undefined : disabled || loading}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
            {children}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
