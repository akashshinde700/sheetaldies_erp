import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import DistortionSection from './DistortionSection';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

const EMPTY_INSP = {
  catNormal: false, catWelded: false, catCrackRisk: false, catDistortionRisk: false,
  catCriticalFinishing: false, catDentDamage: false, catRusty: false, catOthers: false,
  procStressRelieving: false, procHardening: false, procTempering: false, procAnnealing: false,
  procBrazing: false, procPlasmaNitriding: false, procSubZero: false, procSoakClean: false,
  visualBefore: false, visualAfter: false, mpiBefore: false, mpiAfter: false, mpiNil: false,
  requiredHardnessMin: '', requiredHardnessMax: '', hardnessUnit: 'HRC',
  achievedHardness: '',
  hardnessAfter1: '', hardnessAfter2: '', hardnessAfter3: '', hardnessAfter4: '',
  packedQty: '',
  incomingInspectionBy: '',
  finalInspectionBy: '',
  distortionBefore: Array(8).fill(''),
  distortionAfter: Array(8).fill(''),
};

// Parses "64-66", "64 - 66 HRC", "64–66" into { min: '64', max: '66' }.
const parseRangeMinMax = (val = '') => {
  const units = ['HRC', 'HRB', 'HRA', 'HVN', 'HV', 'HS'];
  let range = val.trim();
  for (const u of units) {
    if (range.toUpperCase().endsWith(u)) { range = range.slice(0, -u.length).trim(); break; }
  }
  const m = range.match(/^(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)$/);
  return m ? { min: m[1], max: m[2] } : null;
};

function fromInsp(i) {
  if (!i) return { ...EMPTY_INSP };
  return {
    catNormal: !!i.catNormal, catWelded: !!i.catWelded, catCrackRisk: !!i.catCrackRisk,
    catDistortionRisk: !!i.catDistortionRisk, catCriticalFinishing: !!i.catCriticalFinishing,
    catDentDamage: !!i.catDentDamage, catRusty: !!i.catRusty, catOthers: !!i.catOthers,
    procStressRelieving: !!i.procStressRelieving, procHardening: !!i.procHardening,
    procTempering: !!i.procTempering, procAnnealing: !!i.procAnnealing,
    procBrazing: !!i.procBrazing, procPlasmaNitriding: !!i.procPlasmaNitriding,
    procSubZero: !!i.procSubZero, procSoakClean: !!i.procSoakClean,
    visualBefore: !!i.visualBefore, visualAfter: i.visualAfter !== false,
    mpiBefore: !!i.mpiBefore, mpiAfter: !!i.mpiAfter, mpiNil: i.mpiNil !== false && !i.mpiAfter,
    requiredHardnessMin: i.requiredHardnessMin || '', requiredHardnessMax: i.requiredHardnessMax || '',
    hardnessUnit: i.hardnessUnit || 'HRC',
    achievedHardness: i.achievedHardness || '',
    hardnessAfter1: i.hardnessAfter1 != null ? String(i.hardnessAfter1) : '',
    hardnessAfter2: i.hardnessAfter2 != null ? String(i.hardnessAfter2) : '',
    hardnessAfter3: i.hardnessAfter3 != null ? String(i.hardnessAfter3) : '',
    hardnessAfter4: i.hardnessAfter4 != null ? String(i.hardnessAfter4) : '',
    packedQty: i.packedQty || '',
    incomingInspectionBy: i.incomingInspectionBy || '',
    finalInspectionBy: i.finalInspectionBy || '',
    distortionBefore: Array.isArray(i.distortionBefore)
      ? [...Array(8)].map((_, idx) => { const v = i.distortionBefore[idx]; return v != null && typeof v === 'object' ? (v.val ?? v.value ?? '') : (v ?? ''); })
      : Array(8).fill(''),
    distortionAfter: Array.isArray(i.distortionAfter)
      ? [...Array(8)].map((_, idx) => { const v = i.distortionAfter[idx]; return v != null && typeof v === 'object' ? (v.val ?? v.value ?? '') : (v ?? ''); })
      : Array(8).fill(''),
  };
}

const GroupTitle = ({ children }) => (
  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{children}</p>
);

