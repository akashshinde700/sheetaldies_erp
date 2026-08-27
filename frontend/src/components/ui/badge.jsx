import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors',
  {
    variants: {
      variant: {
        neutral: 'bg-slate-200 text-slate-800',
        success: 'bg-emerald-100 text-emerald-800',
        error: 'bg-rose-100 text-rose-800',
        warning: 'bg-amber-100 text-amber-800',
        info: 'bg-sky-100 text-sky-800',
        outline: 'border border-slate-200 bg-white text-slate-700',
      },
    },
    defaultVariants: { variant: 'neutral' },
  }
);

const Badge = ({ className, variant, ...props }) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { Badge, badgeVariants };
