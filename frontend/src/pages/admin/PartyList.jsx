import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import SearchSelect from '../../components/SearchSelect';

const EMPTY = {
  name:'', partyCode:'', address:'', city:'', state:'Maharashtra', pinCode:'',
  gstin:'', pan:'', stateCode:'27', phone:'', email:'', partyType:'CUSTOMER',
  vatTin:'', cstNo:'',
  bankAccountHolder:'', bankName:'', accountNo:'', ifscCode:'', swiftCode:'',
};

const TYPE_BADGE = {
  CUSTOMER: 'bg-indigo-100 text-indigo-700',
  VENDOR:   'bg-violet-100 text-violet-700',
  BOTH:     'bg-emerald-100 text-emerald-700',
};

const partyToFormFields = (p) => ({
  name: p.name || '',
  partyCode: p.partyCode || '',
  address: p.address || '',
  city: p.city || '',
  state: p.state || '',
  pinCode: p.pinCode || '',
  gstin: p.gstin || '',
  pan: p.pan || '',
  stateCode: p.stateCode || '',
  phone: p.phone || '',
  email: p.email || '',
  partyType: p.partyType || 'CUSTOMER',
  vatTin: p.vatTin || '',
  cstNo: p.cstNo || '',
  bankAccountHolder: p.bankAccountHolder || '',
  bankName: p.bankName || '',
  accountNo: p.accountNo || '',
  ifscCode: p.ifscCode || '',
  swiftCode: p.swiftCode || '',
});

