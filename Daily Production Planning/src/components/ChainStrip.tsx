import React from 'react';
import { ChevronRightIcon } from 'lucide-react';

const STEPS = [
{ key: 'plan', label: 'Daily Planning', detail: 'Load is planned on a furnace' },
{ key: 'run', label: 'VHT Run Sheet', detail: 'HT Cycle No is issued' },
{ key: 'temper', label: 'Tempering Plan', detail: 'Slots claim the same cycle' },
{ key: 'energy', label: 'Energy Log', detail: 'Meter reading closes it' }];


export function ChainStrip({ active }: {active: 'plan' | 'run' | 'temper' | 'energy';}) {
  return (
    <ol className="mb-6 flex flex-wrap items-stretch gap-1 rounded-lg border border-ink-200 bg-white p-1.5">
      {STEPS.map((step, i) => {
        const isActive = step.key === active;
        return (
          <li key={step.key} className="flex min-w-0 flex-1 items-center">
            <div
              className={`min-w-0 flex-1 rounded-md px-3 py-2 ${isActive ? 'bg-brand-600 text-white' : 'text-ink-600'}`}>
              
              <p className="truncate text-[13px] font-semibold leading-tight">{step.label}</p>
              <p className={`mt-0.5 truncate text-[11px] ${isActive ? 'text-brand-100' : 'text-ink-400'}`}>
                {step.detail}
              </p>
            </div>
            {i < STEPS.length - 1 ?
            <ChevronRightIcon className="mx-0.5 h-4 w-4 shrink-0 text-ink-300" aria-hidden="true" /> :
            null}
          </li>);

      })}
    </ol>);

}