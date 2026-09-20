export type Furnace = 'VPT-01' | 'VPT-02';

export type CycleStatus = 'planned' | 'running' | 'tempering' | 'completed';

export interface LoadItem {
  customer: string;
  jobCard: string;
  description: string;
  mtrl: string;
  hrc: string;
  qty: number;
  wt: number;
}

export interface RunSheet {
  cycleStartTime: string;
  cycleEndTime: string;
  totalTime: string;
  mrStart: string;
  mrEnd: string;
  totalMr: string;
  loadingOperator: string;
  supervisor: string;
  hardeningType: string;
  quenchPressure: string;
  fanSpeed: string;
  gasPressure: string;
  waterCirculation: string;
  powerFailureFrom: string;
  powerFailureTo: string;
  remark: string;
  verified: boolean;
}

/** The HT Cycle No is the primary key that every other sheet points back to. */
export interface HeatCycle {
  htCycleNo: string;
  furnaceCycleNo: string;
  furnace: Furnace;
  srNo: number;
  date: string;
  process: string;
  temperature: string;
  quench: string;
  startTime: string;
  endTime: string;
  hold: string;
  status: CycleStatus;
  items: LoadItem[];
  runSheet: RunSheet;
}

export interface TemperingSlot {
  id: string;
  furnace: string;
  srNo: number;
  process: string;
  startTime: string;
  endTime: string;
  batch: string;
  htCycleNos: string[];
}

export interface EnergyEntry {
  srNo: number;
  month: string;
  furnace: Furnace;
  furnaceCycleNo: string;
  cycleWeight: number | null;
  startMeter: number;
  endMeter: number;
  consumption: number;
  htCycleNo: string | null;
}