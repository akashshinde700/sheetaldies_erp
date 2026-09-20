import { useEffect, useState } from 'react';
import { Plus, Pencil, X, Save, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/ui/form-field';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';

// A series is never deleted: every invoice points at the one it was numbered
// from, and its running number must stay reproducible. Retire it instead by
// switching it off — it then stops appearing when a new invoice is raised.

const emptyForm = () => ({ code: '', label: '', padWidth: '4', isActive: true });

export default function InvoiceSeriesList() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { id? , form }
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    // all=true so retired series stay visible and editable here — the invoice
    // form asks for the active ones only.
    api.get('/invoices/series', { params: { all: 'true' } })
      .then((r) => setSeries(r.data.data || []))
      .catch(() => toast.error('Failed to load invoice series.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const startAdd = () => setEditing({ form: emptyForm() });
  const startEdit = (s) => setEditing({
    id: s.id,
    form: { code: s.code, label: s.label, padWidth: String(s.padWidth ?? 4), isActive: s.isActive !== false },
  });

  const save = async () => {
    const { id, form } = editing;
    if (!form.code.trim() || !form.label.trim()) { toast.error('Code and label are both required.'); return; }
    const pad = Number(form.padWidth);
    if (!Number.isInteger(pad) || pad < 1 || pad > 6) { toast.error('Digits must be a whole number from 1 to 6.'); return; }

    setSaving(true);
    try {
      if (id) {
        // The code is what past invoice numbers were built from, so it is
        // fixed once the series exists; only the label, width and on/off move.
        await api.patch(`/invoices/series/${id}`, { label: form.label.trim(), padWidth: pad, isActive: form.isActive });
        toast.success(`Series ${form.code} updated.`);
      } else {
        const r = await api.post('/invoices/series', { code: form.code.trim(), label: form.label.trim(), isActive: form.isActive });
        if (pad !== 4) await api.patch(`/invoices/series/${r.data.data.id}`, { padWidth: pad });
        toast.success(`Series ${form.code} created.`);
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Series save nahi hui.');
    } finally {
      setSaving(false);
    }
  };

  const sample = (code, pad) => `${code || 'SVT'}/26-27/${'1'.padStart(Math.max(1, Math.min(6, Number(pad) || 4)), '0')}`;

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">
      <PageHeader
        title="Invoice Series"
        breadcrumbs={[{ label: 'Invoice Series' }]}
        actions={!editing && <Button onClick={startAdd}><Plus /> New series</Button>}
      />

      {editing && (
        <Card className="border-primary-200">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">
                {editing.id ? <>Edit series <span className="font-mono text-primary-700">{editing.form.code}</span></> : 'New series'}
              </h3>
              <Button size="icon-sm" variant="ghost" onClick={() => setEditing(null)} title="Close"><X /></Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                label="Code"
                required
                hint={editing.id ? 'Fixed — past invoice numbers were built from it.' : 'Short prefix, e.g. SVT.'}
              >
                <Input
                  value={editing.form.code}
                  disabled={Boolean(editing.id)}
                  onChange={(e) => setEditing({ ...editing, form: { ...editing.form, code: e.target.value.toUpperCase() } })}
                  className="font-mono uppercase"
                />
              </FormField>
              <FormField label="Label" required className="sm:col-span-2">
                <Input
                  placeholder="e.g. Tax Invoice 2026-27"
                  value={editing.form.label}
                  onChange={(e) => setEditing({ ...editing, form: { ...editing.form, label: e.target.value } })}
                />
              </FormField>
              <FormField label="Digits" hint="Width of the running number.">
                <Input
                  type="number" min={1} max={6}
                  value={editing.form.padWidth}
                  onChange={(e) => setEditing({ ...editing, form: { ...editing.form, padWidth: e.target.value } })}
                  className="text-right tabular-nums"
                />
              </FormField>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={editing.form.isActive}
                onChange={(e) => setEditing({ ...editing, form: { ...editing.form, isActive: e.target.checked } })}
                className="h-4 w-4 rounded border-slate-300"
              />
              Offer this series when raising a new invoice
            </label>

            <div className="flex items-center gap-3">
              <Button onClick={save} disabled={saving}><Save /> {saving ? 'Saving…' : (editing.id ? 'Save changes' : 'Create series')}</Button>
              <p className="text-[12px] text-slate-500">
                Numbers will read <span className="font-mono font-bold text-primary-700">{sample(editing.form.code, editing.form.padWidth)}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2.5 font-semibold">Code</th>
                <th className="px-4 py-2.5 font-semibold">Label</th>
                <th className="w-24 px-4 py-2.5 font-semibold">Digits</th>
                <th className="w-32 px-4 py-2.5 font-semibold">Invoices</th>
                <th className="w-28 px-4 py-2.5 font-semibold">Status</th>
                <th className="w-16 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-800">{s.code}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{s.label}</td>
                  <td className="px-4 py-3 font-mono text-sm text-slate-600 tabular-nums">{s.padWidth ?? 4}</td>
                  <td className="px-4 py-3 font-mono text-sm text-slate-500 tabular-nums">{s._count?.invoices ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'In use' : 'Retired'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="icon-sm" variant="ghost" title="Edit this series" aria-label={`Edit series ${s.code}`} className="text-slate-400 hover:text-primary-700" onClick={() => startEdit(s)}>
                      <Pencil />
                    </Button>
                  </td>
                </tr>
              ))}
              {!loading && !series.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50"><Hash className="h-5 w-5 text-slate-300" /></div>
                    <p className="text-sm text-slate-500">No invoice series yet — an invoice cannot be raised without one.</p>
                    <Button className="mt-3" size="sm" variant="outline" onClick={startAdd}><Plus /> Create the first series</Button>
                  </td>
                </tr>
              )}
              {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">Loading…</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-[12px] text-slate-500">
        A series is never deleted — every invoice keeps pointing at the one it was numbered from.
        Retire it by switching it off and it stops being offered on new invoices.
      </p>
    </div>
  );
}
