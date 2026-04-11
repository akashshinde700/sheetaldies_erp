import React from 'react';
import { toNum } from '../../../utils/normalize';

const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function TaxTotalsSection({ 
  form, setForm, subtotal, cgstAmt, sgstAmt, igstAmt, grandTotal 
}) {
  return (
    <div className="card p-5 space-y-4">
      <p className="section-title border-b border-slate-100 pb-2">Tax &amp; Totals</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <F label="Handling Charges">
          <input type="number" step="0.01" value={form.handlingCharges} onChange={e => setForm(p => ({ ...p, handlingCharges: e.target.value }))} className="form-input" />
        </F>
        <F label="CGST %">
          <input type="number" step="0.01" value={form.cgstRate} onChange={e => setForm(p => ({ ...p, cgstRate: e.target.value }))} className="form-input" />
        </F>
        <F label="SGST %">
          <input type="number" step="0.01" value={form.sgstRate} onChange={e => setForm(p => ({ ...p, sgstRate: e.target.value }))} className="form-input" />
        </F>
        <F label="IGST %">
          <input type="number" step="0.01" value={form.igstRate} onChange={e => setForm(p => ({ ...p, igstRate: e.target.value }))} className="form-input" />
        </F>
      </div>
      <div className="bg-slate-50 rounded-xl p-4 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold tabular-nums">₹{subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Handling</span><span className="tabular-nums">₹{toNum(form.handlingCharges, 0).toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">CGST ({form.cgstRate}%)</span><span className="tabular-nums">₹{cgstAmt.toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">SGST ({form.sgstRate}%)</span><span className="tabular-nums">₹{sgstAmt.toFixed(2)}</span></div>
        {toNum(form.igstRate, 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">IGST ({form.igstRate}%)</span><span className="tabular-nums">₹{igstAmt.toFixed(2)}</span></div>}
        <div className="flex justify-between border-t border-slate-200 pt-1 mt-1"><span className="font-bold text-slate-800">Grand Total</span><span className="font-extrabold text-slate-900 tabular-nums">₹{grandTotal.toFixed(2)}</span></div>
      </div>
    </div>
  );
}
