import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';

// These mirror PASSWORD_RULES in backend/src/controllers/auth.controller.js.
// Keep the two lists in step — the server rejects on its own copy, this one
// only spares the user a round trip.
const RULES = [
  { test: (p) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { test: (p) => /[0-9]/.test(p), label: 'One digit' },
  { test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p), label: 'One special character' },
];

export default function ChangePassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const unmet = RULES.filter((r) => !r.test(form.newPassword));
  const mismatch = form.confirm.length > 0 && form.confirm !== form.newPassword;
  const sameAsOld = form.newPassword.length > 0 && form.newPassword === form.oldPassword;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.oldPassword) { toast.error('Enter your current password.'); return; }
    if (unmet.length) { toast.error('The new password does not meet the requirements yet.'); return; }
    if (mismatch) { toast.error('The two new passwords do not match.'); return; }
    if (sameAsOld) { toast.error('The new password must differ from the current one.'); return; }

    setSaving(true);
    try {
      await api.put('/auth/change-password', {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password changed. Use the new one next time you sign in.');
      setForm({ oldPassword: '', newPassword: '', confirm: '' });
      navigate('/');
    } catch (err) {
      // The server sends the failed rules back in `errors` — show those rather
      // than a generic message, so it is clear what to fix.
      const detail = err.response?.data?.errors;
      toast.error(Array.isArray(detail) && detail.length ? detail[0] : (err.response?.data?.message || 'Could not change the password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack w-full max-w-xl space-y-5 animate-slide-up">
      <PageHeader
        title="Change Password"
        backTo="/"
        breadcrumbs={[{ label: 'Change Password' }]}
      />
      <Card>
        <CardContent className="p-5">
          <form onSubmit={submit} className="space-y-4">
            <FormField label="Current password" required>
              <Input
                type="password" autoComplete="current-password" value={form.oldPassword}
                onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
              />
            </FormField>

            <FormField label="New password" required>
              <Input
                type="password" autoComplete="new-password" value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
            </FormField>

            <ul className="space-y-1">
              {RULES.map((r) => {
                const ok = r.test(form.newPassword);
                return (
                  <li key={r.label} className={`flex items-center gap-1.5 text-[12px] ${ok ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    {r.label}
                  </li>
                );
              })}
            </ul>

            <FormField
              label="Confirm new password"
              required
              error={mismatch ? 'The two new passwords do not match.' : null}
            >
              <Input
                type="password" autoComplete="new-password" value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
            </FormField>

            {sameAsOld && (
              <p className="text-[12px] font-medium text-rose-600">The new password must differ from the current one.</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" loading={saving} disabled={saving}>
                <KeyRound /> {saving ? 'Changing…' : 'Change password'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => navigate('/')}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
