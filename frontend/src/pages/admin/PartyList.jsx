import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Eye, Pencil, Trash2, X, Users, Save, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import SearchSelect from '../../components/SearchSelect';
import ListSearchInput from '../../components/ListSearchInput';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

const EMPTY = {
  name:'', partyCode:'', address:'', city:'', state:'Maharashtra', pinCode:'',
  gstin:'', pan:'', stateCode:'27', phone:'', email:'', partyType:'CUSTOMER',
  vatTin:'', cstNo:'', tallyLedgerName:'',
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

// Free-typed states drifted in spelling and case ("maharashtra", "MAHARASHTRA",
// "Maharastra"), and each variant broke the state-code lookup. Offering the
// canonical list instead keeps every party consistent and fills the GST code.
const titleCaseState = (s) =>
  s.split(' ').map(w => (w === 'and' ? w : w[0].toUpperCase() + w.slice(1))).join(' ');
const STATE_NAMES = Object.keys(STATE_CODES).map(titleCaseState).sort();

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
  CUSTOMER: 'bg-sky-100 text-sky-800',
  VENDOR:   'bg-violet-100 text-violet-800',
  BOTH:     'bg-emerald-100 text-emerald-800',
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
  tallyLedgerName: p.tallyLedgerName || '',
  cstNo: p.cstNo || '',
  bankAccountHolder: p.bankAccountHolder || '',
  bankName: p.bankName || '',
  accountNo: p.accountNo || '',
  ifscCode: p.ifscCode || '',
  swiftCode: p.swiftCode || '',
});

// Defined at module level — NEVER inside a component or focus will be lost on every keystroke
const F = ({ label, children, className = '', required = false, htmlFor }) => (
  <FormField label={label} required={required} htmlFor={htmlFor} className={className}>
    {children}
  </FormField>
);

const SectionTitle = ({ children }) => (
  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{children}</p>
);

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

