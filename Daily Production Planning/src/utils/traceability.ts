import { cycles } from '../data/cycles';
import { temperingSlots } from '../data/tempering';
import { energyEntries } from '../data/energy';
import type { EnergyEntry, HeatCycle, TemperingSlot } from '../types/production';

export function getCycle(htCycleNo: string): HeatCycle | undefined {
  return cycles.find((c) => c.htCycleNo === htCycleNo);
}

export function cycleSlug(htCycleNo: string): string {
  return htCycleNo.replace(/\//g, '-');
}

export function cycleFromSlug(slug: string): HeatCycle | undefined {
  return cycles.find((c) => cycleSlug(c.htCycleNo) === slug);
}

export function temperingFor(htCycleNo: string): TemperingSlot[] {
  return temperingSlots.filter((s) => s.htCycleNos.includes(htCycleNo));
}

export function energyFor(htCycleNo: string): EnergyEntry | undefined {
  return energyEntries.find((e) => e.htCycleNo === htCycleNo);
}

export function cyclesForFurnace(furnace: string): HeatCycle[] {
  return cycles.filter((c) => c.furnace === furnace);
}

export function loadTotals(cycle: HeatCycle): {qty: number;wt: number;} {
  return cycle.items.reduce(
    (acc, i) => ({ qty: acc.qty + i.qty, wt: Math.round((acc.wt + i.wt) * 100) / 100 }),
    { qty: 0, wt: 0 }
  );
}

export function hhmm(t: string): string {
  if (!t || t === '-') return '—';
  return t.replace('.', ':').padStart(5, '0');
}

export function fmtNum(n: number): string {
  return n.toLocaleString('en-IN');
}