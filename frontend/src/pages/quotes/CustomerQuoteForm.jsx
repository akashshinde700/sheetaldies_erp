import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react';
import api from '../../utils/api';
import { useParties, useProcesses } from '../../hooks/useMasterData';
import SearchSelect from '../../components/SearchSelect';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    <div className="max-w-4xl mx-auto min-w-0 space-y-4 animate-slide-up">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-slate-700"
          aria-label="Go back"
        >
          <ArrowLeft />
        </Button>
        <div className="space-y-0.5 min-w-0">
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">{isEdit ? 'Edit' : 'New'} Customer Quotation</h2>
          <p className="text-xs text-slate-400">Price quote issued to customer for heat treatment services</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle>Quote Details</CardTitle>
            <CardDescription>Customer, dates and payment terms for this quotation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <FormField label="Customer" required>
                <div className="flex gap-2">
                  <SearchSelect
                    value={String(form.customerId || '')}
                    onChange={v => setF('customerId', v)}
                    options={customers.map(c => ({ value: c.id, label: c.name }))}
                    placeholder="— Select Customer —"
                    required
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={openNewCustomer} className="shrink-0">
                    <Plus /> New
                  </Button>
                </div>
              </FormField>
              <FormField label="Quote Date" htmlFor="quoteDate" required>
                <Input
                  id="quoteDate"
                  type="date"
                  value={form.quoteDate}
                  onChange={e => setF('quoteDate', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Kind Attn (Mr.)" htmlFor="kindAttn">
                <Input
                  id="kindAttn"
                  type="text"
                  value={form.kindAttn}
                  onChange={e => setF('kindAttn', e.target.value)}
                  placeholder="Contact person"
                />
              </FormField>
              <FormField label="Valid Until" htmlFor="validUntil">
                <Input
                  id="validUntil"
                  type="date"
                  value={form.validUntil}
                  onChange={e => setF('validUntil', e.target.value)}
                />
              </FormField>
              <FormField label="Payment Terms" htmlFor="paymentTerms">
                <Input
                  id="paymentTerms"
                  type="text"
                  value={form.paymentTerms}
                  onChange={e => setF('paymentTerms', e.target.value)}
                  placeholder="e.g. Net 30 days"
                />
              </FormField>
            </div>
            <FormField label="Notes / Special Instructions" htmlFor="quoteNotes">
              <Textarea
                id="quoteNotes"
                value={form.notes}
                onChange={e => setF('notes', e.target.value)}
                rows={2}
                placeholder="Optional notes..."
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Terms & Commercial Details (printed on the quote) */}
        <Card>
          <CardHeader>
            <CardTitle>Terms &amp; Commercial Details</CardTitle>
            <CardDescription>These rows print on the quotation exactly as entered here.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <FormField label="Transport" htmlFor="termsTransport">
                <Input id="termsTransport" type="text" value={form.termsTransport} onChange={e => setF('termsTransport', e.target.value)} />
              </FormField>
              <FormField label="Payment" htmlFor="termsPayment">
                <Input id="termsPayment" type="text" value={form.termsPayment} onChange={e => setF('termsPayment', e.target.value)} />
              </FormField>
              <FormField label="Delivery" htmlFor="termsDelivery">
                <Input id="termsDelivery" type="text" value={form.termsDelivery} onChange={e => setF('termsDelivery', e.target.value)} />
              </FormField>
              <FormField label="Tax" htmlFor="termsTax">
                <Input id="termsTax" type="text" value={form.termsTax} onChange={e => setF('termsTax', e.target.value)} />
              </FormField>
              <FormField label="PAN Card No" htmlFor="commercialPan">
                <Input id="commercialPan" type="text" value={form.commercialPan} onChange={e => setF('commercialPan', e.target.value)} className="font-mono" />
              </FormField>
              <FormField label="GST No" htmlFor="commercialGst">
                <Input id="commercialGst" type="text" value={form.commercialGst} onChange={e => setF('commercialGst', e.target.value)} className="font-mono" />
              </FormField>
              <FormField label="Services Code" htmlFor="commercialServicesCode">
                <Input id="commercialServicesCode" type="text" value={form.commercialServicesCode} onChange={e => setF('commercialServicesCode', e.target.value)} />
              </FormField>
              <FormField label="ISO Certificate" htmlFor="commercialIso">
                <Input id="commercialIso" type="text" value={form.commercialIso} onChange={e => setF('commercialIso', e.target.value)} />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>Line Items</CardTitle>
              <CardDescription>Choose Rate/Kg, Rate/Pc, or Lot Charge per line (QF-MKT-03 format).</CardDescription>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setItems(p => [...p, emptyItem()])}>
              <Plus /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {/* Five editable columns don't fit a phone; let the table scroll
                inside the card instead of squeezing the inputs to nothing. */}
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-xs min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['#', 'Description / Part Name *', 'Process', 'Material', 'Rate Type', 'Rate (₹)', ''].map(h => (
                      <th key={h} className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-2 py-1.5 text-slate-400 font-mono tabular-nums">{idx + 1}</td>
                      <td className="px-1 py-1.5">
                        <Input
                          type="text"
                          value={item.partName}
                          onChange={e => updateItem(idx, 'partName', e.target.value)}
                          className="h-8 min-h-0 text-xs w-48"
                          placeholder="Description / part name"
                        />
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
                        <Input
                          type="text"
                          value={item.material}
                          onChange={e => updateItem(idx, 'material', e.target.value)}
                          className="h-8 min-h-0 text-xs w-28"
                          placeholder="e.g. D2"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <Select value={item.unit} onValueChange={v => updateItem(idx, 'unit', v)}>
                          <SelectTrigger className="h-8 min-h-0 text-xs w-32">
                            <SelectValue placeholder="Rate type" />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-1 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={item.rate}
                          onChange={e => updateItem(idx, 'rate', e.target.value)}
                          className="h-8 min-h-0 text-xs w-24 text-right tabular-nums font-mono"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setItems(p => p.filter((_, j) => j !== idx))}
                            className="text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                            aria-label={`Remove item ${idx + 1}`}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" loading={saving} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Quote' : 'Create Quote'}
          </Button>
        </div>
      </form>

      {newCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Quick Create</div>
                <div className="text-lg font-extrabold text-slate-800 mt-1">New Customer</div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={closeNewCustomer}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Close"
              >
                <X />
              </Button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <FormField label="Customer Name" htmlFor="qcName" required>
                <Input
                  id="qcName"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))}
                  placeholder="Company / customer name"
                />
              </FormField>
              <FormField label="Address" htmlFor="qcAddress" required>
                <Textarea
                  id="qcAddress"
                  value={newCustomer.address}
                  onChange={e => setNewCustomer(p => ({ ...p, address: e.target.value }))}
                  rows={3}
                  placeholder="Full address"
                />
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <FormField label="GSTIN" htmlFor="qcGstin" hint="Optional">
                  <Input
                    id="qcGstin"
                    value={newCustomer.gstin}
                    onChange={e => setNewCustomer(p => ({ ...p, gstin: e.target.value }))}
                    className="font-mono"
                    placeholder="27ABCDE1234F1Z5"
                  />
                </FormField>
                <FormField label="Phone" htmlFor="qcPhone" hint="Optional">
                  <Input
                    id="qcPhone"
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                  />
                </FormField>
              </div>
              <FormField label="Email" htmlFor="qcEmail" hint="Optional">
                <Input
                  id="qcEmail"
                  type="email"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))}
                  placeholder="email@company.com"
                />
              </FormField>
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <Button type="button" variant="outline" onClick={closeNewCustomer}>Cancel</Button>
              <Button type="button" onClick={createCustomerQuick} loading={newCustomer.saving} disabled={newCustomer.saving}>
                {newCustomer.saving ? 'Creating...' : 'Create & Select'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
