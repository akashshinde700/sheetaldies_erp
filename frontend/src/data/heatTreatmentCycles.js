/**
 * Heat-treatment cycle presets — single source of truth.
 *
 * Mirrors the cycles documented in the customer's Excel "Graphs" sheet
 * (file: 26040000- KLAUS ... D2 DHF.xlsx):
 *   HDS / H13, D2, HSS, D3, Stress Relieving.
 *
 * Plus an Annealing cycle (used as a separate option in the certificate form).
 *
 * Each cycle is defined as ordered SEGMENTS in the form
 *   { tempC, holdMin, label }
 * Between segments the rendered chart ramps from one temperature to the next
 * (instant ramp + flat hold), giving the staircase look of the physical paper
 * graph.
 *
 * Cool-down "to room temperature" steps between hardening and each temper
 * are modelled as 50 °C, 50 min segments — matching the customer's Excel
 * "Graphs" sheet which shows a 50-minute hold at 50 °C between each operation.
 */

export const ROOM_TEMP_C = 50;
const COOL = (label = 'Cool to RT') => ({ tempC: ROOM_TEMP_C, holdMin: 50, label });

export const HEAT_TREATMENT_CYCLES = {
  D2: {
    name: 'D2',
    label: 'D2 — Cold Work Tool Steel',
    material: 'D2',
    austenitizingTempC: 1040,
    tempersCount: 2,
    segments: [
      COOL('Room Temp'),
      { tempC: 550,  holdMin: 10, label: 'Preheat 1' },
      { tempC: 750,  holdMin: 20, label: 'Preheat 2' },
      { tempC: 950,  holdMin: 20, label: 'Preheat 3' },
      { tempC: 1040, holdMin: 30, label: 'Harden' },
      COOL(),
      { tempC: 500,  holdMin: 120, label: 'Temper 1' },
      COOL(),
      { tempC: 500,  holdMin: 120, label: 'Temper 2' },
      COOL('Final Cool'),
    ],
  },
  'H13 / HDS': {
    name: 'H13 / HDS',
    label: 'H13 / HDS — Hot Work Die Steel',
    material: 'H13',
    austenitizingTempC: 1030,
    tempersCount: 3,
    segments: [
      { tempC: 550,  holdMin: 10,  label: 'Preheat 1' },
      { tempC: 750,  holdMin: 20,  label: 'Preheat 2' },
      { tempC: 950,  holdMin: 20,  label: 'Preheat 3' },
      { tempC: 1030, holdMin: 30,  label: 'Harden (Soak)' },
      COOL(),
      { tempC: 560,  holdMin: 120, label: 'Temper 1' },
      COOL(),
      { tempC: 590,  holdMin: 150, label: 'Temper 2' },
      COOL(),
      { tempC: 560,  holdMin: 150, label: 'Temper 3' },
      COOL('Final Cool'),
    ],
  },
  HSS: {
    name: 'HSS',
    label: 'HSS — High Speed Steel',
    material: 'HSS',
    austenitizingTempC: 1195,
    tempersCount: 3,
    segments: [
      { tempC: 650,  holdMin: 10,  label: 'Preheat 1' },
      { tempC: 850,  holdMin: 15,  label: 'Preheat 2' },
      { tempC: 1050, holdMin: 15,  label: 'Preheat 3' },
      { tempC: 1195, holdMin: 30,  label: 'Harden (Soak)' },
      COOL(),
      { tempC: 540,  holdMin: 120, label: 'Temper 1' },
      COOL(),
      { tempC: 540,  holdMin: 120, label: 'Temper 2' },
      COOL(),
      { tempC: 540,  holdMin: 120, label: 'Temper 3' },
      COOL('Final Cool'),
    ],
  },
  D3: {
    name: 'D3',
    label: 'D3 — High-C High-Cr Cold Work',
    material: 'D3',
    austenitizingTempC: 990,
    tempersCount: 2,
    segments: [
      { tempC: 500,  holdMin: 10,  label: 'Preheat 1' },
      { tempC: 750,  holdMin: 20,  label: 'Preheat 2' },
      { tempC: 850,  holdMin: 20,  label: 'Preheat 3' },
      { tempC: 990,  holdMin: 90,  label: 'Harden (Soak)' },
      COOL(),
      { tempC: 200,  holdMin: 120, label: 'Temper 1' },
      COOL(),
      { tempC: 200,  holdMin: 120, label: 'Temper 2' },
      COOL('Final Cool'),
    ],
  },
  'Stress Relieving': {
    name: 'Stress Relieving',
    label: 'Stress Relieving',
    material: null,
    austenitizingTempC: null,
    tempersCount: 0,
    segments: [
      { tempC: 650, holdMin: 120, label: 'Stress Relieving Soak' },
      COOL('Final Cool'),
    ],
  },
  Annealing: {
    name: 'Annealing',
    label: 'Annealing',
    material: null,
    austenitizingTempC: 590,
    tempersCount: 0,
    segments: [
      { tempC: 590, holdMin: 150, label: 'Anneal Soak' },
      COOL('Final Cool'),
    ],
  },
};

