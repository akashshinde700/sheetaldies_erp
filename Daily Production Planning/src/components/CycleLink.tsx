import React from 'react';
import { Link } from 'react-router-dom';
import { LinkIcon } from 'lucide-react';
import { cycleSlug } from '../utils/traceability';

interface CycleLinkProps {
  htCycleNo: string;
  subtle?: boolean;
}

/** The HT Cycle No rendered as the shared key between every sheet. */
export function CycleLink({ htCycleNo, subtle = false }: CycleLinkProps) {
  return (
    <Link
      to={`/run-sheets/${cycleSlug(htCycleNo)}`}
      className={`group inline-flex items-center gap-1 rounded font-mono text-[12px] font-medium transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 ${
      subtle ?
      'text-ink-500 hover:text-brand-700' :
      'text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-500'}`
      }>
      
      <LinkIcon className="h-3 w-3 shrink-0 opacity-60 transition-opacity duration-150 ease-out group-hover:opacity-100" aria-hidden="true" />
      {htCycleNo}
    </Link>);

}