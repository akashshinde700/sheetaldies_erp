import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/ui/page-header';
import { Stepper, useStepper } from '@/components/ui/stepper';
import { FormErrorSummary, focusField } from '@/components/ui/field';

const EMPTY = {
  name: '', partyCode: '', address: '', city: '', state: 'Maharashtra', pinCode: '',
  gstin: '', pan: '', stateCode: '27', phone: '', email: '', partyType: 'CUSTOMER',
  vatTin: '', cstNo: '', tallyLedgerName: '',
  bankAccountHolder: '', bankName: '', accountNo: '', ifscCode: '', swiftCode: '',
};

// GST state code lookup
const STATE_CODES = {
  'andhra pradesh': '37', 'arunachal pradesh': '12', 'assam': '18', 'bihar': '10', 'chhattisgarh': '22',
  'goa': '30', 'gujarat': '24', 'haryana': '06', 'himachal pradesh': '02', 'jharkhand': '20',
  'karnataka': '29', 'kerala': '32', 'madhya pradesh': '23', 'maharashtra': '27', 'manipur': '14',
  'meghalaya': '17', 'mizoram': '15', 'nagaland': '13', 'odisha': '21', 'punjab': '03',
  'rajasthan': '08', 'sikkim': '11', 'tamil nadu': '33', 'telangana': '36', 'tripura': '16',
  'uttar pradesh': '09', 'uttarakhand': '05', 'west bengal': '19',
  'delhi': '07', 'jammu and kashmir': '01', 'ladakh': '38', 'chandigarh': '04',
  'dadra and nagar haveli and daman and diu': '26', 'lakshadweep': '31', 'puducherry': '34',
  'andaman and nicobar islands': '35',
};

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

