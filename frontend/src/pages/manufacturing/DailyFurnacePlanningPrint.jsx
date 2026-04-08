import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';

const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

export default function DailyFurnacePlanningPrint() {
  const [params] = useSearchParams();
  const date = params.get('date') || new Date().toISOString().split('T')[0];
  const [day, setDay] = useState(null);
  const [machines, setMachines] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get(`/furnace-planning/day?date=${date}`),
      api.get('/machines'),
    ]).then(([d, m]) => {
      setDay(d.data.data || null);
      setMachines(m.data.data || []);
    }).catch(() => {});
  }, [date]);

  const byMachine = useMemo(() => {
    const map = new Map();
    (day?.slots || []).forEach(s => {
      const k = String(s.machineId);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(s);
    });
    for (const arr of map.values()) arr.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    return map;
  }, [day]);

  return (
    <div className="bg-slate-100 py-6 print:bg-white print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page { box-shadow: none !important; margin: 0 !important; border: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print max-w-[1000px] mx-auto mb-3 flex items-center gap-2">
        <Link to="/manufacturing/planning" className="btn-ghost">← Back</Link>
        <button className="btn-primary ml-auto" type="button" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <div className="page max-w-[1000px] mx-auto bg-white shadow-lg border border-slate-200">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-extrabold text-lg">SHITAL VACUUM TREAT PVT. LTD.</div>
              <div className="text-xs text-slate-600">DAILY PRODUCTION PLANNING</div>
            </div>
            <div className="text-xs text-right">
              <div><span className="text-slate-500">Date:</span> <span className="font-mono font-bold">{date}</span></div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4">
            {machines.map(m => {
              const slots = byMachine.get(String(m.id)) || [];
              if (!slots.length) return null;
              return (
                <div key={m.id} className="border border-slate-900">
                  <div className="border-b border-slate-900 px-3 py-2 text-sm font-bold">
                    {m.code} — {m.name}
                  </div>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-900">
                        <th className="p-2 text-left w-28">TIME</th>
                        <th className="p-2 text-left w-24">STAGE</th>
                        <th className="p-2 text-left">CUSTOMER / JOB</th>
                        <th className="p-2 text-left w-32">PROCESS</th>
                        <th className="p-2 text-left w-220">CYCLE</th>
                        <th className="p-2 text-left w-28">HOLD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((s) => (
                        <tr key={s.id} className="border-b border-slate-200">
                          <td className="p-2 font-mono">{fmtTime(s.startTime)}–{fmtTime(s.endTime)}</td>
                          <td className="p-2 font-bold">{s.stage || 'HARDENING'}</td>
                          <td className="p-2">
                            <div className="font-bold">{s.jobCard?.customer?.name || s.jobCard?.customerNameSnapshot || '—'}</div>
                            <div className="font-mono">{s.jobCard?.jobCardNo || s.title || ''}</div>
                          </td>
                          <td className="p-2">{s.processType?.name || 'HARDENING'}</td>
                          <td className="p-2 font-mono">
                            {s.tempC ? `${s.tempC}° / ${s.holdMin || ''}min` : '—'}
                            {s.pressureBar ? ` · ${s.pressureBar}bar` : ''}{s.fanRpm ? ` · ${s.fanRpm}rpm` : ''}
                          </td>
                          <td className="p-2 font-mono">{s.holdAtC ? `${s.holdAtC}°` : '—'}{s.holdExtraMin ? ` / ${s.holdExtraMin}min` : ''}</td>
                        </tr>
                      ))}
                      {slots.length === 0 && (
                        <tr><td className="p-3 text-slate-500" colSpan={6}>No slots</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-[10px] text-slate-600 flex justify-between">
            <div>Prepared By: ____________</div>
            <div>Approved By: ____________</div>
          </div>
        </div>
      </div>
    </div>
  );
}

