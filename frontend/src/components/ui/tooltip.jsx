import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-[70] max-w-xs rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-md',
        'animate-scale-in select-none',
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = 'TooltipContent';

/** Convenience wrapper: <InfoTip>text</InfoTip> on any trigger element. */
function InfoTip({ children, label, side = 'top', className }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} className={className}>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, InfoTip };
