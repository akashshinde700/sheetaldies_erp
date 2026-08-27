import React from 'react';
import { Plus, Trash2, Layers, Scale } from 'lucide-react';
import SearchSelect from '../../../components/SearchSelect';
import { toNum } from '../../../utils/normalize';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const GROUP_FIELD = { KGS: 'weight', PCS: 'quantity', LOT: 'quantity' };
const GROUP_LABEL = { KGS: 'Total Weight (kg)', PCS: 'Total Qty (pcs)', LOT: 'Total Lots' };

const UNIT_OPTIONS = ['KGS', 'NOS', 'LOT', 'PCS'];

export default function InvoicedItemsSection({
  lineItems, setLineItems, processes, updateLine, challanInfo, newEmptyLine, remainingByChallanItem, applyGroupTotal,
  showPartName = true, setShowPartName
}) {
  // Group consecutive-or-not lines that share a process, so lines belonging
  // to the same process (e.g. 5 challan items all "Hardening & Tempering")
  // can show one combined "Process Summary" total above them.
  const groups = [];
  const groupIdxByKey = new Map();
  lineItems.forEach((it, i) => {
    const key = it.processTypeId ? String(it.processTypeId) : null;
    if (key && groupIdxByKey.has(key)) {
      groups[groupIdxByKey.get(key)].indices.push(i);
    } else {
      if (key) groupIdxByKey.set(key, groups.length);
      groups.push({ key, processTypeId: it.processTypeId, indices: [i] });
    }
  });

  const renderRow = (it, i) => (
    <div key={it._id} className="rounded-xl border border-slate-200/90 bg-white overflow-hidden">
      {/* Row header */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-100 text-xs font-bold text-sky-700 tabular-nums">
            {i + 1}
          </span>
          <span className="text-xs font-semibold text-slate-600 truncate">
            {it.description || 'New line'}
          </span>
        </div>
        {lineItems.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setLineItems(p => p.filter((_, j) => j !== i))}
            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            aria-label={`Remove line ${i + 1}`}
          >
            <Trash2 />
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Primary fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-x-3 gap-y-3">
          <FormField label="Process" className="col-span-2 sm:col-span-2 lg:col-span-3">
            <SearchSelect
              value={it.processTypeId}
              onChange={v => updateLine(i, 'processTypeId', v)}
              options={processes.map(p => ({ value: p.id, label: p.name }))}
              placeholder="— None —"
            />
          </FormField>
          <FormField label="Description" required className="col-span-2 sm:col-span-2 lg:col-span-5">
            <Input
              value={it.description}
              onChange={e => updateLine(i, 'description', e.target.value)}
              list="desc-suggestions"
              required
              placeholder="Description"
              className="font-semibold"
            />
          </FormField>
          <FormField label="Billing" className="col-span-1 sm:col-span-2 lg:col-span-2">
            <Select
              value={it.billingType || 'KGS'}
              onValueChange={v => updateLine(i, 'billingType', v)}
            >
              <SelectTrigger title="Billing basis — auto-detected from the customer's rate">
                <SelectValue placeholder="Billing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KGS">Per Kg</SelectItem>
                <SelectItem value="PCS">Per Pc</SelectItem>
                <SelectItem value="LOT">Per Lot</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Qty" required className="col-span-1 sm:col-span-1 lg:col-span-1">
            <Input
              type="number"
              min="0"
              inputMode="numeric"
              value={it.quantity}
              onChange={e => updateLine(i, 'quantity', e.target.value)}
              required
              placeholder="Qty"
              className="text-right tabular-nums"
            />
          </FormField>
          <FormField label="Unit" className="col-span-1 sm:col-span-1 lg:col-span-1">
            <Select value={it.unit} onValueChange={v => updateLine(i, 'unit', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map(u => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Rate (₹)" required className="col-span-1 sm:col-span-1 lg:col-span-4">
            <Input
              type="number"
              inputMode="decimal"
              value={it.rate}
              onChange={e => updateLine(i, 'rate', e.target.value)}
              required
              placeholder="Rate"
              className="text-right tabular-nums"
            />
          </FormField>
          <FormField label="Weight (kg)" className="col-span-1 sm:col-span-1 lg:col-span-4">
            <Input
              type="number"
              min="0"
              step="0.001"
              inputMode="decimal"
              value={it.weight}
              onChange={e => updateLine(i, 'weight', e.target.value)}
              placeholder="0.000"
              className="text-right tabular-nums"
            />
          </FormField>
          <FormField label="Amount (₹)" required className="col-span-2 sm:col-span-2 lg:col-span-4">
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={it.amount}
              onChange={e => updateLine(i, 'amount', e.target.value)}
              required
              placeholder="0.00"
              className="text-right tabular-nums font-bold text-sky-700 border-sky-200 bg-sky-50"
            />
          </FormField>
        </div>

        {/* Secondary fields */}
        <div className="rounded-lg bg-slate-50 p-3 space-y-3">
          {challanInfo?.items?.length > 0 && (
            <FormField label="Source Challan Line">
              <SearchSelect
                value={String(it.sourceChallanItemId || '')}
                onChange={v => updateLine(i, 'sourceChallanItemId', v)}
                options={challanInfo.items.map((cIt, idx) => ({
                  value: cIt.id,
                  label: `${idx + 1}. ${cIt.partName || cIt.description || 'Item'} (Qty ${cIt.quantity}, Rate ${cIt.rate})`,
                }))}
                placeholder="Select source challan line"
                useFixed
              />
            </FormField>
          )}
          {it.sourceChallanItemId && remainingByChallanItem.has(String(it.sourceChallanItemId)) && (() => {
            const b = remainingByChallanItem.get(String(it.sourceChallanItemId));
            return (
              <p className="text-[11px] text-slate-500">
                Challan Qty: <strong>{b.totalQty}</strong> · Already Invoiced: <strong>{b.invoicedQty}</strong> · Remaining: <strong>{b.remainingQty}</strong>
              </p>
            );
          })()}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3">
            <FormField label="Material">
              <Input
                value={it.material}
                onChange={e => updateLine(i, 'material', e.target.value)}
                placeholder="H13, D2…"
                className="bg-white"
              />
            </FormField>
            <FormField label="HRC">
              <Input
                value={it.hrc}
                onChange={e => updateLine(i, 'hrc', e.target.value)}
                placeholder="52-54"
                className="bg-white"
              />
            </FormField>
            <FormField label="WO No">
              <Input
                value={it.woNo}
                onChange={e => updateLine(i, 'woNo', e.target.value)}
                className="bg-white"
              />
            </FormField>
            <FormField label="SAC No">
              <Input
                value={it.hsnSac}
                onChange={e => updateLine(i, 'hsnSac', e.target.value)}
                className="bg-white font-mono"
              />
            </FormField>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGroupSummary = (g) => {
    const items = g.indices.map(i => lineItems[i]);
    const first = items[0];
    const type  = first.billingType || 'KGS';
    const field = GROUP_FIELD[type];
    const total = items.reduce((s, it) => s + toNum(it[field], 0), 0);
    const amount = items.reduce((s, it) => s + toNum(it.amount, 0), 0);
    const proc = processes.find(p => String(p.id) === String(g.processTypeId));
    return (
      <div key={`summary-${g.key}`} className="flex flex-wrap items-center gap-3 bg-indigo-50/70 border border-indigo-200 rounded-xl px-3 py-2 mb-1.5">
        <Layers className="h-4 w-4 shrink-0 text-indigo-500" />
        <span className="text-xs font-bold text-indigo-800">{proc?.name || 'Process'}</span>
        <span className="text-[10px] text-indigo-400">({items.length} items)</span>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest">{GROUP_LABEL[type]}</label>
          <Input
            type="number" min="0" step="0.001"
            inputMode="decimal"
            value={total ? total.toFixed(3).replace(/\.?0+$/, '') : ''}
            onChange={e => applyGroupTotal(g.processTypeId, e.target.value)}
            placeholder="0"
            className="h-8 min-h-0 text-xs w-24 text-right tabular-nums font-bold text-indigo-700 border-indigo-300"
          />
          <span className="text-xs text-indigo-400">→</span>
          <span className="text-xs font-bold text-indigo-700 tabular-nums">₹{amount.toFixed(2)}</span>
        </div>
      </div>
    );
  };

  // The invoice bills on weight when it is filled in and falls back to the
  // quantity otherwise — same rule the print page and the Tally export use, so
  // this total is the kilos that will actually appear on the invoice.
  const billedKg = (it) => toNum(it.weight, 0) || toNum(it.quantity, 0);
  const totalKg = lineItems.reduce((s, it) => s + billedKg(it), 0);
  const totalAmount = lineItems.reduce((s, it) => s + toNum(it.amount, 0), 0);
  // What the challan brought in, so a partial delivery is obvious at a glance.
  const challanKg = (challanInfo?.items || [])
    .reduce((s, it) => s + (toNum(it.weight, 0) || toNum(it.quantity, 0)), 0);
  const kg = (v) => v.toFixed(3).replace(/\.?0+$/, '');

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>Services / Items</CardTitle>
          <CardDescription>
            {challanInfo ? 'Auto-filled from challan — edit if partial delivery' : `${lineItems.length} line${lineItems.length !== 1 ? 's' : ''} on this invoice`}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setLineItems(p => [...p, newEmptyLine()])}
        >
          <Plus /> Add Row
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Weight / subtotal summary strip */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2">
          <Scale className="h-4 w-4 shrink-0 text-sky-500" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-extrabold text-sky-500 uppercase tracking-widest">Total Weight</span>
            <span className="text-sm font-extrabold text-sky-800 tabular-nums">{kg(totalKg)} kg</span>
          </div>
          {challanKg > 0 && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Challan</span>
              <span className="text-xs font-bold text-slate-600 tabular-nums">{kg(challanKg)} kg</span>
              {Math.abs(challanKg - totalKg) >= 0.001 && (
                <Badge variant="warning" className="text-[10px]">
                  {totalKg < challanKg ? `${kg(challanKg - totalKg)} kg pending` : `${kg(totalKg - challanKg)} kg extra`}
                </Badge>
              )}
            </div>
          )}
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Lines</span>
            <span className="text-xs font-bold text-slate-600 tabular-nums">{lineItems.length}</span>
          </div>
          <div className="ml-auto flex items-baseline gap-1.5">
            <span className="text-[10px] font-extrabold text-sky-500 uppercase tracking-widest">Subtotal</span>
            <span className="text-sm font-extrabold text-sky-800 tabular-nums">₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* The invoice bills the process; the part name under it is optional. */}
        {setShowPartName && (
          <label className="flex items-start gap-2.5 cursor-pointer select-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 hover:border-sky-200 transition-colors">
            <Checkbox
              checked={showPartName}
              onCheckedChange={c => setShowPartName(c === true)}
              className="mt-0.5"
            />
            <span className="min-w-0">
              <span className="text-xs font-bold text-slate-700">Print me item ka naam bhi dikhao</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                Invoice pe process ka naam hamesha aayega. Ye tick hai to uske neeche item ka naam bhi chhapega.
              </span>
              <span className="block mt-1.5 text-[10px] font-mono leading-relaxed text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
                <span className="font-bold">{processes.find(p => String(p.id) === String(lineItems[0]?.processTypeId))?.name || 'HARDENING & TEMPERING'}</span>
                {showPartName && (
                  <><br /><span className="italic text-slate-400">{lineItems[0]?.description || 'DIE PLATE- 30X196X196- 01NO'}</span></>
                )}
              </span>
            </span>
          </label>
        )}

        <div className="space-y-3">
          {groups.map(g => (
            <div key={g.key || `single-${g.indices[0]}`}>
              {g.processTypeId && g.indices.length > 1 && renderGroupSummary(g)}
              <div className="space-y-3">
                {g.indices.map(i => renderRow(lineItems[i], i))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
