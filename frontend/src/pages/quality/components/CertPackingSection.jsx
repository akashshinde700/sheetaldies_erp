import React, { useEffect, useState } from 'react';
import api from '../../../utils/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

const JC = 'bg-indigo-50 text-indigo-900 font-semibold cursor-not-allowed disabled:bg-indigo-50 disabled:text-indigo-900 disabled:opacity-100';

const GroupTitle = ({ children }) => (
  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{children}</p>
);

export default function CertPackingSection({ form, set, jcData }) {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    api.get('/auth/users').then(r => setUsers(r.data.data || r.data || [])).catch(() => {});
  }, []);
  const locked = !!jcData;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Packing &amp; Approval</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ── Cert-specific editable fields ── */}
        <div className="space-y-3">
          <GroupTitle>Packing</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
            <FormField label="Packed Qty">
              <Input type="number" inputMode="numeric" value={form.packedQty} onChange={e => set('packedQty', e.target.value)}
                className="text-right tabular-nums" />
            </FormField>
            <FormField label="Packed By">
              <Input value={form.packedBy} onChange={e => set('packedBy', e.target.value)} />
            </FormField>
            <FormField label="Approved By">
              <Input value={form.approvedBy} onChange={e => set('approvedBy', e.target.value)} />
            </FormField>
            <FormField label="Final Inspection By">
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
          </div>
        </div>

        {/* ── Job-card-locked fields ── */}
        <div className={`space-y-3 ${locked ? 'bg-indigo-50/40 rounded-xl p-3' : ''}`}>
          <div className="flex items-center gap-2">
            <GroupTitle>Issue &amp; Dispatch Mode</GroupTitle>
            {locked && <Badge className="bg-indigo-100 text-indigo-700 text-[10px]">from Job Card</Badge>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
            <FormField label="Issued To">
              <Input value={form.issuedTo} disabled={locked} onChange={e => set('issuedTo', e.target.value)}
                className={locked ? JC : undefined} placeholder="Customer contact / name" />
            </FormField>
            <FormField label="Cycle No">
              <Input value={form.heatNo} onChange={e => set('heatNo', e.target.value)} placeholder="HT-001" />
            </FormField>
            <FormField label="Dispatch Mode">
              <div className="flex flex-col gap-1.5 pt-1">
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

        {/* ── Dispatch details — always editable ── */}
        <div className="space-y-3">
          <GroupTitle>Dispatch Details</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
            <FormField label="Dispatch Challan No">
              <Input value={form.dispatchChallanNo} onChange={e => set('dispatchChallanNo', e.target.value)} placeholder="DC-001" />
            </FormField>
            <FormField label="Dispatch Challan Date">
              <Input type="date" value={form.dispatchChallanDate} onChange={e => set('dispatchChallanDate', e.target.value)} />
            </FormField>
            <FormField label="Dispatched Through">
              <Input value={form.dispatchedThrough} onChange={e => set('dispatchedThrough', e.target.value)} placeholder="Transport company name" />
            </FormField>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
