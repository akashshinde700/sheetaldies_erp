import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { toNum } from '../../utils/normalize';

function fmt(val) {
  if (val == null || val === '') return null;
  return Number(val).toFixed(2);
}

export default function PartyRatesMatrix() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // { partyId, processTypeId, pricePerKg, pricePerPc, lotPrice }
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['party-rates-matrix'],
    queryFn: () => api.get('/parties/process-rates/matrix').then(r => r.data.data),
    staleTime: 30_000,
  });

  const parties   = data?.parties   || [];
  const processes = data?.processes || [];
  const rateMap   = data?.rateMap   || {};

  const filteredParties = parties.filter(p => {
    if (typeFilter !== 'ALL' && p.partyType !== typeFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const startEdit = (partyId, proc, procIndex) => {
    const key = `${partyId}:${proc.id}`;
    const existing = rateMap[key] || {};
    setEditing({
      partyId,
      procIndex: procIndex ?? processes.indexOf(proc),
      processTypeId: proc.id,
      processName: proc.name,
      partyName: parties.find(p => p.id === partyId)?.name || '',
      pricePerKg: existing.pricePerKg != null ? String(existing.pricePerKg) : '',
      pricePerPc: existing.pricePerPc != null ? String(existing.pricePerPc) : '',
      lotPrice:  existing.lotPrice  != null ? String(existing.lotPrice)  : '',
    });
  };

  const saveEdit = async (thenNext = false) => {
    if (!editing) return;
    const { partyId, procIndex } = editing;
    setSaving(true);
    try {
      const payload = [{
        processTypeId: editing.processTypeId,
        pricePerKg: editing.pricePerKg !== '' ? toNum(editing.pricePerKg) : null,
        pricePerPc: editing.pricePerPc !== '' ? toNum(editing.pricePerPc) : null,
        lotPrice:  editing.lotPrice  !== '' ? toNum(editing.lotPrice)  : null,
      }];
      await api.put(`/parties/${partyId}/process-rates`, payload);
      toast.success('Rate saved');
      qc.invalidateQueries({ queryKey: ['party-rates-matrix'] });
      if (thenNext && processes.length > 0) {
        const nextIdx = (procIndex + 1) % processes.length;
        startEdit(partyId, processes[nextIdx], nextIdx);
      } else {
        setEditing(null);
      }
    } catch {
      toast.error('Failed to save rate');
    } finally {
      setSaving(false);
    }
  };

  const TYPE_BADGE = {
    CUSTOMER: 'bg-sky-100 text-sky-700',
    VENDOR:   'bg-violet-100 text-violet-700',
    BOTH:     'bg-amber-100 text-amber-700',
  };

  return (
    <div className="page-stack w-full animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Party Process Rates</h2>
          <p className="text-xs text-slate-400 mt-1">All parties × all processes — party-specific pricing matrix</p>
        </div>
        <Link to="/admin/parties" className="btn-outline shrink-0">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Parties
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search party…"
          className="form-input w-56"
        />
        <div className="flex gap-1.5">
          {['ALL', 'CUSTOMER', 'VENDOR', 'BOTH'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                typeFilter === t
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 ml-auto">
          {filteredParties.length} parties · {processes.length} processes
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 px-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-sky-100 inline-block" />
          Party-specific rate set
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block" />
          Using global rate (click to override)
        </span>
      </div>

      {isLoading ? (
        <div className="card p-10 text-center text-slate-400">Loading matrix…</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: `${200 + processes.length * 110}px` }}>
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-4 py-3 text-left font-bold text-[11px] uppercase tracking-widest sticky left-0 bg-slate-800 z-10 min-w-[200px]">
                    Party Name
                  </th>
                  {processes.map(proc => (
                    <th key={proc.id} className="px-3 py-3 text-center font-bold text-[11px] uppercase tracking-widest min-w-[110px]">
                      <div>{proc.name}</div>
                      <div className="text-slate-400 font-normal text-[9px] mt-0.5 font-mono">{proc.code}</div>
                      {proc.pricePerKg != null && (
                        <div className="text-slate-400 font-normal text-[10px] mt-0.5">
                          ₹{Number(proc.pricePerKg).toFixed(0)}/kg
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParties.length === 0 ? (
                  <tr>
                    <td colSpan={processes.length + 1} className="px-4 py-8 text-center text-slate-400">
                      No parties found.
                    </td>
                  </tr>
                ) : filteredParties.map((party, idx) => (
                  <tr key={party.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    {/* Party name cell */}
                    <td className={`px-4 py-2.5 sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/admin/parties/${party.id}`}
                          className="font-semibold text-slate-800 hover:text-sky-600 hover:underline transition-colors"
                        >
                          {party.name}
                        </Link>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_BADGE[party.partyType]}`}>
                          {party.partyType}
                        </span>
                        <Link
                          to={`/admin/parties/${party.id}`}
                          title="Open party detail"
                          className="text-slate-300 hover:text-sky-500 transition-colors ml-auto"
                        >
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </Link>
                      </div>
                    </td>

                    {/* Rate cells */}
                    {processes.map((proc, procIdx) => {
                      const key = `${party.id}:${proc.id}`;
                      const rate = rateMap[key];
                      const hasRate = rate && (rate.pricePerKg != null || rate.pricePerPc != null || rate.lotPrice != null);

                      return (
                        <td key={proc.id} className="px-2 py-2 text-center">
                          <button
                            onClick={() => startEdit(party.id, proc, procIdx)}
                            className={`w-full rounded-lg px-2 py-1.5 transition-colors group ${
                              hasRate
                                ? 'bg-sky-50 hover:bg-sky-100'
                                : 'hover:bg-slate-100'
                            }`}
                            title={`Set ${proc.name} rate for ${party.name}`}
                          >
                            {hasRate ? (
                              <div className="space-y-0.5">
                                {rate.pricePerKg != null && (
                                  <div className="font-bold text-sky-700">₹{Number(rate.pricePerKg).toFixed(0)}<span className="text-[9px] font-normal">/kg</span></div>
                                )}
                                {rate.pricePerPc != null && (
                                  <div className="font-semibold text-violet-600 text-[10px]">₹{Number(rate.pricePerPc).toFixed(0)}/pc</div>
                                )}
                                {rate.lotPrice != null && (
                                  <div className="text-slate-400 text-[9px]">lot ₹{Number(rate.lotPrice).toFixed(0)}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 group-hover:text-slate-500 transition-colors text-lg leading-none">—</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (() => {
        const globalRate = processes.find(p => p.id === editing.processTypeId);
        const globalParts = [];
        if (globalRate?.pricePerKg != null) globalParts.push(`₹${Number(globalRate.pricePerKg).toFixed(2)}/kg`);
        if (globalRate?.pricePerPc != null) globalParts.push(`₹${Number(globalRate.pricePerPc).toFixed(2)}/pc`);
        if (globalRate?.lotPrice  != null) globalParts.push(`₹${Number(globalRate.lotPrice).toFixed(2)} lot`);
        const globalStr = globalParts.join(' · ');
        const isLast = editing.procIndex === processes.length - 1;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200">
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Set Party Rate</div>
                  <span className="text-[10px] text-slate-400">
                    {editing.procIndex + 1} / {processes.length}
                  </span>
                </div>
                <div className="text-lg font-extrabold text-slate-800 mt-1">{editing.processName}</div>
                <div className="text-sm text-sky-600 font-semibold">{editing.partyName}</div>
                {globalStr && (
                  <div className="mt-1.5 text-[10px] text-slate-400">
                    Global rate: <span className="font-semibold text-slate-600">{globalStr}</span>
                  </div>
                )}
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="form-label">Rate / kg (₹)</label>
                  <input
                    type="number"
                    value={editing.pricePerKg}
                    onChange={e => setEditing(p => ({ ...p, pricePerKg: e.target.value }))}
                    className="form-input"
                    placeholder={globalRate?.pricePerKg != null ? `${Number(globalRate.pricePerKg).toFixed(2)} (global)` : 'Leave blank for global'}
                    min="0" step="0.01"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="form-label">Rate / piece (₹)</label>
                  <input
                    type="number"
                    value={editing.pricePerPc}
                    onChange={e => setEditing(p => ({ ...p, pricePerPc: e.target.value }))}
                    className="form-input"
                    placeholder={globalRate?.pricePerPc != null ? `${Number(globalRate.pricePerPc).toFixed(2)} (global)` : 'Optional'}
                    min="0" step="0.01"
                  />
                </div>
                <div>
                  <label className="form-label">Lot Charge (₹)</label>
                  <input
                    type="number"
                    value={editing.lotPrice}
                    onChange={e => setEditing(p => ({ ...p, lotPrice: e.target.value }))}
                    className="form-input"
                    placeholder={globalRate?.lotPrice != null ? `${Number(globalRate.lotPrice).toFixed(2)} (global)` : 'Optional'}
                    min="0" step="0.01"
                    onKeyDown={e => {
                      if (e.key === 'Tab' && !e.shiftKey && !isLast) {
                        e.preventDefault();
                        saveEdit(true);
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-slate-400">Leave all blank to remove this party's override — global rate will apply.</p>
              </div>
              <div className="p-4 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => saveEdit(false)}
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                {!isLast && (
                  <button
                    onClick={() => saveEdit(true)}
                    disabled={saving}
                    className="btn-outline text-xs flex items-center gap-1"
                    title="Save and edit next process (Tab)"
                  >
                    Next <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                )}
                <button
                  onClick={() => setEditing(null)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
