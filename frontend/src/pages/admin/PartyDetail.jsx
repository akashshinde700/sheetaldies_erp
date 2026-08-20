import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';

const PAGE_SIZE = 10;

const TYPE_BADGE = {
  CUSTOMER: 'bg-sky-100 text-sky-700',
  VENDOR: 'bg-violet-100 text-violet-700',
  BOTH: 'bg-emerald-100 text-emerald-700',
};

const MiniPagination = ({ page, setPage, total }) => {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) return null;
  return (
    <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
      <p className="text-xs text-slate-500">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="btn-outline text-xs disabled:opacity-40"
        >
          Prev
        </button>
        <span className="text-xs font-semibold text-slate-600">{page} / {totalPages}</span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="btn-outline text-xs disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default function PartyDetail() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const { isManager, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [jobCardsPage, setJobCardsPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [certsPage, setCertsPage] = useState(1);
  const [jobworkFromPage, setJobworkFromPage] = useState(1);
  const [jobworkToPage, setJobworkToPage] = useState(1);
  const [dispatchToPage, setDispatchToPage] = useState(1);
  const [dispatchFromPage, setDispatchFromPage] = useState(1);

  // Process Rates state
  const [processRates, setProcessRates] = useState([]);
  const [allProcesses, setAllProcesses] = useState([]);
  const [editingRates, setEditingRates] = useState(false);
  const [ratesMap, setRatesMap] = useState({});
  const [savingRates, setSavingRates] = useState(false);
  const [ratesSearch, setRatesSearch] = useState('');
  const [showOnlyConfigured, setShowOnlyConfigured] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadRates = async () => {
    if (!isManager) return;
    const [ratesRes, procRes] = await Promise.all([
      api.get(`/parties/${partyId}/process-rates`),
      api.get('/processes'),
    ]);
    const rates = ratesRes.data.data || [];
    const procs = (procRes.data.data || procRes.data).filter(p => p.isActive !== false && p.showInPartyRates !== false);
    const unique = [];
    const seen = new Set();
    for (const p of procs) {
      if (!seen.has(p.id)) { seen.add(p.id); unique.push(p); }
    }
    setAllProcesses(unique);
    setProcessRates(rates);
  };

  const startEditRates = () => {
    const m = {};
    for (const row of processRates) {
      m[row.processTypeId] = {
        pricePerKg: row.pricePerKg ?? '',
        pricePerPc: row.pricePerPc ?? '',
        lotPrice:  row.lotPrice  ?? '',
      };
    }
    setRatesMap(m);
    setEditingRates(true);
  };

  const cancelEditRates = () => { setEditingRates(false); setRatesMap({}); };

  const setRate = (ptId, field, val) =>
    setRatesMap(prev => ({ ...prev, [ptId]: { ...(prev[ptId] || {}), [field]: val } }));

  const resetToGlobal = (ptId) =>
    setRatesMap(prev => { const next = { ...prev }; delete next[ptId]; return next; });

  const doSaveRates = async () => {
    setSavingRates(true);
    try {
      const payload = Object.entries(ratesMap).map(([ptId, v]) => ({
        processTypeId: Number(ptId),
        pricePerKg: v.pricePerKg !== '' ? v.pricePerKg : null,
        pricePerPc: v.pricePerPc !== '' ? v.pricePerPc : null,
        lotPrice:  v.lotPrice  !== '' ? v.lotPrice  : null,
      }));
      await api.put(`/parties/${partyId}/process-rates`, payload);
      toast.success('Process rates saved.');
      setEditingRates(false);
      await loadRates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save rates.');
    } finally {
      setSavingRates(false);
    }
  };

  const saveRates = () => {
    // Confirm if any previously-saved rate is being cleared
    const clearing = Object.entries(ratesMap).filter(([ptId, v]) => {
      const was = processRates.find(r => r.processTypeId === Number(ptId));
      const wasSet = was && (was.pricePerKg != null || was.pricePerPc != null || was.lotPrice != null);
      return wasSet && v.pricePerKg === '' && v.pricePerPc === '' && v.lotPrice === '';
    });
    if (clearing.length > 0) {
      const names = clearing.map(([ptId]) => allProcesses.find(p => p.id === Number(ptId))?.name || ptId).join(', ');
      setConfirmDialog({
        title: 'Remove custom rate?',
        message: `This will remove the custom rate for:\n${names}\n\nFuture invoices will use the global rate.`,
        confirmLabel: 'Remove & Save',
        variant: 'danger',
        onConfirm: async () => { await doSaveRates(); setConfirmDialog(null); },
      });
      return;
    }
    doSaveRates();
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/parties/${partyId}/activity`);
        if (alive) setData(r.data.data);
      } catch (e) {
        toast.error(e.response?.data?.message || 'Failed to load party.');
        if (alive) navigate('/admin/parties', { replace: true });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [partyId, navigate]);

  useEffect(() => { loadRates(); }, [partyId, isManager]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!data) return null;

  const { party, summary, jobCards, invoices, certificates, jobworkAsFromParty, jobworkAsToParty, dispatchToParty, dispatchFromParty } = data;
  const pagedJobCards = jobCards.slice((jobCardsPage - 1) * PAGE_SIZE, jobCardsPage * PAGE_SIZE);
  const pagedInvoices = invoices.slice((invoicesPage - 1) * PAGE_SIZE, invoicesPage * PAGE_SIZE);
  const pagedCerts = certificates.slice((certsPage - 1) * PAGE_SIZE, certsPage * PAGE_SIZE);
  const pagedJobworkFrom = jobworkAsFromParty.slice((jobworkFromPage - 1) * PAGE_SIZE, jobworkFromPage * PAGE_SIZE);
  const pagedJobworkTo = jobworkAsToParty.slice((jobworkToPage - 1) * PAGE_SIZE, jobworkToPage * PAGE_SIZE);
  const pagedDispatchTo = dispatchToParty.slice((dispatchToPage - 1) * PAGE_SIZE, dispatchToPage * PAGE_SIZE);
  const pagedDispatchFrom = dispatchFromParty.slice((dispatchFromPage - 1) * PAGE_SIZE, dispatchFromPage * PAGE_SIZE);

  return (
    <div className="page-stack w-full space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <button type="button" onClick={() => navigate('/admin/parties')} className="text-xs font-semibold text-sky-600 hover:underline mb-2">
            ← Back to Parties
          </button>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">{party.name}</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">{[party.address, party.city, party.state].filter(Boolean).join(' · ')}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`badge ${TYPE_BADGE[party.partyType] || 'bg-slate-100'}`}>{party.partyType}</span>
            {party.gstin && <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded">{party.gstin}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Job cards', summary.jobCards],
          ['Tax invoices (as buyer)', summary.invoices],
          ['Certificates', summary.certificates],
          ['Total billed', formatCurrency(summary.billedTotal)],
        ].map(([label, val]) => (
          <div key={label} className="card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="text-xl font-extrabold text-slate-800 mt-1">{val}</p>
          </div>
        ))}
      </div>

      {summary.jobCardsByOperationMode?.length > 0 && (
        <div className="card p-5">
          <p className="section-title border-b border-slate-100 pb-2 mb-3">Heat treatment / job type mix</p>
          <div className="flex flex-wrap gap-2">
            {summary.jobCardsByOperationMode.map((row) => (
              <span key={row.name} className="badge bg-slate-100 text-slate-700">
                {row.name}: <strong>{row.count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {summary.invoiceLinesByProcess?.length > 0 && (
        <div className="card p-5">
          <p className="section-title border-b border-slate-100 pb-2 mb-3">Billable services (from invoice lines)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500">
                  <th className="py-2 pr-3">Process / line</th>
                  <th className="py-2 pr-3">Lines</th>
                  <th className="py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.invoiceLinesByProcess.map((row) => (
                  <tr key={row.name} className="border-b border-slate-50">
                    <td className="py-2 pr-3 font-medium text-slate-800">{row.name}</td>
                    <td className="py-2 pr-3">{row.count}</td>
                    <td className="py-2">{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Process Rates Master Card — MANAGER/ADMIN view, ADMIN edit only */}
      {isManager && allProcesses.length > 0 && (() => {
        const configuredCount = allProcesses.filter(pt => {
          const s = processRates.find(r => r.processTypeId === pt.id);
          return s && (s.pricePerKg != null || s.pricePerPc != null || s.lotPrice != null);
        }).length;

        const filteredProcesses = allProcesses.filter(pt => {
          if (ratesSearch && !pt.name.toLowerCase().includes(ratesSearch.toLowerCase())) return false;
          if (showOnlyConfigured) {
            const s = processRates.find(r => r.processTypeId === pt.id);
            return !!(s && (s.pricePerKg != null || s.pricePerPc != null || s.lotPrice != null));
          }
          return true;
        });

        const getBillingType = (pt) => {
          const flags = [pt.pricePerKg != null, pt.pricePerPc != null, pt.lotPrice != null];
          const count = flags.filter(Boolean).length;
          if (count === 0) return null;
          if (count > 1) return 'MULTI';
          if (pt.pricePerKg != null) return 'KG';
          if (pt.pricePerPc != null) return 'PC';
          return 'LOT';
        };

        const BILLING_BADGE = {
          KG:    'bg-sky-100 text-sky-700',
          PC:    'bg-violet-100 text-violet-700',
          LOT:   'bg-amber-100 text-amber-700',
          MULTI: 'bg-slate-100 text-slate-500',
        };

        return (
          <div className="card overflow-hidden p-0">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3 justify-between px-5 pt-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sky-600 text-[20px]">price_change</span>
                <p className="section-title">Process Rates (Party-Specific)</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  configuredCount === allProcesses.length ? 'bg-emerald-100 text-emerald-700'
                  : configuredCount > 0 ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-500'
                }`}>
                  {configuredCount} / {allProcesses.length} configured
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!editingRates ? (
                  isAdmin && (
                    <button
                      type="button"
                      onClick={startEditRates}
                      className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 border border-sky-200 hover:border-sky-400 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span> Edit Rates
                    </button>
                  )
                ) : (
                  <div className="flex gap-2">
                    <button type="button" onClick={cancelEditRates} className="btn-ghost text-xs">Cancel</button>
                    <button
                      type="button"
                      onClick={saveRates}
                      disabled={savingRates}
                      className="flex items-center gap-1 text-xs btn-primary py-1.5 px-3"
                    >
                      {savingRates
                        ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Saving…</>
                        : <><span className="material-symbols-outlined text-sm">save</span> Save</>}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Search + filter toolbar */}
            <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 bg-slate-50/40">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[15px]">search</span>
                <input
                  type="text"
                  value={ratesSearch}
                  onChange={e => setRatesSearch(e.target.value)}
                  placeholder="Search process…"
                  className="form-input py-1 text-xs pl-7 w-44"
                />
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showOnlyConfigured}
                  onChange={e => setShowOnlyConfigured(e.target.checked)}
                  className="rounded"
                />
                Show only configured
              </label>
              {(ratesSearch || showOnlyConfigured) && (
                <span className="text-xs text-slate-400">{filteredProcesses.length} shown</span>
              )}
            </div>

            {/* Rates table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                    <th className="th w-48">Process</th>
                    <th className="th">Rate/Kg (₹)</th>
                    <th className="th">Rate/Pc (₹)</th>
                    <th className="th">Lot Charge (₹)</th>
                    {!editingRates
                      ? <th className="th text-slate-400">Global Default</th>
                      : <th className="th w-8"></th>
                    }
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProcesses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-slate-400 text-xs">
                        No processes match the filter.
                      </td>
                    </tr>
                  ) : filteredProcesses.map(pt => {
                    const saved = processRates.find(r => r.processTypeId === pt.id);
                    const isConfigured = saved && (saved.pricePerKg != null || saved.pricePerPc != null || saved.lotPrice != null);
                    const billingType = getBillingType(pt);

                    const globalParts = [];
                    if (pt.pricePerKg != null) globalParts.push(`₹${Number(pt.pricePerKg).toFixed(0)}/kg`);
                    if (pt.pricePerPc != null) globalParts.push(`₹${Number(pt.pricePerPc).toFixed(0)}/pc`);
                    if (pt.lotPrice  != null) globalParts.push(`₹${Number(pt.lotPrice).toFixed(0)} lot`);
                    const globalStr = globalParts.join(' · ') || '—';

                    const hasEditVal = ratesMap[pt.id] && (
                      ratesMap[pt.id].pricePerKg !== '' ||
                      ratesMap[pt.id].pricePerPc !== '' ||
                      ratesMap[pt.id].lotPrice   !== ''
                    );

                    return (
                      <tr key={pt.id} className={`tr ${!isConfigured && !editingRates ? 'opacity-50' : ''}`}>
                        {/* Process name + billing type badge */}
                        <td className="td font-medium text-slate-700">
                          <span>{pt.name}</span>
                          {billingType && (
                            <span className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${BILLING_BADGE[billingType]}`}>
                              {billingType}
                            </span>
                          )}
                        </td>

                        {editingRates ? (
                          <>
                            <td className="td">
                              <input
                                type="number" step="0.01" min="0"
                                value={ratesMap[pt.id]?.pricePerKg ?? ''}
                                onChange={e => setRate(pt.id, 'pricePerKg', e.target.value)}
                                className="form-input py-1 text-xs w-24"
                                placeholder={pt.pricePerKg != null ? `${Number(pt.pricePerKg).toFixed(2)} (global)` : '—'}
                              />
                            </td>
                            <td className="td">
                              <input
                                type="number" step="0.01" min="0"
                                value={ratesMap[pt.id]?.pricePerPc ?? ''}
                                onChange={e => setRate(pt.id, 'pricePerPc', e.target.value)}
                                className="form-input py-1 text-xs w-24"
                                placeholder={pt.pricePerPc != null ? `${Number(pt.pricePerPc).toFixed(2)} (global)` : '—'}
                              />
                            </td>
                            <td className="td">
                              <input
                                type="number" step="0.01" min="0"
                                value={ratesMap[pt.id]?.lotPrice ?? ''}
                                onChange={e => setRate(pt.id, 'lotPrice', e.target.value)}
                                className="form-input py-1 text-xs w-24"
                                placeholder={pt.lotPrice != null ? `${Number(pt.lotPrice).toFixed(2)} (global)` : '—'}
                              />
                            </td>
                            <td className="td text-center">
                              {hasEditVal && (
                                <button
                                  type="button"
                                  onClick={() => resetToGlobal(pt.id)}
                                  title="Reset to global rate"
                                  className="text-rose-400 hover:text-rose-600 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">restart_alt</span>
                                </button>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="td font-mono">
                              {saved?.pricePerKg != null
                                ? <span className="text-sky-700 font-semibold">₹{Number(saved.pricePerKg).toFixed(2)}</span>
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="td font-mono">
                              {saved?.pricePerPc != null
                                ? <span className="text-sky-700 font-semibold">₹{Number(saved.pricePerPc).toFixed(2)}</span>
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="td font-mono">
                              {saved?.lotPrice != null
                                ? <span className="text-sky-700 font-semibold">₹{Number(saved.lotPrice).toFixed(2)}</span>
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="td text-slate-400 text-[10px]">{globalStr}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
              <p className="text-[10px] text-slate-400">
                Party-specific rates apply during inward entry and invoicing. Leave blank to use global rate.
                {!isAdmin && <span className="ml-1 text-amber-600 font-semibold">Read-only — contact Admin to change rates.</span>}
              </p>
            </div>
          </div>
        );
      })()}

      <div className="card overflow-hidden p-0">
        <p className="section-title px-5 pt-5 pb-2">Job cards</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500">
                <th className="th">No.</th>
                <th className="th">Part</th>
                <th className="th">Mode</th>
                <th className="th">Status</th>
                <th className="th">Qty</th>
                <th className="th">Received</th>
              </tr>
            </thead>
            <tbody>
              {jobCards.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No job cards linked.</td></tr>
              ) : pagedJobCards.map((jc) => (
                <tr key={jc.id} className="tr">
                  <td className="td">
                    <Link className="font-semibold text-sky-600 hover:underline" to={`/jobcards/${jc.id}`}>{jc.jobCardNo}</Link>
                  </td>
                  <td className="td text-xs">{jc.part?.partNo || '—'}{jc.part?.description ? ` · ${jc.part.description}` : ''}</td>
                  <td className="td text-xs">{jc.operationMode || '—'}</td>
                  <td className="td text-xs">{jc.status?.replace(/_/g, ' ')}</td>
                  <td className="td">{jc.quantity}</td>
                  <td className="td text-xs">{formatDate(jc.receivedDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <MiniPagination page={jobCardsPage} setPage={setJobCardsPage} total={jobCards.length} />
      </div>

      <div className="card overflow-hidden p-0">
        <p className="section-title px-5 pt-5 pb-2">Tax invoices (this party as buyer)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500">
                <th className="th">Invoice</th>
                <th className="th">Date</th>
                <th className="th">Amount</th>
                <th className="th">Payment</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No invoices.</td></tr>
              ) : pagedInvoices.map((inv) => (
                <tr key={inv.id} className="tr">
                  <td className="td">
                    <Link className="font-semibold text-sky-600 hover:underline" to={`/invoices/${inv.id}`}>{inv.invoiceNo}</Link>
                  </td>
                  <td className="td text-xs">{formatDate(inv.invoiceDate)}</td>
                  <td className="td">{formatCurrency(inv.grandTotal)}</td>
                  <td className="td text-xs">{inv.paymentStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <MiniPagination page={invoicesPage} setPage={setInvoicesPage} total={invoices.length} />
      </div>

      <div className="card overflow-hidden p-0">
        <p className="section-title px-5 pt-5 pb-2">Test certificates</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500">
                <th className="th">Cert</th>
                <th className="th">Job card</th>
                <th className="th">Issue date</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {certificates.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No certificates.</td></tr>
              ) : pagedCerts.map((c) => (
                <tr key={c.id} className="tr">
                  <td className="td">
                    <Link className="font-semibold text-sky-600 hover:underline" to={`/quality/certificates/${c.id}`}>
                      {c.certNo}
                    </Link>
                  </td>
                  <td className="td text-xs">{c.jobCard?.jobCardNo || '—'}</td>
                  <td className="td text-xs">{formatDate(c.issueDate)}</td>
                  <td className="td text-xs">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <MiniPagination page={certsPage} setPage={setCertsPage} total={certificates.length} />
      </div>

      {(jobworkAsFromParty.length + jobworkAsToParty.length + dispatchToParty.length + dispatchFromParty.length) > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {jobworkAsFromParty.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-bold text-slate-600 mb-2">Jobwork (party = sender)</p>
              <ul className="text-sm space-y-1">
                {pagedJobworkFrom.map((ch) => (
                  <li key={ch.id}>
                    <Link className="text-sky-600 hover:underline" to={`/jobwork/${ch.id}`}>{ch.challanNo}</Link>
                    <span className="text-slate-400 text-xs"> → {ch.toParty?.name}</span>
                  </li>
                ))}
              </ul>
              <MiniPagination page={jobworkFromPage} setPage={setJobworkFromPage} total={jobworkAsFromParty.length} />
            </div>
          )}
          {jobworkAsToParty.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-bold text-slate-600 mb-2">Jobwork (party = receiver / processor)</p>
              <ul className="text-sm space-y-1">
                {pagedJobworkTo.map((ch) => (
                  <li key={ch.id}>
                    <span className="text-slate-400 text-xs">{ch.fromParty?.name} → </span>
                    <Link className="text-sky-600 hover:underline" to={`/jobwork/${ch.id}`}>{ch.challanNo}</Link>
                  </li>
                ))}
              </ul>
              <MiniPagination page={jobworkToPage} setPage={setJobworkToPage} total={jobworkAsToParty.length} />
            </div>
          )}
          {dispatchToParty.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-bold text-slate-600 mb-2">Dispatch (delivered to party)</p>
              <ul className="text-sm space-y-1">
                {pagedDispatchTo.map((d) => (
                  <li key={d.id}>
                    <Link className="text-sky-600 hover:underline" to={`/dispatch/${d.id}`}>{d.challanNo}</Link>
                    <span className="text-slate-400 text-xs"> {formatDate(d.challanDate)}</span>
                  </li>
                ))}
              </ul>
              <MiniPagination page={dispatchToPage} setPage={setDispatchToPage} total={dispatchToParty.length} />
            </div>
          )}
          {dispatchFromParty.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-bold text-slate-600 mb-2">Dispatch (sent from party)</p>
              <ul className="text-sm space-y-1">
                {pagedDispatchFrom.map((d) => (
                  <li key={d.id}>
                    <Link className="text-sky-600 hover:underline" to={`/dispatch/${d.id}`}>{d.challanNo}</Link>
                  </li>
                ))}
              </ul>
              <MiniPagination page={dispatchFromPage} setPage={setDispatchFromPage} total={dispatchFromParty.length} />
            </div>
          )}
        </div>
      )}

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
