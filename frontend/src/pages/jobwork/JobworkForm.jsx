import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import SearchSelect from '../../components/SearchSelect';

export default function JobworkForm() {
  const navigate = useNavigate();
  const [parties,  setParties]  = useState([]);
  const [items,    setItems]    = useState([]);
  const [jobCards, setJobCards] = useState([]);
  const [loading,  setLoading]  = useState(false);

  const addDays = (dateStr, days) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    challanDate: today,
    jobCardId: '', fromPartyId: '', toPartyId: '',
    invoiceChNo: '', invoiceChDate: '',
    transportMode: 'Hand Delivery', vehicleNo: '', deliveryPerson: '',
    dispatchDate: today,
    dueDate: addDays(today, 4), processingNotes: '', handlingCharges: '0',
    cgstRate: '0', sgstRate: '0', igstRate: '0',
  });
  const [manualChallanNo, setManualChallanNo] = useState(true);
  const [challanNoInput, setChallanNoInput] = useState('');

  const PROCESSES = [
    'Stress Relieving', 'Hardening', 'Tempering', 'Annealing',
    'Brazing', 'Plasma Nitriding', 'Sub Zero', 'Soak Clean',
  ];
  const EMPTY_ROW = { itemId: '', description: '', drawingNo: '', material: '', hrc: '', woNo: '', hsnCode: '', quantity: '', qtyOut: '', uom: 'KGS', weight: '', rate: '', amount: '', _processKey: '' };
  const [lineItems, setLineItems] = useState([{ ...EMPTY_ROW }]);
  const [selectedProcesses, setSelectedProcesses] = useState(new Set());

  const toggleProcess = (proc) => {
    const isSelected = selectedProcesses.has(proc);
    if (isSelected) {
      setSelectedProcesses(prev => { const n = new Set(prev); n.delete(proc); return n; });
      setLineItems(prev => prev.filter(it => it._processKey !== proc));
    } else {
      setSelectedProcesses(prev => new Set([...prev, proc]));
      setLineItems(prev => [...prev, { ...EMPTY_ROW, description: proc, _processKey: proc }]);
    }
  };

  useEffect(() => {
    api.get('/parties').then(r => {
      const list = r.data.data || [];
      setParties(list);
      const own = list.find(p => p.partyType === 'BOTH') || list[0];
      if (own) setForm(p => ({ ...p, fromPartyId: String(own.id) }));
    });
    api.get('/items').then(r => setItems(r.data.data));
    api.get('/jobcards?limit=100').then(r => {
      const availableJobCards = (r.data.data || []).filter(jc => ['CREATED', 'IN_PROGRESS'].includes(jc.status));
      setJobCards(availableJobCards);
    });
  }, []);

  const updateLineItem = (i, field, val) => {
    setLineItems(prev => {
      const arr = [...prev];
      arr[i] = { ...arr[i], [field]: val };
      if (field === 'quantity' || field === 'rate') {
        const q = parseFloat(field === 'quantity' ? val : arr[i].quantity) || 0;
        const r = parseFloat(field === 'rate'     ? val : arr[i].rate)     || 0;
        arr[i].amount = (q * r).toFixed(2);
      }
      if (field === 'itemId') {
        const item = items.find(it => it.id === parseInt(val));
        if (item) { arr[i].description = item.description || item.partNo || ''; arr[i].hsnCode = item.hsnCode || ''; }
      }
      return arr;
    });
  };

  const subtotal   = lineItems.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
  const total      = subtotal + (parseFloat(form.handlingCharges) || 0);
  const cgstAmt    = parseFloat((total * (parseFloat(form.cgstRate) || 0) / 100).toFixed(2));
  const sgstAmt    = parseFloat((total * (parseFloat(form.sgstRate) || 0) / 100).toFixed(2));
  const igstAmt    = parseFloat((total * (parseFloat(form.igstRate) || 0) / 100).toFixed(2));
  const grandTotal = total + cgstAmt + sgstAmt + igstAmt;

  const fillFromImage = () => {
    const jobCard = jobCards[0] || {};
    const fromParty = parties[0] || {};
    const toParty = parties.find(p => p.partyType === 'VENDOR' || p.partyType === 'BOTH') || parties[0] || {};
    setForm({
      challanDate: today,
      jobCardId: jobCard.id ? String(jobCard.id) : '',
      fromPartyId: fromParty.id ? String(fromParty.id) : '',
      toPartyId: toParty.id ? String(toParty.id) : '',
      invoiceChNo: jobCard.jobCardNo ? `INV-${jobCard.jobCardNo || '0001'}` : '',
      invoiceChDate: today,
      transportMode: 'Hand Delivery',
      vehicleNo: '',
      deliveryPerson: '',
      dispatchDate: today,
      dueDate: addDays(today, 4),
      processingNotes: `Process for job card ${jobCard.jobCardNo || ''}`,
      handlingCharges: '0',
      cgstRate: '0',
      sgstRate: '0',
      igstRate: '0',
    });

    const item = items[0] || {};
    setLineItems([{ ...EMPTY_ROW,
      itemId: item.id ? String(item.id) : '',
      description: item.description || item.partNo || 'AutoItem',
      drawingNo: item.drawingNo || '',
      material: item.material || 'H13',
      hrc: item.hrc || '',
      woNo: item.woNo || '',
      hsnCode: item.hsnCode || item.hsnSacCode || '998898',
      quantity: item.quantity ? String(item.quantity) : '1',
      qtyOut: item.quantity ? String(item.quantity) : '1',
      uom: 'KGS',
      weight: item.weight ? String(item.weight) : '',
      rate: item.rate ? String(item.rate) : '0',
      amount: item.amount ? String(item.amount) : '0',
    }]);

    setSelectedProcesses(new Set(jobCard.processes || []));
    setManualChallanNo(false);
    setChallanNoInput('');
    toast.success('Jobwork values loaded from DB-backed sample.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fromPartyId || !form.toPartyId) {
      toast.error('From and To party are required.');
      return;
    }
    if (manualChallanNo && !challanNoInput.trim()) {
      toast.error('Challan number is required when manual  ticked.');
      return;
    }
    const validItems = lineItems.filter(it => it.description?.trim() || (parseFloat(it.quantity) > 0 && parseFloat(it.rate) > 0));
    if (!validItems.length) {
      toast.error('At least one line item with quantity and rate is required.');
      return;
    }
    setLoading(true);
    try {
      const r = await api.post('/jobwork', { ...form, items: lineItems, manualChallanNo: manualChallanNo ? challanNoInput.trim() : '' });
      toast.success(`Challan ${r.data.data.challanNo} created!`);
      navigate('/jobwork');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating challan.');
    } finally {
      setLoading(false);
    }
  };

  const F = ({ label, children, className = '' }) => (
    <div className={className}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="max-w-5xl animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/jobwork"
          className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">New Jobwork Challan</h2>
          <p className="text-xs text-slate-400 mt-0.5">Rule 45(1) CGST Rules, 2017</p>
          <p className="text-xs text-slate-500 mt-1">Flow ref: 1 (Jobwork). Related image: <span className="font-mono">all\\1.jpeg</span></p>
        </div>
        <button type="button" onClick={fillFromImage} className="btn-outline ml-auto">
          <span className="material-symbols-outlined text-sm">file_upload</span> Load sample data
        </button>
        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
          Challan for Job Work
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Challan Header */}
        <div className="card p-5 space-y-4">
          <p className="section-title border-b border-slate-100 pb-2">Challan Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <F label="Challan Date *">
              <input type="date" value={form.challanDate}
                onChange={e => setForm(p => ({ ...p, challanDate: e.target.value, dispatchDate: e.target.value, dueDate: addDays(e.target.value, 4) }))}
                required className="form-input" />
            </F>
            <div>
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
            </div>
            <F label="Link Job Card">
              <SearchSelect
                value={form.jobCardId}
                onChange={v => setForm(p => ({ ...p, jobCardId: v }))}
                options={jobCards.map(jc => ({ value: jc.id, label: `${jc.jobCardNo} — ${jc.part?.partNo || ''}` }))}
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

        {/* Processing Notes */}
        <div className="card p-5">
          <F label="Processing Notes / Instructions">
            <textarea value={form.processingNotes} onChange={e => setForm(p => ({ ...p, processingNotes: e.target.value }))}
              rows={2} className="form-input resize-none" placeholder="Material pre-heat temperature, hardness required, vacuum level..." />
          </F>
        </div>

        {/* Process Selection */}
        <div className="card p-5">
          <p className="section-title border-b border-slate-100 pb-2 mb-3">Process</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2">
            {PROCESSES.map(proc => {
              const checked = selectedProcesses.has(proc);
              return (
                <label key={proc}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none
                    ${checked ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200'}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleProcess(proc)} className="accent-indigo-600 w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{proc}</span>
                </label>
              );
            })}
          </div>
        </div>

        <datalist id="challan-desc-suggestions">
          <option value="Vacuum Hardening" />
          <option value="Vacuum Hardening + Tempering" />
          <option value="Nitriding" />
          <option value="Deep Cryogenic Treatment" />
          <option value="Stress Relieving" />
          <option value="Annealing" />
          <option value="H13 Die" />
          <option value="D2 Die" />
          <option value="M2 Tool" />
        </datalist>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading
              ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Creating...</>
              : <><span className="material-symbols-outlined text-sm">save</span> Create Challan</>
            }
          </button>
          <Link to="/jobwork" className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
