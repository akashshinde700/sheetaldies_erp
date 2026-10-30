import React, { useState } from 'react';
import { PrintToolbar, type SheetKey } from './components/PrintToolbar';
import { ReworkDataSheet } from './components/ReworkDataSheet';
import { NcRegisterSheet } from './components/NcRegisterSheet';
import { reworkSheet } from './data/reworkSheet';
import { ncRegister } from './data/ncRegister';

interface AppProps {
  /** Which form opens first on screen. Both always print together. */
  initialSheet?: 'rework' | 'nc';
  /** Show the on-screen note explaining how the two records are linked. */
  showLinkNote?: boolean;
}

export function App({
  initialSheet = 'rework',
  showLinkNote = true
}: AppProps) {
  const [active, setActive] = useState<SheetKey>(initialSheet);

  return (
    <div className="min-h-full w-full bg-neutral-100 print:bg-white">
      <PrintToolbar active={active} onChange={setActive} />

      <main className="mx-auto max-w-[1400px] px-6 py-6 print:max-w-none print:p-0">
        {showLinkNote &&
        <p className="no-print mb-4 border-l-2 border-[#b81b5c] bg-white px-4 py-3 text-xs text-neutral-600">
            Rework record <strong>Sr No. 1 (QF-QA-07)</strong> — job card 26XQ667,
            cycle VPT-02-26/04/32 — is raised as{' '}
            <strong>NC Sr No. 1 (QF-QA-20)</strong> against test report
            TC/VPT-02/26-04/32, closed by re-verification test report
            TC/VPT-02/26-04/72 at 59-60 HRC.
          </p>
        }

        <div
          className={
          active === 'rework' ?
          'print-page block' :
          'print-page hidden print:block'
          }>
          
          <ReworkDataSheet sheet={reworkSheet} />
        </div>

        <div
          className={
          active === 'nc' ?
          'print-page mt-6 block print:mt-0' :
          'print-page mt-6 hidden print:mt-0 print:block'
          }>
          
          <NcRegisterSheet sheet={ncRegister} />
        </div>
      </main>
    </div>);

}