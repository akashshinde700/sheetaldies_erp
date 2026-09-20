import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Printer, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import SearchSelect from '../../components/SearchSelect';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Inhouse NC Register (QF-QA-20) — continuous non-conformance log, usually
// one row per Rework Data entry. Cert/rework-entry are lookups for identity
// only; the QA narrative fields stay free-text.

const now = new Date();
const emptyForm = () => ({
  id: null, entryDate: new Date().toISOString().slice(0, 10), reworkEntryId: '', certificateId: '',
  customerName: '', testReport: '', process: '', stage: '', ncQty: '', ncDetails: '',
  disposition: '', rootCauseAnalysis: '', correctiveAction: '', reVerification: '', sign: '',
});

export default function NcRegister() {
  const [rows, setRows] = useState([]);
  const [certs, setCerts] = useState([]);
  const [findYear, setFindYear] = useState(now.getFullYear());
  const [findMonth, setFindMonth] = useState(now.getMonth() + 1);
  const [reworkOptions, setReworkOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/quality/nc-register').then((r) => setRows(r.data.data || [])).catch(() => toast.error('Failed to load NC register.')).finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => { api.get('/quality/certificates', { params: { limit: 200 } }).then((r) => setCerts(r.data.data || [])).catch(() => {}); }, []);
  useEffect(() => {
    api.get('/quality/rework-entries', { params: { year: findYear, month: findMonth } })
      .then((r) => setReworkOptions((r.data.data.entries || []).map((e) => ({ value: e.id, label: `Sr ${e.srNo} — ${e.customerName || ''} (${e.jobCard?.jobCardNo || e.jobCardNoText || ''})` }))))
      .catch(() => {});
  }, [findYear, findMonth]);

  const certOptions = useMemo(() => certs.map((c) => ({ value: c.id, label: `${c.certNo} — ${c.customer?.name || c.jobCard?.customer?.name || ''}` })), [certs]);

  const startAdd = () => setForm(emptyForm());
  const startEdit = (r) => setForm({
    id: r.id, entryDate: r.entryDate.slice(0, 10), reworkEntryId: r.reworkEntry?.id ? String(r.reworkEntry.id) : '',
    certificateId: r.certificate?.id ? String(r.certificate.id) : '', customerName: r.customerName || '', testReport: r.testReport || '',
    process: r.process || '', stage: r.stage || '', ncQty: r.ncQty || '', ncDetails: r.ncDetails || '',
    disposition: r.disposition || '', rootCauseAnalysis: r.rootCauseAnalysis || '', correctiveAction: r.correctiveAction || '',
    reVerification: r.reVerification || '', sign: r.sign || '',
  });

  const save = async () => {
    if (!form.entryDate) { toast.error('Date is required.'); return; }
    setSaving(true);
    try {
      await api.post('/quality/nc-register', form);
      toast.success('NC entry saved.');
      setForm(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete NC Sr No. ${r.srNo}?`)) return;
    try {
      await api.delete(`/quality/nc-register/${r.id}`);
      toast.success('Entry deleted.');
      load();
    } catch {
      toast.error('Failed to delete.');
    }
  };

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Inhouse NC Register</h1>
          <p className="page-subtitle">QF-QA-20 — continuous non-conformance log, cross-linked to Rework Data.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.open('/quality/nc-register/print', '_blank')}><Printer /> Print</Button>
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
              <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Link Certificate</label>
                <SearchSelect value={form.certificateId} onChange={(v) => setForm({ ...form, certificateId: v })} options={certOptions} placeholder="Select certificate (optional)" />
              </div>
              <div className="space-y-1 flex gap-1 items-end">
                <Input type="number" value={findYear} onChange={(e) => setFindYear(Number(e.target.value) || now.getFullYear())} className="w-16" title="Rework entry month/year" />
                <Input type="number" min={1} max={12} value={findMonth} onChange={(e) => setFindMonth(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} className="w-14" />
              </div>
              <div className="space-y-1 sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Link Rework Data Entry (Sr No. above, from month/year picked)</label>
                <SearchSelect value={form.reworkEntryId} onChange={(v) => setForm({ ...form, reworkEntryId: v })} options={reworkOptions} placeholder="Select rework entry (optional)" />
              </div>

              <Input placeholder="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="sm:col-span-2" />
              <Input placeholder="Test Report" value={form.testReport} onChange={(e) => setForm({ ...form, testReport: e.target.value })} />
              <Input placeholder="NC Qty" value={form.ncQty} onChange={(e) => setForm({ ...form, ncQty: e.target.value })} />
              <Input placeholder="Process" value={form.process} onChange={(e) => setForm({ ...form, process: e.target.value })} className="sm:col-span-2" />
              <Input placeholder="Stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className="sm:col-span-2" />
              <Input placeholder="NC Details" value={form.ncDetails} onChange={(e) => setForm({ ...form, ncDetails: e.target.value })} className="sm:col-span-4" />
              <Input placeholder="Disposition" value={form.disposition} onChange={(e) => setForm({ ...form, disposition: e.target.value })} className="sm:col-span-2" />
              <Input placeholder="Root Cause Analysis" value={form.rootCauseAnalysis} onChange={(e) => setForm({ ...form, rootCauseAnalysis: e.target.value })} className="sm:col-span-2" />
              <Input placeholder="Corrective Action" value={form.correctiveAction} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} className="sm:col-span-2" />
              <Input placeholder="Re-Verification" value={form.reVerification} onChange={(e) => setForm({ ...form, reVerification: e.target.value })} />
              <Input placeholder="Sign" value={form.sign} onChange={(e) => setForm({ ...form, sign: e.target.value })} />
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
        <div className="card overflow-hidden">
          <div className="table-responsive">
            <table className="w-full text-center min-w-[1200px]">
              <thead>
                <tr>
                  <th className="th">Sr</th><th className="th">Date</th><th className="th text-left">Customer</th>
                  <th className="th">Test Report</th><th className="th text-left">Process</th><th className="th text-left">Stage</th>
                  <th className="th">NC Qty</th><th className="th text-left">NC Details</th><th className="th text-left">Disposition</th>
                  <th className="th text-left">Root Cause</th><th className="th text-left">Corrective Action</th>
                  <th className="th">Re-Verification</th><th className="th">Sign</th><th className="th w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {rows.map((r) => (
                  <tr key={r.id} className="tr">
                    <td className="td font-mono">{r.srNo}</td>
                    <td className="td whitespace-nowrap">{r.entryDate.slice(0, 10)}</td>
                    <td className="td text-left">{r.customerName}</td>
                    <td className="td font-mono text-[11px]">{r.testReport}</td>
                    <td className="td text-left">{r.process}</td>
                    <td className="td text-left">{r.stage}</td>
                    <td className="td">{r.ncQty}</td>
                    <td className="td text-left">{r.ncDetails}</td>
                    <td className="td text-left">{r.disposition}</td>
                    <td className="td text-left">{r.rootCauseAnalysis}</td>
                    <td className="td text-left">{r.correctiveAction}</td>
                    <td className="td">{r.reVerification}</td>
                    <td className="td">{r.sign}</td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button size="icon-sm" variant="ghost" title="Edit this entry" aria-label="Edit this NC entry" className="text-slate-400 hover:text-primary-700" onClick={() => startEdit(r)}><Pencil /></Button>
                        <Button size="icon-sm" variant="ghost" title="Delete this entry" aria-label="Delete this NC entry" className="text-slate-400 hover:text-rose-600" onClick={() => remove(r)}><Trash2 /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={14} className="px-3 py-8 text-center text-sm text-slate-400">No NC register entries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
