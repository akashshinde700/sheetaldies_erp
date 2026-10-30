import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] animate-backdrop-in', className)}
    {...props}
  />
));
SheetOverlay.displayName = 'SheetOverlay';

const sheetVariants = cva(
  'fixed z-50 flex flex-col gap-4 bg-white shadow-drawer transition ease-out',
  {
    variants: {
      side: {
        right: 'inset-y-0 right-0 h-full w-full sm:max-w-lg border-l border-slate-200 animate-[sheetInRight_260ms_ease-out]',
        left: 'inset-y-0 left-0 h-full w-full sm:max-w-lg border-r border-slate-200 animate-[sheetInLeft_260ms_ease-out]',
        bottom: 'inset-x-0 bottom-0 h-auto max-h-[92dvh] rounded-t-2xl border-t border-slate-200 animate-[sheetInUp_260ms_ease-out]',
      },
    },
    defaultVariants: { side: 'right' },
  }
);

const SheetContent = React.forwardRef(({ side = 'right', className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
      <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">{children}</div>
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-md p-1 text-slate-400 opacity-70 transition-opacity hover:opacity-100 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = 'SheetContent';

const SheetHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col gap-1 pr-8', className)} {...props} />
);
const SheetFooter = ({ className, ...props }) => (
  <div className={cn('mt-auto flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end', className)} {...props} />
);
const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-base font-bold text-slate-900 tracking-tight', className)} {...props} />
));
SheetTitle.displayName = 'SheetTitle';
const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-slate-500', className)} {...props} />
));
SheetDescription.displayName = 'SheetDescription';

export {
  Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription,
};
