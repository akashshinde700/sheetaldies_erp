import React, { useEffect, useState } from 'react';
import api from '../../../utils/api';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const JC = 'bg-indigo-50 text-indigo-900 font-semibold cursor-not-allowed disabled:bg-indigo-50 disabled:text-indigo-900 disabled:opacity-100';

export default function CertPackingSection({ form, set, jcData }) {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    api.get('/auth/users').then(r => setUsers(r.data.data || r.data || [])).catch(() => {});
  }, []);
  const locked = !!jcData;
  return (
    <div className="border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-3">
          <FormField label="Approved By" className="w-full sm:w-[120px]">
            <Input value={form.approvedBy} onChange={e => set('approvedBy', e.target.value)} />
          </FormField>
          <FormField label="Final Inspection By" className="w-full sm:w-[150px]">
            <Input
              list="final-insp-by-list"
              value={form.finalInspectionBy}
              onChange={e => set('finalInspectionBy', e.target.value)}
              placeholder="Type or select..."
            />
            <datalist id="final-insp-by-list">
              {users.map(u => <option key={u.id} value={u.name} />)}
            </datalist>
          </FormField>

          <FormField label="Issued To" className="w-full sm:w-[220px]">
            <Input value={form.issuedTo} disabled={locked} onChange={e => set('issuedTo', e.target.value)}
              className={locked ? JC : undefined} placeholder="Customer contact / name" />
          </FormField>

          <FormField label="Cycle No" className="w-full sm:w-[140px]">
            <Input value={form.heatNo} onChange={e => set('heatNo', e.target.value)} placeholder="HT-001" />
          </FormField>

          <FormField label="Remarks" className="w-full sm:flex-1 sm:basis-[200px]">
            <Input value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Optional" />
          </FormField>

          <FormField label="Dispatch Mode" className="w-full sm:w-[420px]">
            <div className="flex flex-nowrap items-center gap-x-4 min-h-[38px] whitespace-nowrap">
              {[
                ['dispatchByOurVehicle', 'By Our Vehicle'],
                ['dispatchByCourier',    'By Courier'],
                ['collectedByCustomer',  'Collected by Customer'],
              ].map(([field, label]) => (
                <label key={field} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                  <Checkbox
                    checked={!!form[field]}
                    onCheckedChange={checked => set(field, checked === true)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </FormField>
        </div>
    </div>
  );
}
