import React from 'react';
import { useHeatTreatSpecs } from '../../../hooks/useMasterData';

const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function JobCardHeaderInfoSection({ form, setForm, cardData }) {
  const { data: htSpecs = [] } = useHeatTreatSpecs();

  return (
    <div className="card p-5 space-y-4">
      <p className="section-title border-b border-slate-100 pb-2">Job Card Info</p>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <F label="Job Card No.">
          <input value={cardData?.jobCardNo || 'Auto-generated'} disabled className="form-input bg-slate-50" />
        </F>

        {cardData && (() => {
          const inwardNo = cardData.challanItemLinks?.[0]?.challan?.inwardNo
            || cardData.challans?.[0]?.inwardNo
            || null;
          return inwardNo ? (
            <F label="Inward No.">
              <input value={inwardNo} disabled className="form-input bg-indigo-50 text-indigo-700 font-mono font-bold" />
            </F>
          ) : null;
        })()}

        <F label="Certificate No.">
          <input value={form.certificateNo} onChange={e => setForm(p => ({ ...p, certificateNo: e.target.value }))} className="form-input" placeholder="Certificate No." />
        </F>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <F label="Your PO No.">
          <input value={form.yourNo} onChange={e => setForm(p => ({...p, yourNo: e.target.value}))} className="form-input" placeholder="Your PO No." />
        </F>
        <F label="Your DC No.">
          <input
            value={
              cardData?.challanItemLinks?.[0]?.challan?.challanNo
              || cardData?.challans?.[0]?.challanNo
              || ''
            }
            disabled
            className="form-input bg-slate-50"
            placeholder="Your DC No."
          />
        </F>
        <F label="Heat Treatment Specification">
          <select value={form.operationMode} onChange={e => setForm(p => ({...p, operationMode: e.target.value}))} className="form-input">
            {htSpecs.length > 0
              ? htSpecs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
              : <>
                  <option value="NORMAL">NORMAL</option>
                  <option value="REWORK">REWORK</option>
                  <option value="HARDEN AND TEMPER">HARDEN AND TEMPER</option>
                  <option value="STRESS RELIEVING">STRESS RELIEVING</option>
                  <option value="ANNEALING">ANNEALING</option>
                </>
            }
          </select>
        </F>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <F label="Control Plan No.">
          <input value={form.controlPlanNo} onChange={e => setForm(p => ({...p, controlPlanNo: e.target.value}))} className="form-input" placeholder="Control Plan No." />
        </F>
        <F label="Specification" className="xl:col-span-2">
          <textarea value={form.specification} onChange={e => setForm(p => ({...p, specification: e.target.value}))} className="form-input" placeholder="Specification details..." rows="3"></textarea>
        </F>
      </div>

      {/* Three modes, matching the printed job card. Courier used to double as
          customer pickup, so the print's "COLLECTED BY CUSTOMER" box could
          never be ticked. */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm text-slate-600">
        <div className="flex items-center gap-2 text-slate-500 font-semibold uppercase tracking-wide text-[10px]">Dispatch</div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!form.dispatchByOurVehicle} onChange={e => setForm(p => ({ ...p, dispatchByOurVehicle: e.target.checked }))} className="accent-slate-700 rounded" />
          <span>By Our Vehicle</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!form.dispatchByCourier} onChange={e => setForm(p => ({ ...p, dispatchByCourier: e.target.checked }))} className="accent-slate-700 rounded" />
          <span>By Courier</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!form.collectedByCustomer} onChange={e => setForm(p => ({ ...p, collectedByCustomer: e.target.checked }))} className="accent-slate-700 rounded" />
          <span>Collected by Customer</span>
        </label>
      </div>

      <div className="text-xs text-slate-500">Suggested treatment: D2 - HARDEN AND TEMPER - 61-63 HRC</div>
    </div>
  );
}
