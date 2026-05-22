import React from 'react';

const F = ({ label, children, className }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

const JC = 'form-input bg-indigo-50 text-indigo-900 font-semibold cursor-not-allowed';

const CB = ({ label, checked, onChange, locked }) => (
  <label className={`flex items-center gap-2 py-0.5 ${locked ? 'cursor-not-allowed' : 'cursor-pointer group'}`}>
    <button type="button" onClick={() => !locked && onChange(!checked)}
      disabled={locked}
      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
        checked
          ? locked ? 'bg-indigo-400 border-indigo-400' : 'bg-indigo-600 border-indigo-600'
          : locked ? 'border-slate-200 bg-slate-50' : 'border-slate-300 group-hover:border-indigo-400'
      }`}>
      {checked && <span className="material-symbols-outlined text-white text-[11px] leading-none">check</span>}
    </button>
    <span className={`text-xs font-medium ${locked ? 'text-indigo-700' : 'text-slate-700'}`}>{label}</span>
  </label>
);

export default function CertTechnicalSection({ form, set, updateTemperatureCycle, jcData }) {
  const locked = !!jcData;
  return (
    <div className="card p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <F label="Material">
          <input value={form.dieMaterial} disabled={locked} onChange={e => set('dieMaterial', e.target.value)}
            className={locked ? JC : 'form-input'} placeholder="D2" />
        </F>
        <F label="Heat Treatment Specification">
          {locked ? (
            <input value={form.operatorMode} disabled className={JC} />
          ) : (
            <select value={form.operatorMode} onChange={e => {
              set('operatorMode', e.target.value);
              updateTemperatureCycle(e.target.value);
            }} className="form-input">
              <option value="">— Select Heat Treatment —</option>
              <option value="NORMAL">NORMAL</option>
              <option value="HARDEN AND TEMPER">HARDEN AND TEMPER</option>
              <option value="STRESS RELIEVING">STRESS RELIEVING</option>
              <option value="ANNEALING">ANNEALING</option>
              <option value="REWORK">REWORK</option>
            </select>
          )}
        </F>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <F label="Special Instructions">
          <div className={`space-y-2 ${locked ? 'bg-indigo-50 rounded-lg p-2' : ''}`}>
            <CB label="CERTIFICATE"   checked={form.specInstrCertificate}  onChange={v => set('specInstrCertificate', v)}  locked={locked} />
            <CB label="MPI REPORT"    checked={form.specInstrMpiReport}     onChange={v => set('specInstrMpiReport', v)}     locked={locked} />
            <CB label="PROCESS GRAPH" checked={form.specInstrProcessGraph}  onChange={v => set('specInstrProcessGraph', v)}  locked={locked} />
          </div>
        </F>
        <F label="Delivery Date">
          <input type="date" value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)} className="form-input" />
        </F>
        <F label="Special Requirements">
          <textarea value={form.specialRequirements} disabled={locked} onChange={e => set('specialRequirements', e.target.value)}
            className={`${locked ? JC : 'form-input'} text-xs resize-none`} rows="3" />
        </F>
      </div>
      <F label="Precautions During Production & Final Inspection">
        <textarea value={form.precautions} disabled={locked} onChange={e => set('precautions', e.target.value)}
          className={`${locked ? JC : 'form-input'} text-xs resize-none`} rows="3" />
      </F>
      <F label="Special Instruction">
        <textarea value={form.specialInstruction} onChange={e => set('specialInstruction', e.target.value)}
          rows={2} className="form-input resize-none" placeholder="Special Instruction" />
      </F>
    </div>
  );
}
