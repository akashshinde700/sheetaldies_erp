import React from 'react';

const JC = 'form-input bg-indigo-50 text-indigo-900 font-semibold cursor-not-allowed';

export default function CertPackingSection({ form, set, jcData }) {
  const locked = !!jcData;
  return (
    <div className="card p-5">
      <p className="section-title border-b border-slate-100 pb-2 mb-4">Packing & Approval</p>

      {/* Cert-specific editable fields */}
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

      {/* Job-card-locked fields */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4 ${locked ? 'bg-indigo-50/40 rounded-xl p-3' : ''}`}>
        {locked && (
          <div className="col-span-full mb-1">
            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">from Job Card</span>
          </div>
        )}
        <div>
          <label className="form-label">Issued To</label>
          <input value={form.issuedTo} disabled={locked} onChange={e => set('issuedTo', e.target.value)}
            className={locked ? JC : 'form-input'} placeholder="Customer contact / name" />
        </div>
        <div>
          <label className="form-label">Heat No</label>
          <input value={form.heatNo} disabled={locked} onChange={e => set('heatNo', e.target.value)}
            className={locked ? JC : 'form-input'} placeholder="HT-001" />
        </div>
        <div>
          <label className="form-label">Dispatch Mode</label>
          <div className={`flex flex-col gap-1.5 mt-1 ${locked ? 'pointer-events-none' : ''}`}>
            {[
              ['dispatchByOurVehicle', 'By Our Vehicle'],
              ['dispatchByCourier',    'By Courier'],
              ['collectedByCustomer',  'Collected by Customer'],
            ].map(([field, label]) => (
              <label key={field} className={`flex items-center gap-2 text-sm ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input type="checkbox" checked={!!form[field]} disabled={locked}
                  onChange={e => set(field, e.target.checked)}
                  className={`accent-indigo-600 ${locked ? 'opacity-60' : ''}`} />
                <span className={locked ? 'text-indigo-700 font-semibold' : ''}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Dispatch details — always editable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
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
