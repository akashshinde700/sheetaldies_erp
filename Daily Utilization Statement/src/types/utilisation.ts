export type LossCode = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';

export type ShiftId = 1 | 2 | 3;

export interface LossCategory {
  code: LossCode;
  label: string;
  short: string;
  sheetLabel: string;
}

export interface Shift {
  id: ShiftId;
  label: string;
}

export interface Furnace {
  id: string;
  name: string;
  sheetName: string;
  shortName: string;
  location: string;
  /** Which daily statement form the furnace is entered on. */
  sheetGroup: 'vpt' | 'seco';
  shiftMinutes: number;
  monthlyAvailableHours: number;
}

/** Minutes logged against every loss code for one furnace, one shift. */
export type LossValues = Record<LossCode, number>;

/** furnaceId -> day of month -> shift -> minutes per loss code */
export type Entries = Record<string, Record<number, Partial<Record<ShiftId, Partial<LossValues>>>>>;

/** furnaceId -> day of month -> shift -> available minutes (overrides the 480 default) */
export type Availability = Record<string, Record<number, Partial<Record<ShiftId, number>>>>;

/** day of month -> shift -> free text remark */
export type Remarks = Record<number, Partial<Record<ShiftId, string>>>;

export interface DaySummary {
  byCode: LossValues;
  byShift: Record<ShiftId, number>;
  availableByShift: Record<ShiftId, number>;
  availableMinutes: number;
  lossMinutes: number;
  usedMinutes: number;
  percentUsed: number;
}

export interface MonthSummary {
  furnace: Furnace;
  minutesByCode: LossValues;
  hoursByCode: LossValues;
  availableHours: number;
  lossHours: number;
  usedHours: number;
  percentUsed: number;
}

export interface PlantSummary {
  furnaces: MonthSummary[];
  availableHours: number;
  lossHours: number;
  usedHours: number;
  percentUsed: number;
}