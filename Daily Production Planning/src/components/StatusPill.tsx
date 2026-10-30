import React from 'react';
import type { CycleStatus } from '../types/production';

const MAP: Record<CycleStatus, {label: string;className: string;}> = {
  planned: { label: 'Planned', className: 'bg-ink-100 text-ink-600 ring-ink-200' },
  running: { label: 'In furnace', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  tempering: { label: 'Tempering', className: 'bg-sky-50 text-sky-800 ring-sky-200' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' }
};

export function StatusPill({ status }: {status: CycleStatus;}) {
  const s = MAP[status];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.className}`}>
      
      {s.label}
    </span>);

}