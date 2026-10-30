import React from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarDaysIcon, FlameIcon, GaugeIcon, LayersIcon, ZapIcon } from 'lucide-react';
import { PLAN_DATE } from '../data/cycles';

const NAV = [
{ to: '/', label: 'Daily Production Planning', doc: 'QF/PD/03 · Page 1', icon: CalendarDaysIcon, end: true },
{ to: '/tempering', label: 'Tempering Furnace Planning', doc: 'QF/PD/03 · Page 2', icon: FlameIcon, end: false },
{ to: '/run-sheets', label: 'VHT Run Sheets', doc: 'QF/PD/02 · Rev 01', icon: LayersIcon, end: false },
{ to: '/energy', label: 'Energy Consumption', doc: 'Meter log by cycle', icon: ZapIcon, end: false }];


export function AppShell({ children }: {children: React.ReactNode;}) {
  return (
    <div className="flex min-h-full w-full bg-ink-50 print:block print:bg-white">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-ink-200 bg-white lg:flex print:!hidden">
        <div className="flex items-center gap-3 border-b border-ink-200 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-600 font-mono text-sm font-bold text-white">
            SVT
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">Shital Vacuum Treat</p>
            <p className="text-[11px] uppercase tracking-wide text-ink-400">Pvt. Ltd.</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4" aria-label="Sheets">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Linked sheets</p>
          <ul className="space-y-1">
            {NAV.map((item) =>
            <li key={item.to}>
                <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                `flex items-start gap-3 rounded-md px-2.5 py-2 transition-colors duration-150 ease-out ${
                isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'}`

                }>
                
                  {({ isActive }) =>
                <>
                      <item.icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? 'text-brand-600' : 'text-ink-400'}`}
                    aria-hidden="true" />
                  
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium leading-tight">{item.label}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-ink-400">{item.doc}</span>
                      </span>
                    </>
                }
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        <div className="border-t border-ink-200 px-5 py-4">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            <GaugeIcon className="h-3.5 w-3.5" aria-hidden="true" /> Common key
          </p>
          <p className="mt-1.5 font-mono text-xs text-ink-800">HT CYCLE NO</p>
          <p className="mt-1 text-[11px] leading-snug text-ink-500">
            Every sheet on this list is joined on this one number.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 bg-white/95 px-5 py-3 backdrop-blur lg:px-8 print:hidden">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 font-mono text-xs font-bold text-white">
              SVT
            </span>
            <span className="text-sm font-semibold text-ink-900">Shital Vacuum Treat</span>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-ink-400">Plan date</p>
              <p className="font-mono text-sm font-semibold text-ink-900">{PLAN_DATE}</p>
            </div>
            <div className="hidden h-8 w-px bg-ink-200 sm:block" />
            <div className="hidden sm:block">
              <p className="text-[11px] uppercase tracking-wider text-ink-400">Shift in charge</p>
              <p className="text-sm font-medium text-ink-800">RTS · UDD</p>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto lg:hidden" aria-label="Sheets">
            {NAV.map((item) =>
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
              `whitespace-nowrap rounded px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ease-out ${
              isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-500 hover:bg-ink-50'}`

              }>
              
                {item.label.split(' ')[0]}
              </NavLink>
            )}
          </nav>
        </header>

        <main className="min-w-0 flex-1 px-5 py-6 lg:px-8 lg:py-8 print:p-0">{children}</main>
      </div>
    </div>);

}