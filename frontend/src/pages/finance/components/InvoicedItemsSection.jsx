import React from 'react';
import SearchSelect from '../../../components/SearchSelect';
import { toNum } from '../../../utils/normalize';
import { formatCurrency } from '../../../utils/formatters';

export default function InvoicedItemsSection({ 
  lineItems, setLineItems, processes, updateLine, challanInfo, EMPTY_LINE, remainingByChallanItem 
}) {
  return (
    <div className="card p-4 sm:p-5 3xl:p-6 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center border-b border-slate-100 pb-2 mb-4">
        <div>
          <p className="section-title">Services / Items</p>
          {challanInfo && <p className="text-[10px] text-slate-400 mt-0.5">Auto-filled from challan — edit if partial delivery</p>}
        </div>
        <button type="button" onClick={() => setLineItems(p => [...p, { ...EMPTY_LINE }])}
          className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-sm">add</span> Add Row
        </button>
      </div>

      <div className="hidden sm:grid grid-cols-[2rem_1fr_1.6fr_5rem_4.5rem_5rem_6rem_1.5rem] gap-2 px-3 pb-1.5">
        {['Sr.','Process','Description','Qty / UOM','Rate (₹)','Weight (kg)','Amount (₹)',''].map(h => (
          <p key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</p>
        ))}
      </div>

      <div className="space-y-2">
        {lineItems.map((it, i) => (
          <div key={i} className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 hover:border-indigo-200 transition-colors">
            <div className="hidden sm:grid grid-cols-[2rem_1fr_1.6fr_5rem_4.5rem_5rem_6rem_1.5rem] gap-2 items-center">
              <span className="text-[11px] text-slate-400 font-mono text-center">{i+1}</span>
              <SearchSelect
                value={it.processTypeId}
                onChange={v => updateLine(i, 'processTypeId', v)}
                options={processes.map(p => ({ value: p.id, label: p.name }))}
                placeholder="— None —"
              />
              <input value={it.description} onChange={e => updateLine(i, 'description', e.target.value)}
                list="desc-suggestions" required placeholder="Description"
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
              <div className="flex gap-1">
                <input type="number" min="0" value={it.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)}
                  required placeholder="Qty"
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-300 w-0 flex-1 min-w-0" />
                <select value={it.unit} onChange={e => updateLine(i, 'unit', e.target.value)}
                  className="border border-slate-200 rounded-lg px-1 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300">
                  <option>KGS</option><option>NOS</option><option>LOT</option><option>PCS</option>
                </select>
              </div>
              <input type="number" value={it.rate} onChange={e => updateLine(i, 'rate', e.target.value)}
                required placeholder="Rate"
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-right focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
              <input type="number" min="0" step="0.001" value={it.weight} onChange={e => updateLine(i, 'weight', e.target.value)}
                placeholder="0.000"
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-right focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
              <p className="text-xs font-bold text-indigo-700 text-right whitespace-nowrap">
                {it.amount ? formatCurrency(toNum(it.amount, 0)) : '—'}
              </p>
              <div className="flex justify-center">
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => setLineItems(p => p.filter((_, j) => j !== i))}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
              </div>
            </div>

            <div className="sm:hidden space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-mono w-5 text-center flex-shrink-0">{i+1}</span>
                <SearchSelect
                  value={it.processTypeId}
                  onChange={v => updateLine(i, 'processTypeId', v)}
                  options={processes.map(p => ({ value: p.id, label: p.name }))}
                  placeholder="— Process —"
                />
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => setLineItems(p => p.filter((_, j) => j !== i))}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 flex-shrink-0">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
              </div>
              <input value={it.description} onChange={e => updateLine(i, 'description', e.target.value)}
                list="desc-suggestions" required placeholder="Description"
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Qty</label>
                  <div className="flex gap-1">
                    <input type="number" min="0" value={it.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} required placeholder="Qty"
                      className="border border-slate-200 rounded-lg px-1 py-1.5 text-xs bg-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-300 w-0 flex-1 min-w-0" />
                    <select value={it.unit} onChange={e => updateLine(i, 'unit', e.target.value)}
                      className="border border-slate-200 rounded-lg px-1 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300">
                      <option>KGS</option><option>NOS</option><option>LOT</option><option>PCS</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Rate (₹)</label>
                  <input type="number" value={it.rate} onChange={e => updateLine(i, 'rate', e.target.value)} required placeholder="Rate"
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-right focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Wt (kg)</label>
                  <input type="number" min="0" step="0.001" value={it.weight} onChange={e => updateLine(i, 'weight', e.target.value)} placeholder="0.000"
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-right focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
                </div>
              </div>
              <div className="flex justify-end">
                <p className="text-xs font-bold text-indigo-700">{it.amount ? formatCurrency(toNum(it.amount, 0)) : '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-100/80">
              {challanInfo?.items?.length > 0 && (
                <div className="col-span-2 sm:col-span-4">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Source Challan Line</label>
                  <select
                    value={it.sourceChallanItemId || ''}
                    onChange={e => updateLine(i, 'sourceChallanItemId', e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full"
                  >
                    <option value="">Select source challan line</option>
                    {challanInfo.items.map((cIt, idx) => (
                      <option key={cIt.id} value={cIt.id}>
                        {idx + 1}. {cIt.description || 'Item'} (Qty {cIt.quantity}, Rate {cIt.rate})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {it.sourceChallanItemId && remainingByChallanItem.has(String(it.sourceChallanItemId)) && (
                <div className="col-span-2 sm:col-span-4">
                  {(() => {
                    const b = remainingByChallanItem.get(String(it.sourceChallanItemId));
                    return (
                      <p className="text-[10px] text-slate-500">
                        Challan Qty: <strong>{b.totalQty}</strong> | Already Invoiced: <strong>{b.invoicedQty}</strong> | Remaining: <strong>{b.remainingQty}</strong>
                      </p>
                    );
                  })()}
                </div>
              )}
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Material</label>
                <input value={it.material} onChange={e => updateLine(i, 'material', e.target.value)}
                  placeholder="H13, D2…"
                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">HRC</label>
                <input value={it.hrc} onChange={e => updateLine(i, 'hrc', e.target.value)}
                  placeholder="52-54"
                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">WO No</label>
                <input value={it.woNo} onChange={e => updateLine(i, 'woNo', e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">SAC No</label>
                <input value={it.hsnSac} onChange={e => updateLine(i, 'hsnSac', e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
