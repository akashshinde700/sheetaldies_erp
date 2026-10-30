import React from 'react';
import { FileSpreadsheetIcon, PrinterIcon } from 'lucide-react';

interface SheetActionsProps {
  onExport: () => void;
  exportLabel?: string;
}

export function SheetActions({ onExport, exportLabel = 'Export Excel' }: SheetActionsProps) {
  return (
    <div className="flex items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={onExport}
        className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 transition-colors duration-150 ease-out hover:bg-ink-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
        
        <FileSpreadsheetIcon className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        {exportLabel}
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 rounded-md bg-ink-900 px-3 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-ink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
        
        <PrinterIcon className="h-4 w-4" aria-hidden="true" /> Print sheet
      </button>
    </div>);

}