/**
 * Aliases used by older saved data and free-text inspection notes — map to a
 * canonical cycle key in HEAT_TREATMENT_CYCLES.
 */
const CYCLE_ALIASES = {
  'HARDEN AND TEMPER': 'D2',           // legacy default — D2 is project default material
  'HARDEN & TEMPER':   'D2',
  'HARDEN':            'D2',
  HDS:                 'H13 / HDS',
  H13:                 'H13 / HDS',
  'H13/HDS':           'H13 / HDS',
  'STRESS RELIEVING':  'Stress Relieving',
  'STRESS RELIVING':   'Stress Relieving',  // physical-form spelling
  ANNEALING:           'Annealing',
  ANNEAL:              'Annealing',
};

/**
 * Resolve any user-facing label / legacy enum to the canonical cycle key.
 * Returns null if no mapping is found.
 */
export function resolveCycleKey(name) {
  if (!name) return null;
  const raw = String(name).trim();
  if (HEAT_TREATMENT_CYCLES[raw]) return raw;

  const upper = raw.toUpperCase();
  for (const [alias, key] of Object.entries(CYCLE_ALIASES)) {
    if (alias.toUpperCase() === upper) return key;
  }
  for (const key of Object.keys(HEAT_TREATMENT_CYCLES)) {
    if (key.toUpperCase() === upper) return key;
  }
  return null;
}

export function getCycle(name) {
  const key = resolveCycleKey(name);
  return key ? HEAT_TREATMENT_CYCLES[key] : null;
}

export function getCycleSegments(name) {
  const c = getCycle(name);
  return c ? c.segments.map(s => ({ ...s })) : [];
}

// Ramp rates matching the Excel "Graphs" sheet proportions
const HEAT_RATE = 10; // °C per minute while heating
const COOL_RATE = 20; // °C per minute while cooling

/**
 * VHT runsheet stores `tempGraphPoints` as [{ tempC, holdMin, label }].
 * Test certificate / print uses `tempCycleData` as [{ time, temp }] (strings).
 *
 * Front-end equivalent of `backend/src/utils/runsheetGraph.js#runsheetSegmentsToTempCycleData`.
 *
 * Each transition between temperatures allocates proportional ramp time
 * (10 °C/min heating, 20 °C/min cooling) so the rendered curve shows
 * diagonal ramps + flat holds — matching the customer's Excel "Graphs" sheet.
 */
export function segmentsToTempCycleData(points, { withRoomTempLeadIn = false } = {}) {
  if (!Array.isArray(points) || !points.length) return [];
  const firstTemp = Number(points[0].tempC);
  if (!Number.isFinite(firstTemp)) return [];

  const out = [];

  for (let i = 0; i < points.length; i++) {
    const temp = Number(points[i].tempC);
    const hold = Number(points[i].holdMin) || 0;
    if (!Number.isFinite(temp)) continue;

    // Use holdMin as time value if > 0, otherwise empty string
    const timeVal = hold > 0 ? String(hold) : '';
    out.push({ time: timeVal, temp: String(temp) });
    // Log sheets record two readings per hold step (start-of-hold and
    // end-of-hold) — matches the customer's 20-row physical form for D2.
    // (expandSegmentsToPlot, used for the actual graph curve, is unaffected —
    // it works off the un-duplicated `segments` array and would double-count
    // hold time if these extra rows fed back into it.)
    if (hold > 0) out.push({ time: timeVal, temp: String(temp) });
  }

  return out;
}

