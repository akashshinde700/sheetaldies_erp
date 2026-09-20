import React from 'react';
import { PrinterIcon } from 'lucide-react';

interface PrintButtonProps {
  label?: string;
}

export function PrintButton({ label = 'Print sheet' }: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-1.5 rounded border border-line bg-white px-3 py-1.5 text-sm font-medium text-accent transition-colors duration-150 ease-out hover:border-accent">
      
      <PrinterIcon className="h-3.5 w-3.5" />
      {label}
    </button>);

}