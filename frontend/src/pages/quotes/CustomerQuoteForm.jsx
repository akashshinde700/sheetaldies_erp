import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useParties, useProcesses } from '../../hooks/useMasterData';

const emptyItem = () => ({ partName: '', processTypeId: '', material: '', qty: 1, weight: '', rate: '', amount: '', hsnCode: '', remarks: '' });

export default function CustomerQuoteForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: partiesData } = useParties();
  const { data: processesData } = useProcesses();
  const customers = (partiesData?.data || []).filter(p => p.partyType === 'CUSTOMER' || p.partyType === 'BOTH');
  const processes = processesData?.data || [];

  const [form, setForm] = useState({
    customerId: '', quoteDate: new Date().toISOString().slice(0,10),
    validUntil: '', cgstRate: 9, sgstRate: 9, notes: '', paymentTerms: 'Payment within 30 days.',
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
          cgstRate: +q.cgstRate,
          sgstRate: +q.sgstRate,
          notes: q.notes || '',
          paymentTerms: q.paymentTerms || '',
        });
        setItems(q.items.map(i => ({
          partName: i.partName, processTypeId: i.processTypeId || '',
          material: i.material || '', qty: i.qty, weight: i.weight || '',
          rate: i.rate, amount: i.amount, hsnCode: i.hsnCode || '', remarks: i.remarks || '',
        })));
      }).catch(() => toast.error('Failed to load quote.'));
    }
  }, [id, isEdit]);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const calcAmount = (i, idx) => {
    const weight = +i.weight || 0;
    const rate = +i.rate || 0;
    const qty = +i.qty || 1;
    // amount = weight * rate (if weight given) else qty * rate
    const amount = weight > 0 ? +(weight * rate).toFixed(2) : +(qty * rate).toFixed(2);
    setItems(prev => { const n=[...prev]; n[idx]={...n[idx], amount}; return n; });
  };

  const updateItem = (idx, field, val) => {
    setItems(prev => {
      const n = [...prev];
      n[idx] = { ...n[idx], [field]: val };
      // auto-fill HSN from process
      if (field === 'processTypeId' && val) {
        const proc = processes.find(p => p.id === +val);
        if (proc?.hsnSacCode) n[idx].hsnCode = proc.hsnSacCode;
        if (proc?.pricePerKg) n[idx].rate = proc.pricePerKg;
      }
      return n;
    });
    // recalc after update
    setTimeout(() => calcAmount(items[idx], idx), 0);
  };

  const subtotal = items.reduce((s, i) => s + (+i.amount || 0), 0);
  const cgst = +(subtotal * form.cgstRate / 100).toFixed(2);
  const sgst = +(subtotal * form.sgstRate / 100).toFixed(2);
  const total = +(subtotal + cgst + sgst).toFixed(2);

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
              <select value={form.customerId} onChange={e => setF('customerId', e.target.value)} className="form-input" required>
                <option value="">— Select Customer —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Quote Date *</label>
              <input type="date" value={form.quoteDate} onChange={e => setF('quoteDate', e.target.value)} className="form-input" required />
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

        {/* Items */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title">Line Items</p>
            <button type="button" onClick={() => setItems(p => [...p, emptyItem()])}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg">
              <span className="material-symbols-outlined text-sm">add</span> Add Item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Part Name *','Process','Material','Qty','Weight (kg)','Rate (₹)','Amount (₹)','HSN','Remarks',''].map(h => (
                    <th key={h} className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-1 py-1.5">
                      <input type="text" value={item.partName} onChange={e => updateItem(idx, 'partName', e.target.value)}
                        className="form-input text-xs w-32" placeholder="Part name" />
                    </td>
                    <td className="px-1 py-1.5">
                      <select value={item.processTypeId} onChange={e => updateItem(idx, 'processTypeId', e.target.value)} className="form-input text-xs w-32">
                        <option value="">—</option>
                        {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1.5">
                      <input type="text" value={item.material} onChange={e => updateItem(idx, 'material', e.target.value)}
                        className="form-input text-xs w-24" placeholder="e.g. D2" />
                    </td>
                    <td className="px-1 py-1.5">
                      <input type="number" min="1" value={item.qty} onChange={e => { updateItem(idx, 'qty', e.target.value); calcAmount({...item, qty: e.target.value}, idx); }}
                        className="form-input text-xs w-14 text-center font-mono" />
                    </td>
                    <td className="px-1 py-1.5">
                      <input type="number" step="0.001" value={item.weight} onChange={e => { updateItem(idx, 'weight', e.target.value); calcAmount({...item, weight: e.target.value}, idx); }}
                        className="form-input text-xs w-20 text-right font-mono" placeholder="0.000" />
                    </td>
                    <td className="px-1 py-1.5">
                      <input type="number" step="0.01" value={item.rate} onChange={e => { updateItem(idx, 'rate', e.target.value); calcAmount({...item, rate: e.target.value}, idx); }}
                        className="form-input text-xs w-20 text-right font-mono" placeholder="0.00" />
                    </td>
                    <td className="px-1 py-1.5">
                      <input type="number" step="0.01" value={item.amount} onChange={e => updateItem(idx, 'amount', e.target.value)}
                        className="form-input text-xs w-24 text-right font-mono font-bold bg-emerald-50 border-emerald-200" />
                    </td>
                    <td className="px-1 py-1.5">
                      <input type="text" value={item.hsnCode} onChange={e => updateItem(idx, 'hsnCode', e.target.value)}
                        className="form-input text-xs w-20" placeholder="998898" />
                    </td>
                    <td className="px-1 py-1.5">
                      <input type="text" value={item.remarks} onChange={e => updateItem(idx, 'remarks', e.target.value)}
                        className="form-input text-xs w-28" />
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

          {/* Totals */}
          <div className="mt-5 flex justify-end">
            <div className="w-72 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-mono font-semibold">₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">CGST</span>
                <div className="flex items-center gap-1">
                  <input type="number" value={form.cgstRate} onChange={e => setF('cgstRate', +e.target.value)} className="form-input text-xs w-12 text-center py-0.5" min="0" max="28" />
                  <span className="text-slate-400">%</span>
                  <span className="font-mono font-semibold w-20 text-right">₹{cgst.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">SGST</span>
                <div className="flex items-center gap-1">
                  <input type="number" value={form.sgstRate} onChange={e => setF('sgstRate', +e.target.value)} className="form-input text-xs w-12 text-center py-0.5" min="0" max="28" />
                  <span className="text-slate-400">%</span>
                  <span className="font-mono font-semibold w-20 text-right">₹{sgst.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-800 border-t border-slate-200 pt-2">
                <span>Total</span><span className="font-mono">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : isEdit ? 'Update Quote' : 'Create Quote'}
          </button>
        </div>
      </form>
    </div>
  );
}
