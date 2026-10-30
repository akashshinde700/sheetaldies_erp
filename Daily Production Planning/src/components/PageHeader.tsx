import React from 'react';

interface PageHeaderProps {
  title: string;
  docNo: string;
  description: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, docNo, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-400">{docNo}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-500">{description}</p>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>);

}