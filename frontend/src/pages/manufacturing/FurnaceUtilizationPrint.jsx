import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import api from '../../utils/api';

// Ported as-is from the client-supplied "Daily Utilization Statement" prototype
// (Daily Utilization Statement/src/components/sheets/DailyUtilisationSheet.tsx)
// — same markup, same loss-code labels, same borders/columns. Only the data
// source changed: real FurnaceUtilizationDay rows (per real Machine) instead
// of the prototype's local demo state. DO NOT change this layout without the
// client's sign-off — it mirrors their physical paper register exactly.

const LOSS_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const LOSS_CATEGORIES = [
  { code: 'A', label: 'Loading / Unloading' },
  { code: 'B', label: 'Cycle Prepration' },
  { code: 'C', label: 'Waiting for Material' },
  { code: 'D', label: 'Prev. Maintenance' },
  { code: 'E', label: 'Break down Maint.' },
  { code: 'F', label: 'No Power' },
  { code: 'G', label: 'No Material' },
];
const SHIFTS = [{ id: 1, label: '1st Shift' }, { id: 2, label: '2nd Shift' }, { id: 3, label: '3rd Shift' }];
const B = 'border border-black';
const GROUP_WIDTH = LOSS_CODES.length + 1;

const sheetDate = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const emptyRow = () => ({
  shift1UsedMin: 480, shift2UsedMin: 480, shift3UsedMin: 480,
  s1A: 0, s1B: 0, s1C: 0, s1D: 0, s1E: 0, s1F: 0, s1G: 0,
  s2A: 0, s2B: 0, s2C: 0, s2D: 0, s2E: 0, s2F: 0, s2G: 0,
  s3A: 0, s3B: 0, s3C: 0, s3D: 0, s3E: 0, s3F: 0, s3G: 0,
  remarks: '', signedBy: '',
});

function shiftLoss(row, n) {
  return LOSS_CODES.reduce((s, c) => s + (Number(row[`s${n}${c}`]) || 0), 0);
}

