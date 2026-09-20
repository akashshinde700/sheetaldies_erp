import React from 'react';

interface SheetPaperProps {
  orientation?: 'landscape' | 'portrait';
  children: React.ReactNode;
}

/** A single printable sheet of paper, faithful to the shop-floor form. */
export function SheetPaper({ orientation = 'portrait', children }: SheetPaperProps) {
  return (
    <section
      className={`sheet sheet-page mx-auto w-full bg-white p-6 text-black shadow-sm ring-1 ring-line print:p-0 print:shadow-none print:ring-0 ${
      orientation === 'landscape' ?
      'sheet-landscape max-w-[1240px]' :
      'sheet-portrait max-w-[900px]'}`
      }>
      
      {children}
    </section>);

}