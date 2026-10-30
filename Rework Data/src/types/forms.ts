export interface SheetMeta {
  docNo: string;
  revNo: string;
  revDate: string;
  pageNo: string;
}

export interface ReworkRow {
  srNo: number;
  date: string;
  customerName: string;
  description: string;
  qty: string;
  weight: string;
  jobCardNo: string;
  hardnessRequired: string;
  cycleNo: string;
  reason: string;
  reworkCycleNo: string;
  afterProcessResults: string;
  remark: string;
  /** Sr No of the linked row in the Inhouse NC Register (QF-QA-20) */
  ncRegisterSrNo?: number;
}

export interface ReworkSheet {
  meta: SheetMeta;
  companyName: string;
  title: string;
  subTitle: string;
  month: string;
  rows: ReworkRow[];
  blankRows: number;
  totalReworkQty: string;
  totalReworkWeight: string;
  totalProcessedWeight: string;
  monthlyReworkPercent: string;
  target: string;
  actual: string;
  declaration: string;
  causes: string[];
  correctiveActions: string[];
}

export interface NcRow {
  srNo: number;
  date: string;
  customerName: string;
  testReport: string;
  process: string;
  stage: string;
  ncQty: string;
  ncDetails: string;
  disposition: string;
  rootCauseAnalysis: string;
  correctiveAction: string;
  reVerification: string;
  sign: string;
  /** Sr No of the linked row in the Rework Data sheet (QF-QA-07) */
  reworkSrNo?: number;
}

export interface NcRegisterSheet {
  meta: SheetMeta;
  companyName: string;
  title: string;
  rows: NcRow[];
  blankRows: number;
}