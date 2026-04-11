import React from 'react';

const F = ({ label, children, className }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

const CB = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 cursor-pointer group py-0.5">
    <button type="button" onClick={() => onChange(!checked)}
      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
        checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'
      }`}>
      {checked && <span className="material-symbols-outlined text-white text-[11px] leading-none">check</span>}
    </button>
    <span className="text-xs text-slate-700 font-medium">{label}</span>
  </label>
);

export default function CertTechnicalSection({ form, set, updateTemperatureCycle }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <F label="Material">
          <input value={form.dieMaterial} onChange={e => set('dieMaterial', e.target.value)} className="form-input" placeholder="D2" />
        </F>
        <F label="Heat Treatment Specification">
          <select value={form.operatorMode} onChange={e => {
            set('operatorMode', e.target.value);
            updateTemperatureCycle(e.target.value);
          }} className="form-input">
            <option value="">— Select Heat Treatment —</option>
            <option value="HDS">HDS Cycle</option>
            <option value="D2">D2 Cycle</option>
            <option value="HSS">HSS Cycle</option>
            <option value="D3">D3 Cycle</option>
            <option value="STRESS RELIEVING">Stress Relieving</option>
            <option value="ANNEALING">Annealing</option>
          </select>
        </F>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <F label="Special Instructions:">
          <div className="space-y-2">
            <CB label="CERTIFICATE" checked={form.specInstrCertificate} onChange={v => set('specInstrCertificate', v)} />
            <CB label="MPI REPORT" checked={form.specInstrMpiReport} onChange={v => set('specInstrMpiReport', v)} />
            <CB label="PROCESS GRAPH" checked={form.specInstrProcessGraph} onChange={v => set('specInstrProcessGraph', v)} />
          </div>
        </F>
        <F label="Delivery Date">
          <input type="date" value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)} className="form-input" />
        </F>
        <F label="Special Requirements">
          <textarea value={form.specialRequirements} onChange={e => set('specialRequirements', e.target.value)} className="form-input text-xs" rows="3" placeholder="Any special instructions..." />
        </F>
      </div>
      <div>
        <F label="Precautions During Production & Final Inspection">
          <textarea value={form.precautions} onChange={e => set('precautions', e.target.value)} className="form-input text-xs" rows="3" placeholder="Safety precautions, handling instructions, etc." />
        </F>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <F label="Special Instruction">
          <textarea value={form.specialInstruction} onChange={e => set('specialInstruction', e.target.value)} rows={2} className="form-input resize-none" placeholder="Special Instruction"></textarea>
        </F>
      </div>
    </div>
  );
}
