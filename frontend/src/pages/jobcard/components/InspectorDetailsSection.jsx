import React from 'react';

export default function InspectorDetailsSection({ form, set }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
        <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-indigo-500 text-[14px]">badge</span>
        </div>
        <p className="section-title">Inspector Details</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Incoming Inspection By</label>
          <input value={form.incomingInspectionBy} onChange={e => set('incomingInspectionBy', e.target.value)} className="form-input" placeholder="Inspector name" />
        </div>
        <div>
          <label className="form-label">Final Inspection By</label>
          <input value={form.finalInspectionBy} onChange={e => set('finalInspectionBy', e.target.value)} className="form-input" placeholder="Inspector name" />
        </div>
        <div>
          <label className="form-label">Inspected By</label>
          <input value={form.inspectedBy} onChange={e => set('inspectedBy', e.target.value)} className="form-input" placeholder="Inspector name" />
        </div>
        <div>
          <label className="form-label">Packed Qty</label>
          <input type="number" value={form.packedQty} onChange={e => set('packedQty', e.target.value)} className="form-input" placeholder="0" />
        </div>
        <div>
          <label className="form-label">Packed By</label>
          <input value={form.packedBy} onChange={e => set('packedBy', e.target.value)} className="form-input" placeholder="Packer name" />
        </div>
        <div>
          <label className="form-label">Inspection Date</label>
          <input type="date" value={form.inspectionDate} onChange={e => set('inspectionDate', e.target.value)} className="form-input" />
        </div>
        <div className="col-span-1 sm:col-span-2 md:col-span-3">
          <label className="form-label">Remarks</label>
          <input value={form.remarks} onChange={e => set('remarks', e.target.value)} className="form-input" placeholder="Any remarks..." />
        </div>
      </div>
    </div>
  );
}
