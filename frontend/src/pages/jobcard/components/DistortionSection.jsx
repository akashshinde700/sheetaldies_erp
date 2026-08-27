import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DistortionSection({ form, set, onSave, saving }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>Distortion Measurements (8 Points)</CardTitle>
          <CardDescription>Before / after heat treatment readings with computed difference.</CardDescription>
        </div>
        {onSave && (
          <Button type="button" size="sm" onClick={onSave} loading={saving} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Nine columns never fit a phone — scroll the table inside the card
            instead of shrinking the inputs into uselessness. */}
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-center text-xs min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left w-24">Measurement</th>
                {[1,2,3,4,5,6,7,8].map(n => (
                  <th key={n} className="py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pt. {n}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2 px-3 text-xs font-bold text-slate-700 text-left">Before HT</td>
                {form.distortionBefore.map((val, i) => (
                  <td key={i} className="py-1.5 px-1">
                    <Input
                      type="text"
                      value={val}
                      onChange={e => { const arr=[...form.distortionBefore]; arr[i]=e.target.value; set('distortionBefore', arr); }}
                      className="h-8 min-h-0 text-xs w-16 text-center tabular-nums"
                      placeholder="NA"
                      aria-label={`Before HT point ${i + 1}`}
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-xs font-bold text-emerald-700 text-left">After HT</td>
                {form.distortionAfter.map((val, i) => (
                  <td key={i} className="py-1.5 px-1">
                    <Input
                      type="text"
                      value={val}
                      onChange={e => { const arr=[...form.distortionAfter]; arr[i]=e.target.value; set('distortionAfter', arr); }}
                      className="h-8 min-h-0 text-xs w-16 text-center tabular-nums border-emerald-200 bg-emerald-50"
                      placeholder="NA"
                      aria-label={`After HT point ${i + 1}`}
                    />
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-50/80">
                <td className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">Δ Diff</td>
                {form.distortionBefore.map((before, i) => {
                  const after = form.distortionAfter[i];
                  const bNum = Number(before), aNum = Number(after);
                  const numeric = before !== '' && after !== '' && !isNaN(bNum) && !isNaN(aNum);
                  const diff = aNum - bNum;
                  return (
                    <td key={i} className={`py-2 px-1 text-xs font-bold tabular-nums ${
                      numeric && Math.abs(diff) > 0.05 ? 'text-rose-500' : numeric && diff !== 0 ? 'text-amber-500' : 'text-slate-300'
                    }`}>
                      {numeric ? (diff >= 0 ? '+' : '') + diff.toFixed(3) : '—'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
