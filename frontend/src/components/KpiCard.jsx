import { Link } from 'react-router-dom';

export default function KpiCard({ label, value, sub, icon, iconBg = 'bg-slate-100 text-slate-700', badge, badgeColor = 'bg-slate-100 text-slate-700', to }) {
  const Inner = (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 p-4 sm:p-5 min-h-[120px] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 truncate">{label}</p>
          <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{value ?? 0}</p>
        </div>
        <div className={`inline-flex items-center justify-center rounded-2xl p-3 ${iconBg}`}>
          <span className="material-symbols-outlined text-lg">{icon}</span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 leading-snug">{sub}</p>
        {badge && <span className={`text-[10px] font-semibold uppercase tracking-[0.15em] px-2.5 py-1.5 rounded-full ${badgeColor}`}>{badge}</span>}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2">
        {Inner}
      </Link>
    );
  }

  return Inner;
}
