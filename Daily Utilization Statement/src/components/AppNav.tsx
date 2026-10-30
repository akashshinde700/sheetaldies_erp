import React from 'react';
import { NavLink } from 'react-router-dom';
import { useUtilisation } from '../contexts/UtilisationContext';

const LINKS = [
{ to: '/', label: 'Daily Statement' },
{ to: '/monthly', label: 'Idle Time Sheet' },
{ to: '/losses', label: 'Plant Losses' },
{ to: '/print', label: 'Print Pack' }];


export function AppNav() {
  const { monthLabel } = useUtilisation();

  return (
    <header className="no-print w-full border-b border-line bg-white">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-6 px-6 py-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center bg-[#8c1d4a] font-serif text-[11px] font-bold italic text-white"
            style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}>
            
            SVT
          </span>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold text-ink">Shital Vacuum Treat Pvt Ltd</h1>
            <p className="text-xs text-ink-muted">VHF &amp; VPT utilisation register</p>
          </div>
        </div>

        <nav aria-label="Sections" className="ml-4 flex items-center gap-1">
          {LINKS.map((link) =>
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
            `rounded px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-out ${
            isActive ?
            'bg-surface-accent text-accent' :
            'text-ink-muted hover:bg-surface-sunken hover:text-ink'}`

            }>
            
              {link.label}
            </NavLink>
          )}
        </nav>

        <span className="ml-auto rounded border border-line bg-surface-sunken px-2.5 py-1 font-mono text-xs font-medium text-ink-muted">
          {monthLabel}
        </span>
      </div>
    </header>);

}