// Global status color mapping — use consistently across all pages
// Logic: gray (draft) → blue (sent/in-progress) → yellow (partial) → green (done) → red (cancelled/fail)

export const STATUS_COLORS = {
  // Challan / Dispatch / PO statuses
  DRAFT:      'bg-slate-100 text-slate-600',
  SENT:       'bg-blue-100 text-blue-700',
  RECEIVED:   'bg-amber-100 text-amber-700',
  COMPLETED:  'bg-emerald-100 text-emerald-700',
  CANCELLED:  'bg-rose-100 text-rose-700',
  ACCEPTED:   'bg-emerald-100 text-emerald-700',
  PARTIAL_REJECTED: 'bg-amber-100 text-amber-700',

  // Job Card statuses
  CREATED:          'bg-slate-100 text-slate-600',
  IN_PROGRESS:      'bg-blue-100 text-blue-700',
  SENT_FOR_JOBWORK: 'bg-blue-100 text-blue-700',
  INSPECTION:       'bg-violet-100 text-violet-700',
  ON_HOLD:          'bg-orange-100 text-orange-700',

  // Payment
  PENDING:  'bg-slate-100 text-slate-600',
  PARTIAL:  'bg-amber-100 text-amber-700',
  PAID:     'bg-emerald-100 text-emerald-700',

  // Certificate
  ISSUED:   'bg-blue-100 text-blue-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',

  // Inspection
  PASS:        'bg-emerald-100 text-emerald-700',
  FAIL:        'bg-rose-100 text-rose-700',
  CONDITIONAL: 'bg-amber-100 text-amber-700',

  // Production
  PENDING_PROD:  'bg-slate-100 text-slate-500',
  PARTIAL_PROD:  'bg-amber-100 text-amber-700',
  COMPLETED_PROD:'bg-emerald-100 text-emerald-700',
};

export function statusColor(status) {
  return STATUS_COLORS[status] || 'bg-slate-100 text-slate-600';
}
