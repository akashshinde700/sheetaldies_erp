import type { Furnace, LossCategory, LossCode, Shift } from '../types/utilisation';

export const LOSS_CODES: LossCode[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

export const LOSS_CATEGORIES: LossCategory[] = [
{
  code: 'a',
  label: 'Loading / Unloading',
  short: 'Load / Unload',
  sheetLabel: 'Loading Unloading Time in mints.'
},
{
  code: 'b',
  label: 'Cycle Prepration',
  short: 'Cycle prep.',
  sheetLabel: 'Waiting For Cycle Prepration'
},
{
  code: 'c',
  label: 'Waiting for Material',
  short: 'Wait material',
  sheetLabel: 'Waiting for material'
},
{
  code: 'd',
  label: 'Prev. Maintenance',
  short: 'Cleaning',
  sheetLabel: 'Cleaning of furnace'
},
{
  code: 'e',
  label: 'Break down Maint.',
  short: 'B.down maint.',
  sheetLabel: 'B.down Maint.'
},
{ code: 'f', label: 'No Power', short: 'No power', sheetLabel: 'No Power' },
{ code: 'g', label: 'No Material', short: 'No material', sheetLabel: 'No Material' }];


export const SHIFTS: Shift[] = [
{ id: 1, label: '1st Shift' },
{ id: 2, label: '2nd Shift' },
{ id: 3, label: '3rd Shift' }];


export const FURNACES: Furnace[] = [
{
  id: 'vpt1',
  name: 'VPT-01 Hardening Furnace',
  sheetName: 'VPT1 HARDENING FURNACE',
  shortName: 'VPT 1',
  location: 'Shed A',
  sheetGroup: 'vpt',
  shiftMinutes: 480,
  monthlyAvailableHours: 600
},
{
  id: 'vpr2',
  name: 'VPR-02 Pune Hardening Furnace',
  sheetName: 'VPR2 PUNE HARDENING FURNACE',
  shortName: 'VPT 2',
  location: 'Pune',
  sheetGroup: 'vpt',
  shiftMinutes: 480,
  monthlyAvailableHours: 600
},
{
  id: 'seco',
  name: "SECO S'NGR Hardening Furnace",
  sheetName: "SECO S'NGR HARDENING FURNACE",
  shortName: "SECO S'NGR",
  location: 'Sanand',
  sheetGroup: 'seco',
  shiftMinutes: 480,
  monthlyAvailableHours: 600
}];


/** The daily statement is printed as one form per group, exactly like the paper register. */
export const DAILY_SHEET_GROUPS = [
{
  id: 'vpt',
  title: 'VHF & VPT DAILY UTILISATION STATEMENT',
  furnaces: FURNACES.filter((furnace) => furnace.sheetGroup === 'vpt')
}];


/** Furnaces that are logged on the daily statement form. */
export const DAILY_FURNACES = DAILY_SHEET_GROUPS.flatMap((group) => group.furnaces);

export const MONTH_ID = '2026-07';
export const MONTH_LABEL = 'JULY-2026';
export const DAYS_IN_MONTH = 31;