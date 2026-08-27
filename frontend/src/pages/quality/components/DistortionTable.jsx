import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function DistortionTable({ form, setForm, set }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distortion Measurements (8 Points)</CardTitle>
        <CardDescription>Readings before and after heat treatment; the difference is computed automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs min-w-[560px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-2 px-2 text-[10px] font-bold text-slate-500 uppercase text-left w-24">Measurement</th>
                {[1,2,3,4,5,6,7,8].map(n => (
                  <th key={n} className="py-2 px-1 text-[10px] font-bold text-slate-500 uppercase">Pt. {n}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-1.5 px-2 text-xs font-bold text-slate-700 text-left">Before HT</td>
                {form.distortionBefore.map((val, i) => (
                  <td key={i} className="py-1.5 px-1">
                    <Input type="text" value={val}
                      onChange={e => { const arr=[...form.distortionBefore]; arr[i]=e.target.value; set('distortionBefore', arr); }}
                      className="h-8 sm:h-8 min-h-0 text-xs w-16 px-1 text-center tabular-nums" placeholder="NA" />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 px-2 text-xs font-bold text-emerald-700 text-left">After HT</td>
                {form.distortionAfter.map((val, i) => (
                  <td key={i} className="py-1.5 px-1">
                    <Input type="text" value={val}
                      onChange={e => { const arr=[...form.distortionAfter]; arr[i]=e.target.value; set('distortionAfter', arr); }}
                      className="h-8 sm:h-8 min-h-0 text-xs w-16 px-1 text-center tabular-nums border-emerald-200 bg-emerald-50 focus:border-emerald-300 focus:ring-emerald-200/50" placeholder="NA" />
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-50/80">
                <td className="py-2 px-2 text-[10px] font-bold text-slate-400 uppercase text-left">Δ Diff</td>
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
