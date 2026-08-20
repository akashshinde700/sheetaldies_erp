import React from 'react';
import SearchSelect from '../../../components/SearchSelect';
import { toNum } from '../../../utils/normalize';

const GROUP_FIELD = { KGS: 'weight', PCS: 'quantity', LOT: 'quantity' };
const GROUP_LABEL = { KGS: 'Total Weight (kg)', PCS: 'Total Qty (pcs)', LOT: 'Total Lots' };

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
    <div key={it._id} className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 hover:border-sky-200 transition-colors">
      <div className="hidden sm:grid grid-cols-[2rem_1fr_1.2fr_5.5rem_7.5rem_4.5rem_5rem_6.5rem_1.5rem] gap-2 items-center">
        <span className="text-[11px] text-slate-400 font-mono text-center">{i+1}</span>
        <SearchSelect
          value={it.processTypeId}
          onChange={v => updateLine(i, 'processTypeId', v)}
          options={processes.map(p => ({ value: p.id, label: p.name }))}
          placeholder="— None —"
        />
        <input value={it.description} onChange={e => updateLine(i, 'description', e.target.value)}
          list="desc-suggestions" required placeholder="Description"
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-300 w-full" />
        <select value={it.billingType || 'KGS'} onChange={e => updateLine(i, 'billingType', e.target.value)}
          title="Billing basis — auto-detected from the customer's rate"
          className="border border-slate-200 rounded-lg px-1 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-300 w-full">
          <option value="KGS">Per Kg</option>
          <option value="PCS">Per Pc</option>
          <option value="LOT">Per Lot</option>
        </select>
        <div className="flex gap-1">
          <input type="number" min="0" value={it.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)}
            required placeholder="Qty"
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-center focus:outline-none focus:ring-1 focus:ring-sky-300 w-0 flex-1 min-w-0" />
          <select value={it.unit} onChange={e => updateLine(i, 'unit', e.target.value)}
            className="border border-slate-200 rounded-lg px-1 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-300">
            <option>KGS</option><option>NOS</option><option>LOT</option><option>PCS</option>
          </select>
        </div>
        <input type="number" value={it.rate} onChange={e => updateLine(i, 'rate', e.target.value)}
          required placeholder="Rate"
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-right focus:outline-none focus:ring-1 focus:ring-sky-300 w-full" />
        <input type="number" min="0" step="0.001" value={it.weight} onChange={e => updateLine(i, 'weight', e.target.value)}
          placeholder="0.000"
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-right focus:outline-none focus:ring-1 focus:ring-sky-300 w-full" />
        <input type="number" min="0" step="0.01" value={it.amount} onChange={e => updateLine(i, 'amount', e.target.value)}
          required placeholder="0.00"
          className="border border-sky-200 rounded-lg px-2 py-1.5 text-xs bg-sky-50 text-right font-bold text-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-400 w-full" />
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
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-300 w-full" />
        <div>
          <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Billing Basis</label>
          <select value={it.billingType || 'KGS'} onChange={e => updateLine(i, 'billingType', e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-300 w-full">
            <option value="KGS">Per Kg (by weight)</option>
            <option value="PCS">Per Pc (by pieces)</option>
            <option value="LOT">Per Lot</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Qty</label>
            <div className="flex gap-1">
              <input type="number" min="0" value={it.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} required placeholder="Qty"
                className="border border-slate-200 rounded-lg px-1 py-1.5 text-xs bg-white text-center focus:outline-none focus:ring-1 focus:ring-sky-300 w-0 flex-1 min-w-0" />
              <select value={it.unit} onChange={e => updateLine(i, 'unit', e.target.value)}
                className="border border-slate-200 rounded-lg px-1 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-300">
                <option>KGS</option><option>NOS</option><option>LOT</option><option>PCS</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Rate (₹)</label>
            <input type="number" value={it.rate} onChange={e => updateLine(i, 'rate', e.target.value)} required placeholder="Rate"
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-right focus:outline-none focus:ring-1 focus:ring-sky-300 w-full" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Wt (kg)</label>
            <input type="number" min="0" step="0.001" value={it.weight} onChange={e => updateLine(i, 'weight', e.target.value)} placeholder="0.000"
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-right focus:outline-none focus:ring-1 focus:ring-sky-300 w-full" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Amount (₹)</label>
          <input type="number" min="0" step="0.01" value={it.amount} onChange={e => updateLine(i, 'amount', e.target.value)}
            required placeholder="0.00"
            className="border border-sky-200 rounded-lg px-2 py-1.5 text-xs bg-sky-50 text-right font-bold text-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-400 w-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-100/80">
        {challanInfo?.items?.length > 0 && (
          <div className="col-span-2 sm:col-span-4">
            <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Source Challan Line</label>
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
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-300 w-full" />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">HRC</label>
          <input value={it.hrc} onChange={e => updateLine(i, 'hrc', e.target.value)}
            placeholder="52-54"
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-300 w-full" />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">WO No</label>
          <input value={it.woNo} onChange={e => updateLine(i, 'woNo', e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-300 w-full" />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">SAC No</label>
          <input value={it.hsnSac} onChange={e => updateLine(i, 'hsnSac', e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white font-mono focus:outline-none focus:ring-1 focus:ring-sky-300 w-full" />
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
        <span className="material-symbols-outlined text-indigo-500 text-[16px]">layers</span>
        <span className="text-xs font-bold text-indigo-800">{proc?.name || 'Process'}</span>
        <span className="text-[10px] text-indigo-400">({items.length} items)</span>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">{GROUP_LABEL[type]}</label>
          <input
            type="number" min="0" step="0.001"
            value={total ? total.toFixed(3).replace(/\.?0+$/, '') : ''}
            onChange={e => applyGroupTotal(g.processTypeId, e.target.value)}
            placeholder="0"
            className="border border-indigo-300 rounded-lg px-2 py-1 text-xs bg-white text-right font-bold text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 w-24"
          />
          <span className="text-xs text-indigo-400">→</span>
          <span className="text-xs font-bold text-indigo-700">₹{amount.toFixed(2)}</span>
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
    <div className="card p-4 sm:p-5 3xl:p-6 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center border-b border-slate-100 pb-2 mb-3">
        <div>
          <p className="section-title">Services / Items</p>
          {challanInfo && <p className="text-[10px] text-slate-400 mt-0.5">Auto-filled from challan — edit if partial delivery</p>}
        </div>
        <button type="button" onClick={() => setLineItems(p => [...p, newEmptyLine()])}
          className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-sm">add</span> Add Row
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2 mb-3">
        <span className="material-symbols-outlined text-sky-500 text-[16px]">scale</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-semibold text-sky-500 uppercase tracking-wider">Total Weight</span>
          <span className="text-sm font-extrabold text-sky-800">{kg(totalKg)} kg</span>
        </div>
        {challanKg > 0 && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Challan</span>
            <span className="text-xs font-bold text-slate-600">{kg(challanKg)} kg</span>
            {Math.abs(challanKg - totalKg) >= 0.001 && (
              <span className="badge bg-amber-100 text-amber-700 text-[10px]">
                {totalKg < challanKg ? `${kg(challanKg - totalKg)} kg pending` : `${kg(totalKg - challanKg)} kg extra`}
              </span>
            )}
          </div>
        )}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Lines</span>
          <span className="text-xs font-bold text-slate-600">{lineItems.length}</span>
        </div>
        <div className="ml-auto flex items-baseline gap-1.5">
          <span className="text-[10px] font-semibold text-sky-500 uppercase tracking-wider">Subtotal</span>
          <span className="text-sm font-extrabold text-sky-800">₹{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* The invoice bills the process; the part name under it is optional. */}
      {setShowPartName && (
        <label className="flex items-start gap-2 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-3 hover:border-sky-200 transition-colors">
          <input type="checkbox" checked={showPartName}
            onChange={e => setShowPartName(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-sky-600 flex-shrink-0" />
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

      <div className="hidden sm:grid grid-cols-[2rem_1fr_1.2fr_5.5rem_7.5rem_4.5rem_5rem_6.5rem_1.5rem] gap-2 px-3 pb-1.5">
        {['Sr.','Process','Description','Billing','Qty / UOM','Rate (₹)','Weight (kg)','Amount (₹)',''].map(h => (
          <p key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</p>
        ))}
      </div>

      <div className="space-y-2">
        {groups.map(g => (
          <div key={g.key || `single-${g.indices[0]}`}>
            {g.processTypeId && g.indices.length > 1 && renderGroupSummary(g)}
            <div className="space-y-2">
              {g.indices.map(i => renderRow(lineItems[i], i))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
