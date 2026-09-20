import type { EnergyEntry } from '../types/production';

export const energyMonths = ['SEP-2026', 'APR-2026'];

/**
 * Every reading is keyed by the FURNACE CYCLE NO, which maps 1:1 to an
 * HT Cycle No once the run sheet for that cycle is closed out.
 */
export const energyEntries: EnergyEntry[] = [
// ---- SEP-2026 (current month, linked to today's plan) ----
{ srNo: 1, month: 'SEP-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/09/01', cycleWeight: 294.1, startMeter: 3790120, endMeter: 3790670, consumption: 550, htCycleNo: 'VHT/2026/00001' },
{ srNo: 2, month: 'SEP-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/09/02', cycleWeight: 213.5, startMeter: 3790670, endMeter: 0, consumption: 0, htCycleNo: 'VHT/2026/00002' },
{ srNo: 3, month: 'SEP-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/09/03', cycleWeight: 346.4, startMeter: 0, endMeter: 0, consumption: 0, htCycleNo: 'VHT/2026/00003' },
{ srNo: 1, month: 'SEP-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/09/01', cycleWeight: 316.7, startMeter: 118200, endMeter: 118728, consumption: 528, htCycleNo: 'VHT/2026/00004' },
{ srNo: 2, month: 'SEP-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/09/02', cycleWeight: 89.5, startMeter: 118728, endMeter: 119260, consumption: 532, htCycleNo: 'VHT/2026/00005' },
{ srNo: 3, month: 'SEP-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/09/03', cycleWeight: 74.5, startMeter: 119260, endMeter: 0, consumption: 0, htCycleNo: 'VHT/2026/00006' },
{ srNo: 4, month: 'SEP-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/09/04', cycleWeight: 38.9, startMeter: 0, endMeter: 0, consumption: 0, htCycleNo: 'VHT/2026/00007' },
{ srNo: 5, month: 'SEP-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/09/05', cycleWeight: 144.1, startMeter: 0, endMeter: 0, consumption: 0, htCycleNo: 'VHT/2026/00008' },

// ---- APR-2026 (closed month) ----
{ srNo: 1, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/01', cycleWeight: 476.1, startMeter: 3758710, endMeter: 3759260, consumption: 550, htCycleNo: null },
{ srNo: 2, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/02', cycleWeight: 271, startMeter: 3759260, endMeter: 3759521, consumption: 260, htCycleNo: null },
{ srNo: 3, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/03', cycleWeight: null, startMeter: 3759521, endMeter: 3759781, consumption: 258, htCycleNo: null },
{ srNo: 4, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/04', cycleWeight: 630, startMeter: 3759781, endMeter: 3760424, consumption: 643, htCycleNo: null },
{ srNo: 5, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/05', cycleWeight: 283, startMeter: 3760424, endMeter: 3760691, consumption: 267, htCycleNo: null },
{ srNo: 6, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/06', cycleWeight: 430, startMeter: 3760691, endMeter: 3761121, consumption: 430, htCycleNo: null },
{ srNo: 7, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/07', cycleWeight: 576.7, startMeter: 3761121, endMeter: 3761664, consumption: 543, htCycleNo: null },
{ srNo: 8, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/08', cycleWeight: 677.15, startMeter: 3761664, endMeter: 3762243, consumption: 579, htCycleNo: null },
{ srNo: 9, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/09', cycleWeight: 530.7, startMeter: 3762243, endMeter: 3762693, consumption: 450, htCycleNo: null },
{ srNo: 10, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/10', cycleWeight: 645.9, startMeter: 3762693, endMeter: 3763214, consumption: 521, htCycleNo: null },
{ srNo: 11, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/11', cycleWeight: 421.1, startMeter: 3763214, endMeter: 3763658, consumption: 444, htCycleNo: null },
{ srNo: 12, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/12', cycleWeight: 574.4, startMeter: 3763658, endMeter: 3764123, consumption: 465, htCycleNo: null },
{ srNo: 13, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/13', cycleWeight: 358.1, startMeter: 3764123, endMeter: 3764389, consumption: 266, htCycleNo: null },
{ srNo: 14, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/14', cycleWeight: 599.26, startMeter: 3764389, endMeter: 3764890, consumption: 501, htCycleNo: null },
{ srNo: 15, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/15', cycleWeight: 412.1, startMeter: 3764890, endMeter: 3765259, consumption: 379, htCycleNo: null },
{ srNo: 16, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/16', cycleWeight: 443, startMeter: 3765269, endMeter: 3765790, consumption: 521, htCycleNo: null },
{ srNo: 17, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/17', cycleWeight: 486.8, startMeter: 3765790, endMeter: 3766319, consumption: 529, htCycleNo: null },
{ srNo: 18, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/18', cycleWeight: 590.3, startMeter: 3766319, endMeter: 3766850, consumption: 531, htCycleNo: null },
{ srNo: 19, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/19', cycleWeight: 433.9, startMeter: 3766850, endMeter: 3767276, consumption: 426, htCycleNo: null },
{ srNo: 20, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/20', cycleWeight: 476, startMeter: 3767276, endMeter: 3767759, consumption: 483, htCycleNo: null },
{ srNo: 21, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/21', cycleWeight: 359.2, startMeter: 3767759, endMeter: 3768223, consumption: 474, htCycleNo: null },
{ srNo: 22, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/22', cycleWeight: 388.3, startMeter: 3768223, endMeter: 3768642, consumption: 409, htCycleNo: null },
{ srNo: 23, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/23', cycleWeight: 285, startMeter: 3768642, endMeter: 3768904, consumption: 262, htCycleNo: null },
{ srNo: 24, month: 'APR-2026', furnace: 'VPT-01', furnaceCycleNo: 'VPT1-26/04/24', cycleWeight: 457, startMeter: 3768904, endMeter: 3769368, consumption: 464, htCycleNo: null },

{ srNo: 1, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/01', cycleWeight: 523.1, startMeter: 93650, endMeter: 94178, consumption: 578, htCycleNo: null },
{ srNo: 2, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/02', cycleWeight: 541.1, startMeter: 94178, endMeter: 94710, consumption: 541, htCycleNo: null },
{ srNo: 3, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/03', cycleWeight: 378.1, startMeter: 94710, endMeter: 95059, consumption: 349, htCycleNo: null },
{ srNo: 4, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/04', cycleWeight: 280, startMeter: 95059, endMeter: 95426, consumption: 367, htCycleNo: null },
{ srNo: 5, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/05', cycleWeight: 592.9, startMeter: 95426, endMeter: 95993, consumption: 567, htCycleNo: null },
{ srNo: 6, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/06', cycleWeight: 699, startMeter: 95993, endMeter: 96591, consumption: 598, htCycleNo: null },
{ srNo: 7, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/07', cycleWeight: 687, startMeter: 96591, endMeter: 97176, consumption: 585, htCycleNo: null },
{ srNo: 8, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/08', cycleWeight: 378, startMeter: 97176, endMeter: 97504, consumption: 328, htCycleNo: null },
{ srNo: 9, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/09', cycleWeight: 669.5, startMeter: 97504, endMeter: 98086, consumption: 582, htCycleNo: null },
{ srNo: 10, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/10', cycleWeight: 342.1, startMeter: 98086, endMeter: 98492, consumption: 406, htCycleNo: null },
{ srNo: 11, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/11', cycleWeight: 687, startMeter: 98492, endMeter: 99146, consumption: 654, htCycleNo: null },
{ srNo: 12, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/12', cycleWeight: 383.5, startMeter: 99146, endMeter: 99647, consumption: 501, htCycleNo: null },
{ srNo: 13, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/13', cycleWeight: 624, startMeter: 99647, endMeter: 100185, consumption: 538, htCycleNo: null },
{ srNo: 14, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/14', cycleWeight: 281, startMeter: 100185, endMeter: 100517, consumption: 332, htCycleNo: null },
{ srNo: 15, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/15', cycleWeight: 443.5, startMeter: 100517, endMeter: 101023, consumption: 506, htCycleNo: null },
{ srNo: 16, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/16', cycleWeight: 298, startMeter: 101023, endMeter: 101413, consumption: 390, htCycleNo: null },
{ srNo: 17, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/17', cycleWeight: 355.8, startMeter: 101556, endMeter: 102029, consumption: 473, htCycleNo: null },
{ srNo: 18, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/18', cycleWeight: 512.2, startMeter: 102029, endMeter: 102432, consumption: 403, htCycleNo: null },
{ srNo: 19, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/19', cycleWeight: 589.4, startMeter: 102432, endMeter: 102993, consumption: 561, htCycleNo: null },
{ srNo: 20, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/20', cycleWeight: 245.3, startMeter: 102993, endMeter: 103328, consumption: 335, htCycleNo: null },
{ srNo: 21, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/21', cycleWeight: 410, startMeter: 103328, endMeter: 103827, consumption: 499, htCycleNo: null },
{ srNo: 22, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/22', cycleWeight: 495.1, startMeter: 103827, endMeter: 104420, consumption: 593, htCycleNo: null },
{ srNo: 23, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/23', cycleWeight: 355.3, startMeter: 104420, endMeter: 104832, consumption: 412, htCycleNo: null },
{ srNo: 24, month: 'APR-2026', furnace: 'VPT-02', furnaceCycleNo: 'VPT2-26/04/24', cycleWeight: 342.3, startMeter: 104832, endMeter: 105247, consumption: 415, htCycleNo: null }];