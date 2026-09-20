import * as XLSX from 'xlsx';
import { PLAN_DATE, cycles } from '../data/cycles';
import { temperingFurnaces, temperingSlots } from '../data/tempering';
import { energyEntries } from '../data/energy';
import { energyFor, hhmm, loadTotals, temperingFor } from './traceability';

function fileDate(): string {
  return PLAN_DATE.replace(/\./g, '-');
}

function download(workbook: XLSX.WorkBook, fileName: string): void {
  XLSX.writeFile(workbook, fileName);
}

/** Tempering Furnace Planning — one row per slot, plus the linked HT Cycle No. */
export function exportTemperingPlan(): void {
  const rows = temperingFurnaces.flatMap((furnace) =>
  temperingSlots.
  filter((s) => s.furnace === furnace).
  map((s) => ({
    'FURNACE': s.furnace,
    'S.NO': s.srNo,
    'PROCESS': s.process,
    'START': hhmm(s.startTime),
    'END': hhmm(s.endTime),
    'BATCH': s.batch,
    'HT CYCLE NO': s.htCycleNos.join(', ') || 'NOT LINKED',
    'SOURCE FURNACE': s.htCycleNos.
    map((no) => cycles.find((c) => c.htCycleNo === no)?.furnace ?? '').
    filter(Boolean).
    join(', '),
    'LINKED': s.htCycleNos.length > 0 ? 'YES' : 'NO'
  }))
  );

  const sheet = XLSX.utils.json_to_sheet(rows, { origin: 'A4' });
  XLSX.utils.sheet_add_aoa(
    sheet,
    [['SHITAL VACUUM TREAT PVT. LTD.'], ['TEMPERING FURNACE PLANING', '', '', '', 'DATE', PLAN_DATE], []],
    { origin: 'A1' }
  );
  sheet['!cols'] = [
  { wch: 10 },
  { wch: 6 },
  { wch: 46 },
  { wch: 8 },
  { wch: 8 },
  { wch: 30 },
  { wch: 34 },
  { wch: 16 },
  { wch: 9 }];


  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Tempering Plan');
  download(wb, `Tempering-Furnace-Planning-${fileDate()}.xlsx`);
}

/** Daily Production Planning — one row per hardening cycle with its downstream links. */
export function exportDailyPlanning(): void {
  const rows = cycles.map((c) => {
    const totals = loadTotals(c);
    const energy = energyFor(c.htCycleNo);
    return {
      'FURNACE': c.furnace,
      'SR NO': c.srNo,
      'HT CYCLE NO': c.htCycleNo,
      'FURNACE CYCLE NO': c.furnaceCycleNo,
      'CUSTOMERS': c.items.map((i) => `${i.customer}-${i.jobCard}`).join(', '),
      'JOB CARDS': c.items.length,
      'QTY (NOS)': totals.qty,
      'WEIGHT (KG)': totals.wt,
      'PROCESS': c.process,
      'PARAMETERS': c.temperature,
      'QUENCHING': c.quench,
      'START': hhmm(c.startTime),
      'END': hhmm(c.endTime),
      'HOLD': c.hold,
      'STATUS': c.status.toUpperCase(),
      'TEMPERING SLOTS': temperingFor(c.htCycleNo).
      map((s) => `${s.furnace}#${s.srNo}`).
      join(', '),
      'ENERGY (KW)': energy && energy.consumption > 0 ? energy.consumption : ''
    };
  });

  const sheet = XLSX.utils.json_to_sheet(rows, { origin: 'A4' });
  XLSX.utils.sheet_add_aoa(
    sheet,
    [['SHITAL VACUUM TREAT PVT. LTD.'], ['DAILY PRODUCTION PLANNING', '', '', 'DATE', PLAN_DATE], []],
    { origin: 'A1' }
  );
  sheet['!cols'] = [
  { wch: 10 },
  { wch: 7 },
  { wch: 18 },
  { wch: 18 },
  { wch: 60 },
  { wch: 10 },
  { wch: 11 },
  { wch: 12 },
  { wch: 12 },
  { wch: 18 },
  { wch: 18 },
  { wch: 8 },
  { wch: 8 },
  { wch: 20 },
  { wch: 12 },
  { wch: 20 },
  { wch: 12 }];


  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Daily Planning');
  download(wb, `Daily-Production-Planning-${fileDate()}.xlsx`);
}

/** Energy consumption register for one month, with the HT Cycle No each reading belongs to. */
export function exportEnergyLog(month: string): void {
  const rows = energyEntries.
  filter((e) => e.month === month).
  map((e) => ({
    'FURNACE': e.furnace,
    'SR NO': e.srNo,
    'FURNACE CYCLE NO': e.furnaceCycleNo,
    'HT CYCLE NO': e.htCycleNo ?? '',
    'CYCLE WEIGHT (KG)': e.cycleWeight ?? 'DESING',
    'START METER READING': e.startMeter || '',
    'END METER READING': e.endMeter || '',
    'TOTAL CONSUMPTION (KW)': e.consumption || '',
    'KW PER KG': e.consumption > 0 && e.cycleWeight ? Number((e.consumption / e.cycleWeight).toFixed(2)) : ''
  }));

  const sheet = XLSX.utils.json_to_sheet(rows, { origin: 'A4' });
  XLSX.utils.sheet_add_aoa(
    sheet,
    [['SHITAL VACUUM TREAT PVT. LTD.'], [`ENERGY CONSUMPTION - ${month}`], []],
    { origin: 'A1' }
  );
  sheet['!cols'] = [
  { wch: 10 },
  { wch: 7 },
  { wch: 20 },
  { wch: 18 },
  { wch: 18 },
  { wch: 20 },
  { wch: 20 },
  { wch: 22 },
  { wch: 11 }];


  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, month);
  download(wb, `Energy-Consumption-${month}.xlsx`);
}