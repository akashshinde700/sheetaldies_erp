import React, { Fragment } from 'react';
import SearchSelect from '../../../components/SearchSelect';

export default function LineItemsSection({ lineItems, setLineItems, items, updateLineItem, EMPTY_ROW, onRemoveRow, processes }) {
  const remove = (i) => (onRemoveRow ? onRemoveRow(i) : setLineItems(prev => prev.filter((_, idx) => idx !== i)));

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <p className="section-title">Line Items</p>
        <button type="button" onClick={() => setLineItems(prev => [...prev, { ...EMPTY_ROW }])}
          className="btn-secondary text-xs px-3 py-1.5">
          <span className="material-symbols-outlined text-sm">add</span> Add Row
        </button>
      </div>
      <div className="space-y-4">
        {lineItems.map((row, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">{i + 1}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    {processes && (
                      <div className="w-40">
                        <SearchSelect
                          value={String(row.processTypeId || '')}
                          onChange={v => updateLineItem(i, 'processTypeId', v)}
                          options={processes.map(p => ({ value: p.id, label: p.name }))}
                          placeholder="— Process —"
                          useFixed
                          dense
                          className="w-full"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <input list="challan-desc-suggestions" value={row.description} onChange={e => updateLineItem(i, 'description', e.target.value)} placeholder="Part name..." className="w-full form-input text-sm font-semibold" />
                    </div>
                    <div className="w-44">
                      <input value={row.material} onChange={e => updateLineItem(i, 'material', e.target.value)} placeholder="D2, H13..." className="w-full form-input text-sm" />
                    </div>
                    <div className="w-24">
                      <input value={row.hrc} onChange={e => updateLineItem(i, 'hrc', e.target.value)} placeholder="54-5" className="w-full form-input text-sm" />
                    </div>
                    <div className="w-20">
                      <input type="number" min="0" value={row.quantity} onChange={e => updateLineItem(i, 'quantity', e.target.value)} placeholder="0" className="w-full form-input text-sm text-right tabular-nums" />
                    </div>
                    <div className="w-28">
                      <input type="number" step="0.001" min="0" value={row.weight} onChange={e => updateLineItem(i, 'weight', e.target.value)} placeholder="0.00" className="w-full form-input text-sm text-right tabular-nums" />
                    </div>
                    <div className="flex items-center">
                      {lineItems.length > 1 && (
                        <button type="button" onClick={() => remove(i)} className="p-2 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 bg-slate-50 rounded-md p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Drawing No</label>
                  <input value={row.drawingNo} onChange={e => updateLineItem(i, 'drawingNo', e.target.value)} placeholder="Optional" className="form-input text-sm" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">WO / Ref No</label>
                  <input value={row.woNo} onChange={e => updateLineItem(i, 'woNo', e.target.value)} placeholder="Optional" className="form-input text-sm" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">HSN Code</label>
                  <input value={row.hsnCode} onChange={e => updateLineItem(i, 'hsnCode', e.target.value)} placeholder="Optional" className="form-input text-sm" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">UOM</label>
                  <select value={row.uom} onChange={e => updateLineItem(i, 'uom', e.target.value)} className="form-input text-sm">
                    <option>KGS</option><option>NOS</option><option>PCS</option><option>SET</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
