import React from 'react';

interface MinuteInputProps {
  value: number;
  onChange: (minutes: number) => void;
  label: string;
  max?: number;
  invalid?: boolean;
  variant?: 'boxed' | 'sheet';
}

export function MinuteInput({
  value,
  onChange,
  label,
  max = 480,
  invalid = false,
  variant = 'boxed'
}: MinuteInputProps) {
  const boxed = `h-8 w-full min-w-[3.25rem] rounded border bg-white px-1 text-center font-mono text-sm tabular-nums text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-accent/25 ${
  invalid ? 'border-danger text-danger' : 'border-line focus:border-accent'}`;


  const sheet = `h-7 w-full border-0 bg-transparent px-0 text-center font-mono text-[13px] font-medium tabular-nums placeholder:text-transparent focus:bg-surface-accent focus:outline-none print:focus:bg-transparent ${
  invalid ? 'text-danger' : 'text-accent'}`;


  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      step={5}
      aria-label={label}
      value={value === 0 ? '' : value}
      onChange={(event) => {
        const next = Number(event.target.value);
        onChange(Number.isFinite(next) && next > 0 ? Math.min(next, max) : 0);
      }}
      className={variant === 'sheet' ? sheet : boxed}
      placeholder="0" />);


}