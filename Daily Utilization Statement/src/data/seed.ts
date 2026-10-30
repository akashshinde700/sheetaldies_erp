import type { Entries, LossCode, LossValues, Remarks, ShiftId } from '../types/utilisation';
import { DAYS_IN_MONTH } from './furnaces';

type DayValues = Record<number, number>;

/** VPT-01 — transcribed from the signed July-2026 idle time sheet (minutes). */
const VPT1_LOADING = [
30, 45, 30, 45, 45, 30, 45, 30, 30, 30, 30, 30, 30, 45, 45, 30, 30, 45, 30, 45, 30, 60, 60, 30, 30,
30, 30, 30, 45, 30, 30];

const VPT1_CYCLE_PREP: DayValues = { 5: 45, 6: 30, 8: 30, 10: 30, 18: 15, 26: 15 };
const VPT1_BREAKDOWN: DayValues = { 6: 275 };

/** VPR-02 Pune */
const VPR2_LOADING = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i === 2 || i === 16 ? 60 : 40);
const VPR2_CYCLE_PREP: DayValues = { 4: 60, 9: 45, 15: 60, 21: 45, 27: 90 };
const VPR2_WAIT_MATERIAL: DayValues = { 12: 15 };
const VPR2_BREAKDOWN: DayValues = { 19: 150, 25: 78 };

/** SECO S'NGR */
const SECO_LOADING = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i === 4 ? 110 : 55);
const SECO_CYCLE_PREP: DayValues = { 2: 300, 7: 240, 11: 360, 16: 305, 20: 300, 28: 300 };
const SECO_CLEANING: DayValues = { 13: 285 };
const SECO_BREAKDOWN: DayValues = { 8: 1100, 14: 900, 22: 1300, 30: 312 };
const SECO_NO_POWER: DayValues = { 23: 216 };
const SECO_NO_MATERIAL: DayValues = { 6: 600, 17: 585, 29: 600 };

/** Small losses land on one shift; long stoppages spill across the following shifts. */
function distribute(total: number, day: number, allInFirstShift: boolean): Record<ShiftId, number> {
  const result: Record<ShiftId, number> = { 1: 0, 2: 0, 3: 0 };
  if (total <= 0) return result;

  if (allInFirstShift || total <= 90) {
    const shift: ShiftId = allInFirstShift ? 1 : day % 3 + 1 as ShiftId;
    result[shift] = total;
    return result;
  }

  let remaining = total;
  for (const shift of [1, 2, 3] as ShiftId[]) {
    const take = Math.min(480, remaining);
    result[shift] = take;
    remaining -= take;
  }
  return result;
}

function addValues(
entries: Entries,
furnaceId: string,
code: LossCode,
values: DayValues | number[],
allInFirstShift: boolean)
{
  const asRecord: DayValues = Array.isArray(values) ?
  values.reduce<DayValues>((acc, value, index) => {
    acc[index + 1] = value;
    return acc;
  }, {}) :
  values;

  Object.entries(asRecord).forEach(([dayKey, total]) => {
    const day = Number(dayKey);
    const perShift = distribute(total, day, allInFirstShift);
    for (const shift of [1, 2, 3] as ShiftId[]) {
      if (!perShift[shift]) continue;
      const furnace = entries[furnaceId] ||= {};
      const dayEntry = furnace[day] ||= {};
      const shiftEntry = dayEntry[shift] ||= {};
      shiftEntry[code] = (shiftEntry[code] || 0) + perShift[shift];
    }
  });
}

export function createSeedEntries(): Entries {
  const entries: Entries = {};

  addValues(entries, 'vpt1', 'a', VPT1_LOADING, true);
  addValues(entries, 'vpt1', 'b', VPT1_CYCLE_PREP, true);
  addValues(entries, 'vpt1', 'e', VPT1_BREAKDOWN, true);

  addValues(entries, 'vpr2', 'a', VPR2_LOADING, false);
  addValues(entries, 'vpr2', 'b', VPR2_CYCLE_PREP, false);
  addValues(entries, 'vpr2', 'c', VPR2_WAIT_MATERIAL, false);
  addValues(entries, 'vpr2', 'e', VPR2_BREAKDOWN, false);

  addValues(entries, 'seco', 'a', SECO_LOADING, false);
  addValues(entries, 'seco', 'b', SECO_CYCLE_PREP, false);
  addValues(entries, 'seco', 'd', SECO_CLEANING, false);
  addValues(entries, 'seco', 'e', SECO_BREAKDOWN, false);
  addValues(entries, 'seco', 'f', SECO_NO_POWER, false);
  addValues(entries, 'seco', 'g', SECO_NO_MATERIAL, false);

  return entries;
}

export function createSeedRemarks(): Remarks {
  return {
    6: { 1: 'VPT-01 heater zone 2 element replaced — 275 min breakdown.' },
    19: { 2: 'VPT-02 vacuum pump seal failure, cycle stopped from 14:20.' }
  };
}

export const EMPTY_LOSSES: LossValues = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0 };