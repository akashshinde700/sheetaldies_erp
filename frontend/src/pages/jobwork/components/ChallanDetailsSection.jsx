import React from 'react';
import SearchSelect from '../../../components/SearchSelect';

const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function ChallanDetailsSection({ 
  isEdit, form, setForm, jobCards, parties, 
  manualChallanNo, setManualChallanNo, 
  challanNoInput, setChallanNoInput, addDays 
}) {
  return (
    <div className="card p-5 space-y-4">
      <p className="section-title border-b border-slate-100 pb-2">Challan Details</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Challan Date *">
          <input type="date" value={form.challanDate}
            onChange={e => setForm(p => ({ ...p, challanDate: e.target.value, dispatchDate: e.target.value, dueDate: addDays(e.target.value, 4) }))}
            required className="form-input" />
        </F>
        <div>
          {isEdit ? (
            <>
              <label className="form-label mb-1">Challan No</label>
              <input type="text" value={challanNoInput || '-'} disabled className="form-input opacity-60 cursor-not-allowed" />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Challan No</label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={manualChallanNo}
                    onChange={e => { setManualChallanNo(e.target.checked); if (!e.target.checked) setChallanNoInput(''); }}
                    className="w-3.5 h-3.5 accent-indigo-600"
                  />
                  <span className="text-[11px] text-slate-500">Manual</span>
                </label>
              </div>
              {manualChallanNo ? (
                <input
                  type="text"
                  value={challanNoInput}
                  onChange={e => setChallanNoInput(e.target.value)}
                  placeholder="e.g. SDT/JW/25-26/0050"
                  required
                  className="form-input"
                />
              ) : (
                <input type="text" value="Auto-generated" disabled className="form-input opacity-50 cursor-not-allowed" />
              )}
            </>
          )}
        </div>
        <F label="Link Job Card">
          <SearchSelect
            value={form.jobCardId}
            onChange={v => setForm(p => ({ ...p, jobCardId: v }))}
            options={jobCards
              .filter((jc) => ['CREATED', 'IN_PROGRESS'].includes(jc.status) || String(jc.id) === String(form.jobCardId))
              .map(jc => ({ value: jc.id, label: `${jc.jobCardNo} — ${jc.part?.partNo || ''}` }))}
            placeholder="— Optional —"
          />
        </F>
        <F label="Transport Mode">
          <select value={form.transportMode} onChange={e => setForm(p => ({ ...p, transportMode: e.target.value }))} className="form-input">
            {['Hand Delivery', 'Courier', 'Own Vehicle', 'Transporter'].map(m => <option key={m}>{m}</option>)}
          </select>
        </F>
        <F label="Invoice Ch. No">
          <input value={form.invoiceChNo} onChange={e => setForm(p => ({ ...p, invoiceChNo: e.target.value }))} className="form-input" placeholder="Reference invoice no" />
        </F>
        <F label="Invoice Ch. Date">
          <input type="date" value={form.invoiceChDate} onChange={e => setForm(p => ({ ...p, invoiceChDate: e.target.value }))} className="form-input" />
        </F>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="From Party (Sender) *">
          <SearchSelect
            value={form.fromPartyId}
            onChange={v => setForm(p => ({ ...p, fromPartyId: v }))}
            options={parties.map(p => ({ value: p.id, label: p.name }))}
            placeholder="— Select Sender —"
            required
          />
        </F>
        <F label="To Party (Processor) *">
          <SearchSelect
            value={form.toPartyId}
            onChange={v => setForm(p => ({ ...p, toPartyId: v }))}
            options={parties.filter(p => p.partyType === 'VENDOR' || p.partyType === 'BOTH').map(p => ({ value: p.id, label: p.name }))}
            placeholder="— Select Processor —"
            required
          />
        </F>
        <F label="Vehicle No">
          <input value={form.vehicleNo} onChange={e => setForm(p => ({ ...p, vehicleNo: e.target.value }))} className="form-input" placeholder="MH12 AB 1234" />
        </F>
        <F label="Delivery Person">
          <input value={form.deliveryPerson} onChange={e => setForm(p => ({ ...p, deliveryPerson: e.target.value }))} className="form-input" placeholder="Name of person delivering" />
        </F>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Dispatch Date">
          <input type="date" value={form.dispatchDate} onChange={e => setForm(p => ({ ...p, dispatchDate: e.target.value }))} className="form-input" />
        </F>
        <F label="Due Date (Return by)">
          <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="form-input" />
        </F>
      </div>
    </div>
  );
}
