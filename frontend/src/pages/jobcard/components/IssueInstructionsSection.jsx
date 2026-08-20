import React, { useEffect, useState } from 'react';
import api from '../../../utils/api';

const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function IssueInstructionsSection({ form, setForm }) {
  const [issueBySuggestions, setIssueBySuggestions] = useState([]);

  useEffect(() => {
    api.get('/jobcards/issue-by-suggestions').then(r => setIssueBySuggestions(r.data.data || [])).catch(() => {});
  }, []);

  return (
    <div className="card p-5 space-y-4">
      <p className="section-title border-b border-slate-100 pb-2">Issue Details & Special Instructions</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="Issue Date">
          <input type="date" value={form.issueDate} onChange={e => setForm(p => ({...p, issueDate: e.target.value}))} className="form-input" />
        </F>
        <F label="Issued By">
          <input
            list="issue-by-suggestions-list"
            value={form.issueBy}
            onChange={e => setForm(p => ({...p, issueBy: e.target.value}))}
            className="form-input"
            placeholder="Issued By"
            autoComplete="off"
          />
          <datalist id="issue-by-suggestions-list">
            {issueBySuggestions.map(name => <option key={name} value={name} />)}
          </datalist>
        </F>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">Special Instructions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 cursor-pointer transition-shadow hover:shadow-sm">
            <input type="checkbox" checked={form.specInstrCert} onChange={e => setForm(p => ({...p, specInstrCert: e.target.checked}))}
              className="w-4 h-4 rounded accent-indigo-600" />
            <span className="text-sm text-slate-700 font-medium">Certificate</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 cursor-pointer transition-shadow hover:shadow-sm">
            <input type="checkbox" checked={form.specInstrMPIRep} onChange={e => setForm(p => ({...p, specInstrMPIRep: e.target.checked}))}
              className="w-4 h-4 rounded accent-indigo-600" />
            <span className="text-sm text-slate-700 font-medium">MPI Report</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 cursor-pointer transition-shadow hover:shadow-sm">
            <input type="checkbox" checked={form.specInstrGraph} onChange={e => setForm(p => ({...p, specInstrGraph: e.target.checked}))}
              className="w-4 h-4 rounded accent-indigo-600" />
            <span className="text-sm text-slate-700 font-medium">Process Graph</span>
          </label>
        </div>
      </div>
    </div>
  );
}
