import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import api from '../../utils/api';
import { toNum } from '../../utils/normalize';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

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
    <div className="page-stack w-full space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Party Process Rates</h1>
          <p className="page-subtitle">All parties × all processes — party-specific pricing matrix</p>
        </div>
        <Button variant="outline" asChild className="shrink-0">
          <Link to="/admin/parties">
            <ArrowLeft /> Parties
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-3 items-center">
            <Input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search party…"
              aria-label="Search party"
              className="h-9 min-h-0 text-xs w-56"
            />
            <div className="flex gap-1.5">
              {['ALL', 'CUSTOMER', 'VENDOR', 'BOTH'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    typeFilter === t
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400 ml-auto tabular-nums">
              {filteredParties.length} parties · {processes.length} processes
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1 text-xs text-slate-500">
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
        <div className="card p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-8 flex-1 rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-responsive">
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
                        <div className="text-slate-400 font-normal text-[10px] mt-0.5 tabular-nums">
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
                          aria-label={`Open detail for ${party.name}`}
                          className="text-slate-300 hover:text-sky-500 transition-colors ml-auto"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>

                    {/* Rate cells */}
                    {processes.map((proc, procIdx) => {
                      const key = `${party.id}:${proc.id}`;
                      const rate = rateMap[key];
                      const hasRate = rate && (rate.pricePerKg != null || rate.pricePerPc != null || rate.lotPrice != null);

                      return (
                        <td key={proc.id} className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => startEdit(party.id, proc, procIdx)}
                            className={`w-full rounded-lg px-2 py-1.5 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                              hasRate
                                ? 'bg-sky-50 hover:bg-sky-100'
                                : 'hover:bg-slate-100'
                            }`}
                            title={`Set ${proc.name} rate for ${party.name}`}
                            aria-label={`Set ${proc.name} rate for ${party.name}`}
                          >
                            {hasRate ? (
                              <div className="space-y-0.5 tabular-nums">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px] p-4 animate-backdrop-in" role="dialog" aria-modal="true">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-card-elevated border border-slate-200 animate-scale-in">
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Set Party Rate</div>
                  <span className="text-[10px] text-slate-400 tabular-nums">
                    {editing.procIndex + 1} / {processes.length}
                  </span>
                </div>
                <div className="text-lg font-bold text-slate-900 tracking-tight mt-1">{editing.processName}</div>
                <div className="text-sm text-sky-600 font-semibold">{editing.partyName}</div>
                {globalStr && (
                  <div className="mt-1.5 text-[10px] text-slate-400">
                    Global rate: <span className="font-semibold text-slate-600 tabular-nums">{globalStr}</span>
                  </div>
                )}
              </div>
              <div className="p-5 space-y-4">
                <FormField label="Rate / kg (₹)" htmlFor="rate-kg">
                  <Input
                    id="rate-kg"
                    type="number"
                    value={editing.pricePerKg}
                    onChange={e => setEditing(p => ({ ...p, pricePerKg: e.target.value }))}
                    className="text-right tabular-nums"
                    placeholder={globalRate?.pricePerKg != null ? `${Number(globalRate.pricePerKg).toFixed(2)} (global)` : 'Leave blank for global'}
                    min="0" step="0.01"
                    autoFocus
                  />
                </FormField>
                <FormField label="Rate / piece (₹)" htmlFor="rate-pc">
                  <Input
                    id="rate-pc"
                    type="number"
                    value={editing.pricePerPc}
                    onChange={e => setEditing(p => ({ ...p, pricePerPc: e.target.value }))}
                    className="text-right tabular-nums"
                    placeholder={globalRate?.pricePerPc != null ? `${Number(globalRate.pricePerPc).toFixed(2)} (global)` : 'Optional'}
                    min="0" step="0.01"
                  />
                </FormField>
                <FormField label="Lot Charge (₹)" htmlFor="rate-lot">
                  <Input
                    id="rate-lot"
                    type="number"
                    value={editing.lotPrice}
                    onChange={e => setEditing(p => ({ ...p, lotPrice: e.target.value }))}
                    className="text-right tabular-nums"
                    placeholder={globalRate?.lotPrice != null ? `${Number(globalRate.lotPrice).toFixed(2)} (global)` : 'Optional'}
                    min="0" step="0.01"
                    onKeyDown={e => {
                      if (e.key === 'Tab' && !e.shiftKey && !isLast) {
                        e.preventDefault();
                        saveEdit(true);
                      }
                    }}
                  />
                </FormField>
                <p className="text-xs text-slate-400">Leave all blank to remove this party's override — global rate will apply.</p>
              </div>
              <div className="p-4 border-t border-slate-100 flex gap-2">
                <Button
                  type="button"
                  onClick={() => saveEdit(false)}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                {!isLast && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => saveEdit(true)}
                    disabled={saving}
                    title="Save and edit next process (Tab)"
                  >
                    Next <ArrowRight />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