export default function FurnaceUtilizationPrint() {
  const [params] = useSearchParams();
  const date = params.get('date') || new Date().toISOString().slice(0, 10);
  const title = params.get('title') || 'DAILY UTILISATION STATEMENT';
  const machineIds = (params.get('machineIds') || '').split(',').map((s) => s.trim()).filter(Boolean);

  const [machines, setMachines] = useState([]);
  const [rowsByMachine, setRowsByMachine] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { const p = document.title; document.title = ' '; return () => { document.title = p; }; }, []);

  useEffect(() => {
    if (!machineIds.length) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      api.get('/machines'),
      ...machineIds.map((id) => api.get('/manufacturing/furnace-utilization', { params: { machineId: id, date } })),
    ]).then(([machinesRes, ...rowsRes]) => {
      setMachines(machinesRes.data.data || []);
      const map = {};
      machineIds.forEach((id, i) => { map[id] = rowsRes[i].data.data || emptyRow(); });
      setRowsByMachine(map);
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, machineIds.join(',')]);

  const furnaces = useMemo(() => machineIds.map((id) => {
    const m = machines.find((x) => String(x.id) === String(id));
    return { id, shortName: m?.name || m?.code || `#${id}`, row: rowsByMachine[id] || emptyRow() };
  }), [machineIds, machines, rowsByMachine]);

  const columnCount = 1 + furnaces.length * GROUP_WIDTH + 1;

  if (loading) return <div className="p-10 text-slate-400">Loading...</div>;
  if (!furnaces.length) return (
    <div className="p-10 text-center">
      <p className="text-rose-500 font-bold">No furnace selected to print.</p>
      <Link to="/manufacturing/utilization" className="text-indigo-600">← Back</Link>
    </div>
  );

  return (
    <div className="bg-slate-100 min-h-screen py-8 print:bg-white print:py-0">
      <style>{`
        @page { size: A4 landscape; margin: 8mm; }
        @media print {
          .no-print { display: none !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .sheet input, .sheet textarea { background: transparent !important; color: #1f4e79 !important; }
        }
      `}</style>

      <div className="no-print max-w-[1240px] mx-auto mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-[#1f4e79] hover:border-[#1f4e79]"
        >
          <Printer className="h-3.5 w-3.5" /> Print sheet
        </button>
      </div>

      <section className="sheet mx-auto w-full max-w-[1240px] bg-white p-6 text-black shadow-sm ring-1 ring-[#dfe4e9] print:p-0 print:shadow-none print:ring-0">
        <div className="border-2 border-black font-sans">
          <div className="flex items-stretch border-b-2 border-black">
            <div className="flex w-24 items-center justify-center border-r border-black p-2">
              <span
                aria-hidden="true"
                className="flex h-14 w-14 items-center justify-center bg-[#8c1d4a] font-serif text-lg font-bold italic text-white"
                style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}
              >
                SVT
              </span>
            </div>
            <h2 className="flex flex-1 items-center justify-center px-4 py-3 text-center text-xl font-bold tracking-wide">
              SHITAL VACUUM TREAT PVT LTD.
            </h2>
            <div className="flex w-60 items-center gap-2 border-l border-black px-4">
              <span className="text-sm font-bold">DATE :-</span>
              <span className="font-mono text-base font-medium text-[#1f4e79]">{sheetDate(date)}</span>
            </div>
          </div>

          <p className="border-b border-black py-1 text-center text-sm font-bold underline">{title}</p>

          <table className="w-full table-fixed border-collapse text-center text-[11px]">
            <colgroup>
              <col className="w-[92px]" />
              {furnaces.map((f) => (
                <React.Fragment key={f.id}>
                  {LOSS_CODES.map((code) => <col key={`${f.id}-${code}`} />)}
                  <col className="w-[62px]" />
                </React.Fragment>
              ))}
              <col className="w-[58px]" />
            </colgroup>

            <tbody>
              <tr>
                <th scope="col" className={`${B} px-1 py-1 text-left font-bold`}>SHIFT</th>
                {furnaces.map((f) => (
                  <React.Fragment key={f.id}>
                    <th scope="col" colSpan={LOSS_CODES.length} className={`${B} px-1 py-1 text-center text-[12px] font-bold`}>
                      {f.shortName}
                    </th>
                    <th scope="col" className={`${B} px-0.5 text-[9px] font-semibold leading-tight`}>BAL.</th>
                  </React.Fragment>
                ))}
                <th scope="col" rowSpan={5} className={`${B} px-1 text-center font-bold`}>SIGN</th>
              </tr>

              {SHIFTS.map((shift) => (
                <tr key={`available-${shift.id}`}>
                  <th scope="row" className={`${B} px-1 py-1 text-left font-bold italic`}>{shift.label}</th>
                  {furnaces.map((f) => {
                    const available = f.row[`shift${shift.id}UsedMin`] ?? 480;
                    const loss = shiftLoss(f.row, shift.id);
                    const balance = available - loss;
                    return (
                      <React.Fragment key={f.id}>
                        <td colSpan={LOSS_CODES.length} className={`${B} px-2 py-0.5`}>
                          <input
                            type="number" disabled value={available}
                            aria-label={`${f.shortName} ${shift.label} available minutes`}
                            className="h-7 w-full border-0 bg-transparent text-center font-mono text-[13px] font-medium tabular-nums text-[#1f4e79]"
                          />
                        </td>
                        <td className={`${B} px-0.5 py-1 font-mono text-[13px] font-semibold tabular-nums ${balance < 0 ? 'text-[#b42318]' : 'text-[#1f4e79]'}`}>
                          {balance}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}

              <tr>
                <th scope="row" className={`${B} px-1 py-1`}><span className="sr-only">Day total</span></th>
                {furnaces.map((f) => {
                  const available = SHIFTS.reduce((s, sh) => s + (f.row[`shift${sh.id}UsedMin`] ?? 480), 0);
                  const loss = SHIFTS.reduce((s, sh) => s + shiftLoss(f.row, sh.id), 0);
                  const used = Math.max(0, available - loss);
                  return (
                    <React.Fragment key={f.id}>
                      <td colSpan={LOSS_CODES.length} className={`${B} px-2 py-1 text-center font-mono text-[13px] font-semibold tabular-nums`}>
                        {available}
                      </td>
                      <td className={`${B} px-0.5 py-1 font-mono text-[13px] font-bold tabular-nums text-[#1f4e79]`}>
                        {used}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>

              {SHIFTS.map((shift) => (
                <React.Fragment key={shift.id}>
                  <tr>
                    <th scope="row" rowSpan={2} className={`${B} px-1 py-1 text-left font-bold italic`}>{shift.label}</th>
                    {furnaces.map((f) => (
                      <React.Fragment key={f.id}>
                        {LOSS_CATEGORIES.map((cat) => (
                          <th key={`${f.id}-${cat.code}`} scope="col" title={cat.label} className={`${B} bg-[#f2f3e8] px-0 py-0.5 font-mono text-[11px] font-semibold`}>
                            {cat.code}
                          </th>
                        ))}
                        <th scope="col" className={`${B} bg-[#f2f3e8] px-0.5 py-0.5 text-[9px] font-semibold`}>TOTAL</th>
                      </React.Fragment>
                    ))}
                    <td rowSpan={2} className={B} />
                  </tr>
                  <tr>
                    {furnaces.map((f) => {
                      const available = f.row[`shift${shift.id}UsedMin`] ?? 480;
                      const loss = shiftLoss(f.row, shift.id);
                      const over = loss > available;
                      return (
                        <React.Fragment key={f.id}>
                          {LOSS_CODES.map((code) => {
                            const v = Number(f.row[`s${shift.id}${code}`]) || 0;
                            return (
                              <td key={`${f.id}-${code}`} className={`${B} px-0.5 py-0.5`}>
                                <input
                                  type="number" disabled value={v === 0 ? '' : v} placeholder="0"
                                  aria-label={`${f.shortName} ${shift.label} ${code} minutes`}
                                  className={`h-7 w-full border-0 bg-transparent px-0 text-center font-mono text-[13px] font-medium tabular-nums placeholder:text-transparent ${over ? 'text-[#b42318]' : 'text-[#1f4e79]'}`}
                                />
                              </td>
                            );
                          })}
                          <td className={`${B} px-0.5 py-1 font-mono text-[13px] font-semibold tabular-nums ${over ? 'text-[#b42318]' : 'text-[#1f4e79]'}`}>
                            {loss || ''}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                </React.Fragment>
              ))}

              {SHIFTS.map((shift) => (
                <tr key={`remark-${shift.id}`}>
                  <th scope="row" className={`${B} px-1 py-2 text-left font-bold italic leading-tight`}>REMARK<br />{shift.label}</th>
                  <td colSpan={furnaces.length * GROUP_WIDTH} className={`${B} px-2`}>
                    <textarea
                      rows={2} disabled
                      value={shift.id === 1 ? (furnaces[0]?.row.remarks || '') : ''}
                      aria-label={`Remark ${shift.label}`}
                      className="w-full resize-none border-0 bg-transparent py-1 text-left font-mono text-[12px] text-[#1f4e79]"
                    />
                  </td>
                  <td className={B} />
                </tr>
              ))}

              <tr>
                <td colSpan={columnCount} className={`${B} px-2 py-1.5 text-left`}>
                  <span className="flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] font-medium">
                    {LOSS_CATEGORIES.map((cat) => <span key={cat.code}>{cat.code}) {cat.label}</span>)}
                    <span className="font-semibold">BAL. = available − losses</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
