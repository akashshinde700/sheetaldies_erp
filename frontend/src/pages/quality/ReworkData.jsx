import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Printer, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import SearchSelect from '../../components/SearchSelect';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Rework Data register (QF-QA-07) — monthly log of every job card that
// failed a certificate check and was reworked. Certificate is a lookup for
// identity only; every other column stays free-text, same as the paper form.

const now = new Date();
const emptyForm = () => ({
  id: null, entryDate: new Date().toISOString().slice(0, 10), certificateId: '', reworkCertificateId: '',
  customerName: '', description: '', qty: '', weightKg: '', jobCardNoText: '', hardnessRequired: '',
  cycleNo: '', reason: '', reworkCycleNo: '', afterProcessResults: '', remark: '',
});

export default function ReworkData() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null); // null = form closed
  const [meta, setMeta] = useState({ totalProcessedWeightKg: '', targetPercent: '1', causes: '', correctiveActions: '' });
  const [savingMeta, setSavingMeta] = useState(false);

  useEffect(() => {
    api.get('/quality/certificates', { params: { limit: 200 } }).then((r) => setCerts(r.data.data || [])).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    setForm(null);
    api.get('/quality/rework-entries', { params: { year, month } })
      .then((r) => {
        setData(r.data.data);
        setMeta({
          totalProcessedWeightKg: r.data.data.totalProcessedWeightKg ?? '',
          targetPercent: String(r.data.data.targetPercent ?? '1'),
          causes: (r.data.data.causes || []).join('\n'),
          correctiveActions: (r.data.data.correctiveActions || []).join('\n'),
        });
      })
      .catch(() => toast.error('Failed to load rework data.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [year, month]);

  const certOptions = useMemo(() => certs.map((c) => ({
    value: c.id, label: `${c.certNo} — ${c.customer?.name || c.jobCard?.customer?.name || ''} (${c.jobCard?.jobCardNo || ''})`,
  })), [certs]);

  const applyCertPrefill = (certId, key) => {
    const cert = certs.find((c) => String(c.id) === String(certId));
    setForm((f) => {
      const next = { ...f, [key]: certId };
      if (key === 'certificateId' && cert) {
        next.customerName = next.customerName || cert.customer?.name || cert.jobCard?.customer?.name || '';
        next.description = next.description || cert.items?.[0]?.description || '';
        next.jobCardNoText = next.jobCardNoText || cert.jobCard?.jobCardNo || '';
        next.hardnessRequired = next.hardnessRequired || (cert.hardnessMin && cert.hardnessMax ? `${cert.hardnessMin}-${cert.hardnessMax} ${cert.hardnessUnit || 'HRC'}` : '');
        next.qty = next.qty || cert.items?.[0]?.quantity || '';
        next.weightKg = next.weightKg || cert.items?.[0]?.totalWeight || '';
      }
      return next;
    });
  };

  const startAdd = () => setForm(emptyForm());
  const startEdit = (e) => setForm({
    id: e.id, entryDate: e.entryDate.slice(0, 10), certificateId: e.certificateId ? String(e.certificateId) : '',
    reworkCertificateId: e.reworkCertificateId ? String(e.reworkCertificateId) : '',
    customerName: e.customerName || '', description: e.description || '', qty: e.qty ?? '', weightKg: e.weightKg ?? '',
    jobCardNoText: e.jobCardNoText || '', hardnessRequired: e.hardnessRequired || '', cycleNo: e.cycleNo || '',
    reason: e.reason || '', reworkCycleNo: e.reworkCycleNo || '', afterProcessResults: e.afterProcessResults || '', remark: e.remark || '',
  });

  const save = async () => {
    if (!form.entryDate) { toast.error('Date is required.'); return; }
    setSaving(true);
    try {
      await api.post('/quality/rework-entries', { ...form, year, month });
      toast.success('Rework entry saved.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (e) => {
    if (!window.confirm(`Delete rework entry Sr No. ${e.srNo}?`)) return;
    try {
      await api.delete(`/quality/rework-entries/${e.id}`);
      toast.success('Entry deleted.');
      load();
    } catch {
      toast.error('Failed to delete.');
    }
  };

  const saveMeta = async () => {
    setSavingMeta(true);
    try {
      await api.post('/quality/rework-months', {
        year, month,
        totalProcessedWeightKg: meta.totalProcessedWeightKg || null,
        targetPercent: meta.targetPercent || 1,
        causes: meta.causes.split('\n').map((s) => s.trim()).filter(Boolean),
        correctiveActions: meta.correctiveActions.split('\n').map((s) => s.trim()).filter(Boolean),
      });
      toast.success('Month summary saved.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSavingMeta(false);
    }
  };

  const entries = data?.entries || [];
  const totals = data?.totals || { totalReworkQty: 0, totalReworkWeight: 0, monthlyReworkPercent: 0 };

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Rework Data</h1>
          <p className="page-subtitle">QF-QA-07 — monthly rework &amp; rejection register, linked to certificates and the NC register.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} className="w-20" />
          <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || now.getFullYear())} className="w-24" />
          <Button variant="outline" onClick={() => window.open(`/quality/rework-data/print?year=${year}&month=${month}`, '_blank')}><Printer /> Print</Button>
          <Button variant="outline" onClick={() => window.open(`/quality/print-pack?year=${year}&month=${month}`, '_blank')} title="Rework Data + NC Register, one print job"><Printer /> Print Pack</Button>
          <Button onClick={startAdd}><Plus /> Add Entry</Button>
        </div>
      </div>

      {form && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-700">{form.id ? 'Edit Entry' : 'New Entry'}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
                <Input type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Link Certificate (original, failed)</label>
                <SearchSelect value={form.certificateId} onChange={(v) => applyCertPrefill(v, 'certificateId')} options={certOptions} placeholder="Select certificate (optional)" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rework Certificate (result)</label>
                <SearchSelect value={form.reworkCertificateId} onChange={(v) => setForm({ ...form, reworkCertificateId: v })} options={certOptions} placeholder="Select certificate (optional)" />
              </div>

              <Input placeholder="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="sm:col-span-2" />
              <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="sm:col-span-2" />
              <Input type="number" placeholder="Qty" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
              <Input type="number" placeholder="Weight (kg)" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
              <Input placeholder="Job Card No" value={form.jobCardNoText} onChange={(e) => setForm({ ...form, jobCardNoText: e.target.value })} />
              <Input placeholder="Hardness Required" value={form.hardnessRequired} onChange={(e) => setForm({ ...form, hardnessRequired: e.target.value })} />
              <Input placeholder="Cycle No" value={form.cycleNo} onChange={(e) => setForm({ ...form, cycleNo: e.target.value })} />
              <Input placeholder="Rework Cycle No" value={form.reworkCycleNo} onChange={(e) => setForm({ ...form, reworkCycleNo: e.target.value })} />
              <Input placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="sm:col-span-2" />
              <Input placeholder="After Process Results" value={form.afterProcessResults} onChange={(e) => setForm({ ...form, afterProcessResults: e.target.value })} />
              <Input placeholder="Remark" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}><Save /> {saving ? 'Saving…' : 'Save'}</Button>
              <Button variant="ghost" onClick={() => setForm(null)}><X /> Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="card p-10 text-center text-sm text-slate-400">Loading…</div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="table-responsive">
              <table className="w-full text-center min-w-[1100px]">
                <thead>
                  <tr>
                    <th className="th">Sr</th><th className="th">Date</th><th className="th text-left">Customer</th>
                    <th className="th text-left">Description</th><th className="th">Qty</th><th className="th">Wt</th>
                    <th className="th">Job Card / Hardness</th><th className="th">Cycle No</th><th className="th text-left">Reason</th>
                    <th className="th">Rework Cycle</th><th className="th">Result</th><th className="th">Remark</th><th className="th w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/80">
                  {entries.map((e) => (
                    <tr key={e.id} className="tr">
                      <td className="td font-mono">{e.srNo}</td>
                      <td className="td whitespace-nowrap">{e.entryDate.slice(0, 10)}</td>
                      <td className="td text-left">{e.customerName}</td>
                      <td className="td text-left">{e.description}</td>
                      <td className="td tabular-nums">{e.qty ?? ''}</td>
                      <td className="td tabular-nums">{e.weightKg ?? ''}</td>
                      <td className="td"><div>{e.jobCardNoText}</div><div className="text-slate-400">{e.hardnessRequired}</div></td>
                      <td className="td font-mono text-[11px]">{e.cycleNo}</td>
                      <td className="td text-left">{e.reason}</td>
                      <td className="td font-mono text-[11px]">{e.reworkCycleNo}</td>
                      <td className="td">{e.afterProcessResults}</td>
                      <td className="td">{e.remark}</td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-primary-700" onClick={() => startEdit(e)}><Pencil /></Button>
                          <Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={() => remove(e)}><Trash2 /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!entries.length && (
                    <tr><td colSpan={13} className="px-3 py-8 text-center text-sm text-slate-400">No rework entries for {String(month).padStart(2, '0')}/{year} yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card><CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Total Rework Qty / Weight</p>
              <p className="mt-1 font-mono text-xl font-bold text-slate-800 tabular-nums">{totals.totalReworkQty} <span className="text-sm text-slate-400">nos</span> · {totals.totalReworkWeight} <span className="text-sm text-slate-400">kg</span></p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Monthly Rework %</p>
              <p className="mt-1 font-mono text-xl font-bold text-danger-600 tabular-nums">{totals.monthlyReworkPercent}%</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Target</p>
              <p className="mt-1 font-mono text-xl font-bold text-primary-700 tabular-nums">{meta.targetPercent}%</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-700">Month Summary (for print)</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Processed Weight (kg)</label>
                  <Input type="number" value={meta.totalProcessedWeightKg} onChange={(e) => setMeta({ ...meta, totalProcessedWeightKg: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target %</label>
                  <Input type="number" step="0.01" value={meta.targetPercent} onChange={(e) => setMeta({ ...meta, targetPercent: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Causes (one per line)</label>
                  <textarea className="form-input w-full h-20" value={meta.causes} onChange={(e) => setMeta({ ...meta, causes: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Corrective Actions (one per line)</label>
                  <textarea className="form-input w-full h-20" value={meta.correctiveActions} onChange={(e) => setMeta({ ...meta, correctiveActions: e.target.value })} />
                </div>
              </div>
              <Button onClick={saveMeta} disabled={savingMeta}><Save /> {savingMeta ? 'Saving…' : 'Save Summary'}</Button>
            </CardContent>
          </Card>

          <p className="text-xs text-slate-400">
            Linked to <Link to="/quality/nc-register" className="text-primary-700 underline">Inhouse NC Register (QF-QA-20)</Link> — add the matching NC row from there.
          </p>
        </>
      )}
    </div>
  );
}
