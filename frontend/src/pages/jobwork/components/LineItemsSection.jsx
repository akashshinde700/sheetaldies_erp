import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import SearchSelect from '../../../components/SearchSelect';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const UOM_OPTIONS = ['KGS', 'NOS', 'PCS', 'SET'];

export default function LineItemsSection({ lineItems, setLineItems, items, updateLineItem, EMPTY_ROW, onRemoveRow, processes }) {
  const remove = (i) => (onRemoveRow ? onRemoveRow(i) : setLineItems(prev => prev.filter((_, idx) => idx !== i)));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>Line Items</CardTitle>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setLineItems(prev => [...prev, { ...EMPTY_ROW }])}
        >
          <Plus /> Add Item
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {lineItems.map((row, i) => (
          <div key={i} className="rounded-xl border border-slate-200/90 bg-white overflow-hidden">
            {/* Row header */}
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-100 text-xs font-bold text-sky-700 tabular-nums">
                  {i + 1}
                </span>
                <span className="text-xs font-semibold text-slate-600 truncate">
                  {row.description || 'New item'}
                </span>
              </div>
              {lineItems.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(i)}
                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  aria-label={`Remove item ${i + 1}`}
                >
                  <Trash2 />
                </Button>
              )}
            </div>

            {/* Primary fields */}
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-x-3 gap-y-4">
                {processes && (
                  <FormField label="Process" className="col-span-2 sm:col-span-2 lg:col-span-3">
                    <SearchSelect
                      value={String(row.processTypeId || '')}
                      onChange={v => updateLineItem(i, 'processTypeId', v)}
                      options={processes.map(p => ({ value: p.id, label: p.name }))}
                      placeholder="— Process —"
                      useFixed
                      dense
                      className="w-full"
                    />
                  </FormField>
                )}
                <FormField label="Part / Description" className="col-span-2 sm:col-span-2 lg:col-span-4">
                  <Input
                    list="challan-desc-suggestions"
                    value={row.description}
                    onChange={e => updateLineItem(i, 'description', e.target.value)}
                    placeholder="Part name..."
                    className="font-semibold"
                  />
                </FormField>
                <FormField label="Material" className="col-span-1 sm:col-span-2 lg:col-span-2">
                  <Input
                    value={row.material}
                    onChange={e => updateLineItem(i, 'material', e.target.value)}
                    placeholder="D2, H13..."
                  />
                </FormField>
                <FormField label="HRC" className="col-span-1 sm:col-span-2 lg:col-span-1">
                  <Input
                    value={row.hrc}
                    onChange={e => updateLineItem(i, 'hrc', e.target.value)}
                    placeholder="54-56"
                  />
                </FormField>
                <FormField label="Qty" className="col-span-1 sm:col-span-2 lg:col-span-1">
                  <Input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={row.quantity}
                    onChange={e => updateLineItem(i, 'quantity', e.target.value)}
                    placeholder="0"
                    className="text-right tabular-nums"
                  />
                </FormField>
                <FormField label="Weight (kg)" className="col-span-1 sm:col-span-2 lg:col-span-1">
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    inputMode="decimal"
                    value={row.weight}
                    onChange={e => updateLineItem(i, 'weight', e.target.value)}
                    placeholder="0.00"
                    className="text-right tabular-nums"
                  />
                </FormField>
              </div>

              {/* Secondary fields */}
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3">
                  <FormField label="Drawing No">
                    <Input
                      value={row.drawingNo}
                      onChange={e => updateLineItem(i, 'drawingNo', e.target.value)}
                      placeholder="Optional"
                      className="bg-white"
                    />
                  </FormField>
                  <FormField label="WO / Ref No">
                    <Input
                      value={row.woNo}
                      onChange={e => updateLineItem(i, 'woNo', e.target.value)}
                      placeholder="Optional"
                      className="bg-white"
                    />
                  </FormField>
                  <FormField label="HSN Code">
                    <Input
                      value={row.hsnCode}
                      onChange={e => updateLineItem(i, 'hsnCode', e.target.value)}
                      placeholder="Optional"
                      className="bg-white"
                    />
                  </FormField>
                  <FormField label="UOM">
                    <Select value={row.uom} onValueChange={v => updateLineItem(i, 'uom', v)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="UOM" />
                      </SelectTrigger>
                      <SelectContent>
                        {UOM_OPTIONS.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