const InspectionEditSection = forwardRef(function InspectionEditSection({ id, inspection, hrcRange }, ref) {
  const [state, setState] = useState(() => fromInsp(inspection));

  // Keep Req. Hardness Min/Max in sync with the Job Card's "Hardness Range" field.
  useEffect(() => {
    const parsed = parseRangeMinMax(hrcRange || '');
    if (parsed) setState(s => ({ ...s, requiredHardnessMin: parsed.min, requiredHardnessMax: parsed.max }));
  }, [hrcRange]);

  // Re-initialize if inspection data loads after first render
  const [initialized, setInitialized] = useState(!!inspection);
  if (!initialized && inspection) {
    setState(fromInsp(inspection));
    setInitialized(true);
  }
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/quality/${id}/inspection`, state);
      toast.success('Inspection saved');
    } catch { toast.error('Failed to save inspection'); }
    finally { setSaving(false); }
  };

  // Expose a silent flush so the Job Card form's main "Update" button also
  // persists inspection edits (categorization, process, hardness, distortion,
  // etc.) even when the user never clicked this section's own "Save
  // Inspection" button. Re-saving the current state is idempotent.
  useImperativeHandle(ref, () => ({
    flushPendingEdits: async () => {
      try {
        await api.put(`/quality/${id}/inspection`, state);
        return true;
      } catch {
        return false;
      }
    },
  }));

  const set = (updates) => setState(s => ({ ...s, ...updates }));
  const setField = (field, value) => setState(s => ({ ...s, [field]: value }));

  const CB = ({ field, label }) => (
    <label className="flex items-center gap-2 py-0.5 cursor-pointer select-none text-sm">
      <Checkbox
        checked={!!state[field]}
        onCheckedChange={checked => set({ [field]: checked === true })}
      />
      <span className="text-slate-700">{label}</span>
    </label>
  );

  return (
    <>
    <DistortionSection form={state} set={setField} onSave={save} saving={saving} />
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>Incoming Inspection</CardTitle>
          <CardDescription>Categorization, process, visual / MPI checks and required hardness.</CardDescription>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={save} disabled={saving} loading={saving}>
          {saving ? 'Saving…' : 'Save Inspection'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4">
          {/* Categorization */}
          <div className="space-y-2">
            <GroupTitle>Categorization</GroupTitle>
            <div className="space-y-1">
              <CB field="catNormal" label="Normal" />
              <CB field="catWelded" label="Welded" />
              <CB field="catCrackRisk" label="Crack / Crack Risk" />
              <CB field="catDistortionRisk" label="Distortion Risk" />
              <CB field="catCriticalFinishing" label="Critical Finishing" />
              <CB field="catDentDamage" label="Dent / Damage" />
              <CB field="catRusty" label="Rusty" />
              <CB field="catOthers" label="Others" />
            </div>
          </div>

          {/* Process */}
          <div className="space-y-2">
            <GroupTitle>Process</GroupTitle>
            <div className="space-y-1">
              <CB field="procStressRelieving" label="Stress Relieving" />
              <CB field="procHardening" label="Hardening" />
              <CB field="procTempering" label="Tempering" />
              <CB field="procAnnealing" label="Annealing" />
              <CB field="procBrazing" label="Brazing" />
              <CB field="procPlasmaNitriding" label="Plasma Nitriding" />
              <CB field="procSubZero" label="Sub Zero" />
              <CB field="procSoakClean" label="Soak Clean" />
            </div>
          </div>

          {/* Visual + MPI */}
          <div className="space-y-4">
            <div className="space-y-2">
              <GroupTitle>Visual Inspection</GroupTitle>
              <div className="space-y-1">
                <CB field="visualBefore" label="Before" />
                <CB field="visualAfter" label="After" />
              </div>
            </div>
            <div className="space-y-2">
              <GroupTitle>MPI Inspection</GroupTitle>
              <div className="space-y-1">
                <CB field="mpiBefore" label="Before" />
                <CB field="mpiAfter" label="After" />
                <CB field="mpiNil" label="Nil" />
              </div>
            </div>
          </div>

          {/* Hardness fields */}
          <div className="space-y-3">
            <GroupTitle>Required Hardness</GroupTitle>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3">
              {[['requiredHardnessMin','Min'],['requiredHardnessMax','Max']].map(([f, lbl]) => (
                <FormField key={f} label={lbl} htmlFor={`insp-${f}`}>
                  <Input
                    id={`insp-${f}`}
                    value={state[f]}
                    onChange={e => set({ [f]: e.target.value })}
                    inputMode="decimal"
                    className="text-right tabular-nums"
                  />
                </FormField>
              ))}
            </div>
            <FormField label="Hardness Unit" htmlFor="insp-hardnessUnit">
              <Input
                id="insp-hardnessUnit"
                list="insp-hardness-unit-list"
                value={state.hardnessUnit}
                onChange={e => set({ hardnessUnit: e.target.value })}
                maxLength={8}
                placeholder="HRC"
              />
              <datalist id="insp-hardness-unit-list">
                {['HRC','HRB','HV','HB','BHN'].map(u => <option key={u} value={u} />)}
              </datalist>
            </FormField>
            {/* Hardness After 1-4, Achieved Hardness, Packed Qty, Incoming
                Inspection By and Quality Inspection By inputs were removed from
                this edit form on request. Their values are still preserved in
                `state` (loaded via fromInsp) and re-saved untouched, so existing
                data and all print outputs remain unchanged. */}
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
});

export default InspectionEditSection;
