import React from 'react';
import { RefreshCw } from 'lucide-react';
import SearchSelect from '../../../components/SearchSelect';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const JC_INPUT = 'bg-indigo-50 text-indigo-900 font-semibold cursor-not-allowed disabled:bg-indigo-50 disabled:text-indigo-900 disabled:opacity-100';

export default function CertHeaderSection({ form, set, parties, jobCards, jcData }) {
  const locked = !!jcData;

  const customerOptions = (parties || [])
    .filter(p => p.partyType === 'CUSTOMER' || p.partyType === 'BOTH')
    .map(p => ({ value: String(p.id), label: p.name }));

  const jobCardOptions = (jobCards || []).map(jc => ({
    value: jc.id,
    label: jc.jobCardNo,
  }));

  return (
    <div>
        <div className="flex flex-wrap items-start gap-x-3 gap-y-3">
          <FormField label="Job Card No." className="w-full sm:w-[140px]">
            {locked ? (
              <Input value={jcData.jobCardNo || ''} disabled className={JC_INPUT} />
            ) : (
              <SearchSelect
                value={String(form.jobCardId || '')}
                onChange={v => set('jobCardId', v)}
                options={jobCardOptions}
                placeholder="— Select Job Card —"
              />
            )}
          </FormField>

          <FormField label="Customer" required className="w-full sm:flex-1 sm:basis-[200px]">
            {locked ? (
              <Input value={jcData.customer?.name || jcData.customerNameSnapshot || form.issuedTo || ''} disabled className={JC_INPUT} />
            ) : (
              <SearchSelect
                value={String(form.customerId || '')}
                onChange={v => set('customerId', v)}
                options={customerOptions}
                placeholder="— Select Customer —"
                required
              />
            )}
          </FormField>

          <FormField label="Certificate No." className="w-full sm:w-[150px]">
            <div className="flex gap-1.5">
              <Input value={form.issueNo} onChange={e => set('issueNo', e.target.value)} className="flex-1 font-app-mono" placeholder="Auto-generated" />
              <Button type="button" variant="outline" title="Regenerate"
                onClick={() => {
                  const now = new Date();
                  const yy  = String(now.getFullYear()).slice(-2);
                  const mm  = String(now.getMonth() + 1).padStart(2, '0');
                  const rand = String(Math.floor(100 + Math.random() * 900));
                  set('issueNo', `${yy}${mm}${rand}`);
                }}
                className="shrink-0 px-2.5 min-h-[44px] sm:min-h-0 sm:h-9 text-slate-400 hover:text-indigo-600">
                <RefreshCw />
              </Button>
            </div>
          </FormField>

          <FormField label="Issue Date" className="w-full sm:w-[130px]">
            <Input type="date" value={form.issueDate} onChange={e => set('issueDate', e.target.value)} />
          </FormField>

          <FormField label="Issue By" className="w-full sm:w-[150px]">
            <Input value={form.checkedBy} onChange={e => set('checkedBy', e.target.value)} placeholder="Inspector name" />
          </FormField>

          <FormField label="Your PO No." className="w-full sm:w-[120px]">
            <Input value={form.yourPoNo} disabled={locked} onChange={e => set('yourPoNo', e.target.value)}
              className={locked ? JC_INPUT : undefined} />
          </FormField>
        </div>
    </div>
  );
}
