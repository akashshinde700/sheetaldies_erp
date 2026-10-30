import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import SearchSelect from '../../../components/SearchSelect';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

/**
 * Heat-treatment process log — one expandable card per cycle instead of a
 * 15-column table that never fit a viewport. Field names and the
 * heatRows/setHeatRows contract are unchanged.
 */
export default function ProcessLogSection({ heatRows, setHeatRows, processes, emptyHeatRow }) {
  const [open, setOpen] = useState(() => new Set([0]));
  const toggle = (i) => setOpen((s) => {
    const n = new Set(s);
    n.has(i) ? n.delete(i) : n.add(i);
    return n;
  });

  const procName = (id) => (processes || []).find((p) => String(p.id) === String(id))?.name;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>Heat Treatment Process Log</CardTitle>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => { setHeatRows((p) => [...p, emptyHeatRow()]); setOpen((s) => new Set(s).add(heatRows.length)); }}
        >
          <Plus /> Add cycle
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {heatRows.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">No heat treatment records. Click "Add cycle" to add one.</p>
        ) : (
          heatRows.map((row, i) => {
            const upd = (field, val) => setHeatRows((prev) => { const a = [...prev]; a[i] = { ...a[i], [field]: val }; return a; });
            const isOpen = open.has(i);
            return (
              <div key={i} className="overflow-hidden rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 bg-slate-50/70 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    aria-expanded={isOpen}
                    className="flex flex-1 items-center gap-2.5 overflow-x-auto text-left text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    <span className="font-app-mono font-bold text-slate-700">#{row.cycleNo || i + 1}</span>
                    <span className="truncate font-semibold text-slate-700">{procName(row.processTypeId) || row.equipment || 'Cycle'}</span>
                    <span className="whitespace-nowrap font-app-mono text-slate-500">
                      {(row.tempFrom || '—')}→{(row.tempTo || '—')}°C
                    </span>
                    {row.holdTimeMin && <span className="whitespace-nowrap font-app-mono text-slate-500">{row.holdTimeMin} min</span>}
                    {row.result && (
                      <Badge variant={row.result === 'OK' ? 'success' : 'error'} className="shrink-0 text-[10px]">{row.result}</Badge>
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => { setHeatRows((p) => p.filter((_, j) => j !== i)); setOpen((s) => { const n = new Set(s); n.delete(i); return n; }); }}
                    className="shrink-0 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Remove cycle ${i + 1}`}
                  >
                    <Trash2 />
                  </Button>
                </div>

                {isOpen && (
                  <div className="grid grid-cols-1 gap-x-3 gap-y-3 border-t border-slate-100 p-3 sm:grid-cols-2 lg:grid-cols-3">
                    <FormField label="Equipment">
                      <Input value={row.equipment} onChange={(e) => upd('equipment', e.target.value)} placeholder="Furnace" />
                    </FormField>
                    <FormField label="Process">
                      <SearchSelect
                        value={String(row.processTypeId || '')}
                        onChange={(v) => upd('processTypeId', v)}
                        options={(processes || []).map((p) => ({ value: p.id, label: p.name }))}
                        placeholder="— Process —"
                        useFixed
                        className="w-full"
                      />
                    </FormField>
                    <FormField label="Cycle no">
                      <Input type="number" inputMode="numeric" value={row.cycleNo} onChange={(e) => upd('cycleNo', e.target.value)}
                        className="text-right tabular-nums" placeholder="1" />
                    </FormField>
                    <FormField label="Temp / time note">
                      <Input value={row.tempTime} onChange={(e) => upd('tempTime', e.target.value)} placeholder="e.g. 1020°C / 30m" />
                    </FormField>
                    <FormField label="Temp from (°C)">
                      <Input type="number" inputMode="numeric" value={row.tempFrom} onChange={(e) => upd('tempFrom', e.target.value)}
                        className="text-right tabular-nums" placeholder="800" />
                    </FormField>
                    <FormField label="Temp to (°C)">
                      <Input type="number" inputMode="numeric" value={row.tempTo} onChange={(e) => upd('tempTo', e.target.value)}
                        className="text-right tabular-nums" placeholder="900" />
                    </FormField>
                    <FormField label="Hold (min)">
                      <Input type="number" inputMode="numeric" value={row.holdTimeMin} onChange={(e) => upd('holdTimeMin', e.target.value)}
                        className="text-right tabular-nums" placeholder="60" />
                    </FormField>
                    <FormField label="Start time">
                      <Input type="datetime-local" value={row.startTime} onChange={(e) => upd('startTime', e.target.value)} />
                    </FormField>
                    <FormField label="End time">
                      <Input type="datetime-local" value={row.endTime} onChange={(e) => upd('endTime', e.target.value)} />
                    </FormField>
                    <FormField label="Process date">
                      <Input type="date" value={row.processDate} onChange={(e) => upd('processDate', e.target.value)} />
                    </FormField>
                    <FormField label="Loading by">
                      <Input value={row.loadingBy} onChange={(e) => upd('loadingBy', e.target.value)} placeholder="Name" />
                    </FormField>
                    <FormField label="Atmosphere">
                      <Input value={row.atmosphere} onChange={(e) => upd('atmosphere', e.target.value)} placeholder="Vacuum" />
                    </FormField>
                    <FormField label="UOM">
                      <Input value={row.uom} onChange={(e) => upd('uom', e.target.value)} placeholder="KGS" />
                    </FormField>
                    <FormField label="Result">
                      {/* Native select kept: the "—" option is an empty-string value,
                          which Radix Select does not support. */}
                      <select
                        value={row.result}
                        onChange={(e) => upd('result', e.target.value)}
                        className="form-input"
                        aria-label={`Cycle ${i + 1} result`}
                      >
                        <option value="">—</option>
                        <option value="OK">OK</option>
                        <option value="NOT OK">NOT OK</option>
                      </select>
                    </FormField>
                    <FormField label="Signed by">
                      <Input value={row.signedBy} onChange={(e) => upd('signedBy', e.target.value)} placeholder="Name" />
                    </FormField>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
