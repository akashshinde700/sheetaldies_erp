import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import SearchSelect from '../../../components/SearchSelect';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ProcessLogSection({ heatRows, setHeatRows, processes, emptyHeatRow }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>Heat Treatment Process Log</CardTitle>
          <CardDescription>{heatRows.length} cycle{heatRows.length !== 1 ? 's' : ''} recorded for this job card</CardDescription>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setHeatRows(p => [...p, emptyHeatRow()])}>
          <Plus /> Add Row
        </Button>
      </CardHeader>
      <CardContent>
        {heatRows.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No heat treatment records. Click "Add Row" to add.</p>
        ) : (
          /* Sixteen columns can never fit a viewport — the table scrolls
             inside the card at every breakpoint. */
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-xs min-w-[1280px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Equipment','Process','Cycle','Temp/Time','Temp From°C','Temp To°C','Hold (min)','Start Time','End Time','Date','Loading By','Atmosphere','UOM','Result','Sign',''].map(h => (
                    <th key={h} className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {heatRows.map((row, i) => {
                  const upd = (field, val) => setHeatRows(prev => { const a=[...prev]; a[i]={...a[i],[field]:val}; return a; });
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-1 py-1.5">
                        <Input value={row.equipment} onChange={e=>upd('equipment',e.target.value)}
                          className="h-8 min-h-0 text-xs w-24" placeholder="Furnace" aria-label={`Row ${i + 1} equipment`} />
                      </td>
                      <td className="px-1 py-1.5">
                        <SearchSelect
                          value={String(row.processTypeId || '')}
                          onChange={v => upd('processTypeId', v)}
                          options={(processes || []).map(p => ({ value: p.id, label: p.name }))}
                          placeholder="—"
                          useFixed
                          className="w-28"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input type="number" inputMode="numeric" value={row.cycleNo} onChange={e=>upd('cycleNo',e.target.value)}
                          className="h-8 min-h-0 text-xs w-14 text-center tabular-nums" placeholder="1" aria-label={`Row ${i + 1} cycle`} />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input value={row.tempTime} onChange={e=>upd('tempTime',e.target.value)}
                          className="h-8 min-h-0 text-xs w-28" placeholder="e.g. 1020°C / 30m" aria-label={`Row ${i + 1} temp/time`} />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input type="number" inputMode="numeric" value={row.tempFrom} onChange={e=>upd('tempFrom',e.target.value)}
                          className="h-8 min-h-0 text-xs w-20 text-right tabular-nums" placeholder="800" aria-label={`Row ${i + 1} temp from`} />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input type="number" inputMode="numeric" value={row.tempTo} onChange={e=>upd('tempTo',e.target.value)}
                          className="h-8 min-h-0 text-xs w-20 text-right tabular-nums" placeholder="900" aria-label={`Row ${i + 1} temp to`} />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input type="number" inputMode="numeric" value={row.holdTimeMin} onChange={e=>upd('holdTimeMin',e.target.value)}
                          className="h-8 min-h-0 text-xs w-16 text-right tabular-nums" placeholder="60" aria-label={`Row ${i + 1} hold time`} />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input type="datetime-local" value={row.startTime} onChange={e=>upd('startTime',e.target.value)}
                          className="h-8 min-h-0 text-xs w-40" aria-label={`Row ${i + 1} start time`} />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input type="datetime-local" value={row.endTime} onChange={e=>upd('endTime',e.target.value)}
                          className="h-8 min-h-0 text-xs w-40" aria-label={`Row ${i + 1} end time`} />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input type="date" value={row.processDate} onChange={e=>upd('processDate',e.target.value)}
                          className="h-8 min-h-0 text-xs w-32" aria-label={`Row ${i + 1} process date`} />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input value={row.loadingBy} onChange={e=>upd('loadingBy',e.target.value)}
                          className="h-8 min-h-0 text-xs w-24" placeholder="Name" aria-label={`Row ${i + 1} loading by`} />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input value={row.atmosphere} onChange={e=>upd('atmosphere',e.target.value)}
                          className="h-8 min-h-0 text-xs w-20" placeholder="Vacuum" aria-label={`Row ${i + 1} atmosphere`} />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input value={row.uom} onChange={e=>upd('uom',e.target.value)}
                          className="h-8 min-h-0 text-xs w-16" placeholder="KGS" aria-label={`Row ${i + 1} UOM`} />
                      </td>
                      <td className="px-1 py-1.5">
                        {/* Native select kept: the "—" option is an empty-string value,
                            which Radix Select does not support. */}
                        <select
                          value={row.result}
                          onChange={e=>upd('result',e.target.value)}
                          className="form-input h-8 min-h-0 text-xs w-24 py-1"
                          aria-label={`Row ${i + 1} result`}
                        >
                          <option value="">—</option>
                          <option value="OK">OK</option>
                          <option value="NOT OK">NOT OK</option>
                        </select>
                      </td>
                      <td className="px-1 py-1.5">
                        <Input value={row.signedBy} onChange={e=>upd('signedBy',e.target.value)}
                          className="h-8 min-h-0 text-xs w-20" placeholder="Name" aria-label={`Row ${i + 1} signed by`} />
                      </td>
                      <td className="px-1 py-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setHeatRows(p=>p.filter((_,j)=>j!==i))}
                          className="text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                          aria-label={`Remove row ${i + 1}`}
                        >
                          <Trash2 />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
