import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

export default function InspectorDetailsSection({ form, set }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspector Details</CardTitle>
        <CardDescription>Who inspected, packed and signed off.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          <FormField label="Incoming Inspection By" htmlFor="incomingInspectionBy">
            <Input
              id="incomingInspectionBy"
              value={form.incomingInspectionBy}
              onChange={e => set('incomingInspectionBy', e.target.value)}
              placeholder="Inspector name"
            />
          </FormField>
          <FormField label="Final Inspection By" htmlFor="finalInspectionBy">
            <Input
              id="finalInspectionBy"
              value={form.finalInspectionBy}
              onChange={e => set('finalInspectionBy', e.target.value)}
              placeholder="Inspector name"
            />
          </FormField>
          <FormField label="Inspected By" htmlFor="inspectedBy">
            <Input
              id="inspectedBy"
              value={form.inspectedBy}
              onChange={e => set('inspectedBy', e.target.value)}
              placeholder="Inspector name"
            />
          </FormField>
          <FormField label="Packed Qty" htmlFor="packedQty">
            <Input
              id="packedQty"
              type="number"
              inputMode="numeric"
              value={form.packedQty}
              onChange={e => set('packedQty', e.target.value)}
              placeholder="0"
              className="text-right tabular-nums"
            />
          </FormField>
          <FormField label="Packed By" htmlFor="packedBy">
            <Input
              id="packedBy"
              value={form.packedBy}
              onChange={e => set('packedBy', e.target.value)}
              placeholder="Packer name"
            />
          </FormField>
          <FormField label="Inspection Date" htmlFor="inspectionDate">
            <Input
              id="inspectionDate"
              type="date"
              value={form.inspectionDate}
              onChange={e => set('inspectionDate', e.target.value)}
            />
          </FormField>
          <FormField label="Remarks" htmlFor="inspectionRemarks" className="sm:col-span-2">
            <Input
              id="inspectionRemarks"
              value={form.remarks}
              onChange={e => set('remarks', e.target.value)}
              placeholder="Any remarks..."
            />
          </FormField>
        </div>
      </CardContent>
    </Card>
  );
}
