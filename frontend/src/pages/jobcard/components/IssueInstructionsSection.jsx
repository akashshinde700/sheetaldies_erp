import React, { useEffect, useState } from 'react';
import api from '../../../utils/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const GroupTitle = ({ children }) => (
  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{children}</p>
);

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
      <CardHeader>
        <CardTitle>Issue Details &amp; Special Instructions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* ── Issue details ── */}
        <div className="space-y-3">
          <GroupTitle>Issue</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <FormField label="Issue Date" htmlFor="issueDate">
              <Input
                id="issueDate"
                type="date"
                value={form.issueDate}
                onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))}
              />
            </FormField>
            <FormField label="Issued By" htmlFor="issueBy">
              <Input
                id="issueBy"
                list="issue-by-suggestions-list"
                value={form.issueBy}
                onChange={e => setForm(p => ({ ...p, issueBy: e.target.value }))}
                placeholder="Issued By"
                autoComplete="off"
              />
              <datalist id="issue-by-suggestions-list">
                {issueBySuggestions.map(name => <option key={name} value={name} />)}
              </datalist>
            </FormField>
          </div>
        </div>

        {/* ── Special instructions ── */}
        <div className="space-y-3">
          <GroupTitle>Special Instructions</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-3">
            {SPECIAL_INSTRUCTIONS.map(({ field, label }) => (
              <label
                key={field}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 cursor-pointer select-none transition-colors hover:border-sky-300 hover:bg-sky-50/40"
              >
                <Checkbox
                  checked={!!form[field]}
                  onCheckedChange={checked => setForm(p => ({ ...p, [field]: checked === true }))}
                />
                <span className="text-sm text-slate-700 font-medium">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
