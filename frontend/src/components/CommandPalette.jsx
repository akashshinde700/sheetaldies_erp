import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  LayoutDashboard, FileText, ClipboardList, BadgeCheck, ReceiptText, Users,
  ListChecks, Thermometer, Plus, Search,
} from 'lucide-react';
import api from '../utils/api';

const NAV = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Pending List', to: '/pending', icon: ListChecks },
  { label: 'Job Cards', to: '/jobcards', icon: FileText },
  { label: 'New Job Card', to: '/jobcards/new', icon: Plus },
  { label: 'Inwards', to: '/jobwork/register', icon: ClipboardList },
  { label: 'New Inward Entry', to: '/jobwork/inward-entry', icon: Plus },
  { label: 'VHT Run Sheet', to: '/manufacturing/runsheet', icon: Thermometer },
  { label: 'Certificates', to: '/quality/certificates', icon: BadgeCheck },
  { label: 'New Certificate', to: '/quality/certificates/new', icon: Plus },
  { label: 'Invoices', to: '/invoices', icon: ReceiptText },
  { label: 'New Invoice', to: '/invoices/new', icon: Plus },
  { label: 'Parties', to: '/admin/parties', icon: Users },
];

/**
 * ⌘K / Ctrl+K command palette. Opens from the header search button or the
 * keyboard shortcut. Navigation is instant; records are loaded once on first
 * open (recent 20 of each type) and filtered client-side.
 */
export default function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [records, setRecords] = useState(null); // { jobCards, challans, certs, invoices, parties }
  const [loading, setLoading] = useState(false);

  // Global shortcut
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // Lazy-load records the first time the palette opens
  useEffect(() => {
    if (!open || records || loading) return;
    setLoading(true);
    const grab = (url, params) => api.get(url, { params }).then((r) => r.data.data || []).catch(() => []);
    Promise.all([
      grab('/jobcards', { limit: 20 }),
      grab('/jobwork', { limit: 20 }),
      grab('/quality/certificates', { limit: 20 }),
      grab('/invoices', { limit: 20 }),
      grab('/parties'),
    ])
      .then(([jobCards, challans, certs, invoices, parties]) =>
        setRecords({ jobCards, challans, certs, invoices, parties: (parties || []).slice(0, 50) })
      )
      .finally(() => setLoading(false));
  }, [open, records, loading]);

  const go = useCallback((to) => { onOpenChange(false); navigate(to); }, [navigate, onOpenChange]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Search"
      shouldFilter
      className="font-app"
      overlayClassName="fixed inset-0 z-[80] bg-slate-950/40 backdrop-blur-[2px] animate-backdrop-in"
      contentClassName="fixed left-1/2 top-[12vh] z-[80] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card-elevated animate-scale-in outline-none"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-3">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <Command.Input
          autoFocus
          placeholder="Search job cards, challans, certificates, invoices, parties…"
          className="h-12 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
      </div>
      <Command.List className="max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-slate-400">
          {loading ? 'Loading…' : 'No matches.'}
        </Command.Empty>

        <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400">
          {NAV.map((n) => (
            <Item key={n.to} onSelect={() => go(n.to)}>
              <n.icon className="h-4 w-4 text-slate-400" /> {n.label}
            </Item>
          ))}
        </Command.Group>

        {records?.jobCards?.length > 0 && (
          <Group heading="Job cards">
            {records.jobCards.map((jc) => (
              <Item key={`jc-${jc.id}`} value={`jobcard ${jc.jobCardNo} ${jc.customer?.name || jc.customerNameSnapshot || ''} ${jc.drawingNo || ''}`} onSelect={() => go(`/jobcards/${jc.id}`)}>
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="font-app-mono">{jc.jobCardNo}</span>
                <span className="truncate text-slate-500">{jc.customer?.name || jc.customerNameSnapshot || ''}</span>
              </Item>
            ))}
          </Group>
        )}

        {records?.challans?.length > 0 && (
          <Group heading="Challans">
            {records.challans.map((c) => (
              <Item key={`ch-${c.id}`} value={`challan ${c.challanNo} ${c.inwardNo || ''} ${c.fromParty?.name || ''}`} onSelect={() => go(`/jobwork/${c.id}`)}>
                <ClipboardList className="h-4 w-4 text-slate-400" />
                <span className="font-app-mono">{c.inwardNo || c.challanNo}</span>
                <span className="truncate text-slate-500">{c.fromParty?.name || ''}</span>
              </Item>
            ))}
          </Group>
        )}

        {records?.certs?.length > 0 && (
          <Group heading="Certificates">
            {records.certs.map((ct) => (
              <Item key={`ct-${ct.id}`} value={`certificate ${ct.certNo} ${ct.customer?.name || ''}`} onSelect={() => go(`/quality/certificates/${ct.id}`)}>
                <BadgeCheck className="h-4 w-4 text-slate-400" />
                <span className="font-app-mono">{ct.certNo}</span>
                <span className="truncate text-slate-500">{ct.customer?.name || ''}</span>
              </Item>
            ))}
          </Group>
        )}

        {records?.invoices?.length > 0 && (
          <Group heading="Invoices">
            {records.invoices.map((inv) => (
              <Item key={`inv-${inv.id}`} value={`invoice ${inv.invoiceNo} ${inv.toParty?.name || ''}`} onSelect={() => go(`/invoices/${inv.id}`)}>
                <ReceiptText className="h-4 w-4 text-slate-400" />
                <span className="font-app-mono">{inv.invoiceNo}</span>
                <span className="truncate text-slate-500">{inv.toParty?.name || ''}</span>
              </Item>
            ))}
          </Group>
        )}

        {records?.parties?.length > 0 && (
          <Group heading="Parties">
            {records.parties.map((p) => (
              <Item key={`p-${p.id}`} value={`party ${p.name} ${p.partyType || ''}`} onSelect={() => go(`/admin/parties/${p.id}`)}>
                <Users className="h-4 w-4 text-slate-400" />
                <span className="truncate">{p.name}</span>
                <span className="text-[10px] uppercase text-slate-400">{p.partyType}</span>
              </Item>
            ))}
          </Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}

const groupHeadingCls =
  '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400';

function Group({ heading, children }) {
  return <Command.Group heading={heading} className={`mt-1 ${groupHeadingCls}`}>{children}</Command.Group>;
}

function Item({ value, onSelect, children }) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 outline-none
        data-[selected=true]:bg-sky-50 data-[selected=true]:text-sky-950"
    >
      {children}
    </Command.Item>
  );
}
