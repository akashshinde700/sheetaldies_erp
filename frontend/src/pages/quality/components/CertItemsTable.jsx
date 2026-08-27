import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CertItemsTable({ certItems, setCertItems }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>Items / Parts</CardTitle>
          <CardDescription>{certItems.length} item{certItems.length !== 1 ? 's' : ''} on this certificate</CardDescription>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setCertItems(p => [...p, { description: '', quantity: '1', weightPerPc: '', totalWeight: '', remarks: '' }])}
        >
          <Plus /> Add Row
        </Button>
      </CardHeader>
      <CardContent>
        {/* Six editable columns do not fit a phone; let the table scroll inside
            its card instead of squeezing the inputs to nothing. */}
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-xs min-w-[520px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['#', 'Part Description', 'Qty', 'Wt/Pc (kg)', 'Total Wt (kg)', ''].map(h => (
                  <th key={h} className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {certItems.map((it, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-2 py-1.5 text-slate-400 font-mono tabular-nums">
                    {i + 1}
                    {it.sourceChallanItemId && (
                      <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-sky-400" title="Linked from inward item" />
                    )}
                  </td>
                  <td className="px-1 py-1.5">
                    <Input value={it.description} onChange={e => { const a = [...certItems]; a[i] = { ...a[i], description: e.target.value }; setCertItems(a); }}
                      className="h-8 sm:h-8 min-h-0 text-xs w-48" placeholder="Part name" />
                  </td>
                  <td className="px-1 py-1.5">
                    <Input type="number" inputMode="numeric" value={it.quantity}
                      onChange={e => { const a = [...certItems]; a[i].quantity = e.target.value; setCertItems(a); }}
                      className="h-8 sm:h-8 min-h-0 text-xs w-16 text-center tabular-nums" />
                  </td>
                  <td className="px-1 py-1.5">
                    <Input type="number" step="0.001" inputMode="decimal" value={it.weightPerPc}
                      onChange={e => { const a = [...certItems]; a[i].weightPerPc = e.target.value; setCertItems(a); }}
                      className="h-8 sm:h-8 min-h-0 text-xs w-20 text-right tabular-nums" />
                  </td>
                  <td className="px-1 py-1.5">
                    <Input type="number" step="0.001" inputMode="decimal" value={it.totalWeight}
                      onChange={e => { const a = [...certItems]; a[i] = { ...a[i], totalWeight: e.target.value }; setCertItems(a); }}
                      className="h-8 sm:h-8 min-h-0 text-xs w-20 text-right tabular-nums" />
                  </td>
                  <td className="px-1 py-1.5">
                    {certItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon-sm"
                        onClick={() => setCertItems(p => p.filter((_, j) => j !== i))}
                        className="text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                        aria-label={`Remove item ${i + 1}`}>
                        <Trash2 />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
