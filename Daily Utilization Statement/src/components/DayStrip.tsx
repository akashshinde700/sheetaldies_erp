import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { FURNACES } from '../data/furnaces';
import { useUtilisation } from '../contexts/UtilisationContext';
import { getDayLosses, sumLosses } from '../utils/utilisation';

export function DayStrip() {
  const { entries, daysInMonth, selectedDay, setSelectedDay, monthLabel } = useUtilisation();

  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
        disabled={selectedDay === 1}
        className="flex h-8 w-8 items-center justify-center rounded border border-line bg-white text-ink-muted transition-colors duration-150 ease-out hover:border-line-strong hover:text-ink disabled:opacity-40"
        aria-label="Previous day">
        
        <ChevronLeftIcon className="h-4 w-4" />
      </button>

      <div
        className="flex flex-1 items-center gap-1 overflow-x-auto pb-1"
        role="tablist"
        aria-label={`Days of ${monthLabel}`}>
        
        {days.map((day) => {
          const logged = FURNACES.some((furnace) => sumLosses(getDayLosses(entries, furnace.id, day)) > 0);
          const isActive = day === selectedDay;
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedDay(day)}
              className={`relative h-9 w-9 shrink-0 rounded border font-mono text-sm tabular-nums transition-colors duration-150 ease-out ${
              isActive ?
              'border-accent bg-accent text-white' :
              'border-line bg-white text-ink-muted hover:border-line-strong hover:text-ink'}`
              }>
              
              {day}
              {logged && !isActive ?
              <span
                aria-hidden="true"
                className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" /> :

              null}
            </button>);

        })}
      </div>

      <button
        type="button"
        onClick={() => setSelectedDay(Math.min(daysInMonth, selectedDay + 1))}
        disabled={selectedDay === daysInMonth}
        className="flex h-8 w-8 items-center justify-center rounded border border-line bg-white text-ink-muted transition-colors duration-150 ease-out hover:border-line-strong hover:text-ink disabled:opacity-40"
        aria-label="Next day">
        
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>);

}