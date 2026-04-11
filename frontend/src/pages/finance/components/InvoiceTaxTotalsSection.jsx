import React from 'react';

export default function InvoiceTaxTotalsSection({ 
  form, setForm, subtotal, cgst, sgst, igst, tcsAmt, grandTotal 
}) {
  return (
    <div className="card p-4 sm:p-5 3xl:p-6 min-w-0">
      <div className="flex justify-end">
        <div className="w-full max-w-sm 3xl:max-w-md space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-semibold text-slate-700">₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits:2 })}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Transport / Freight</span>
            <input type="number" min="0" value={form.transportFreight}
              onChange={e => setForm(p => ({ ...p, transportFreight: e.target.value }))}
              className="w-28 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-300" />
          </div>
          {[
            { label:'CGST', key:'cgstRate', amt: cgst },
            { label:'SGST', key:'sgstRate', amt: sgst },
            { label:'IGST', key:'igstRate', amt: igst },
            { label:'TCS',  key:'tcsRate',  amt: tcsAmt },
          ].map(({ label, key, amt }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-slate-500">{label} %</span>
              <div className="flex items-center gap-2">
                <input type="number" min="0" step="0.01" value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  className="w-14 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                <span className="text-slate-500 w-28 text-right">₹ {amt.toLocaleString('en-IN', { minimumFractionDigits:2 })}</span>
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Extra Amt</span>
            <input type="number" min="0" value={form.extraAmt}
              onChange={e => setForm(p => ({ ...p, extraAmt: e.target.value }))}
              className="w-28 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-300" />
          </div>
          <div className="flex justify-between font-extrabold text-base border-t border-slate-200 pt-2.5">
            <span className="text-slate-800">Grand Total</span>
            <span className="text-indigo-700">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits:2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