const nextPartyCode = (parties) => {
  let max = 0;
  for (const p of parties) {
    const m = p.partyCode?.match(/^S(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'S' + String(max + 1).padStart(4, '0');
};

const SectionTitle = ({ children }) => (
  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{children}</p>
);

export default function PartyForm() {
  const { partyId } = useParams();
  const isEdit = Boolean(partyId);
  const navigate = useNavigate();
  const { isManager } = useAuth();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [gstinError, setGstinError] = useState('');
  const gstinTimer = useRef(null);
  const [saving, setSaving] = useState(false);

  const [locations, setLocations] = useState({ cities: [], states: [], pinCodes: [] });
  const [processes, setProcesses] = useState([]);
  const [ratesMap, setRatesMap] = useState({});

  const STEPS = [
    { key: 'identity', label: 'Identity & address' },
    { key: 'contact', label: 'Contact & banking' },
    { key: 'rates', label: 'Process rates' },
  ];
  const wiz = useStepper(STEPS.length);
  const LAST = STEPS.length - 1;

  useEffect(() => {
    api.get('/parties/location-suggestions')
      .then(r => setLocations(r.data.data || { cities: [], states: [], pinCodes: [] }))
      .catch(() => {});
    api.get('/processes').then(r => {
      const all = (r.data.data || r.data).filter(p => p.isActive !== false && p.showInPartyRates !== false);
      const seen = new Set();
      const unique = [];
      for (const p of all) {
        if (!seen.has(p.name)) { seen.add(p.name); unique.push(p); }
      }
      setProcesses(unique);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    if (isEdit) {
      api.get(`/parties/${partyId}`).then(r => {
        if (alive) setForm(partyToFormFields(r.data.data || r.data));
      }).catch(() => { toast.error('Party not found.'); navigate('/admin/parties'); });
      api.get(`/parties/${partyId}/process-rates`).then(r => {
        if (!alive) return;
        const m = {};
        for (const row of r.data.data || []) {
          m[row.processTypeId] = {
            pricePerKg: row.pricePerKg ?? '',
            pricePerPc: row.pricePerPc ?? '',
            lotPrice: row.lotPrice ?? '',
          };
        }
        setRatesMap(m);
      }).catch(() => {});
    } else {
      api.get('/parties').then(r => {
        if (alive) setForm({ ...EMPTY, partyCode: nextPartyCode(r.data.data || []) });
      }).catch(() => {});
    }
    return () => { alive = false; };
  }, [partyId, isEdit, navigate]);

  const set = (k, v) => setForm(p => {
    const next = { ...p, [k]: v };
    if (k === 'gstin' && v.length >= 2) {
      const code = v.slice(0, 2);
      if (/^\d{2}$/.test(code)) next.stateCode = code;
    }
    if (k === 'state') {
      const code = STATE_CODES[v.toLowerCase().trim()];
      if (code) next.stateCode = code;
    }
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

  const setRate = (ptId, field, val) =>
    setRatesMap(prev => ({ ...prev, [ptId]: { ...(prev[ptId] || {}), [field]: val } }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Company / party name is required.';
    if (!form.address.trim()) e.address = 'Address is required.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const eObj = validate();
    setErrors(eObj);
    if (Object.keys(eObj).length) {
      wiz.goto(0);
      setTimeout(() => focusField(Object.keys(eObj)[0] === 'name' ? 'party-name' : 'party-address'), 0);
      toast.error('Please fix the highlighted fields on the first step.');
      return;
    }
    setSaving(true);
    try {
      let savedId = partyId;
      if (isEdit) {
        await api.put(`/parties/${partyId}`, form);
      } else {
        const r = await api.post('/parties', form);
        savedId = r.data.data?.id;
      }
      if (savedId && Object.keys(ratesMap).length > 0) {
        const ratesPayload = Object.entries(ratesMap).map(([ptId, v]) => ({
          processTypeId: Number(ptId),
          pricePerKg: v.pricePerKg !== '' ? v.pricePerKg : null,
          pricePerPc: v.pricePerPc !== '' ? v.pricePerPc : null,
          lotPrice: v.lotPrice !== '' ? v.lotPrice : null,
        }));
        await api.put(`/parties/${savedId}/process-rates`, ratesPayload);
      }
      toast.success(isEdit ? 'Party updated.' : 'Party added.');
      navigate(savedId ? `/admin/parties/${savedId}` : '/admin/parties');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving party.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="font-app flex flex-col h-full min-h-0">
      <PageHeader
        title={isEdit ? `Edit Party ${form.partyCode || ''}`.trim() : 'Add New Party'}
        backTo={isEdit ? `/admin/parties/${partyId}` : '/admin/parties'}
        breadcrumbs={[
          { label: 'Parties', to: '/admin/parties' },
          { label: isEdit ? (form.name || 'Edit') : 'New' },
        ]}
      />

      <div className="mt-2 shrink-0 rounded-xl border border-slate-200 bg-white p-2 shadow-card">
        <Stepper steps={STEPS} current={wiz.current} completed={wiz.completed} onStepClick={(i) => wiz.goto(i)} />
      </div>

      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-3 pr-0.5 space-y-3">

          {/* ── Step 1 · Identity & address ── */}
          <div hidden={wiz.current !== 0} className="space-y-3">
            <FormErrorSummary
              errors={Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, { message: v }]))}
              labels={{ name: 'Company / party name', address: 'Address' }}
              onJump={(n) => { wiz.goto(0); focusField(n === 'name' ? 'party-name' : 'party-address'); }}
            />

            <Card>
              <CardHeader><CardTitle>Party &amp; address</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-12">
                  <FormField label="Party Type" required className="col-span-2 lg:col-span-4">
                    <div className="flex gap-1.5">
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

                  <FormField label="Company / Party Name" required htmlFor="party-name" error={errors.name}
                    className="col-span-2 lg:col-span-6">
                    <Input id="party-name" value={form.name} onChange={e => set('name', e.target.value)} required
                      invalid={Boolean(errors.name)} placeholder="Sheetal Dies & Tools Pvt. Ltd." />
                  </FormField>

                  <FormField label="Party Code" htmlFor="party-code" className="lg:col-span-2">
                    <Input id="party-code" value={form.partyCode} readOnly={!isEdit}
                      onChange={e => set('partyCode', e.target.value.toUpperCase())}
                      className={`font-app-mono ${!isEdit ? 'bg-slate-50 text-slate-500 cursor-default' : ''}`} placeholder="S0004" />
                  </FormField>

                  <FormField label="Address" required htmlFor="party-address" error={errors.address}
                    className="col-span-2 lg:col-span-6">
                    <Textarea id="party-address" value={form.address} onChange={e => set('address', e.target.value)}
                      required invalid={Boolean(errors.address)} rows={2} placeholder="Plot No. 5, Sector 10..." />
                  </FormField>

                  <FormField label="City" htmlFor="party-city" className="lg:col-span-2">
                    <Input id="party-city" value={form.city} list="party-city-list"
                      onChange={e => set('city', e.target.value)} placeholder="Pune" />
                    <datalist id="party-city-list">
                      {locations.cities.map(c => (
                        <option key={c.city} value={c.city}>{[c.state, c.pinCode].filter(Boolean).join(' · ')}</option>
                      ))}
                    </datalist>
                  </FormField>

                  <FormField label="State" htmlFor="party-state" className="lg:col-span-2">
                    <select id="party-state" value={form.state} onChange={e => set('state', e.target.value)} className="form-input">
                      <option value="">— Select —</option>
                      {STATE_NAMES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </FormField>

                  <FormField label="PIN Code" htmlFor="party-pin" className="lg:col-span-2">
                    <Input id="party-pin" value={form.pinCode} list="party-pin-list"
                      onChange={e => set('pinCode', e.target.value)} placeholder="411014" maxLength={6}
                      className="tabular-nums" />
                    <datalist id="party-pin-list">
                      {locations.pinCodes.map(pc => <option key={pc} value={pc} />)}
                    </datalist>
                  </FormField>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Tax identity</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-12">
                  <FormField label="GSTIN" htmlFor="party-gstin" error={gstinError || null} className="col-span-2 lg:col-span-4">
                    <Input id="party-gstin" value={form.gstin} onChange={e => {
                      const v = e.target.value.toUpperCase();
                      set('gstin', v);
                      clearTimeout(gstinTimer.current);
                      gstinTimer.current = setTimeout(() => setGstinError(validateGSTIN(v) || ''), 500);
                    }}
                      className={`font-app-mono ${gstinError ? 'border-rose-300 bg-rose-50' : form.gstin.length === 15 && !gstinError ? 'border-emerald-300' : ''}`}
                      placeholder="27AAAAA0000A1Z5" maxLength={15} />
                    {form.gstin.length === 15 && !gstinError && <p className="text-[10px] text-emerald-600 mt-0.5">✓ Valid GSTIN format</p>}
                  </FormField>

                  <FormField label="State Code (auto)" htmlFor="party-statecode" className="lg:col-span-2">
                    <Input id="party-statecode" value={form.stateCode} onChange={e => set('stateCode', e.target.value)}
                      placeholder="27" maxLength={3} className="tabular-nums" />
                  </FormField>

                  <FormField label="PAN" htmlFor="party-pan" error={validatePAN(form.pan)} className="lg:col-span-3">
                    <Input id="party-pan" value={form.pan} onChange={e => set('pan', e.target.value.toUpperCase())}
                      className={`font-app-mono ${validatePAN(form.pan) ? 'border-rose-300 bg-rose-50' : form.pan.length === 10 ? 'border-emerald-300' : ''}`}
                      placeholder="AAAAA0000A" maxLength={10} />
                  </FormField>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Step 2 · Contact & banking ── */}
          <div hidden={wiz.current !== 1} className="space-y-3">
            <Card>
              <CardHeader><CardTitle>Contact &amp; Tally</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-12">
                  <FormField label="Phone" htmlFor="party-phone" className="lg:col-span-3">
                    <Input id="party-phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="9876543210" />
                  </FormField>
                  <FormField label="Email" htmlFor="party-email" className="lg:col-span-4">
                    <Input id="party-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@company.com" />
                  </FormField>
                  <FormField label="Tally Ledger Name" htmlFor="party-tally" className="col-span-2 lg:col-span-5"
                    hint={'Khali chhodo to upar wala naam hi Tally me jayega. Alag naam ho to bilkul waisa hi likho — ek space ka farak bhi "Ledger not found" de dega.'}>
                    <Input id="party-tally" value={form.tallyLedgerName} onChange={e => set('tallyLedgerName', e.target.value)}
                      className={form.tallyLedgerName ? 'border-violet-300 bg-violet-50/40' : ''}
                      placeholder={form.name || 'Tally me jo naam hai'} maxLength={200} />
                    {form.tallyLedgerName && form.tallyLedgerName.trim() !== form.name.trim() && (
                      <p className="text-[10px] text-violet-600 mt-0.5">
                        Invoice pe: <strong>{form.name || '—'}</strong> · Tally me: <strong>{form.tallyLedgerName.trim()}</strong>
                      </p>
                    )}
                  </FormField>

                  <FormField label="VAT TIN" htmlFor="party-vat" className="lg:col-span-3">
                    <Input id="party-vat" value={form.vatTin} onChange={e => set('vatTin', e.target.value)} className="font-app-mono" placeholder="27501011577V" />
                  </FormField>
                  <FormField label="CST No" htmlFor="party-cst" className="lg:col-span-3">
                    <Input id="party-cst" value={form.cstNo} onChange={e => set('cstNo', e.target.value)} className="font-app-mono" placeholder="27501011577C" />
                  </FormField>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Bank details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-12">
                  <FormField label="A/c Holder Name" htmlFor="party-bank-holder" className="col-span-2 lg:col-span-4">
                    <Input id="party-bank-holder" value={form.bankAccountHolder} onChange={e => set('bankAccountHolder', e.target.value)} placeholder="Company Name as per bank" />
                  </FormField>
                  <FormField label="Bank Name" htmlFor="party-bank-name" className="lg:col-span-3">
                    <Input id="party-bank-name" value={form.bankName} onChange={e => set('bankName', e.target.value)} placeholder="Kotak Mahindra Bank" />
                  </FormField>
                  <FormField label="Account No" htmlFor="party-bank-ac" className="lg:col-span-2">
                    <Input id="party-bank-ac" value={form.accountNo} onChange={e => set('accountNo', e.target.value)} className="font-app-mono" placeholder="6601016330" />
                  </FormField>
                  <FormField label="IFSC Code" htmlFor="party-ifsc" error={validateIFSC(form.ifscCode)} className="lg:col-span-2">
                    <Input id="party-ifsc" value={form.ifscCode} onChange={e => set('ifscCode', e.target.value.toUpperCase())}
                      className={`font-app-mono ${validateIFSC(form.ifscCode) ? 'border-rose-300 bg-rose-50' : form.ifscCode.length === 11 ? 'border-emerald-300' : ''}`}
                      placeholder="KKBK0001788" maxLength={11} />
                  </FormField>
                  <FormField label="SWIFT Code" htmlFor="party-swift" className="lg:col-span-1">
                    <Input id="party-swift" value={form.swiftCode} onChange={e => set('swiftCode', e.target.value.toUpperCase())} className="font-app-mono" placeholder="KKBKINBB" />
                  </FormField>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Step 3 · Process rates ── */}
          <div hidden={wiz.current !== 2} className="space-y-3">
            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0">
                <CardTitle>Process rates (party-specific)</CardTitle>
                <Badge variant="warning" className="px-2 py-0.5 text-[10px] uppercase tracking-wider">Admin / Manager</Badge>
              </CardHeader>
              <CardContent>
                {!isManager ? (
                  <p className="text-sm text-slate-500">Only Admin / Manager can set party-specific rates.</p>
                ) : processes.length === 0 ? (
                  <p className="text-sm text-slate-500">No processes available to rate.</p>
                ) : (
                  <>
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
                              {['pricePerKg', 'pricePerPc', 'lotPrice'].map(field => (
                                <td key={field} className="px-3 py-1.5 text-right">
                                  <Input
                                    type="number" step="0.01" min="0"
                                    value={ratesMap[pt.id]?.[field] ?? ''}
                                    onChange={e => setRate(pt.id, field, e.target.value)}
                                    className="h-8 min-h-0 text-xs text-right tabular-nums w-24 ml-auto"
                                    placeholder="0.00"
                                    aria-label={`${field} for ${pt.name}`}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">Leave blank to skip. Party-specific rate applies during inward entry and invoicing.</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Wizard navigation ── */}
        <div className="shrink-0 mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-card sm:px-5">
          <Button type="button" variant="ghost" disabled={wiz.isFirst} onClick={wiz.back}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <span className="font-app-mono text-xs text-slate-400">Step {wiz.current + 1} of {STEPS.length}</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost">
              <Link to={isEdit ? `/admin/parties/${partyId}` : '/admin/parties'}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="animate-spin" /> Saving…</> : <><Save /> {isEdit ? 'Update Party' : 'Add Party'}</>}
            </Button>
            {wiz.current < LAST && (
              <Button type="button" onClick={wiz.next}>Next <ChevronRight className="h-4 w-4" /></Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
