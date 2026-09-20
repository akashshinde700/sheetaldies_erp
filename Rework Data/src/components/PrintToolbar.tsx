import React from 'react';
import { PrinterIcon } from 'lucide-react';

export type SheetKey = 'rework' | 'nc';

interface PrintToolbarProps {
  active: SheetKey;
  onChange: (key: SheetKey) => void;
}

const TABS: {key: SheetKey;label: string;doc: string;}[] = [
{ key: 'rework', label: 'Rework & Rejection Data', doc: 'QF-QA-07' },
{ key: 'nc', label: 'Inhouse NC Register', doc: 'QF-QA-20' }];


export function PrintToolbar({ active, onChange }: PrintToolbarProps) {
  return (
    <div className="no-print sticky top-0 z-10 border-b border-neutral-300 bg-white">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <div className="mr-auto">
          <h1 className="text-sm font-semibold tracking-tight text-neutral-900">
            Shital Vacuum Treat Pvt Ltd — Quality Records
          </h1>
          <p className="text-xs text-neutral-500">
            April 2026 · NC register linked to rework record Sr No. 1
          </p>
        </div>

        <div
          className="flex rounded-md border border-neutral-300 p-0.5"
          role="tablist"
          aria-label="Select form">
          
          {TABS.map((tab) => {
            const isActive = tab.key === active;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(tab.key)}
                className={[
                'rounded px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b81b5c]',
                isActive ?
                'bg-neutral-900 text-white' :
                'text-neutral-600 hover:bg-neutral-100'].
                join(' ')}>
                
                {tab.label}
                <span
                  className={
                  isActive ?
                  'ml-2 text-neutral-400' :
                  'ml-2 text-neutral-400'
                  }>
                  
                  {tab.doc}
                </span>
              </button>);

          })}
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md bg-[#b81b5c] px-3.5 py-2 text-xs font-semibold text-white transition-colors duration-150 ease-out hover:bg-[#9d1750] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b81b5c] focus-visible:ring-offset-2">
          
          <PrinterIcon className="h-4 w-4" aria-hidden="true" />
          Print both forms
        </button>
      </div>
    </div>);

}