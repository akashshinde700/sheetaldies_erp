import React from 'react';
import SearchSelect from '../../../components/SearchSelect';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TRANSPORT_MODES = ['Hand Delivery', 'Courier', 'Own Vehicle', 'Transporter'];

const GroupTitle = ({ children }) => (
  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{children}</p>
);

export default function ChallanDetailsSection({
  isEdit, form, setForm, jobCards, parties,
  manualChallanNo, setManualChallanNo,
  challanNoInput, setChallanNoInput, addDays
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Challan Details</CardTitle>
        <CardDescription>Basic challan info, parties and transport details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ── Challan basics ── */}
        <div className="space-y-3">
          <GroupTitle>Challan</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4">
            <FormField label="Challan Date" htmlFor="challanDate" required>
              <Input
                id="challanDate"
                type="date"
                value={form.challanDate}
                onChange={e => setForm(p => ({ ...p, challanDate: e.target.value, dispatchDate: e.target.value, dueDate: addDays(e.target.value, 4) }))}
                required
              />
            </FormField>

            {isEdit ? (
              <FormField label="Challan No" htmlFor="challanNo">
                <Input
                  id="challanNo"
                  value={challanNoInput}
                  onChange={e => setChallanNoInput(e.target.value)}
                  placeholder="Challan No"
                />
              </FormField>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="challanNo">Challan No</Label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <Checkbox
                      checked={manualChallanNo}
                      onCheckedChange={checked => {
                        const isChecked = checked === true;
                        setManualChallanNo(isChecked);
                        if (!isChecked) setChallanNoInput('');
                      }}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-[11px] text-slate-500">Manual</span>
                  </label>
                </div>
                {manualChallanNo ? (
                  <Input
                    id="challanNo"
                    value={challanNoInput}
                    onChange={e => setChallanNoInput(e.target.value)}
                    placeholder="e.g. SVT/JW/25-26/0050"
                    required
                  />
                ) : (
                  <Input id="challanNo" value="Auto-generated" disabled />
                )}
              </div>
            )}

            <FormField label="Link Job Card" hint="Optional — links this challan to an open job card">
              <SearchSelect
                value={form.jobCardId}
                onChange={v => setForm(p => ({ ...p, jobCardId: v }))}
                options={jobCards
                  .filter((jc) => ['CREATED', 'IN_PROGRESS'].includes(jc.status) || String(jc.id) === String(form.jobCardId))
                  .map(jc => ({ value: jc.id, label: `${jc.jobCardNo} — ${jc.part?.partNo || ''}` }))}
                placeholder="— Optional —"
              />
            </FormField>

            <FormField label="Invoice Ch. No" htmlFor="invoiceChNo">
              <Input
                id="invoiceChNo"
                value={form.invoiceChNo}
                onChange={e => setForm(p => ({ ...p, invoiceChNo: e.target.value }))}
                placeholder="Reference invoice no"
              />
            </FormField>

            <FormField label="Invoice Ch. Date" htmlFor="invoiceChDate">
              <Input
                id="invoiceChDate"
                type="date"
                value={form.invoiceChDate}
                onChange={e => setForm(p => ({ ...p, invoiceChDate: e.target.value }))}
              />
            </FormField>
          </div>
        </div>

        {/* ── Parties ── */}
        <div className="space-y-3">
          <GroupTitle>Parties</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <FormField label="From Party (Sender)" required>
              <SearchSelect
                value={form.fromPartyId}
                onChange={v => setForm(p => ({ ...p, fromPartyId: v }))}
                options={parties.map(p => ({ value: p.id, label: p.name }))}
                placeholder="— Select Sender —"
                required
              />
            </FormField>
            <FormField label="To Party (Processor)" required>
              <SearchSelect
                value={form.toPartyId}
                onChange={v => setForm(p => ({ ...p, toPartyId: v }))}
                options={parties.filter(p => p.partyType === 'VENDOR' || p.partyType === 'BOTH').map(p => ({ value: p.id, label: p.name }))}
                placeholder="— Select Processor —"
                required
              />
            </FormField>
          </div>
        </div>

        {/* ── Transport & dates ── */}
        <div className="space-y-3">
          <GroupTitle>Transport &amp; Dates</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4">
            <FormField label="Transport Mode">
              <Select
                value={form.transportMode}
                onValueChange={v => setForm(p => ({ ...p, transportMode: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPORT_MODES.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Vehicle No" htmlFor="vehicleNo">
              <Input
                id="vehicleNo"
                value={form.vehicleNo}
                onChange={e => setForm(p => ({ ...p, vehicleNo: e.target.value }))}
                placeholder="MH12 AB 1234"
              />
            </FormField>

            <FormField label="Delivery Person" htmlFor="deliveryPerson">
              <Input
                id="deliveryPerson"
                value={form.deliveryPerson}
                onChange={e => setForm(p => ({ ...p, deliveryPerson: e.target.value }))}
                placeholder="Name of person delivering"
              />
            </FormField>

            <FormField label="Dispatch Date" htmlFor="dispatchDate">
              <Input
                id="dispatchDate"
                type="date"
                value={form.dispatchDate}
                onChange={e => setForm(p => ({ ...p, dispatchDate: e.target.value }))}
              />
            </FormField>

            <FormField label="Due Date (Return by)" htmlFor="dueDate">
              <Input
                id="dueDate"
                type="date"
                value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
              />
            </FormField>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
