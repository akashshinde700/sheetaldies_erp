import type { ReworkSheet } from '../types/forms';

export const reworkSheet: ReworkSheet = {
  meta: {
    docNo: 'QF-QA-07',
    revNo: '0',
    revDate: '01.04.2019',
    pageNo: '1 OF 1'
  },
  companyName: 'SHITAL VACUUM TREAT PVT LTD',
  title: 'TITLE:- REWORK DATA',
  subTitle: 'REWORK AND REJECTION DATA FOR THE MONTH OF :-',
  month: 'APRIL 2026',
  rows: [
  {
    srNo: 1,
    date: '29.04.2026',
    customerName: 'VINEEL HITEK TOOLING PVT. LTD.',
    description:
    'SP-1031-11 FORM TOOL 2 LOWER LEFT \u00d833.5 X 131.50 X 50.0 X 10.0',
    qty: '1',
    weight: '1.5',
    jobCardNo: '26XQ667',
    hardnessRequired: '58-60 HRC',
    cycleNo: 'VPT-02-26/04/32',
    reason: 'LOWER HRC AFTER VPT-02 46-47 HRC',
    reworkCycleNo: 'VPT-02-26/04/72',
    afterProcessResults: '59-60 HRC',
    remark: 'Ok',
    ncRegisterSrNo: 1
  }],

  blankRows: 13,
  totalReworkQty: '1',
  totalReworkWeight: '1.5',
  totalProcessedWeight: '88495.33',
  monthlyReworkPercent: '0.002',
  target: '1.00%',
  actual: 'Act',
  declaration:
  'DECLERATION:- Corrective action of in house N.C to initiate when rejection is above KPI target (monthly basis)',
  causes: [
  'Customer given wrong material grade for VHT process. As per recived challan 1.2379 and for rework given 1.2510 steel grade.',
  '',
  '',
  ''],

  correctiveActions: [
  'Rework process done as per 1.2510 grade and result found ok',
  '',
  '',
  '']

};