const SkeletonRow = () => (
  <tr>
    <td className="td"><Skeleton className="h-3.5 w-36" /></td>
    <td className="td hidden sm:table-cell"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td hidden md:table-cell"><Skeleton className="h-3.5 w-32" /></td>
    <td className="td"><Skeleton className="h-3.5 w-20" /></td>
    <td className="td hidden md:table-cell"><Skeleton className="h-3.5 w-28" /></td>
    <td className="td"><Skeleton className="h-5 w-16 rounded-full" /></td>
    <td className="td"><Skeleton className="h-3.5 w-20 ml-auto" /></td>
  </tr>
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
  const [gstinError, setGstinError] = useState('');
  const gstinTimer = useRef(null);
  const [saving,     setSaving]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // party object to delete
  // Cities and PINs already used on other parties — typing the same place a
  // second time should not mean typing it out again.
  const [locations, setLocations] = useState({ cities: [], states: [], pinCodes: [] });
  const [deleting,   setDeleting]   = useState(false);
  const [clonePickerKey, setClonePickerKey] = useState(0);
  const [processes,  setProcesses]  = useState([]);
  const [ratesMap,   setRatesMap]   = useState({}); // { [processTypeId]: { pricePerKg, pricePerPc, lotPrice } }

  const load = () => {
    setLoading(true);
    api.get('/parties').then(r => setParties(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/parties/location-suggestions')
      .then(r => setLocations(r.data.data || { cities: [], states: [], pinCodes: [] }))
      .catch(() => {});
    load();
    api.get('/processes').then(r => {
      const all = (r.data.data || r.data).filter(p => p.isActive !== false && p.showInPartyRates !== false);
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

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/parties/${confirmDelete.id}`);
      toast.success('Party deleted.');
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting party.');
    } finally { setDeleting(false); }
  };

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
    // A city already on file carries its state and PIN with it, so choosing it
    // fills both — but never overwrites something already typed.
    if (k === 'city') {
      const known = locations.cities.find(c => c.city.toLowerCase() === v.toLowerCase().trim());
      if (known) {
        if (known.state && !p.state) {
          next.state = known.state;
          const code = STATE_CODES[known.state.toLowerCase().trim()];
          if (code) next.stateCode = code;
        }
        if (known.pinCode && !p.pinCode) next.pinCode = known.pinCode;
      }
    }
    return next;
  });

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Parties</h1>
          <p className="page-subtitle">{filtered.length > 0 ? `${filtered.length} of ${parties.length}` : 'Customers, Vendors & Both'}</p>
        </div>
        <Button type="button" onClick={openNew} className="shrink-0">
          <Plus /> Add Party
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
            <div className="space-y-1 flex-1 min-w-[220px]">
              <FilterLabel>Search</FilterLabel>
              <ListSearchInput
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, GSTIN, city..."
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <FilterLabel>Type</FilterLabel>
              <div className="flex gap-1.5">
                {['ALL', 'CUSTOMER', 'VENDOR', 'BOTH'].map(t => (
                  <button key={t} type="button" onClick={() => setFilter(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      filter === t
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-200'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-sky-300 hover:text-sky-600'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {(search || filter !== 'ALL') && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setFilter('ALL');
                }}
                className="text-slate-500 hover:text-rose-600"
              >
                <X /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-left min-w-[560px]">
            <thead>
              <tr>
                <th className="th">Name</th>
                <th className="th">Phone</th>
                <th className="th hidden md:table-cell">Email</th>
                <th className="th">Type</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                        <Users className="h-5 w-5 text-sky-300" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {(search || filter !== 'ALL') ? 'No parties match your filters.' : 'No parties yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : pagedParties.map(p => (
                <tr key={p.id} className="tr">
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/parties/${p.id}`} className="text-sm font-bold text-slate-800 hover:text-sky-700 hover:underline">{p.name}</Link>
                      {p.partyCode && <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{p.partyCode}</span>}
                    </div>
                    {p.address && <div className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5">{p.address}</div>}
                  </td>
                  <td className="td text-xs text-slate-600 whitespace-nowrap">{p.phone || '—'}</td>
                  <td className="td text-xs text-slate-600 hidden md:table-cell">{p.email || '—'}</td>
                  <td className="td">
                    <Badge className={`px-2 py-0.5 text-[10px] ${TYPE_BADGE[p.partyType] || 'bg-slate-100 text-slate-600'}`}>{p.partyType}</Badge>
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon-sm" asChild
                        className="text-slate-400 hover:text-slate-700">
                        <Link to={`/admin/parties/${p.id}`} title="View" aria-label={`View party ${p.name}`}>
                          <Eye />
                        </Link>
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm"
                        onClick={() => openEdit(p)}
                        title="Edit" aria-label={`Edit party ${p.name}`}
                        className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                        <Pencil />
                      </Button>
                      {isManager && (
                        <Button type="button" variant="ghost" size="icon-sm"
                          onClick={() => setConfirmDelete(p)}
                          title="Delete" aria-label={`Delete party ${p.name}`}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-500 tabular-nums">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              <span className="text-xs font-semibold text-slate-600 tabular-nums">{page} / {totalPages}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: portal to body — avoids broken fixed positioning inside Layout animate-slide-up (transform) */}
      {confirmDelete &&
        createPortal(
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] animate-backdrop-in" onClick={() => setConfirmDelete(null)} aria-hidden />
            <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-card-elevated border border-slate-200 overflow-hidden animate-scale-in">
              <div className="px-6 py-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                    <Trash2 className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Delete Party?</h3>
                    <p className="text-xs text-slate-500 mt-0.5">This cannot be undone.</p>
                  </div>
                </div>
                <p className="text-sm text-slate-700 mb-1">
                  <span className="font-bold">{confirmDelete.name}</span>
                  {confirmDelete.partyCode && <span className="text-slate-400 font-mono text-xs ml-1">({confirmDelete.partyCode})</span>}
                </p>
                <p className="text-xs text-slate-500 mb-5">If this party has linked challans, invoices, or job cards the delete will fail.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
                  <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting} className="flex-1">
                    {deleting
                      ? <><Loader2 className="animate-spin" /> Deleting...</>
                      : <><Trash2 /> Delete</>
                    }
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showForm &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="party-form-title"
          >
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] animate-backdrop-in" onClick={() => setShowForm(false)} aria-hidden />
            <div className="relative w-full max-w-2xl max-h-[min(100dvh-1.5rem,1200px)] flex flex-col rounded-2xl bg-white shadow-card-elevated border border-slate-200 overflow-hidden animate-scale-in">

            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-900 shadow-sm">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <h3 id="party-form-title" className="text-base font-bold text-slate-900 tracking-tight truncate">
                  {editId ? 'Edit Party' : 'Add New Party'}
                </h3>
              </div>
              <Button type="button" variant="outline" size="icon-sm" onClick={() => setShowForm(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-rose-600 hover:border-rose-200 shrink-0">
                <X />
              </Button>
            </div>

            <form onSubmit={handleSave} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-4">

              {/* Party Type */}
              <FormField label="Party Type" required>
                <div className="flex gap-2">
                  {['CUSTOMER', 'VENDOR', 'BOTH'].map(t => (
                    <button key={t} type="button" onClick={() => set('partyType', t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                        form.partyType === t
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-sky-300 hover:text-sky-600'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Name + Party Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <F label="Company / Party Name" required htmlFor="party-name" className="col-span-1 sm:col-span-2">
                  <Input id="party-name" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Sheetal Dies & Tools Pvt. Ltd." />
                </F>
                <F label="Party Code" htmlFor="party-code">
                  <Input id="party-code" value={form.partyCode} readOnly={!editId} onChange={e => set('partyCode', e.target.value.toUpperCase())}
                    className={`font-mono ${!editId ? 'bg-slate-50 text-slate-500 cursor-default' : ''}`} placeholder="S0004" />
                </F>
              </div>

              {/* Address */}
              <F label="Address" required htmlFor="party-address">
                <Textarea id="party-address" value={form.address} onChange={e => set('address', e.target.value)} required rows={2} className="min-h-[64px]" placeholder="Plot No. 5, Sector 10..." />
              </F>

              {/* City / State / Pin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <F label="City" htmlFor="party-city">
                  <Input
                    id="party-city"
                    value={form.city}
                    list="party-city-list"
                    onChange={e => set('city', e.target.value)}
                    placeholder="Pune"
                  />
                  <datalist id="party-city-list">
                    {locations.cities.map(c => (
                      <option key={c.city} value={c.city}>{[c.state, c.pinCode].filter(Boolean).join(' · ')}</option>
                    ))}
                  </datalist>
                </F>
                <F label="State" htmlFor="party-state">
                  <select id="party-state" value={form.state} onChange={e => set('state', e.target.value)} className="form-input">
                    <option value="">— Select —</option>
                    {STATE_NAMES.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </F>
                <F label="PIN Code" htmlFor="party-pin">
                  <Input
                    id="party-pin"
                    value={form.pinCode}
                    list="party-pin-list"
                    onChange={e => set('pinCode', e.target.value)}
                    placeholder="411014"
                    maxLength={6}
                    className="tabular-nums"
                  />
                  <datalist id="party-pin-list">
                    {locations.pinCodes.map(pc => <option key={pc} value={pc} />)}
                  </datalist>
                </F>
              </div>

              {/* GSTIN / State Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField
                  label="GSTIN"
                  htmlFor="party-gstin"
                  className="col-span-1 sm:col-span-2"
                  error={gstinError || null}
                >
                  <Input id="party-gstin" value={form.gstin} onChange={e => {
                    const v = e.target.value.toUpperCase();
                    set('gstin', v);
                    clearTimeout(gstinTimer.current);
                    gstinTimer.current = setTimeout(() => setGstinError(validateGSTIN(v) || ''), 500);
                  }} className={`font-mono ${gstinError ? 'border-rose-300 bg-rose-50' : form.gstin.length === 15 && !gstinError ? 'border-emerald-300' : ''}`} placeholder="27AAAAA0000A1Z5" maxLength={15} />
                  {form.gstin.length === 15 && !gstinError && <p className="text-[10px] text-emerald-600 mt-0.5">✓ Valid GSTIN format</p>}
                </FormField>
                <F label="State Code (auto)" htmlFor="party-statecode">
                  <Input id="party-statecode" value={form.stateCode} onChange={e => set('stateCode', e.target.value)} placeholder="27" maxLength={3} className="tabular-nums" />
                </F>
              </div>

              <FormField label="PAN" htmlFor="party-pan" error={validatePAN(form.pan)}>
                <Input id="party-pan" value={form.pan} onChange={e => set('pan', e.target.value.toUpperCase())}
                  className={`font-mono ${validatePAN(form.pan) ? 'border-rose-300 bg-rose-50' : form.pan.length === 10 ? 'border-emerald-300' : ''}`}
                  placeholder="AAAAA0000A" maxLength={10} />
              </FormField>

              {/* Tally matches ledgers by exact name and never creates one on
                  import, so a party spelled differently there needs mapping. */}
              <div>
                <F label="Tally Ledger Name" htmlFor="party-tally">
                  <Input id="party-tally" value={form.tallyLedgerName} onChange={e => set('tallyLedgerName', e.target.value)}
                    className={form.tallyLedgerName ? 'border-violet-300 bg-violet-50/40' : ''}
                    placeholder={form.name || 'Tally me jo naam hai'} maxLength={200} />
                </F>
                <p className="text-[10px] text-slate-400 mt-1">
                  Khali chhodo to upar wala naam hi Tally me jayega. Tally me is party ka
                  ledger kisi aur naam se hai to wahi yahan likho — <strong>bilkul waisa hi</strong>,
                  ek space ka farak bhi "Ledger not found" de dega.
                </p>
                {form.tallyLedgerName && form.tallyLedgerName.trim() !== form.name.trim() && (
                  <p className="text-[10px] text-violet-600 mt-0.5">
                    Invoice pe: <strong>{form.name || '—'}</strong> · Tally me: <strong>{form.tallyLedgerName.trim()}</strong>
                  </p>
                )}
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <F label="Phone" htmlFor="party-phone"><Input id="party-phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="9876543210" /></F>
                <F label="Email" htmlFor="party-email"><Input id="party-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@company.com" /></F>
              </div>

              {/* VAT / CST */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <F label="VAT TIN" htmlFor="party-vat"><Input id="party-vat" value={form.vatTin} onChange={e => set('vatTin', e.target.value)} className="font-mono" placeholder="27501011577V" /></F>
                <F label="CST No" htmlFor="party-cst"><Input id="party-cst" value={form.cstNo} onChange={e => set('cstNo', e.target.value)} className="font-mono" placeholder="27501011577C" /></F>
              </div>

              {/* Bank Details */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <SectionTitle>Bank Details</SectionTitle>
                <F label="A/c Holder Name" htmlFor="party-bank-holder">
                  <Input id="party-bank-holder" value={form.bankAccountHolder} onChange={e => set('bankAccountHolder', e.target.value)} placeholder="Company Name as per bank" />
                </F>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <F label="Bank Name" htmlFor="party-bank-name"><Input id="party-bank-name" value={form.bankName} onChange={e => set('bankName', e.target.value)} placeholder="Kotak Mahindra Bank" /></F>
                  <F label="Account No" htmlFor="party-bank-ac"><Input id="party-bank-ac" value={form.accountNo} onChange={e => set('accountNo', e.target.value)} className="font-mono" placeholder="6601016330" /></F>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="IFSC Code" htmlFor="party-ifsc" error={validateIFSC(form.ifscCode)}>
                    <Input id="party-ifsc" value={form.ifscCode} onChange={e => set('ifscCode', e.target.value.toUpperCase())}
                      className={`font-mono ${validateIFSC(form.ifscCode) ? 'border-rose-300 bg-rose-50' : form.ifscCode.length === 11 ? 'border-emerald-300' : ''}`}
                      placeholder="KKBK0001788" maxLength={11} />
                  </FormField>
                  <F label="SWIFT Code" htmlFor="party-swift"><Input id="party-swift" value={form.swiftCode} onChange={e => set('swiftCode', e.target.value.toUpperCase())} className="font-mono" placeholder="KKBKINBB" /></F>
                </div>
              </div>

              {/* Process Rates — ADMIN / MANAGER only */}
              {isManager && processes.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <SectionTitle>Process Rates (Party-Specific)</SectionTitle>
                    <Badge variant="warning" className="px-2 py-0.5 text-[10px] uppercase tracking-wider">Admin / Manager</Badge>
                  </div>
                  <div className="table-responsive rounded-xl border border-slate-200">
                    <table className="w-full text-xs min-w-[580px]">
                      <thead>
                        <tr>
                          <th className="th">Process</th>
                          <th className="th text-right">Rate/Kg (₹)</th>
                          <th className="th text-right">Rate/Pc (₹)</th>
                          <th className="th text-right">Lot Charge (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50/80">
                        {processes.map(pt => (
                          <tr key={pt.id} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2 font-medium text-slate-700">{pt.name}</td>
                            <td className="px-3 py-1.5 text-right">
                              <Input
                                type="number" step="0.01" min="0"
                                value={ratesMap[pt.id]?.pricePerKg ?? ''}
                                onChange={e => setRate(pt.id, 'pricePerKg', e.target.value)}
                                className="h-8 min-h-0 text-xs text-right tabular-nums w-24 ml-auto"
                                placeholder="0.00"
                                aria-label={`Rate per kg for ${pt.name}`}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <Input
                                type="number" step="0.01" min="0"
                                value={ratesMap[pt.id]?.pricePerPc ?? ''}
                                onChange={e => setRate(pt.id, 'pricePerPc', e.target.value)}
                                className="h-8 min-h-0 text-xs text-right tabular-nums w-24 ml-auto"
                                placeholder="0.00"
                                aria-label={`Rate per piece for ${pt.name}`}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <Input
                                type="number" step="0.01" min="0"
                                value={ratesMap[pt.id]?.lotPrice ?? ''}
                                onChange={e => setRate(pt.id, 'lotPrice', e.target.value)}
                                className="h-8 min-h-0 text-xs text-right tabular-nums w-24 ml-auto"
                                placeholder="0.00"
                                aria-label={`Lot charge for ${pt.name}`}
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
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-3 pb-1 border-t border-slate-100 mt-2 bg-white">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="sm:w-auto w-full">Cancel</Button>
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving
                    ? <><Loader2 className="animate-spin" /> Saving...</>
                    : <><Save /> {editId ? 'Update Party' : 'Add Party'}</>
                  }
                </Button>
              </div>
            </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
