import React from 'react';

export default function CertPackingSection({ form, set }) {
  return (
    <div className="card p-5">
      <p className="section-title border-b border-slate-100 pb-2 mb-4">Packing & Approval</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Packed Qty</label>
          <input type="number" value={form.packedQty} onChange={e => set('packedQty', e.target.value)} className="form-input" />
        </div>
        <div>
          <label className="form-label">Packed By</label>
          <input value={form.packedBy} onChange={e => set('packedBy', e.target.value)} className="form-input" />
        </div>
        <div>
          <label className="form-label">Approved By</label>
          <input value={form.approvedBy} onChange={e => set('approvedBy', e.target.value)} className="form-input" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
        <div>
          <label className="form-label">Issued To</label>
          <input value={form.issuedTo} onChange={e => set('issuedTo', e.target.value)} className="form-input" placeholder="Customer contact / name" />
        </div>
        <div>
          <label className="form-label">Heat No</label>
          <input value={form.heatNo} onChange={e => set('heatNo', e.target.value)} className="form-input" placeholder="HT-001" />
        </div>
        <div>
          <label className="form-label">Dispatch Mode</label>
          <input value={form.dispatchMode} onChange={e => set('dispatchMode', e.target.value)} className="form-input" placeholder="By Hand / Courier / Transport" />
        </div>
        <div>
          <label className="form-label">Dispatch Challan No</label>
          <input value={form.dispatchChallanNo} onChange={e => set('dispatchChallanNo', e.target.value)} className="form-input" placeholder="DC-001" />
        </div>
        <div>
          <label className="form-label">Dispatch Challan Date</label>
          <input type="date" value={form.dispatchChallanDate} onChange={e => set('dispatchChallanDate', e.target.value)} className="form-input" />
        </div>
        <div>
          <label className="form-label">Dispatched Through</label>
          <input value={form.dispatchedThrough} onChange={e => set('dispatchedThrough', e.target.value)} className="form-input" placeholder="Transport company name" />
        </div>
      </div>
    </div>
  );
}
