import React, { useEffect, useState } from 'react';
import api from '../../../utils/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const SPECIAL_INSTRUCTIONS = [
  { field: 'specInstrCert', label: 'Certificate' },
  { field: 'specInstrMPIRep', label: 'MPI Report' },
  { field: 'specInstrGraph', label: 'Process Graph' },
];

export default function IssueInstructionsSection({ form, setForm }) {
  const [issueBySuggestions, setIssueBySuggestions] = useState([]);

  useEffect(() => {
    api.get('/jobcards/issue-by-suggestions').then(r => setIssueBySuggestions(r.data.data || [])).catch(() => {});
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle>Issue Details &amp; Special Instructions</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-12">
          <FormField label="Issue Date" htmlFor="issueDate" className="lg:col-span-2">
            <Input id="issueDate" type="date" value={form.issueDate}
              onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))} />
          </FormField>
          <FormField label="Issued By" htmlFor="issueBy" className="lg:col-span-3">
            <Input id="issueBy" list="issue-by-suggestions-list" value={form.issueBy}
              onChange={e => setForm(p => ({ ...p, issueBy: e.target.value }))} placeholder="Issued By" autoComplete="off" />
            <datalist id="issue-by-suggestions-list">
              {issueBySuggestions.map(name => <option key={name} value={name} />)}
            </datalist>
          </FormField>
          <FormField label="Docs needed on job card" className="col-span-2 lg:col-span-7">
            <div className="flex min-h-[34px] flex-wrap items-center gap-x-4 gap-y-1">
              {SPECIAL_INSTRUCTIONS.map(({ field, label }) => (
                <label key={field} className="flex cursor-pointer select-none items-center gap-1.5 text-sm text-slate-700">
                  <Checkbox checked={!!form[field]}
                    onCheckedChange={checked => setForm(p => ({ ...p, [field]: checked === true }))} />
                  {label}
                </label>
              ))}
            </div>
          </FormField>
        </div>
      </CardContent>
    </Card>
  );
}
