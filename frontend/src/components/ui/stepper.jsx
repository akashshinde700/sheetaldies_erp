import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Stepper — horizontal progress indicator for multi-step create flows.
 *
 * <Stepper
 *   steps={[{ key:'source', label:'Source' }, ...]}
 *   current={0}                       // active index
 *   completed={new Set([0])}          // optional: indices marked done
 *   onStepClick={(i) => ...}          // optional: allow jumping back
 * />
 */
export function Stepper({ steps, current, completed, onStepClick, className }) {
  return (
    <ol className={cn('flex w-full items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      {steps.map((s, i) => {
        const isDone = completed ? completed.has(i) : i < current;
        const isActive = i === current;
        const clickable = typeof onStepClick === 'function' && (isDone || i < current);
        return (
          <li key={s.key} className="flex flex-1 min-w-[92px] items-center gap-1">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick(i)}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'group flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors',
                clickable && 'hover:bg-slate-100 cursor-pointer',
                !clickable && 'cursor-default'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold font-app-mono',
                  isActive && 'bg-sky-600 text-white ring-2 ring-sky-200',
                  isDone && !isActive && 'bg-emerald-600 text-white',
                  !isActive && !isDone && 'bg-slate-200 text-slate-500'
                )}
              >
                {isDone && !isActive ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn(
                  'hidden truncate text-xs font-semibold sm:block',
                  isActive ? 'text-slate-900' : isDone ? 'text-slate-600' : 'text-slate-400'
                )}
              >
                {s.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <span className={cn('h-px w-4 shrink-0 sm:w-6', i < current ? 'bg-emerald-400' : 'bg-slate-200')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** useStepper — small state helper for linear flows. */
export function useStepper(count) {
  const [current, setCurrent] = React.useState(0);
  const [completed, setCompleted] = React.useState(() => new Set());
  const next = React.useCallback(() => {
    setCompleted((c) => new Set(c).add(current));
    setCurrent((i) => Math.min(i + 1, count - 1));
  }, [current, count]);
  const back = React.useCallback(() => setCurrent((i) => Math.max(i - 1, 0)), []);
  const goto = React.useCallback((i) => setCurrent(() => Math.max(0, Math.min(i, count - 1))), [count]);
  return { current, completed, setCompleted, next, back, goto, isFirst: current === 0, isLast: current === count - 1 };
}
