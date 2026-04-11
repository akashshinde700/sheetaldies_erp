import React from 'react';
import { toNum } from '../../../utils/normalize';

export default function LineItemsSection({ lineItems, setLineItems, items, updateLineItem, EMPTY_ROW }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <p className="section-title">Line Items</p>
        <button type="button" onClick={() => setLineItems(prev => [...prev, { ...EMPTY_ROW }])}
          className="btn-secondary text-xs px-3 py-1.5">
          <span className="material-symbols-outlined text-sm">add</span> Add Row
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="th">Item</th>
              <th className="th">Description</th>
              <th className="th">Drawing No</th>
              <th className="th">Material</th>
              <th className="th">HRC</th>
              <th className="th">HSN</th>
              <th className="th">Qty</th>
              <th className="th">Qty Out</th>
              <th className="th">UOM</th>
              <th className="th">Weight</th>
              <th className="th">Rate</th>
              <th className="th">Amount</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {lineItems.map((row, i) => (
              <tr key={i}>
                <td className="td">
                  <select value={row.itemId} onChange={e => updateLineItem(i, 'itemId', e.target.value)}
                    className="form-input text-xs py-1 w-28">
                    <option value="">—</option>
                    {items.map(it => <option key={it.id} value={it.id}>{it.partNo}</option>)}
                  </select>
                </td>
                <td className="td"><input list="challan-desc-suggestions" value={row.description} onChange={e => updateLineItem(i, 'description', e.target.value)} className="form-input text-xs py-1 w-36" /></td>
                <td className="td"><input value={row.drawingNo} onChange={e => updateLineItem(i, 'drawingNo', e.target.value)} className="form-input text-xs py-1 w-20" /></td>
                <td className="td"><input value={row.material} onChange={e => updateLineItem(i, 'material', e.target.value)} className="form-input text-xs py-1 w-16" /></td>
                <td className="td"><input value={row.hrc} onChange={e => updateLineItem(i, 'hrc', e.target.value)} className="form-input text-xs py-1 w-14" /></td>
                <td className="td"><input value={row.hsnCode} onChange={e => updateLineItem(i, 'hsnCode', e.target.value)} className="form-input text-xs py-1 w-20" /></td>
                <td className="td"><input type="number" min="0" value={row.quantity} onChange={e => updateLineItem(i, 'quantity', e.target.value)} className="form-input text-xs py-1 w-16 tabular-nums" /></td>
                <td className="td"><input type="number" min="0" value={row.qtyOut} onChange={e => updateLineItem(i, 'qtyOut', e.target.value)} className="form-input text-xs py-1 w-16 tabular-nums" /></td>
                <td className="td">
                  <select value={row.uom} onChange={e => updateLineItem(i, 'uom', e.target.value)} className="form-input text-xs py-1 w-16">
                    <option>KGS</option><option>NOS</option><option>PCS</option><option>SET</option>
                  </select>
                </td>
                <td className="td"><input type="number" step="0.001" value={row.weight} onChange={e => updateLineItem(i, 'weight', e.target.value)} className="form-input text-xs py-1 w-18 tabular-nums" /></td>
                <td className="td"><input type="number" step="0.01" value={row.rate} onChange={e => updateLineItem(i, 'rate', e.target.value)} className="form-input text-xs py-1 w-18 tabular-nums" /></td>
                <td className="td font-semibold tabular-nums text-right">{toNum(row.amount, 0).toFixed(2)}</td>
                <td className="td">
                  {lineItems.length > 1 && (
                    <button type="button" onClick={() => setLineItems(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-rose-400 hover:text-rose-600 transition-colors">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
