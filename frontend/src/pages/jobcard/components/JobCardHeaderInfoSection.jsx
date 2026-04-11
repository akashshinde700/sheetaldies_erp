import React from 'react';
import SearchSelect from '../../../components/SearchSelect';

const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function JobCardHeaderInfoSection({ 
  form, setForm, cardData, 
  parts, partOpen, partWrapRef, openPartDropdown, clearPart, partInputRef, 
  partQuery, setPartQuery, setShowAddForm, filteredParts, selectPart, showAddForm, 
  initQuickAdd, handleQuickAddPart, newPart, setNewPart, savingPart 
}) {
  const selectedPartLabel = parts.find(p => String(p.id) === String(form.partId))
    ? `${parts.find(p => String(p.id) === String(form.partId)).partNo} – ${parts.find(p => String(p.id) === String(form.partId)).description}`
    : '';

  return (
    <div className="card p-5 space-y-4">
      <p className="section-title border-b border-slate-100 pb-2">Job Card Info</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Part / item</label>
          <div ref={partWrapRef} className="relative">
            {!partOpen ? (
              <button type="button" onClick={openPartDropdown}
                className={`form-input w-full text-left flex items-center justify-between gap-2 ${!form.partId ? 'text-slate-400' : 'text-slate-800'}`}>
                <span className="truncate text-sm">{form.partId ? selectedPartLabel : '— Select or Add Part —'}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {form.partId && (
                    <button type="button" onClick={clearPart}
                      className="material-symbols-outlined text-[16px] text-slate-300 hover:text-rose-400 transition-colors">
                      close
                    </button>
                  )}
                  <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
                </div>
              </button>
            ) : (
              <div className="form-input flex items-center gap-2 p-0 overflow-hidden">
                <span className="material-symbols-outlined text-slate-400 text-[16px] ml-3 flex-shrink-0">search</span>
                <input ref={partInputRef} value={partQuery} onChange={e => { setPartQuery(e.target.value); setShowAddForm(false); }}
                  placeholder="Search or type new part name..."
                  className="flex-1 py-2 pr-3 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setPartOpen(false); setPartQuery(''); }
                    if (e.key === 'Enter' && filteredParts.length === 1) { e.preventDefault(); selectPart(filteredParts[0]); }
                  }} />
              </div>
            )}
            <input tabIndex={-1} required value={form.partId || ''} onChange={() => {}}
              className="absolute inset-0 opacity-0 pointer-events-none w-full" />
            
            {partOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <div className="max-h-56 overflow-y-auto">
                  {filteredParts.length === 0 && !showAddForm ? (
                    <div className="px-4 py-3 text-center">
                      <p className="text-xs text-slate-400 mb-2">No part found{partQuery ? ` for "${partQuery}"` : ''}.</p>
                      <button type="button" onClick={initQuickAdd}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-sm">add_circle</span>
                        Add "{partQuery || 'new part'}"
                      </button>
                    </div>
                  ) : filteredParts.map(p => (
                    <button key={p.id} type="button" onClick={() => selectPart(p)}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2 ${String(p.id) === String(form.partId) ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700'}`}>
                      {String(p.id) === String(form.partId) && <span className="material-symbols-outlined text-[14px] text-indigo-500 flex-shrink-0">check</span>}
                      <span className={String(p.id) === String(form.partId) ? '' : 'ml-[22px]'}>{p.partNo} – {p.description}</span>
                    </button>
                  ))}
                  {filteredParts.length > 0 && partQuery.trim() && !showAddForm && (
                    <button type="button" onClick={initQuickAdd}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-2 border-t border-slate-100">
                      <span className="material-symbols-outlined text-sm">add_circle</span>
                      Add "{partQuery}" as new part
                    </button>
                  )}
                </div>

                {showAddForm && (
                  <form onSubmit={handleQuickAddPart} className="border-t border-slate-100 p-3 space-y-2 bg-indigo-50/40">
                    <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Quick Add New Part</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Part No</label>
                        <input value={newPart.partNo} onChange={e => setNewPart(p => ({ ...p, partNo: e.target.value }))}
                          placeholder="e.g. P-001"
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-full bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Description *</label>
                        <input required value={newPart.description} onChange={e => setNewPart(p => ({ ...p, description: e.target.value }))}
                          placeholder="Part description"
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-full bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={savingPart}
                        className="flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                        <span className="material-symbols-outlined text-sm">{savingPart ? 'progress_activity' : 'save'}</span>
                        {savingPart ? 'Adding...' : 'Add & Select'}
                      </button>
                      <button type="button" onClick={() => setShowAddForm(false)}
                        className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 bg-white">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
        <F label="Job Card No.">
          <input value={cardData?.jobCardNo || 'Auto-generated'} disabled className="form-input bg-slate-50" />
        </F>
        <F label="Certificate No.">
          <input value={form.certificateNo} onChange={e => setForm(p => ({ ...p, certificateNo: e.target.value }))} className="form-input" />
        </F>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <F label="Your PO No.">
          <input value={form.yourNo} onChange={e => setForm(p => ({...p, yourNo: e.target.value}))} className="form-input" placeholder="Your PO No." />
        </F>
        <F label="Your DC No.">
          <input value={form.dieNo} onChange={e => setForm(p => ({...p, dieNo: e.target.value}))} className="form-input" placeholder="Your DC No." />
        </F>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <F label="DISPATCH MODE:-">
          <input value={form.dispatchMode} onChange={e => setForm(p => ({...p, dispatchMode: e.target.value}))} className="form-input" placeholder="DISPATCH MODE:-" />
        </F>
        <F label="Material">
          <input value={form.dieMaterial} onChange={e => setForm(p => ({...p, dieMaterial: e.target.value}))} className="form-input" placeholder="D2" />
        </F>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.dispatchByOurVehicle} onChange={e => setForm(p => ({ ...p, dispatchByOurVehicle: e.target.checked }))} /> By Our Vehicle</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.dispatchByCourier} onChange={e => setForm(p => ({ ...p, dispatchByCourier: e.target.checked }))} /> By Courier</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.collectedByCustomer} onChange={e => setForm(p => ({ ...p, collectedByCustomer: e.target.checked }))} /> Collected by Customer</label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <F label="Heat Treatment Specification">
          <select value={form.operationMode} onChange={e => setForm(p => ({...p, operationMode: e.target.value}))} className="form-input">
            <option value="NORMAL">NORMAL</option>
            <option value="REWORK">REWORK</option>
            <option value="HARDEN AND TEMPER">HARDEN AND TEMPER</option>
            <option value="STRESS RELIEVING">STRESS RELIEVING</option>
            <option value="ANNEALING">ANNEALING</option>
          </select>
        </F>
        <F label="Special Instruction">
          <input value={form.remarks} onChange={e => setForm(p => ({...p, remarks: e.target.value}))} className="form-input" placeholder="Special Instruction" />
        </F>
      </div>
      <div className="text-xs text-slate-500">Suggested treatment: D2 - HARDEN AND TEMPER - 61-63 HRC</div>
    </div>
  );
}
