import { useMemo } from 'react';

const ROOM_TEMP_C = 50;
const FONT = 'Arial, Helvetica, sans-serif';
// Every ramp gets the same x-width, every hold gets the same x-width — NOT
// scaled to its real duration. A real cycle mixes short 10-30min ramps/holds
// with long 120-150min holds; plotting those time-proportionally crams the
// short, detail-heavy stages (the actual hardening ramp, with 3-4 close-
// together temperature labels) into an unreadable sliver on one side while
// the long tempering holds stretch out and dominate the page. Fixed slot
// widths keep every stage equally readable, matching the schematic (not
// time-accurate) look of the customer's own Excel "Graphs" sheet.
const RAMP_UNIT = 0.6;
const HOLD_UNIT = 1.4;

// Build both the polyline points AND a `holds` list (one entry per flat hold
// segment, with its mid-point time, temperature and hold-minutes) so the graph
// can annotate each plateau with its temperature (above) and hold time (below)
// — exactly like the customer's Excel "Graphs" sheet.
function buildPlot(rawSegments) {
  if (!rawSegments?.length) return { pts: [], holds: [] };
  // Some data sources (e.g. VHT Run Sheet presets) store two rows per hold
  // — a start-of-hold and end-of-hold reading, both at the same tempC, for
  // the log-sheet table — with the same or differing holdMin. Plotted
  // as-is those become two near-identical overlapping plateaus with
  // doubled labels, so consecutive same-temperature rows are collapsed
  // into a single plateau here (keeping the larger holdMin of the two).
  const segments = [];
  for (const s of rawSegments) {
    const tempC = Number(s.tempC);
    const holdMin = Number(s.holdMin) || 0;
    const prev = segments[segments.length - 1];
    if (prev && Number(prev.tempC) === tempC) {
      prev.holdMin = Math.max(Number(prev.holdMin) || 0, holdMin);
    } else {
      segments.push({ tempC, holdMin });
    }
  }

  const first = Number(segments[0].tempC);
  if (!Number.isFinite(first)) return { pts: [], holds: [] };

  let t = 0;
  const pts = [];
  const holds = [];
  let prevTemp = first !== ROOM_TEMP_C ? ROOM_TEMP_C : first;
  pts.push({ t: 0, temp: prevTemp });

  for (let i = 0; i < segments.length; i++) {
    const temp = Number(segments[i].tempC);
    const hold = Number(segments[i].holdMin) || 0;
    if (!Number.isFinite(temp)) continue;

    if (temp !== prevTemp) {
      t += RAMP_UNIT;
      pts.push({ t, temp });
    }

    if (hold > 0) {
      const tStart = t;
      t += HOLD_UNIT;
      pts.push({ t, temp });
      holds.push({ tMid: (tStart + t) / 2, temp, holdMin: hold });
    }

    prevTemp = temp;
  }

  return { pts, holds };
}

