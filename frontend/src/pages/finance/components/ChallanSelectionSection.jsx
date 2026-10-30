import React from 'react';
import { Ban, AlertTriangle, CheckCircle2 } from 'lucide-react';
import SearchSelect from '../../../components/SearchSelect';
import { toNum } from '../../../utils/normalize';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';

export default function ChallanSelectionSection({
  form, handleChallanChange, challans, loadingChallan,
  challanInfo, fullyInvoiced, wouldExceed, challanHistory,
  alreadyInvoiced, subtotal, grandTotal, remaining, PAY_BADGE
}) {
  const challanSubtotal = challanInfo ? toNum(challanInfo.subtotal, 0) : 0;

  const StatusIcon = fullyInvoiced ? Ban : wouldExceed ? AlertTriangle : CheckCircle2;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link to Challan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <FormField
          label="Select Challan"
          hint={loadingChallan ? 'Loading challan details...' : undefined}
        >
          <SearchSelect
            value={form.challanId}
            onChange={v => handleChallanChange(v)}
            options={challans.map(c => ({
              value: c.id,
              label: `${c.challanNo} · ${c.fromParty?.name || ''} · ${formatDate(c.challanDate)} · ${formatCurrency(toNum(c.totalValue, 0))}`,
            }))}
            placeholder="— No Challan (manual entry) —"
          />
        </FormField>

        {challanInfo && (challanInfo.relatedJobCards?.length > 0 || challanInfo.weightSummary?.inwardTotalWeight > 0) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {challanInfo.relatedJobCards?.length > 0
              ? challanInfo.relatedJobCards.map(jc => (
                  <span key={jc.id}>
                    Job Card <span className="font-mono text-slate-700">{jc.jobCardNo}</span> total weight:{' '}
                    <span className="font-bold text-amber-700">{toNum(jc.totalWeight, 0).toFixed(3)} kg</span>
                  </span>
                ))
              : (
                <span>
                  Challan total weight:{' '}
                  <span className="font-bold text-amber-700">{toNum(challanInfo.weightSummary.inwardTotalWeight, 0).toFixed(3)} kg</span>
                </span>
              )}
          </div>
        )}

        {/* Billing progress */}
        {challanInfo && (
          <div className={`rounded-xl p-4 border ${fullyInvoiced ? 'bg-rose-50 border-rose-200' : wouldExceed ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center gap-1.5 text-xs font-bold mb-2">
              <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${fullyInvoiced ? 'text-rose-700' : wouldExceed ? 'text-amber-700' : 'text-emerald-700'}`} />
              <span className={fullyInvoiced ? 'text-rose-700' : wouldExceed ? 'text-amber-700' : 'text-emerald-700'}>
                {fullyInvoiced
                  ? 'Fully Invoiced — No new bill allowed'
                  : wouldExceed
                  ? 'This invoice would exceed remaining amount'
                  : challanHistory.length > 0
                  ? `Partial Billing — ${challanHistory.length} invoice(s) already created`
                  : 'First invoice for this challan'}
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
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{label}</p>
                  <p className={`font-bold tabular-nums ${cls}`}>{formatCurrency(value)}</p>
                </div>
              ))}
            </div>
            {challanHistory.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/60 space-y-1">
                {challanHistory.map(inv => (
                  <div key={inv.id} className="flex flex-wrap items-center gap-3 text-[11px]">
                    <span className="font-mono text-slate-600">{inv.invoiceNo}</span>
                    <span className="text-slate-500 tabular-nums">{formatCurrency(toNum(inv.subtotal, 0))}</span>
                    <span className={`badge text-[10px] ${PAY_BADGE[inv.paymentStatus] || 'bg-slate-100 text-slate-600'}`}>{inv.paymentStatus}</span>
                    {inv.sentToTally && <Badge className="bg-violet-100 text-violet-700 text-[10px]">TALLY</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
