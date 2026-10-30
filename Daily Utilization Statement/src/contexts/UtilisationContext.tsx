import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DAYS_IN_MONTH, MONTH_ID, MONTH_LABEL } from '../data/furnaces';
import { createSeedEntries, createSeedRemarks } from '../data/seed';
import { availableHoursFor } from '../utils/utilisation';
import type { Availability, Entries, LossCode, Remarks, ShiftId } from '../types/utilisation';

interface UtilisationContextValue {
  month: string;
  monthLabel: string;
  daysInMonth: number;
  entries: Entries;
  availability: Availability;
  remarks: Remarks;
  /** Planned working days in the month — available time is workingDays × 24 hrs per furnace. */
  workingDays: number;
  setWorkingDays: (days: number) => void;
  availableHoursPerFurnace: number;
  selectedDay: number;
  setSelectedDay: (day: number) => void;
  setCell: (
  furnaceId: string,
  day: number,
  shift: ShiftId,
  code: LossCode,
  minutes: number)
  => void;
  setAvailable: (furnaceId: string, day: number, shift: ShiftId, minutes: number) => void;
  setRemark: (day: number, shift: ShiftId, text: string) => void;
  clearShift: (furnaceId: string, day: number, shift: ShiftId) => void;
}

const UtilisationContext = createContext<UtilisationContextValue | null>(null);

export function UtilisationProvider({ children }: {children: React.ReactNode;}) {
  const [entries, setEntries] = useState<Entries>(() => createSeedEntries());
  const [availability, setAvailability] = useState<Availability>({});
  const [remarks, setRemarks] = useState<Remarks>(() => createSeedRemarks());
  const [workingDays, setWorkingDays] = useState(25);
  const [selectedDay, setSelectedDay] = useState(6);

  const setCell = useCallback(
    (furnaceId: string, day: number, shift: ShiftId, code: LossCode, minutes: number) => {
      setEntries((current) => {
        const furnace = current[furnaceId] ?? {};
        const dayEntry = furnace[day] ?? {};
        const shiftEntry = { ...(dayEntry[shift] ?? {}) };

        if (minutes > 0) shiftEntry[code] = minutes;else
        delete shiftEntry[code];

        return {
          ...current,
          [furnaceId]: {
            ...furnace,
            [day]: { ...dayEntry, [shift]: shiftEntry }
          }
        };
      });
    },
    []
  );

  const setAvailable = useCallback(
    (furnaceId: string, day: number, shift: ShiftId, minutes: number) => {
      setAvailability((current) => {
        const furnace = current[furnaceId] ?? {};
        const dayEntry = furnace[day] ?? {};
        return {
          ...current,
          [furnaceId]: {
            ...furnace,
            [day]: { ...dayEntry, [shift]: minutes }
          }
        };
      });
    },
    []
  );

  const clearShift = useCallback((furnaceId: string, day: number, shift: ShiftId) => {
    setEntries((current) => {
      const furnace = current[furnaceId] ?? {};
      const dayEntry = furnace[day] ?? {};
      return {
        ...current,
        [furnaceId]: {
          ...furnace,
          [day]: { ...dayEntry, [shift]: {} }
        }
      };
    });
  }, []);

  const setRemark = useCallback((day: number, shift: ShiftId, text: string) => {
    setRemarks((current) => ({
      ...current,
      [day]: { ...(current[day] ?? {}), [shift]: text }
    }));
  }, []);

  const value = useMemo<UtilisationContextValue>(
    () => ({
      month: MONTH_ID,
      monthLabel: MONTH_LABEL,
      daysInMonth: DAYS_IN_MONTH,
      entries,
      availability,
      remarks,
      workingDays,
      setWorkingDays,
      availableHoursPerFurnace: availableHoursFor(workingDays),
      selectedDay,
      setSelectedDay,
      setCell,
      setAvailable,
      setRemark,
      clearShift
    }),
    [
    entries,
    availability,
    remarks,
    workingDays,
    selectedDay,
    setCell,
    setAvailable,
    setRemark,
    clearShift]

  );

  return <UtilisationContext.Provider value={value}>{children}</UtilisationContext.Provider>;
}

export function useUtilisation(): UtilisationContextValue {
  const context = useContext(UtilisationContext);
  if (!context) {
    throw new Error('useUtilisation must be used inside a UtilisationProvider');
  }
  return context;
}