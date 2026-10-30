import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * PageHeader — one consistent page-top block for the modernized screens.
 *
 * <PageHeader
 *   title="Job Card"
 *   meta={<>JC-0042 · <StatusPill .../></>}
 *   breadcrumbs={[{ label:'Job Cards', to:'/jobcards' }, { label:'JC-0042' }]}
 *   backTo="/jobcards"
 *   actions={<Button>…</Button>}
 * />
 */
export function Breadcrumbs({ items = [], className }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-xs font-medium text-slate-500', className)}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {it.to && !last ? (
              <Link to={it.to} className="rounded px-0.5 hover:text-sky-700 hover:underline">{it.label}</Link>
            ) : (
              <span className={cn('px-0.5', last && 'text-slate-700')} aria-current={last ? 'page' : undefined}>{it.label}</span>
            )}
            {!last && <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export function PageHeader({ title, meta, breadcrumbs, backTo, actions, className, inlineMeta = false }) {
  return (
    <div className={cn('space-y-2', className)}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2.5 min-w-0">
          {backTo && (
            <Button asChild variant="outline" size="icon-sm" className="mt-0.5 rounded-lg shrink-0 text-slate-500 hover:text-slate-900">
              <Link to={backTo} aria-label="Back">
                <ArrowLeft />
              </Link>
            </Button>
          )}
          {inlineMeta ? (
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{title}</h1>
              {meta && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">{meta}</div>}
            </div>
          ) : (
            <div className="min-w-0 space-y-0.5">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{title}</h1>
              {meta && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">{meta}</div>}
            </div>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
