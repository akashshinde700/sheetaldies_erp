import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * StatusPill — one component, one status->style map, used everywhere a
 * document / workflow state is shown. Colour is never the only signal:
 * the label text always carries the meaning too.
 */
const TONE = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info:    'bg-info-50 text-info-700 ring-info-200',
  progress:'bg-sky-50 text-sky-700 ring-sky-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  danger:  'bg-rose-50 text-rose-700 ring-rose-200',
  heat:    'bg-heat-50 text-heat-700 ring-heat-200',
};

// Maps the app's known status codes to a tone. Extend as needed — an
// unknown status falls back to neutral rather than throwing.
const STATUS_TONE = {
  // Job card
  CREATED: 'neutral', IN_PROGRESS: 'progress', SENT_FOR_JOBWORK: 'warning',
  INSPECTION: 'info', COMPLETED: 'success', ON_HOLD: 'danger',
  // Challan / dispatch
  DRAFT: 'neutral', SENT: 'progress', RECEIVED: 'warning', CANCELLED: 'danger',
  ACCEPTED: 'success', PARTIAL_REJECTED: 'warning',
  // Payment
  PENDING: 'warning', PARTIAL: 'info', PAID: 'success',
  // Certificate
  ISSUED: 'progress', APPROVED: 'success',
  // Inspection
  PASS: 'success', FAIL: 'danger', CONDITIONAL: 'warning',
};

export function statusTone(status) {
  return STATUS_TONE[status] || 'neutral';
}

export function StatusPill({ status, tone, label, className, size = 'md' }) {
  const t = tone || statusTone(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        TONE[t] || TONE.neutral,
        className
      )}
    >
      {label || String(status || '').replace(/_/g, ' ')}
    </span>
  );
}
