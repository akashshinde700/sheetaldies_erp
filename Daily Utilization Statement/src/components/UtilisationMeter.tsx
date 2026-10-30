import React from 'react';
import { fmt, utilisationTone } from '../utils/utilisation';

interface UtilisationMeterProps {
  percent: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const TRACK_HEIGHT: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3'
};

const VALUE_SIZE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-sm',
  md: 'text-xl',
  lg: 'text-5xl'
};

const FILL: Record<'ok' | 'warn' | 'danger', string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger'
};

const TEXT: Record<'ok' | 'warn' | 'danger', string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger'
};

export function UtilisationMeter({ percent, label, size = 'md' }: UtilisationMeterProps) {
  const tone = utilisationTone(percent);
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        {label ?
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            {label}
          </span> :
        null}
        <span className={`font-mono font-semibold tabular-nums ${VALUE_SIZE[size]} ${TEXT[tone]}`}>
          {fmt(percent, 1)}
          <span className={size === 'lg' ? 'text-2xl' : 'text-xs'}>%</span>
        </span>
      </div>
      <div
        className={`mt-2 w-full overflow-hidden rounded-full bg-line ${TRACK_HEIGHT[size]}`}
        role="meter"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? `${label} utilisation` : 'Utilisation'}>
        
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-out ${FILL[tone]}`}
          style={{ width: `${clamped}%` }} />
        
      </div>
    </div>);

}