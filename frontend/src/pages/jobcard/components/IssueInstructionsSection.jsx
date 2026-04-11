import React from 'react';

const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function IssueInstructionsSection({ form, setForm }) {
  return (
    <div className="card p-5 space-y-4">
      <p className="section-title border-b border-slate-100 pb-2">Issue Details & Special Instructions</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="Issue Date">
          <input type="date" value={form.issueDate} onChange={e => setForm(p => ({...p, issueDate: e.target.value}))} className="form-input" />
        </F>
        <F label="Issue By">
          <input value={form.issueBy} onChange={e => setForm(p => ({...p, issueBy: e.target.value}))} className="form-input" placeholder="Issue By" />
        </F>
      </div>
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-100">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Special Instructions (What to Include)</p>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" checked={form.specInstrCert} onChange={e => setForm(p => ({...p, specInstrCert: e.target.checked}))}
              className="w-4 h-4 rounded border-2 border-indigo-300 accent-indigo-600 cursor-pointer" />
            <span className="text-sm text-slate-700 font-medium">☑ CERTIFICATE</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" checked={form.specInstrMPIRep} onChange={e => setForm(p => ({...p, specInstrMPIRep: e.target.checked}))}
              className="w-4 h-4 rounded border-2 border-indigo-300 accent-indigo-600 cursor-pointer" />
            <span className="text-sm text-slate-700 font-medium">☐ MPI REPORT</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" checked={form.specInstrGraph} onChange={e => setForm(p => ({...p, specInstrGraph: e.target.checked}))}
              className="w-4 h-4 rounded border-2 border-indigo-300 accent-indigo-600 cursor-pointer" />
            <span className="text-sm text-slate-700 font-medium">☐ PROCESS GRAPH</span>
          </label>
        </div>
      </div>
    </div>
  );
}
