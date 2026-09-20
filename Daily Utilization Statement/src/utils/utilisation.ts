import { FURNACES, LOSS_CODES, SHIFTS } from '../data/furnaces';
import type {
  Availability,
  DaySummary,
  Entries,
  Furnace,
  LossCode,
  LossValues,
  MonthSummary,
  PlantSummary,
  ShiftId } from
'../types/utilisation';

export function emptyLosses(): LossValues {
  return { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0 };
}

export function getCell(
entries: Entries,
furnaceId: string,
day: number,
shift: ShiftId,
code: LossCode)
: number {
  return entries[furnaceId]?.[day]?.[shift]?.[code] ?? 0;
}

export function getAvailableMinutes(
availability: Availability,
furnace: Furnace,
day: number,
shift: ShiftId)
: number {
  return availability[furnace.id]?.[day]?.[shift] ?? furnace.shiftMinutes;
}

export function getShiftLosses(
entries: Entries,
furnaceId: string,
day: number,
shift: ShiftId)
: LossValues {
  const values = emptyLosses();
  LOSS_CODES.forEach((code) => {
    values[code] = getCell(entries, furnaceId, day, shift, code);
  });
  return values;
}

export function sumLosses(values: LossValues): number {
  return LOSS_CODES.reduce((total, code) => total + values[code], 0);
}

/** All shifts of one day for one furnace, collapsed to a single row of loss codes. */
export function getDayLosses(entries: Entries, furnaceId: string, day: number): LossValues {
  const values = emptyLosses();
  SHIFTS.forEach((shift) => {
    LOSS_CODES.forEach((code) => {
      values[code] += getCell(entries, furnaceId, day, shift.id, code);
    });
  });
  return values;
}

export function daySummary(
entries: Entries,
furnace: Furnace,
day: number,
availability: Availability = {})
: DaySummary {
  const byCode = emptyLosses();
  const byShift: Record<ShiftId, number> = { 1: 0, 2: 0, 3: 0 };
  const availableByShift: Record<ShiftId, number> = { 1: 0, 2: 0, 3: 0 };

  SHIFTS.forEach((shift) => {
    const values = getShiftLosses(entries, furnace.id, day, shift.id);
    availableByShift[shift.id] = getAvailableMinutes(availability, furnace, day, shift.id);
    LOSS_CODES.forEach((code) => {
      byCode[code] += values[code];
      byShift[shift.id] += values[code];
    });
  });

  const availableMinutes = SHIFTS.reduce((total, shift) => total + availableByShift[shift.id], 0);
  const lossMinutes = sumLosses(byCode);
  const usedMinutes = Math.max(0, availableMinutes - lossMinutes);

  return {
    byCode,
    byShift,
    availableByShift,
    availableMinutes,
    lossMinutes,
    usedMinutes,
    percentUsed: availableMinutes ? usedMinutes / availableMinutes * 100 : 0
  };
}

export function monthSummary(
entries: Entries,
furnace: Furnace,
daysInMonth: number,
availableHoursOverride?: number)
: MonthSummary {
  const minutesByCode = emptyLosses();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayValues = getDayLosses(entries, furnace.id, day);
    LOSS_CODES.forEach((code) => {
      minutesByCode[code] += dayValues[code];
    });
  }

  const hoursByCode = emptyLosses();
  LOSS_CODES.forEach((code) => {
    hoursByCode[code] = minutesByCode[code] / 60;
  });

  const lossHours = sumLosses(hoursByCode);
  const availableHours = availableHoursOverride ?? furnace.monthlyAvailableHours;
  const usedHours = Math.max(0, availableHours - lossHours);

  return {
    furnace,
    minutesByCode,
    hoursByCode,
    availableHours,
    lossHours,
    usedHours,
    percentUsed: availableHours ? usedHours / availableHours * 100 : 0
  };
}

/** Available time is a planning figure: working days × 24 hrs per furnace. */
export function availableHoursFor(workingDays: number): number {
  return workingDays * 24;
}

export function plantSummary(
entries: Entries,
daysInMonth: number,
availableHoursPerFurnace?: number)
: PlantSummary {
  const summaries = FURNACES.map((furnace) =>
  monthSummary(entries, furnace, daysInMonth, availableHoursPerFurnace)
  );
  const availableHours = summaries.reduce((total, item) => total + item.availableHours, 0);
  const lossHours = summaries.reduce((total, item) => total + item.lossHours, 0);
  const usedHours = summaries.reduce((total, item) => total + item.usedHours, 0);

  return {
    furnaces: summaries,
    availableHours,
    lossHours,
    usedHours,
    percentUsed: availableHours ? usedHours / availableHours * 100 : 0
  };
}

export function fmt(value: number, digits = 2): string {
  return value.toFixed(digits);
}

export function fmtOrDash(value: number, digits = 2): string {
  return value > 0 ? value.toFixed(digits) : '—';
}

export function minutesToHours(minutes: number): number {
  return minutes / 60;
}

export function utilisationTone(percent: number): 'ok' | 'warn' | 'danger' {
  if (percent >= 90) return 'ok';
  if (percent >= 75) return 'warn';
  return 'danger';
}

/** 6 -> "06/07/2026" for the DATE field on the daily sheet. */
export function sheetDate(day: number, month: string): string {
  const [year, monthNumber] = month.split('-');
  return `${String(day).padStart(2, '0')}/${monthNumber}/${year}`;
}