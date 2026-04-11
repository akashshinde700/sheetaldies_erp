import React from 'react';
import SearchSelect from '../../../components/SearchSelect';
import { toNum } from '../../../utils/normalize';

export default function ChallanSelectionSection({ 
  form, handleChallanChange, challans, loadingChallan, 
  challanInfo, fullyInvoiced, wouldExceed, challanHistory, 
  alreadyInvoiced, subtotal, grandTotal, remaining, PAY_BADGE 
}) {
  const challanSubtotal = challanInfo ? toNum(challanInfo.subtotal, 0) : 0;

  return (
    <div className="card p-4 sm:p-5 3xl:p-6 space-y-4 min-w-0">
      <p className="section-title border-b border-slate-100 pb-2">Link to Challan</p>
      <div>
        <label className="form-label">
          Select Challan
          <span className="ml-2 font-normal normal-case text-slate-400">— auto-fills items & checks for duplicate billing</span>
        </label>
        <SearchSelect
          value={form.challanId}
          onChange={v => handleChallanChange(v)}
          options={challans.map(c => ({
            value: c.id,
            label: `${c.challanNo} · ${c.toParty?.name || ''} · ${new Date(c.challanDate).toLocaleDateString('en-IN')} · ₹${toNum(c.totalValue, 0).toLocaleString('en-IN')}`,
          }))}
          placeholder="— No Challan (manual entry) —"
        />
        {loadingChallan && <p className="text-xs text-slate-400 mt-1.5">Loading challan details...</p>}
      </div>

      {/* Billing progress */}
      {challanInfo && (
        <div className={`rounded-xl p-4 border ${fullyInvoiced ? 'bg-rose-50 border-rose-200' : wouldExceed ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className={fullyInvoiced ? 'text-rose-700' : wouldExceed ? 'text-amber-700' : 'text-emerald-700'}>
              {fullyInvoiced
                ? '⛔ Fully Invoiced — No new bill allowed'
                : wouldExceed
                ? '⚠️ This invoice would exceed remaining amount'
                : challanHistory.length > 0
                ? `✅ Partial Billing — ${challanHistory.length} invoice(s) already created`
                : '✅ First invoice for this challan'}
            </span>
          </div>
          <div className="w-full bg-white rounded-full h-2 mb-3 overflow-hidden border border-slate-200">
            <div className={`h-2 rounded-full transition-all ${fullyInvoiced || wouldExceed ? 'bg-rose-400' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(100, challanSubtotal > 0 ? ((alreadyInvoiced + subtotal) / challanSubtotal) * 100 : 0)}%` }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { label: 'Challan Total',    value: challanSubtotal, cls: 'text-slate-700' },
              { label: 'Already Billed',   value: alreadyInvoiced, cls: 'text-amber-600' },
              { label: 'This Invoice',     value: grandTotal,      cls: wouldExceed ? 'text-rose-600' : 'text-slate-700' },
              { label: 'Remaining After',  value: Math.max(0, remaining - subtotal), cls: remaining - subtotal < -0.01 ? 'text-rose-600' : 'text-emerald-700' },
            ].map(({ label, value, cls }) => (
              <div key={label}>
                <p className="text-slate-400">{label}</p>
                <p className={`font-bold ${cls}`}>₹ {value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            ))}
          </div>
          {challanHistory.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/60 space-y-1">
              {challanHistory.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 text-[11px]">
                  <span className="font-mono text-slate-600">{inv.invoiceNo}</span>
                  <span className="text-slate-500">₹ {toNum(inv.subtotal, 0).toLocaleString('en-IN')}</span>
                  <span className={`badge text-[10px] ${PAY_BADGE[inv.paymentStatus] || 'bg-slate-100 text-slate-600'}`}>{inv.paymentStatus}</span>
                  {inv.sentToTally && <span className="badge text-[10px] bg-violet-100 text-violet-700">TALLY</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
