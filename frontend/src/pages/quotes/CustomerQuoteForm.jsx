import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useParties, useProcesses } from '../../hooks/useMasterData';
import SearchSelect from '../../components/SearchSelect';

const emptyItem = () => ({ _id: Math.random(), partName: '', processTypeId: '', material: '', unit: 'KGS', rate: '' });

const UNIT_OPTIONS = [
  { value: 'KGS', label: 'Rate/Kg (₹)' },
  { value: 'PCS', label: 'Rate/Pc (₹)' },
  { value: 'LOT', label: 'Lot Charge (₹)' },
];

export default function CustomerQuoteForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const queryClient = useQueryClient();
  const { data: parties = [] } = useParties();
  const { data: processes = [] } = useProcesses();
  // Show all parties (CUSTOMER, VENDOR, BOTH) — a quote can be issued to any party.
  const customers = parties;

  const [newCustomer, setNewCustomer] = useState(null); // { name, address, email, phone, gstin, saving }

  const openNewCustomer = () => setNewCustomer({ name: '', address: '', email: '', phone: '', gstin: '', saving: false });
  const closeNewCustomer = () => setNewCustomer(null);

  const createCustomerQuick = async () => {
    if (!newCustomer.name.trim() || !newCustomer.address.trim()) {
      toast.error('Customer name and address are required.');
      return;
    }
    setNewCustomer(p => ({ ...p, saving: true }));
    try {
      const r = await api.post('/parties/quick', {
        name: newCustomer.name.trim(),
        address: newCustomer.address.trim(),
        email: newCustomer.email.trim() || null,
        phone: newCustomer.phone.trim() || null,
        gstin: newCustomer.gstin.trim() || null,
        partyType: 'CUSTOMER',
      });
      const created = r.data.data;
      toast.success(`Customer "${created.name}" created.`);
      await queryClient.invalidateQueries({ queryKey: ['parties'] });
      setF('customerId', created.id);
      closeNewCustomer();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create customer.');
      setNewCustomer(p => ({ ...p, saving: false }));
    }
  };

  const [form, setForm] = useState({
    customerId: '', quoteDate: new Date().toISOString().slice(0,10),
    validUntil: '', notes: '', paymentTerms: 'Payment within 30 days.',
    kindAttn: '',
    termsTransport: 'BOTH SIDE AT YOUR END',
    termsPayment: '60 DAYS.',
    termsDelivery: '4-5 DAYS AFTER RECEPIT OF MATERIAL AT OUR END',
    termsTax: 'AS PER GOVERMENT RULES',
    commercialPan: 'AATCS0577L',
    commercialGst: '27AATCS0577L1ZK',
    commercialServicesCode: '998873 ( 18% )',
    commercialIso: 'ISO 9001 -2015',
  });
  const [items, setItems] = useState([emptyItem()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/customer-quotes/${id}`).then(r => {
        const q = r.data.data;
        setForm({
          customerId: q.customerId,
          quoteDate: q.quoteDate?.slice(0,10) || '',
          validUntil: q.validUntil?.slice(0,10) || '',
          notes: q.notes || '',
          paymentTerms: q.paymentTerms || '',
          kindAttn: q.kindAttn || '',
          termsTransport: q.termsTransport || 'BOTH SIDE AT YOUR END',
          termsPayment: q.termsPayment || '60 DAYS.',
          termsDelivery: q.termsDelivery || '4-5 DAYS AFTER RECEPIT OF MATERIAL AT OUR END',
          termsTax: q.termsTax || 'AS PER GOVERMENT RULES',
          commercialPan: q.commercialPan || 'AATCS0577L',
          commercialGst: q.commercialGst || '27AATCS0577L1ZK',
          commercialServicesCode: q.commercialServicesCode || '998873 ( 18% )',
          commercialIso: q.commercialIso || 'ISO 9001 -2015',
        });
        setItems(q.items.map(i => ({
          _id: i.id ?? Math.random(),
          partName: i.partName, processTypeId: i.processTypeId || '',
          material: i.material || '', unit: i.unit || 'KGS', rate: i.rate,
        })));
      }).catch(() => toast.error('Failed to load quote.'));
    }
  }, [id, isEdit]);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const rateForUnit = (proc, unit) => {
    if (!proc) return null;
    if (unit === 'PCS') return proc.pricePerPc;
    if (unit === 'LOT') return proc.lotPrice;
    return proc.pricePerKg;
  };

  const updateItem = (idx, field, val) => {
    setItems(prev => {
      const n = [...prev];
      n[idx] = { ...n[idx], [field]: val };
      // auto-fill the rate from the selected process, matching whichever
      // unit (Kg/Pc/Lot) is currently selected for this line
      if (field === 'processTypeId' && val) {
        const proc = processes.find(p => p.id === +val);
        const r = rateForUnit(proc, n[idx].unit);
        if (r) n[idx].rate = r;
      }
      // switching unit re-pulls the matching rate from the same process, if set
      if (field === 'unit' && n[idx].processTypeId) {
        const proc = processes.find(p => p.id === +n[idx].processTypeId);
        const r = rateForUnit(proc, val);
        if (r) n[idx].rate = r;
      }
      return n;
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.customerId) return toast.error('Select a customer.');
    if (!items.some(i => i.partName && +i.rate > 0)) return toast.error('Add at least one item with part name and rate.');
    setSaving(true);
    try {
      const payload = { ...form, items: items.filter(i => i.partName) };
      if (isEdit) {
        await api.put(`/customer-quotes/${id}`, payload);
        toast.success('Quote updated.');
      } else {
        const r = await api.post('/customer-quotes', payload);
        toast.success(r.data.message);
        navigate(`/customer-quotes/${r.data.data.id}`);
        return;
      }
      navigate(`/customer-quotes/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">{isEdit ? 'Edit' : 'New'} Customer Quotation</h2>
          <p className="text-xs text-slate-400">Price quote issued to customer for heat treatment services</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header */}
        <div className="card p-5">
          <p className="section-title mb-4">Quote Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Customer *</label>
              <div className="flex gap-2">
                <SearchSelect
                  value={String(form.customerId || '')}
                  onChange={v => setF('customerId', v)}
                  options={customers.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="— Select Customer —"
                  required
                  className="flex-1"
                />
                <button type="button" onClick={openNewCustomer} className="btn-outline whitespace-nowrap">
                  <span className="material-symbols-outlined text-[18px] shrink-0">add</span> New
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">Quote Date *</label>
              <input type="date" value={form.quoteDate} onChange={e => setF('quoteDate', e.target.value)} className="form-input" required />
            </div>
            <div>
              <label className="form-label">Kind Attn (Mr.)</label>
              <input type="text" value={form.kindAttn} onChange={e => setF('kindAttn', e.target.value)} className="form-input" placeholder="Contact person" />
            </div>
            <div>
              <label className="form-label">Valid Until</label>
              <input type="date" value={form.validUntil} onChange={e => setF('validUntil', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Payment Terms</label>
              <input type="text" value={form.paymentTerms} onChange={e => setF('paymentTerms', e.target.value)} className="form-input" placeholder="e.g. Net 30 days" />
            </div>
          </div>
          <div className="mt-4">
            <label className="form-label">Notes / Special Instructions</label>
            <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} className="form-input" placeholder="Optional notes..." />
          </div>
        </div>

        {/* Terms & Commercial Details (printed on the quote) */}
        <div className="card p-5">
          <p className="section-title mb-4">Terms & Commercial Details</p>
          <p className="text-[11px] text-slate-400 mb-3">These rows print on the quotation exactly as entered here.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Transport</label>
              <input type="text" value={form.termsTransport} onChange={e => setF('termsTransport', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Payment</label>
              <input type="text" value={form.termsPayment} onChange={e => setF('termsPayment', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Delivery</label>
              <input type="text" value={form.termsDelivery} onChange={e => setF('termsDelivery', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Tax</label>
              <input type="text" value={form.termsTax} onChange={e => setF('termsTax', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">PAN Card No</label>
              <input type="text" value={form.commercialPan} onChange={e => setF('commercialPan', e.target.value)} className="form-input font-mono" />
            </div>
            <div>
              <label className="form-label">GST No</label>
              <input type="text" value={form.commercialGst} onChange={e => setF('commercialGst', e.target.value)} className="form-input font-mono" />
            </div>
            <div>
              <label className="form-label">Services Code</label>
              <input type="text" value={form.commercialServicesCode} onChange={e => setF('commercialServicesCode', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">ISO Certificate</label>
              <input type="text" value={form.commercialIso} onChange={e => setF('commercialIso', e.target.value)} className="form-input" />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title">Line Items</p>
            <button type="button" onClick={() => setItems(p => [...p, emptyItem()])}
              className="flex items-center gap-1 text-xs font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg">
              <span className="material-symbols-outlined text-sm">add</span> Add Item
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">Choose Rate/Kg, Rate/Pc, or Lot Charge per line (QF-MKT-03 format).</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Description / Part Name *','Process','Material','Rate Type','Rate (₹)',''].map(h => (
                    <th key={h} className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item._id} className="hover:bg-slate-50/50">
                    <td className="px-1 py-1.5">
                      <input type="text" value={item.partName} onChange={e => updateItem(idx, 'partName', e.target.value)}
                        className="form-input text-xs w-48" placeholder="Description / part name" />
                    </td>
                    <td className="px-1 py-1.5">
                      <SearchSelect
                        value={String(item.processTypeId || '')}
                        onChange={v => updateItem(idx, 'processTypeId', v)}
                        options={processes.map(p => ({ value: p.id, label: p.name }))}
                        placeholder="—"
                        useFixed
                        className="w-36"
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <input type="text" value={item.material} onChange={e => updateItem(idx, 'material', e.target.value)}
                        className="form-input text-xs w-28" placeholder="e.g. D2" />
                    </td>
                    <td className="px-1 py-1.5">
                      <select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}
                        className="form-input text-xs w-32">
                        {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1.5">
                      <input type="number" step="0.01" value={item.rate} onChange={e => updateItem(idx, 'rate', e.target.value)}
                        className="form-input text-xs w-24 text-right font-mono" placeholder="0.00" />
                    </td>
                    <td className="px-1 py-1.5">
                      {items.length > 1 && (
                        <button type="button" onClick={() => setItems(p => p.filter((_, j) => j !== idx))}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50">
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

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : isEdit ? 'Update Quote' : 'Create Quote'}
          </button>
        </div>
      </form>

      {newCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <div className="text-xs font-black tracking-widest text-slate-400 uppercase">Quick Create</div>
                <div className="text-lg font-extrabold text-slate-800 mt-1">New Customer</div>
              </div>
              <button type="button" onClick={closeNewCustomer} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="form-label">Customer Name *</label>
                <input value={newCustomer.name} onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))}
                  className="form-input" placeholder="Company / customer name" />
              </div>
              <div>
                <label className="form-label">Address *</label>
                <textarea value={newCustomer.address} onChange={e => setNewCustomer(p => ({ ...p, address: e.target.value }))}
                  className="form-input" rows={3} placeholder="Full address" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">GSTIN (optional)</label>
                  <input value={newCustomer.gstin} onChange={e => setNewCustomer(p => ({ ...p, gstin: e.target.value }))}
                    className="form-input font-mono" placeholder="27ABCDE1234F1Z5" />
                </div>
                <div>
                  <label className="form-label">Phone (optional)</label>
                  <input value={newCustomer.phone} onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                    className="form-input" placeholder="+91 98765 43210" />
                </div>
              </div>
              <div>
                <label className="form-label">Email (optional)</label>
                <input type="email" value={newCustomer.email} onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))}
                  className="form-input" placeholder="email@company.com" />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button type="button" onClick={closeNewCustomer} className="btn-outline">Cancel</button>
              <button type="button" onClick={createCustomerQuick} disabled={newCustomer.saving} className="btn-primary disabled:opacity-50">
                {newCustomer.saving ? 'Creating...' : 'Create & Select'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
