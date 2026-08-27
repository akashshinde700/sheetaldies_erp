import { useMemo } from 'react';
import { expandSegmentsToPlot } from '../data/heatTreatmentCycles';

// Shared temperature-time curve preview for heat-treatment segment arrays
// [{ tempC, holdMin, label }] — used by the Temperature Cycle Graph master,
// VHT Run Sheet form, and anywhere else that edits segments directly.
export default function HeatCycleGraphPreview({ segments }) {
  const pts = useMemo(() => expandSegmentsToPlot(segments), [segments]);
  if (pts.length < 2) return <div className="text-xs text-slate-400">Add graph points.</div>;

  const w = 560;
  const h = 160;
  const pad = 28;
  const minX = Math.min(...pts.map((p) => p.t));
  const maxX = Math.max(...pts.map((p) => p.t));
  const minY = Math.min(...pts.map((p) => p.temp), 0);
  const maxY = Math.max(...pts.map((p) => p.temp));
  const sx = (x) => pad + ((x - minX) / (maxX - minX || 1)) * (w - pad * 2);
  const sy = (y) => h - pad - ((y - minY) / (maxY - minY || 1)) * (h - pad * 2);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.t).toFixed(2)} ${sy(p.temp).toFixed(2)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-xl h-[160px] border border-slate-200 rounded bg-white">
      <path d={d} fill="none" stroke="#000" strokeWidth="2" />
      {pts.map((p, i) => (
        <circle key={i} cx={sx(p.t)} cy={sy(p.temp)} r="2.5" fill="#2563eb" />
      ))}
      <text x={pad} y={h - 6} className="text-[9px] fill-slate-500">Time (min)</text>
      <text x={4} y={pad} className="text-[9px] fill-slate-500" transform={`rotate(-90 4 ${pad})`}>°C</text>
    </svg>
  );
}
