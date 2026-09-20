import type { TemperingSlot } from '../types/production';

export const temperingFurnaces = ['TFR-01', 'TFR-02', 'TFR-03', 'VTF', 'TF-02'];

export const temperingSlots: TemperingSlot[] = [
{ id: 'TFR-01-1', furnace: 'TFR-01', srNo: 1, process: 'VPT-02 1ST TEMP - 540°C/270MIN', startTime: '16.30', endTime: '0.00', batch: 'SHIRODKAR + D2', htCycleNos: ['VHT/2026/00005'] },
{ id: 'TFR-01-2', furnace: 'TFR-01', srNo: 2, process: 'D2 DROPPING - 540°C/300MIN', startTime: '0.30', endTime: '7.00', batch: 'SHEETAL + D2', htCycleNos: ['VHT/2026/00001'] },
{ id: 'TFR-01-3', furnace: 'TFR-01', srNo: 3, process: 'VPT-02 1ST TEMP - 540°C/270MIN', startTime: '7.30', endTime: '14.30', batch: 'SHIRODKAR + D2', htCycleNos: ['VHT/2026/00005'] },
{ id: 'TFR-01-4', furnace: 'TFR-01', srNo: 4, process: 'VPT-02 1ST TEMP - 200°C/240MIN', startTime: '14.30', endTime: '20.00', batch: 'CUTTING RING', htCycleNos: ['VHT/2026/00006'] },

{ id: 'TFR-02-1', furnace: 'TFR-02', srNo: 1, process: 'HDS 2ND TEMP DROPPING - 595°C/300MIN', startTime: '11.30', endTime: '17.30', batch: 'SIMMONDS + SIGMA', htCycleNos: [] },
{ id: 'TFR-02-2', furnace: 'TFR-02', srNo: 2, process: 'S.R + DROPPING', startTime: '18.00', endTime: '0.00', batch: 'SAIRAJ + HDS', htCycleNos: ['VHT/2026/00008'] },
{ id: 'TFR-02-3', furnace: 'TFR-02', srNo: 3, process: 'VPT-02 1ST TEMP - 200°C/240MIN', startTime: '0.30', endTime: '5.30', batch: 'HOERBIGER + POOJA', htCycleNos: ['VHT/2026/00004'] },
{ id: 'TFR-02-4', furnace: 'TFR-02', srNo: 4, process: 'S7 2ND TEMP - 540°C/270MIN', startTime: '6.00', endTime: '13.00', batch: 'SHIRODKAR + D2', htCycleNos: ['VHT/2026/00005'] },

{ id: 'TFR-03-1', furnace: 'TFR-03', srNo: 1, process: 'VPT-02 1ST + HDS 3RD TEMP - 560°C/300MIN', startTime: '14.30', endTime: '23.30', batch: 'SUTLEJ + HDS', htCycleNos: [] },
{ id: 'TFR-03-2', furnace: 'TFR-03', srNo: 2, process: 'VPT-01 1ST TEMP + D2 2ND TEMP - 500°C/300MIN', startTime: '1.30', endTime: '8.00', batch: 'PRAGATI + VPT-02 D2', htCycleNos: ['VHT/2026/00001', 'VHT/2026/00005'] },
{ id: 'TFR-03-3', furnace: 'TFR-03', srNo: 3, process: 'HOERBIGER 2ND - 200°C/240MIN', startTime: '8.30', endTime: '12.30', batch: 'HOERBIGER + POOJA', htCycleNos: ['VHT/2026/00004'] },
{ id: 'TFR-03-4', furnace: 'TFR-03', srNo: 4, process: 'VPT-01 1ST TEMP - 500°C/240MIN', startTime: '12.30', endTime: '18.30', batch: 'TABLET + D2', htCycleNos: ['VHT/2026/00007'] },

{ id: 'VTF-1', furnace: 'VTF', srNo: 1, process: 'VPT-02 1ST TEMP - 500°C/300MIN', startTime: '10.30', endTime: '17.30', batch: 'SHEETAL + D2', htCycleNos: ['VHT/2026/00003'] },
{ id: 'VTF-2', furnace: 'VTF', srNo: 2, process: 'HDS 3RD TEMP DROPPING', startTime: '19.30', endTime: '1.30', batch: 'HDS CARRY FORWARD', htCycleNos: [] },
{ id: 'VTF-3', furnace: 'VTF', srNo: 3, process: 'HDS 2ND TEMP DROPPING - 595°C/300MIN', startTime: '2.00', endTime: '9.00', batch: 'SIGMA + HDS (46/48-48/50)', htCycleNos: [] },
{ id: 'VTF-4', furnace: 'VTF', srNo: 4, process: 'D2 DROPPING', startTime: '10.30', endTime: '16.30', batch: 'D2 DROPPING', htCycleNos: ['VHT/2026/00002'] },

{ id: 'TF-02-1', furnace: 'TF-02', srNo: 1, process: 'HDS 2ND DROPPING - 590°C/240MIN', startTime: '16.30', endTime: '22.30', batch: 'S.K + HDS', htCycleNos: [] },
{ id: 'TF-02-2', furnace: 'TF-02', srNo: 2, process: 'VPT-02 1ST TEMP - 560°C/300MIN', startTime: '0.30', endTime: '6.30', batch: 'VML + HDS + VN 2ND TEMP', htCycleNos: ['VHT/2026/00004'] },
{ id: 'TF-02-3', furnace: 'TF-02', srNo: 3, process: 'D2 DROPPING - 535°C/240MIN', startTime: '7.00', endTime: '12.00', batch: '56/58 HRC', htCycleNos: ['VHT/2026/00002'] },
{ id: 'TF-02-4', furnace: 'TF-02', srNo: 4, process: 'VPT-01 1ST TEMP - 200°C/240MIN', startTime: '12.30', endTime: '18.00', batch: 'ADVA + D2', htCycleNos: ['VHT/2026/00003'] }];