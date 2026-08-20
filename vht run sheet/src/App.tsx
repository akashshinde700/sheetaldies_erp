import React from 'react';
import { PrinterIcon } from 'lucide-react';
import { RunSheet } from './components/RunSheet';

export function App() {
  return (
    <div className="w-full min-h-full bg-neutral-200 py-6 flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={() => window.print()}
        className="no-print inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2">
        
        <PrinterIcon className="h-4 w-4" aria-hidden="true" />
        Print / Save as PDF (A4 Landscape)
      </button>
      <RunSheet />
    </div>);

}