/**
 * Inverse of segmentsToTempCycleData: rebuild segments [{ tempC, holdMin }]
 * from the flat {time, temp} rows the certificate form edits.
 *
 * segmentsToTempCycleData emits a hold as TWO identical rows (time = holdMin,
 * same temp) and a ramp-only waypoint as ONE row (time = ''). So we collapse
 * each run of consecutive equal-temp rows into a single segment whose holdMin
 * is that run's time value (the duplicated rows share the same time — it is
 * NOT summed). Real cycles always separate equal-temp plateaus (e.g. two
 * 200 °C tempers) with a 50 °C cool step, so runs never merge across holds.
 *
 * Rows with a blank/non-numeric temperature (the form's padded blank rows)
 * are dropped up front, so they are ignored automatically.
 */
export function tempRowsToSegments(rows) {
  if (!Array.isArray(rows)) return [];
  const clean = rows.filter(r => r && r.temp !== '' && r.temp != null && Number.isFinite(Number(r.temp)));
  const segments = [];
  let i = 0;
  while (i < clean.length) {
    const temp = Number(clean[i].temp);
    let holdMin = 0;
    let j = i;
    while (j < clean.length && Number(clean[j].temp) === temp) {
      const t = Number(clean[j].time);
      if (clean[j].time !== '' && Number.isFinite(t) && t > holdMin) holdMin = t;
      j++;
    }
    segments.push({ tempC: temp, holdMin });
    i = j;
  }
  return segments;
}

/**
 * Expanded numeric points for SVG plotting:
 *   [{ t, temp }, ...]
 *
 * Produces the same shape used by VHTRunsheetForm.jsx /
 * VHTRunsheetPrint.jsx, but centralised so all renderers stay in sync.
 *
 * Prepends a 50 °C lead-in and allocates proportional ramp time between
 * each segment so the curve shows diagonal ramps + flat holds — matching
 * the customer's Excel "Graphs" sheet.
 */
export function expandSegmentsToPlot(points, { withRoomTempLeadIn = true } = {}) {
  if (!points?.length) return [];
  const first = Number(points[0].tempC);
  if (!Number.isFinite(first)) return [];

  let t = 0;
  const out = [];
  let prevTemp = (withRoomTempLeadIn && first !== ROOM_TEMP_C) ? ROOM_TEMP_C : first;
  out.push({ t: 0, temp: prevTemp });

  for (let i = 0; i < points.length; i++) {
    const temp = Number(points[i].tempC);
    const hold = Number(points[i].holdMin) || 0;
    if (!Number.isFinite(temp)) continue;

    if (temp !== prevTemp) {
      const rate = temp > prevTemp ? HEAT_RATE : COOL_RATE;
      const rampMin = Math.max(1, Math.round(Math.abs(temp - prevTemp) / rate));
      t += rampMin;
      out.push({ t, temp });
    }

    if (hold > 0) {
      t += hold;
      out.push({ t, temp });
    }

    prevTemp = temp;
  }

  return out;
}

/**
 * Preset bank for the run-sheet form's preset buttons.
 * Shape: { [cycleName]: [{ tempC, holdMin, label }, ...] }.
 */
export const CYCLE_PRESETS = Object.fromEntries(
  Object.entries(HEAT_TREATMENT_CYCLES).map(([key, cyc]) => [
    key,
    cyc.segments.map(s => ({ ...s })),
  ])
);

/** Display order for dropdowns / preset buttons. */
export const CYCLE_NAMES = Object.keys(HEAT_TREATMENT_CYCLES);

/** Default graph used when a runsheet/cert has no saved cycle yet. */
export const DEFAULT_CYCLE_KEY = 'D2';
export const DEFAULT_GRAPH_SEGMENTS = CYCLE_PRESETS[DEFAULT_CYCLE_KEY];
export const DEFAULT_TEMP_CYCLE_TIME_TEMP = segmentsToTempCycleData(DEFAULT_GRAPH_SEGMENTS);
