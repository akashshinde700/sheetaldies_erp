import { Link } from 'react-router-dom';

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
  const Inner = (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm hover:border-slate-300 hover:shadow transition-all duration-150 p-3 sm:p-4 h-full flex flex-col justify-between gap-2 min-w-0">
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