// Heat-treatment curve — matches the customer's Excel "Graphs" style: a
// stepped blue line with each plateau's TEMPERATURE labelled above it and its
// HOLD TIME (minutes) labelled below it, plus arrowed TEMPERATURE (°C) /
// TIME (MINUTE) axes. Shared by the VHT Run Sheet print and the Test
// Certificate form's live graph so both render identically.
export default function HeatCycleStepGraph({ segments, stroke = '#3f60c1', preserveAspectRatio = 'xMidYMid meet', viewW = 340, viewH = 210, labelFontSize = 7, strokeWidth = 1.6, showYAxisTicks = false }) {
  const { pts, holds } = useMemo(() => buildPlot(segments), [segments]);
  if (pts.length < 2) return null;

  // viewBox + plot area (units are arbitrary; the SVG scales to fit its box).
  // A numbered Y-axis scale needs a bit more left margin for the tick labels.
  const W = viewW, H = viewH;
  const plotLeft = showYAxisTicks ? 50 : 30, plotRight = W - 14, plotTop = 14, plotBottom = H - 30;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;

  const minX = Math.min(...pts.map(p => p.t));
  const maxX = Math.max(...pts.map(p => p.t));
  const maxY = Math.max(...pts.map(p => p.temp), 100);
  // Label offsets/headroom below are tuned for the default labelFontSize (7)
  // and scale proportionally with it — otherwise a larger labelFontSize (as
  // used for the bigger certificate-print graph) renders text tall enough
  // to cut through the plateau line instead of sitting cleanly above/below it.
  const fontScale = labelFontSize / 7;
  // Extra headroom below the lowest plateau so its hold-time label fits above
  // the X axis (the lowest holds sit ~20% up from the baseline, like the Excel
  // sheet), and a little above the peak so the top temperature label clears.
  // Y-axis tick scale (200/400/600… like the physical certificate form) —
  // opt-in since the VHT Run Sheet graph and the live-editing preview were
  // never designed with one. When shown, the plot's top bound is rounded up
  // to the next tick step so the last tick isn't clipped.
  const tickStep = maxY <= 600 ? 100 : 200;
  const tickMax = Math.ceil((maxY + 100) / 100) * 100;
  const yTicks = showYAxisTicks
    ? Array.from({ length: tickMax / tickStep }, (_, i) => (i + 1) * tickStep)
    : [];
  const yTop = Math.max(maxY * (1 + 0.06 * fontScale), showYAxisTicks ? tickMax : 0);
  const yBot = -maxY * (0.24 * fontScale);
  const tempLabelDy = -3 * fontScale;
  const holdLabelDy = 9 * fontScale;

  const sx = x => plotLeft + ((x - minX) / (maxX - minX || 1)) * plotW;
  const sy = y => plotBottom - ((y - yBot) / (yTop - yBot)) * plotH;

  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.t).toFixed(1)} ${sy(p.temp).toFixed(1)}`).join(' ');

  const LINE = stroke;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio={preserveAspectRatio}>
      {/* ── Axes ── */}
      <line x1={plotLeft} y1={plotBottom} x2={plotLeft} y2={plotTop - 1} stroke="#333" strokeWidth="1" />
      <line x1={plotLeft} y1={plotBottom} x2={plotRight + 4} y2={plotBottom} stroke="#333" strokeWidth="1" />
      {/* Arrow heads */}
      <path d={`M ${plotLeft} ${plotTop - 5} L ${plotLeft - 3} ${plotTop + 2} L ${plotLeft + 3} ${plotTop + 2} Z`} fill="#333" />
      <path d={`M ${plotRight + 7} ${plotBottom} L ${plotRight} ${plotBottom - 3} L ${plotRight} ${plotBottom + 3} Z`} fill="#333" />

      {/* ── Y-axis tick scale (200/400/600…), opt-in via showYAxisTicks ── */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={plotLeft - 4} y1={sy(t).toFixed(1)} x2={plotLeft} y2={sy(t).toFixed(1)} stroke="#555" strokeWidth="1" />
          <text x={plotLeft - 6} y={(sy(t) + labelFontSize * 0.35).toFixed(1)} textAnchor="end"
            fontFamily={FONT} fontSize={labelFontSize * 0.75} fill="#333">
            {t}
          </text>
        </g>
      ))}

      {/* ── Axis titles ── */}
      <text x={12} y={(plotTop + plotBottom) / 2} transform={`rotate(-90 12 ${(plotTop + plotBottom) / 2})`}
        textAnchor="middle" fontFamily={FONT} fontSize={labelFontSize} fontWeight="700" fill="#000">
        TEMPERATURE (°C)
      </text>
      <text x={(plotLeft + plotRight) / 2} y={plotBottom + 22}
        textAnchor="middle" fontFamily={FONT} fontSize={labelFontSize + 0.5} fontWeight="700" fill="#000">
        TIME (MINUTE)
      </text>

      {/* ── Curve ── */}
      <path d={d} fill="none" stroke={LINE} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />

      {/* ── Per-plateau labels: temperature above, hold-minutes below ── */}
      {holds.map((hd, i) => (
        <g key={i}>
          <text x={sx(hd.tMid).toFixed(1)} y={(sy(hd.temp) + tempLabelDy).toFixed(1)}
            textAnchor="middle" fontFamily={FONT} fontSize={labelFontSize} fontWeight="700" fill="#000">
            {Math.round(hd.temp)}
          </text>
          <text x={sx(hd.tMid).toFixed(1)} y={(sy(hd.temp) + holdLabelDy).toFixed(1)}
            textAnchor="middle" fontFamily={FONT} fontSize={labelFontSize - 0.5} fill="#333">
            {Math.round(hd.holdMin)}
          </text>
        </g>
      ))}
    </svg>
  );
}
