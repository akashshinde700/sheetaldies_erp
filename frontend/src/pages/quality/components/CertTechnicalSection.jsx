import React from 'react';
import { useHeatTreatSpecs } from '../../../hooks/useMasterData';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const JC = 'bg-sky-50 text-sky-900 font-semibold cursor-not-allowed disabled:bg-sky-50 disabled:text-sky-900 disabled:opacity-100';

const GroupTitle = ({ children }) => (
  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{children}</p>
);

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
    <Card>
      <CardHeader>
        <CardTitle>Technical Details</CardTitle>
        <CardDescription>Material, heat treatment specification, and special instructions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ── Material & treatment ── */}
        <div className="space-y-3">
          <GroupTitle>Material &amp; Treatment</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <FormField label="Material">
              <Input value={form.dieMaterial} disabled={locked} onChange={e => set('dieMaterial', e.target.value)}
                className={locked ? JC : undefined} placeholder="D2" />
            </FormField>
            {/* Native select kept intentionally: it carries a value="" placeholder option, which Radix Select cannot represent. */}
            <FormField label="Heat Treatment Specification">
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
          </div>
        </div>

        {/* ── Instructions & delivery ── */}
        <div className="space-y-3">
          <GroupTitle>Instructions &amp; Delivery</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
            <FormField label="Special Instructions">
              <div className="space-y-1.5 pt-1">
                <CB label="CERTIFICATE"   checked={form.specInstrCertificate}  onChange={v => set('specInstrCertificate', v)} />
                <CB label="MPI REPORT"    checked={form.specInstrMpiReport}     onChange={v => set('specInstrMpiReport', v)} />
                <CB label="PROCESS GRAPH" checked={form.specInstrProcessGraph}  onChange={v => set('specInstrProcessGraph', v)} />
              </div>
            </FormField>
            <FormField label="Delivery Date">
              <Input type="date" value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)} />
            </FormField>
            <FormField label="Special Requirements">
              <Textarea value={form.specialRequirements} disabled={locked} onChange={e => set('specialRequirements', e.target.value)}
                className={`text-xs ${locked ? JC : ''}`} rows="3" style={{ minHeight: '64px' }} />
            </FormField>
          </div>
        </div>

        {/* ── Notes ── */}
        <div className="space-y-3">
          <GroupTitle>Notes</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <FormField label="Precautions During Production & Final Inspection">
              <Textarea value={form.precautions} disabled={locked} onChange={e => set('precautions', e.target.value)}
                className={`text-xs ${locked ? JC : ''}`} rows="3" style={{ minHeight: '64px' }} />
            </FormField>
            <FormField label="Special Instruction">
              <Textarea value={form.specialInstruction} onChange={e => set('specialInstruction', e.target.value)}
                rows={2} className="text-xs" style={{ minHeight: '64px' }} placeholder="Special Instruction" />
            </FormField>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