export default function PartyList() {
  const [parties,  setParties]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('ALL');
  const [search,   setSearch]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [clonePickerKey, setClonePickerKey] = useState(0);

  const load = () => {
    setLoading(true);
    api.get('/parties').then(r => setParties(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = parties.filter(p => {
    const matchType   = filter === 'ALL' || p.partyType === filter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
      || p.gstin?.toLowerCase().includes(search.toLowerCase())
      || p.city?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const openNew = () => { setForm(EMPTY); setEditId(null); setShowForm(true); };

  const openEdit = (p) => {
    setForm(partyToFormFields(p));
    setEditId(p.id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/parties/${editId}`, form);
        toast.success('Party updated.');
      } else {
        await api.post('/parties', form);
        toast.success('Party added.');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving party.');
    } finally { setSaving(false); }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const F = ({ label, children, className = '' }) => (
    <div className={className}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Parties</h2>
          <p className="text-xs text-slate-400 mt-0.5">{filtered.length > 0 ? `${filtered.length} of ${parties.length}` : 'Customers, Vendors & Both'}</p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <span className="material-symbols-outlined text-sm">add</span> Add Party
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="form-input pl-9 w-full sm:w-64" placeholder="Search name, GSTIN, city..." />
        </div>
        <div className="flex gap-2">
          {['ALL', 'CUSTOMER', 'VENDOR', 'BOTH'].map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-150 ${
                filter === t
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                {['Name', 'City / State', 'GSTIN', 'Phone', 'Email', 'Type', 'Actions'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    <span className="text-sm">Loading parties...</span>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-xl text-slate-300">group</span>
                  </div>
                  <p className="text-sm text-slate-400">No parties found.</p>
                </td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="tr">
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{p.name}</span>
                      {p.partyCode && <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{p.partyCode}</span>}
                    </div>
                    {p.address && <div className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5">{p.address}</div>}
                  </td>
                  <td className="td text-xs text-slate-600">
                    {[p.city, p.state].filter(Boolean).join(', ') || '—'}
                    {p.pinCode && <span className="text-slate-400"> – {p.pinCode}</span>}
                  </td>
                  <td className="td text-xs font-mono text-slate-600">{p.gstin || '—'}</td>
                  <td className="td text-xs text-slate-600">{p.phone || '—'}</td>
                  <td className="td text-xs text-slate-600">{p.email || '—'}</td>
                  <td className="td">
                    <span className={`badge ${TYPE_BADGE[p.partyType] || 'bg-slate-100 text-slate-600'}`}>{p.partyType}</span>
                  </td>
                  <td className="td">
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                      <Link
                        to={`/admin/parties/${p.id}`}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-700 hover:underline">
                        <span className="material-symbols-outlined text-sm">visibility</span> View
                      </Link>
                      <button type="button" onClick={() => openEdit(p)}
                        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                        <span className="material-symbols-outlined text-sm">edit</span> Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: portal to body — avoids broken fixed positioning inside Layout animate-slide-up (transform) */}
      {showForm &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="party-form-title"
          >
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-backdrop-in" onClick={() => setShowForm(false)} aria-hidden />
            <div className="relative w-full max-w-lg max-h-[min(100dvh-1.5rem,920px)] flex flex-col rounded-2xl bg-white shadow-2xl shadow-slate-900/20 border border-slate-200/80 overflow-hidden animate-scale-in">

            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0 bg-gradient-to-br from-slate-50 to-indigo-50/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm">
                  <span className="material-symbols-outlined text-white text-[18px]">group</span>
                </div>
                <h3 id="party-form-title" className="text-base font-extrabold text-slate-800 truncate">
                  {editId ? 'Edit Party' : 'Add New Party'}
                </h3>
              </div>
              <button type="button" onClick={() => setShowForm(false)}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-sm shrink-0">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-4">

              {/* Party Type */}
              <div>
                <label className="form-label">Party Type *</label>
                <div className="flex gap-2">
                  {['CUSTOMER', 'VENDOR', 'BOTH'].map(t => (
                    <button key={t} type="button" onClick={() => set('partyType', t)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        form.partyType === t
                          ? 'text-white border-transparent shadow-sm'
                          : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                      style={form.partyType === t ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' } : {}}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {!editId && (
                <div>
                  <label className="form-label">Copy from existing party (optional)</label>
                  <SearchSelect
                    key={clonePickerKey}
                    value=""
                    onChange={(pid) => {
                      if (!pid) return;
                      const p = parties.find((x) => String(x.id) === String(pid));
                      if (p) {
                        setForm(partyToFormFields(p));
                        toast.success(`Loaded details from ${p.name}. Review and save as new party.`);
                      }
                      setClonePickerKey((k) => k + 1);
                    }}
                    options={parties.map((p) => ({ value: p.id, label: `${p.name} (${p.partyType})` }))}
                    placeholder="Search & select — all fields fill below"
                  />
                </div>
              )}

              {/* Name + Party Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <F label="Company / Party Name *" className="col-span-1 sm:col-span-2">
                  <input value={form.name} onChange={e => set('name', e.target.value)} required className="form-input" placeholder="Sheetal Dies & Tools Pvt. Ltd." />
                </F>
                <F label="Party Code">
                  <input value={form.partyCode} onChange={e => set('partyCode', e.target.value.toUpperCase())} className="form-input" placeholder="S0004" />
                </F>
              </div>

              {/* Address */}
              <F label="Address *">
                <textarea value={form.address} onChange={e => set('address', e.target.value)} required rows={2} className="form-input resize-none" placeholder="Plot No. 5, Sector 10..." />
              </F>

              {/* City / State / Pin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <F label="City"><input value={form.city} onChange={e => set('city', e.target.value)} className="form-input" placeholder="Pune" /></F>
                <F label="State"><input value={form.state} onChange={e => set('state', e.target.value)} className="form-input" placeholder="Maharashtra" /></F>
                <F label="PIN Code"><input value={form.pinCode} onChange={e => set('pinCode', e.target.value)} className="form-input" placeholder="411014" maxLength={6} /></F>
              </div>

              {/* GSTIN / State Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <F label="GSTIN" className="col-span-1 sm:col-span-2">
                  <input value={form.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} className="form-input font-mono" placeholder="27AAAAA0000A1Z5" maxLength={15} />
                </F>
                <F label="State Code">
                  <input value={form.stateCode} onChange={e => set('stateCode', e.target.value)} className="form-input" placeholder="27" maxLength={3} />
                </F>
              </div>

              <F label="PAN">
                <input value={form.pan} onChange={e => set('pan', e.target.value.toUpperCase())} className="form-input font-mono" placeholder="AAAAA0000A" maxLength={10} />
              </F>

              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <F label="Phone"><input value={form.phone} onChange={e => set('phone', e.target.value)} className="form-input" placeholder="9876543210" /></F>
                <F label="Email"><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="form-input" placeholder="info@company.com" /></F>
              </div>

              {/* VAT / CST */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <F label="VAT TIN"><input value={form.vatTin} onChange={e => set('vatTin', e.target.value)} className="form-input" placeholder="27501011577V" /></F>
                <F label="CST No"><input value={form.cstNo} onChange={e => set('cstNo', e.target.value)} className="form-input" placeholder="27501011577C" /></F>
              </div>

              {/* Bank Details */}
              <div className="border-t border-slate-100 pt-4">
                <p className="section-title mb-3">Bank Details</p>
                <div className="space-y-3">
                  <F label="A/c Holder Name">
                    <input value={form.bankAccountHolder} onChange={e => set('bankAccountHolder', e.target.value)} className="form-input" placeholder="Company Name as per bank" />
                  </F>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <F label="Bank Name"><input value={form.bankName} onChange={e => set('bankName', e.target.value)} className="form-input" placeholder="Kotak Mahindra Bank" /></F>
                    <F label="Account No"><input value={form.accountNo} onChange={e => set('accountNo', e.target.value)} className="form-input font-mono" placeholder="6601016330" /></F>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="IFSC Code"><input value={form.ifscCode} onChange={e => set('ifscCode', e.target.value.toUpperCase())} className="form-input font-mono" placeholder="KKBK0001788" /></F>
                    <F label="SWIFT Code"><input value={form.swiftCode} onChange={e => set('swiftCode', e.target.value.toUpperCase())} className="form-input font-mono" placeholder="KKBKINBB" /></F>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2 pb-1 border-t border-slate-100 mt-2 bg-white">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost sm:w-auto w-full justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary justify-center min-h-[44px]">
                  {saving
                    ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Saving...</>
                    : <><span className="material-symbols-outlined text-sm">save</span> {editId ? 'Update Party' : 'Add Party'}</>
                  }
                </button>
              </div>
            </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
