import { Link } from 'react-router-dom';

// Static map, not string interpolation — Tailwind's build-time class scanner
// greps literal source text, so a template-built "bg-${hue}-500" would never
// get generated into the shipped CSS. Every hue any page passes to `iconBg`
// must have an entry here.
const ACCENT_LINE = {
  slate: 'bg-slate-300', amber: 'bg-amber-500', blue: 'bg-blue-500',
  emerald: 'bg-emerald-500', rose: 'bg-rose-500', sky: 'bg-sky-500',
  info: 'bg-info-500', violet: 'bg-violet-500', primary: 'bg-primary-500',
  warning: 'bg-warning-500', success: 'bg-success-500', danger: 'bg-danger-500',
};

export default function KpiCard({
  label,
  value,
  sub,
  icon,
  iconBg = 'bg-slate-100 text-slate-600',
  badge,
  badgeColor = 'bg-slate-100 text-slate-700',
  to,
  loading = false,
}) {
  // Top accent line picks up the same hue as the icon chip (e.g. "bg-emerald-100
  // text-emerald-700" -> "bg-emerald-500") so a card's one moment of color reads
  // as one coherent signal, not a separate decorative stripe.
  const hueMatch = iconBg.match(/bg-([a-z]+)-100/);
  const accentClass = (hueMatch && ACCENT_LINE[hueMatch[1]]) || 'bg-slate-300';

  const Inner = (
    <div className="relative overflow-hidden bg-white/95 rounded-xl border border-slate-200/90 shadow-sm hover:border-slate-300 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 p-3 sm:p-4 h-full flex flex-col justify-between gap-3 min-w-0">
      <span className={`absolute inset-x-0 top-0 h-0.5 ${accentClass}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">{label}</p>
          {loading ? (
            <div className="mt-1.5 h-6 w-14 rounded bg-slate-100 animate-pulse" />
          ) : (
            <p className="mt-0.5 text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums leading-tight truncate">
              {value ?? 0}
            </p>
          )}
        </div>
        {icon && (
          <div className={`inline-flex items-center justify-center rounded-lg w-7 h-7 shrink-0 ${iconBg}`}>
            <span className="material-symbols-outlined text-[16px]">{icon}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="text-[11px] text-slate-500 leading-tight truncate">{sub}</p>
        {badge && !loading && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${badgeColor}`}>{badge}</span>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 rounded-xl">
        {Inner}
      </Link>
    );
  }

  return Inner;
}
