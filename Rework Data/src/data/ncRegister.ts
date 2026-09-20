import type { NcRegisterSheet } from '../types/forms';

export const ncRegister: NcRegisterSheet = {
  meta: {
    docNo: 'QF-QA-20',
    revNo: '00',
    revDate: '01.08.2021',
    pageNo: '1 OF 1'
  },
  companyName: 'SHITAL VACUUM TREAT PVT LTD.',
  title: 'INHOUSE NON CONFORMANCE (NC) REGISTER',
  rows: [
  {
    srNo: 1,
    date: '29.04.2026',
    customerName: 'VINEEL HITEK TOOLING PVT. LTD.',
    testReport: 'TC/VPT-02/26-04/32',
    process: 'VACUUM HARDENING & TEMPERING',
    stage: 'AFTER PROCESS HARDNESS CHECK',
    ncQty: '1',
    ncDetails:
    'Lower hardness after cycle VPT-02-26/04/32 \u2014 46-47 HRC against required 58-60 HRC. Job Card No. 26XQ667, SP-1031-11 FORM TOOL 2 LOWER LEFT.',
    disposition:
    'Rework \u2014 re-hardening under cycle VPT-02-26/04/72 (Ref. QF-QA-07, Sr No. 1)',
    rootCauseAnalysis:
    'Customer given wrong material grade. Challan received as 1.2379, actual grade 1.2510.',
    correctiveAction:
    'Rework done as per 1.2510 grade parameters. Material grade to be verified against challan before loading.',
    reVerification: '59-60 HRC \u2014 OK (Test Report TC/VPT-02/26-04/72)',
    sign: 'Q.A',
    reworkSrNo: 1
  }],

  blankRows: 14
};