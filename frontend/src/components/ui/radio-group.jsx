import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

const RadioGroup = React.forwardRef(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-2', className)} {...props} />
));
RadioGroup.displayName = 'RadioGroup';

const RadioGroupItem = React.forwardRef(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'aspect-square h-4 w-4 shrink-0 rounded-full border border-slate-300 bg-white text-sky-600 shadow-sm',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-sky-600',
      className
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <Circle className="h-2 w-2 fill-sky-600 text-sky-600" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = 'RadioGroupItem';

/** Card-style option row: <RadioCards value onValueChange options={[{value,label,hint}]} /> */
function RadioCards({ value, onValueChange, options = [], className, name }) {
  return (
    <RadioGroup value={value} onValueChange={onValueChange} name={name} className={cn('sm:grid-cols-2 lg:grid-cols-3', className)}>
      {options.map((o) => {
        const id = `${name || 'rc'}-${o.value}`;
        return (
          <label
            key={o.value}
            htmlFor={id}
            className={cn(
              'flex cursor-pointer select-none items-start gap-2.5 rounded-lg border bg-white px-3 py-2.5 transition-colors',
              value === o.value ? 'border-sky-400 bg-sky-50/50 ring-1 ring-sky-200' : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/30'
            )}
          >
            <RadioGroupItem id={id} value={o.value} className="mt-0.5" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-800">{o.label}</span>
              {o.hint && <span className="block text-xs text-slate-500">{o.hint}</span>}
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}

export { RadioGroup, RadioGroupItem, RadioCards };
