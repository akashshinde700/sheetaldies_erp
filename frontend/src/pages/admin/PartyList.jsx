import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import SearchSelect from '../../components/SearchSelect';
import ListSearchInput from '../../components/ListSearchInput';
import { useAuth } from '../../context/AuthContext';

const EMPTY = {
  name:'', partyCode:'', address:'', city:'', state:'Maharashtra', pinCode:'',
  gstin:'', pan:'', stateCode:'27', phone:'', email:'', partyType:'CUSTOMER',
  vatTin:'', cstNo:'',
  bankAccountHolder:'', bankName:'', accountNo:'', ifscCode:'', swiftCode:'',
};

// GST state code lookup
const STATE_CODES = {
  'andhra pradesh':'37','arunachal pradesh':'12','assam':'18','bihar':'10','chhattisgarh':'22',
  'goa':'30','gujarat':'24','haryana':'06','himachal pradesh':'02','jharkhand':'20',
  'karnataka':'29','kerala':'32','madhya pradesh':'23','maharashtra':'27','manipur':'14',
  'meghalaya':'17','mizoram':'15','nagaland':'13','odisha':'21','punjab':'03',
  'rajasthan':'08','sikkim':'11','tamil nadu':'33','telangana':'36','tripura':'16',
  'uttar pradesh':'09','uttarakhand':'05','west bengal':'19',
  'delhi':'07','jammu and kashmir':'01','ladakh':'38','chandigarh':'04',
  'dadra and nagar haveli and daman and diu':'26','lakshadweep':'31','puducherry':'34',
  'andaman and nicobar islands':'35',
};

const validateGSTIN = (v) => {
  if (!v) return null;
  if (v.length !== 15) return 'GSTIN must be exactly 15 characters';
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v)) return 'Invalid GSTIN format';
  return null;
};
const validateIFSC = (v) => {
  if (!v) return null;
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v)) return 'IFSC must be 11 chars: 4 letters, 0, 6 alphanumeric';
  return null;
};
const validatePAN = (v) => {
  if (!v) return null;
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v)) return 'Invalid PAN format (e.g. ABCDE1234F)';
  return null;
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

