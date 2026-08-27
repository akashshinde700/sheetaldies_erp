import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * WizardShell — full-height layout for multi-step create/edit flows.
 *
 * The page header, the stepper and the action bar stay pinned and always
 * visible; only the field area between them scrolls, and only when a step
 * is taller than the viewport. On normal laptop screens nothing scrolls.
 *
 * Requires the app shell to pass height down: <main> is `flex flex-col`
 * and its Outlet wrapper is `flex-1 min-h-0 flex flex-col`.
 *
 * <WizardShell
 *   header={<PageHeader ... />}
 *   stepper={<Stepper ... />}      // optional
 *   footer={<div>…action bar…</div>}
 * >
 *   {step content}
 * </WizardShell>
 */
export function WizardShell({ header, stepper, footer, children, className, bodyClassName }) {
  return (
    <div className={cn('font-app flex flex-col h-full min-h-0 print:block print:h-auto', className)}>
      {header && <div className="shrink-0 print:static">{header}</div>}
      {stepper && (
        <div className="shrink-0 mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-card print:hidden">
          {stepper}
        </div>
      )}
      <div
        className={cn(
          'flex-1 min-h-0 overflow-y-auto overscroll-contain py-3 pr-0.5 space-y-3 print:overflow-visible print:py-0',
          bodyClassName,
        )}
      >
        {children}
      </div>
      {footer && <div className="shrink-0 print:hidden">{footer}</div>}
    </div>
  );
}
