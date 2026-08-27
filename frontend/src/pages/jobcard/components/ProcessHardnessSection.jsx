import React from 'react';
import SearchSelect from '../../../components/SearchSelect';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const HARDNESS_UNITS = ['HRC', 'HRB', 'HV', 'HB'];

const CB = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2.5 cursor-pointer select-none py-0.5">
    <Checkbox checked={checked} onCheckedChange={c => onChange(c === true)} />
    <span className="text-xs text-slate-700 font-medium">{label}</span>
  </label>
);

const GroupTitle = ({ children }) => (
  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{children}</p>
);

export default function ProcessHardnessSection({ form, set, processes, inRange }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Process &amp; Inspection</CardTitle>
        <CardDescription>Processes performed, checks and hardness results.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Primary Process">
          <SearchSelect
            value={String(form.processTypeId || '')}
            onChange={v => set('processTypeId', v)}
            options={(processes || []).map(p => ({ value: p.id, label: p.name }))}
            placeholder="— Select Process —"
          />
        </FormField>

        <div className="space-y-2">
          <GroupTitle>Processes</GroupTitle>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <CB label="Stress Relieving" checked={form.procStressRelieving} onChange={v => set('procStressRelieving', v)} />
            <CB label="Hardening"        checked={form.procHardening}       onChange={v => set('procHardening', v)} />
            <CB label="Tempering"        checked={form.procTempering}       onChange={v => set('procTempering', v)} />
            <CB label="Annealing"        checked={form.procAnnealing}       onChange={v => set('procAnnealing', v)} />
            <CB label="Brazing"          checked={form.procBrazing}         onChange={v => set('procBrazing', v)} />
            <CB label="Plasma Nitriding" checked={form.procPlasmaNitriding} onChange={v => set('procPlasmaNitriding', v)} />
            <CB label="Nitriding"        checked={form.procNitriding}       onChange={v => set('procNitriding', v)} />
            <CB label="Sub Zero"         checked={form.procSubZero}         onChange={v => set('procSubZero', v)} />
            <CB label="Soak Clean"       checked={form.procSoakClean}       onChange={v => set('procSoakClean', v)} />
            <CB label="Slow Cool"        checked={form.procSlowCool}        onChange={v => set('procSlowCool', v)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-slate-100">
          <div className="space-y-2">
            <GroupTitle>Visual</GroupTitle>
            <div className="space-y-1.5">
              <CB label="Before" checked={form.visualBefore} onChange={v => set('visualBefore', v)} />
              <CB label="After"  checked={form.visualAfter}  onChange={v => set('visualAfter', v)} />
            </div>
          </div>
          <div className="space-y-2">
            <GroupTitle>MPI</GroupTitle>
            <div className="space-y-1.5">
              <CB label="Before" checked={form.mpiBefore} onChange={v => set('mpiBefore', v)} />
              <CB label="After"  checked={form.mpiAfter}  onChange={v => set('mpiAfter', v)} />
              <CB label="NIL"    checked={form.mpiNil}    onChange={v => set('mpiNil', v)} />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 space-y-2">
          <GroupTitle>Required Hardness</GroupTitle>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              value={form.requiredHardnessMin}
              onChange={e => set('requiredHardnessMin', e.target.value)}
              className="w-16 text-center tabular-nums bg-white"
              placeholder="Min"
              aria-label="Required hardness min"
            />
            <span className="text-slate-400 font-bold">–</span>
            <Input
              type="number"
              inputMode="decimal"
              value={form.requiredHardnessMax}
              onChange={e => set('requiredHardnessMax', e.target.value)}
              className="w-16 text-center tabular-nums bg-white"
              placeholder="Max"
              aria-label="Required hardness max"
            />
            <Select value={form.hardnessUnit} onValueChange={v => set('hardnessUnit', v)}>
              <SelectTrigger className="w-24 bg-white" aria-label="Hardness unit">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                {HARDNESS_UNITS.map(u => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={`rounded-xl p-3 border space-y-2 ${inRange ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
          <p className={`text-[10px] font-extrabold uppercase tracking-widest ${inRange ? 'text-emerald-700' : 'text-slate-400'}`}>Achieved Hardness</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              value={form.achievedHardness}
              onChange={e => set('achievedHardness', e.target.value)}
              className={`w-24 text-center tabular-nums text-lg font-extrabold bg-white ${inRange ? 'border-emerald-200 text-emerald-800' : 'text-slate-800'}`}
              placeholder="56"
              aria-label="Achieved hardness"
            />
            <span className={`text-sm font-bold ${inRange ? 'text-emerald-700' : 'text-slate-600'}`}>{form.hardnessUnit}</span>
            {form.achievedHardness && form.requiredHardnessMin && form.requiredHardnessMax && (
              <Badge variant={inRange ? 'success' : 'error'} className="ml-auto text-[10px]">
                {inRange ? 'IN RANGE' : 'OUT OF RANGE'}
              </Badge>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-2">
          <GroupTitle>Hardness After (4 readings)</GroupTitle>
          <div className="grid grid-cols-4 gap-2">
            {[
              ['hardnessAfter1','1'],
              ['hardnessAfter2','2'],
              ['hardnessAfter3','3'],
              ['hardnessAfter4','4'],
            ].map(([k, lbl]) => (
              <Input
                key={k}
                type="number"
                inputMode="decimal"
                value={form[k]}
                onChange={e => set(k, e.target.value)}
                className="text-center tabular-nums bg-white"
                placeholder={lbl}
                aria-label={`Hardness reading ${lbl}`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
          <span className="text-xs font-bold text-slate-600">Urgent</span>
          <Button
            type="button"
            variant={form.urgent ? 'danger' : 'outline'}
            size="sm"
            onClick={() => set('urgent', !form.urgent)}
            className={form.urgent ? '' : 'hover:border-rose-300 hover:text-rose-600'}
          >
            {form.urgent ? 'YES' : 'NO'}
          </Button>
        </div>

        <FormField label="Final Status">
          <Select value={form.inspectionStatus} onValueChange={v => set('inspectionStatus', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PASS">Pass</SelectItem>
              <SelectItem value="FAIL">Fail</SelectItem>
              <SelectItem value="CONDITIONAL">Conditional</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </CardContent>
    </Card>
  );
}
