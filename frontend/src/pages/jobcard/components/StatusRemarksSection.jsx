import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';

export default function StatusRemarksSection({ form, setForm }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Production Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-3">
          <FormField label="Special Requirements" htmlFor="specialRequirements">
            <Textarea
              id="specialRequirements"
              value={form.specialRequirements}
              onChange={e => setForm(p => ({ ...p, specialRequirements: e.target.value }))}
              rows={2}
              placeholder="Enter any specific process or handling requirements"
            />
          </FormField>
          <FormField label="Precautions During Production & Final Inspection" htmlFor="precautions">
            <Textarea
              id="precautions"
              value={form.precautions}
              onChange={e => setForm(p => ({ ...p, precautions: e.target.value }))}
              rows={2}
              placeholder="Enter any safety or quality precautions"
            />
          </FormField>
        </div>
      </CardContent>
    </Card>
  );
}