// Defined at module level — NEVER inside a component or focus will be lost on every keystroke
const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function PartyList() {
  const { isManager } = useAuth();
  const PAGE_SIZE = 10;
  const [parties,    setParties]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('ALL');
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);
  const [showForm,   setShowForm]   = useState(false);
  const [editId,     setEditId]     = useState(null);
  const [form,       setForm]       = useState(EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [clonePickerKey, setClonePickerKey] = useState(0);
  const [processes,  setProcesses]  = useState([]);
  const [ratesMap,   setRatesMap]   = useState({}); // { [processTypeId]: { pricePerKg, pricePerPc, lotPrice } }

  const load = () => {
    setLoading(true);
    api.get('/parties').then(r => setParties(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get('/processes').then(r => {
      const all = (r.data.data || r.data).filter(p => p.isActive !== false);
      // Deduplicate by process name (keep first occurrence)
      const uniqueByName = [];
      const seenNames = new Set();
      for (const p of all) {
        if (!seenNames.has(p.name)) {
          seenNames.add(p.name);
          uniqueByName.push(p);
        }
      }
      setProcesses(uniqueByName);
    });
  }, []);
  useEffect(() => { setPage(1); }, [search, filter]);

  const filtered = parties.filter(p => {
    const matchType   = filter === 'ALL' || p.partyType === filter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
      || p.gstin?.toLowerCase().includes(search.toLowerCase())
      || p.city?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedParties = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const nextPartyCode = () => {
    let max = 0;
    for (const p of parties) {
      const m = p.partyCode?.match(/^S(\d+)$/i);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return 'S' + String(max + 1).padStart(4, '0');
  };

  const openNew = () => { setForm({ ...EMPTY, partyCode: nextPartyCode() }); setEditId(null); setRatesMap({}); setShowForm(true); };

  const openEdit = (p) => {
    setForm(partyToFormFields(p));
    setEditId(p.id);
    setRatesMap({});
    api.get(`/parties/${p.id}/process-rates`).then(r => {
      const m = {};
      for (const row of r.data.data || []) {
        m[row.processTypeId] = {
          pricePerKg: row.pricePerKg ?? '',
          pricePerPc: row.pricePerPc ?? '',
          lotPrice:  row.lotPrice  ?? '',
        };
      }
      setRatesMap(m);
    });
    setShowForm(true);
  };

  const setRate = (ptId, field, val) =>
    setRatesMap(prev => ({ ...prev, [ptId]: { ...(prev[ptId] || {}), [field]: val } }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let savedId = editId;
      if (editId) {
        await api.put(`/parties/${editId}`, form);
      } else {
        const r = await api.post('/parties', form);
        savedId = r.data.data?.id;
      }
      if (savedId && Object.keys(ratesMap).length > 0) {
        const ratesPayload = Object.entries(ratesMap).map(([ptId, v]) => ({
          processTypeId: Number(ptId),
          pricePerKg: v.pricePerKg !== '' ? v.pricePerKg : null,
          pricePerPc: v.pricePerPc !== '' ? v.pricePerPc : null,
          lotPrice:  v.lotPrice  !== '' ? v.lotPrice  : null,
        }));
        await api.put(`/parties/${savedId}/process-rates`, ratesPayload);
      }
      toast.success(editId ? 'Party updated.' : 'Party added.');
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving party.');
    } finally { setSaving(false); }
  };

  const set = (k, v) => setForm(p => {
    const next = { ...p, [k]: v };
    // Auto-extract state code from GSTIN first 2 digits
    if (k === 'gstin' && v.length >= 2) {
      const code = v.slice(0, 2);
      if (/^\d{2}$/.test(code)) next.stateCode = code;
    }
    // Auto-set state code from state name
    if (k === 'state') {
      const code = STATE_CODES[v.toLowerCase().trim()];
      if (code) next.stateCode = code;
    }
    return next;
  });

  return (
    <div className="page-stack w-full space-y-6 animate-slide-up">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Parties</h1>
          <p className="page-subtitle">{filtered.length > 0 ? `${filtered.length} of ${parties.length}` : 'Customers, Vendors & Both'}</p>
        </div>
        <button onClick={openNew} className="btn-primary shrink-0 inline-flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[18px]">add</span> Add Party
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search</label>
          <ListSearchInput
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, GSTIN, city..."
          />
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
        {(search || filter !== 'ALL') ? (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setFilter('ALL');
            }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium"
          >
            <span className="material-symbols-outlined text-sm">close</span> Clear
          </button>
        ) : <div />}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[540px]">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                <th className="th">Name</th>
                <th className="th hidden sm:table-cell">City / State</th>
                <th className="th hidden md:table-cell">GSTIN</th>
                <th className="th">Phone</th>
                <th className="th hidden md:table-cell">Email</th>
                <th className="th">Type</th>
                <th className="th">Actions</th>
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
              ) : pagedParties.map(p => (
                <tr key={p.id} className="tr">
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{p.name}</span>
                      {p.partyCode && <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{p.partyCode}</span>}
                    </div>
                    {p.address && <div className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5">{p.address}</div>}
                  </td>
                  <td className="td text-xs text-slate-600 hidden sm:table-cell">
                    {[p.city, p.state].filter(Boolean).join(', ') || '—'}
                    {p.pinCode && <span className="text-slate-400"> – {p.pinCode}</span>}
                  </td>
                  <td className="td text-xs font-mono text-slate-600 hidden md:table-cell">{p.gstin || '—'}</td>
                  <td className="td text-xs text-slate-600">{p.phone || '—'}</td>
                  <td className="td text-xs text-slate-600 hidden md:table-cell">{p.email || '—'}</td>
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
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-outline text-xs disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs font-semibold text-slate-600">{page} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-outline text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
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
            <div className="relative w-full max-w-2xl max-h-[min(100dvh-1.5rem,1200px)] flex flex-col rounded-2xl bg-white shadow-2xl shadow-slate-900/20 border border-slate-200/80 overflow-hidden animate-scale-in">

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

              {/* Name + Party Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <F label="Company / Party Name *" className="col-span-1 sm:col-span-2">
                  <input value={form.name} onChange={e => set('name', e.target.value)} required className="form-input" placeholder="Sheetal Dies & Tools Pvt. Ltd." />
                </F>
                <F label="Party Code">
                  <input value={form.partyCode} readOnly={!editId} onChange={e => set('partyCode', e.target.value.toUpperCase())} className={`form-input ${!editId ? 'bg-slate-50 text-slate-500 cursor-default' : ''}`} placeholder="S0004" />
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
                <div className="col-span-1 sm:col-span-2">
                  <label className="form-label">GSTIN</label>
                  <input value={form.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} className={`form-input font-mono ${validateGSTIN(form.gstin) ? 'border-rose-300 bg-rose-50' : form.gstin.length === 15 ? 'border-emerald-300' : ''}`} placeholder="27AAAAA0000A1Z5" maxLength={15} />
                  {validateGSTIN(form.gstin) && <p className="text-[10px] text-rose-600 mt-0.5">{validateGSTIN(form.gstin)}</p>}
                  {form.gstin.length === 15 && !validateGSTIN(form.gstin) && <p className="text-[10px] text-emerald-600 mt-0.5">Valid GSTIN format</p>}
                </div>
                <F label="State Code (auto)">
                  <input value={form.stateCode} onChange={e => set('stateCode', e.target.value)} className="form-input" placeholder="27" maxLength={3} />
                </F>
              </div>

              <div>
                <label className="form-label">PAN</label>
                <input value={form.pan} onChange={e => set('pan', e.target.value.toUpperCase())} className={`form-input font-mono ${validatePAN(form.pan) ? 'border-rose-300 bg-rose-50' : form.pan.length === 10 ? 'border-emerald-300' : ''}`} placeholder="AAAAA0000A" maxLength={10} />
                {validatePAN(form.pan) && <p className="text-[10px] text-rose-600 mt-0.5">{validatePAN(form.pan)}</p>}
              </div>

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
                    <div>
                      <label className="form-label">IFSC Code</label>
                      <input value={form.ifscCode} onChange={e => set('ifscCode', e.target.value.toUpperCase())} className={`form-input font-mono ${validateIFSC(form.ifscCode) ? 'border-rose-300 bg-rose-50' : form.ifscCode.length === 11 ? 'border-emerald-300' : ''}`} placeholder="KKBK0001788" maxLength={11} />
                      {validateIFSC(form.ifscCode) && <p className="text-[10px] text-rose-600 mt-0.5">{validateIFSC(form.ifscCode)}</p>}
                    </div>
                    <F label="SWIFT Code"><input value={form.swiftCode} onChange={e => set('swiftCode', e.target.value.toUpperCase())} className="form-input font-mono" placeholder="KKBKINBB" /></F>
                  </div>
                </div>
              </div>

              {/* Process Rates — ADMIN / MANAGER only */}
              {isManager && processes.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="section-title">Process Rates (Party-Specific)</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Admin / Manager</span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs min-w-[580px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">Process</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">Rate/Kg (₹)</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">Rate/Pc (₹)</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">Lot Charge (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {processes.map(pt => (
                          <tr key={pt.id} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2 font-medium text-slate-700">{pt.name}</td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number" step="0.01" min="0"
                                value={ratesMap[pt.id]?.pricePerKg ?? ''}
                                onChange={e => setRate(pt.id, 'pricePerKg', e.target.value)}
                                className="form-input py-1 text-xs w-24"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number" step="0.01" min="0"
                                value={ratesMap[pt.id]?.pricePerPc ?? ''}
                                onChange={e => setRate(pt.id, 'pricePerPc', e.target.value)}
                                className="form-input py-1 text-xs w-24"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number" step="0.01" min="0"
                                value={ratesMap[pt.id]?.lotPrice ?? ''}
                                onChange={e => setRate(pt.id, 'lotPrice', e.target.value)}
                                className="form-input py-1 text-xs w-24"
                                placeholder="0.00"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">Leave blank to skip. Party-specific rate applies during inward entry and invoicing.</p>
                </div>
              )}

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
