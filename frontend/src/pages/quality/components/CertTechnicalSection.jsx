import React from 'react';
import { useHeatTreatSpecs } from '../../../hooks/useMasterData';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

const JC = 'bg-sky-50 text-sky-900 font-semibold cursor-not-allowed disabled:bg-sky-50 disabled:text-sky-900 disabled:opacity-100';

const CB = ({ label, checked, onChange, locked }) => (
  <label className={`flex items-center gap-1.5 ${locked ? 'cursor-not-allowed' : 'cursor-pointer group'}`}>
    <button type="button" onClick={() => !locked && onChange(!checked)}
      disabled={locked}
      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
        checked
          ? locked ? 'bg-sky-400 border-sky-400' : 'bg-sky-600 border-sky-600'
          : locked ? 'border-slate-200 bg-slate-50' : 'border-slate-300 group-hover:border-sky-400'
      }`}>
      {checked && <span className="material-symbols-outlined text-white text-[11px] leading-none">check</span>}
    </button>
    <span className={`text-xs font-medium whitespace-nowrap ${locked ? 'text-sky-700' : 'text-slate-700'}`}>{label}</span>
  </label>
);

export default function CertTechnicalSection({ form, set, updateTemperatureCycle, jcData }) {
  const locked = !!jcData;
  const { data: htSpecs = [] } = useHeatTreatSpecs();
  return (
    <div className="border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-3">
          <FormField label="Your PO Date" className="w-full sm:w-[130px]">
            <Input type="date" value={form.yourPoDate} onChange={e => set('yourPoDate', e.target.value)} />
          </FormField>

          <FormField label="Your DC No." className="w-full sm:w-[100px]">
            <Input value={form.yourRefNo} onChange={e => set('yourRefNo', e.target.value)} />
          </FormField>

          <FormField label="Material" className="w-full sm:w-[130px]">
            <Input value={form.dieMaterial} disabled={locked} onChange={e => set('dieMaterial', e.target.value)}
              className={locked ? JC : undefined} placeholder="D2" />
          </FormField>

          {/* Native select kept intentionally: it carries a value="" placeholder option, which Radix Select cannot represent. */}
          <FormField label="Heat Treatment Specification" className="w-full sm:w-[190px]">
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
          </FormField>

          <FormField label="Special Instructions" className="w-full sm:w-[340px]">
            <div className="flex min-h-[38px] flex-nowrap items-center gap-x-3 whitespace-nowrap">
              <CB label="CERTIFICATE"   checked={form.specInstrCertificate}  onChange={v => set('specInstrCertificate', v)} />
              <CB label="MPI REPORT"    checked={form.specInstrMpiReport}     onChange={v => set('specInstrMpiReport', v)} />
              <CB label="PROCESS GRAPH" checked={form.specInstrProcessGraph}  onChange={v => set('specInstrProcessGraph', v)} />
            </div>
          </FormField>

          <FormField label="Delivery Date" className="w-full sm:w-[130px]">
            <Input type="date" value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)} />
          </FormField>
        </div>

    </div>
  );
}
