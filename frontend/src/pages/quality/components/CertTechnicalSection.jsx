import React from 'react';
import { useHeatTreatSpecs } from '../../../hooks/useMasterData';

const F = ({ label, children, className }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

const JC = 'form-input bg-sky-50 text-sky-900 font-semibold cursor-not-allowed';

const CB = ({ label, checked, onChange, locked }) => (
  <label className={`flex items-center gap-2 py-0.5 ${locked ? 'cursor-not-allowed' : 'cursor-pointer group'}`}>
    <button type="button" onClick={() => !locked && onChange(!checked)}
      disabled={locked}
      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
        checked
          ? locked ? 'bg-sky-400 border-sky-400' : 'bg-sky-600 border-sky-600'
          : locked ? 'border-slate-200 bg-slate-50' : 'border-slate-300 group-hover:border-sky-400'
      }`}>
      {checked && <span className="material-symbols-outlined text-white text-[11px] leading-none">check</span>}
    </button>
    <span className={`text-xs font-medium ${locked ? 'text-sky-700' : 'text-slate-700'}`}>{label}</span>
  </label>
);

export default function CertTechnicalSection({ form, set, updateTemperatureCycle, jcData }) {
  const locked = !!jcData;
  const { data: htSpecs = [] } = useHeatTreatSpecs();
  return (
    <div className="card p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <F label="Material">
          <input value={form.dieMaterial} disabled={locked} onChange={e => set('dieMaterial', e.target.value)}
            className={locked ? JC : 'form-input'} placeholder="D2" />
        </F>
        <F label="Heat Treatment Specification">
          <select value={form.operatorMode} onChange={e => {
            set('operatorMode', e.target.value);
            updateTemperatureCycle(e.target.value);
          }} className="form-input">
            <option value="">— Select Heat Treatment —</option>
            <optgroup label="Material-specific cycles">
              <option value="D2">D2 — Cold Work Tool Steel</option>
              <option value="H13 / HDS">H13 / HDS — Hot Work Die Steel</option>
              <option value="HSS">HSS — High Speed Steel</option>
              <option value="D3">D3 — High-C High-Cr Cold Work</option>
            </optgroup>
            {htSpecs.length > 0 ? (
              <optgroup label="Heat Treatment Specs">
                {htSpecs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </optgroup>
            ) : (
              <>
                <optgroup label="Generic cycles">
                  <option value="HARDEN AND TEMPER">HARDEN AND TEMPER (D2 default)</option>
                  <option value="STRESS RELIEVING">STRESS RELIEVING</option>
                  <option value="ANNEALING">ANNEALING</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="NORMAL">NORMAL</option>
                  <option value="REWORK">REWORK</option>
                </optgroup>
              </>
            )}
          </select>
        </F>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <F label="Special Instructions">
          <div className="space-y-2">
            <CB label="CERTIFICATE"   checked={form.specInstrCertificate}  onChange={v => set('specInstrCertificate', v)} />
            <CB label="MPI REPORT"    checked={form.specInstrMpiReport}     onChange={v => set('specInstrMpiReport', v)} />
            <CB label="PROCESS GRAPH" checked={form.specInstrProcessGraph}  onChange={v => set('specInstrProcessGraph', v)} />
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
