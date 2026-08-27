import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Undo2, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Shared grid template — header, display row, edit row, and the total row
// must all use the exact same grid-template-columns (with an empty
// placeholder cell standing in for any column a given mode doesn't render)
// so columns never shift when toggling between view/edit. The checkbox lives
// inside the Description cell (as a tight flex row) rather than its own grid
// track, so this one template covers both the checkbox and no-checkbox cases.
//
// NOTE: the trailing action column is a FIXED width (not `auto`). Each row is
// its own independent CSS grid, so an `auto` last column resolved to a
// different width per row (0px in header/total, ~40px for the display "Edit"
// button, ~90px for the edit-mode "Save ✕" buttons). That made the remaining
// `fr` columns compute differently in every row, so the DESCRIPTION / DRAWING
// NO / QTY / WEIGHT / MATERIAL headers no longer lined up over their content.
// A fixed 108px track guarantees identical column widths across all rows.
const COLS = 'grid-cols-[minmax(180px,2.4fr)_minmax(110px,0.85fr)_minmax(60px,0.5fr)_minmax(90px,0.6fr)_minmax(110px,0.8fr)_96px]';

function ItemEditRow({ item, selected, onToggle, onSaved, showCheckbox = true, registerFlush }) {
  const [editing,   setEditing]   = useState(false);
  const [desc,      setDesc]      = useState(() => {
    let d = item.description || '';
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (item.processName) d = d.replace(new RegExp('\\s*[-–]\\s*' + esc(item.processName) + '\\s*$', 'i'), '').trim();
    if (item.material)    d = d.replace(new RegExp('\\s*[-–]\\s*' + esc(item.material)    + '\\s*$', 'i'), '').trim();
    return d;
  });
  const [qty,       setQty]       = useState(item.quantity  != null ? String(item.quantity) : '');
  const [weight,    setWeight]    = useState(item.weight     != null ? String(item.weight)  : '');
  const [material,  setMaterial]  = useState(item.material   || '');
  const [drawingNo, setDrawingNo] = useState(item.drawingNo  || '');
  const [saving,    setSaving]    = useState(false);

  const save = async ({ silent = false } = {}) => {
    setSaving(true);
    try {
      await api.patch(`/jobwork/items/${item.id}`, { description: desc, quantity: qty, weight, material, drawingNo });
      if (!silent) toast.success('Item updated');
      setEditing(false);
      onSaved?.();
      return true;
    } catch { toast.error('Failed to save item'); return false; }
    finally { setSaving(false); }
  };

  // Register a flush callback so the parent's main "Update" button can commit
  // this row's edits even if the user never clicked the row-level Save. When
  // the row isn't being edited the callback is a no-op.
  useEffect(() => {
    if (!registerFlush) return;
    return registerFlush(item.id, () => (editing ? save({ silent: true }) : Promise.resolve(true)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, desc, qty, weight, material, drawingNo]);

  const inp = 'w-full border border-slate-200 rounded px-1.5 py-1 text-xs font-mono bg-white focus:border-sky-400 outline-none';

  const dispDesc = (() => {
    let d = item.description || '';
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (item.processName) d = d.replace(new RegExp('\\s*[-–]\\s*' + esc(item.processName) + '\\s*$', 'i'), '').trim();
    if (item.material)    d = d.replace(new RegExp('\\s*[-–]\\s*' + esc(item.material)    + '\\s*$', 'i'), '').trim();
    return d || item.description || '—';
  })();

  if (editing) {
    return (
      <div className={`rounded-lg border-2 border-sky-300 bg-sky-50 px-3 py-2 ${selected ? 'opacity-60' : ''}`}>
        <div className={`grid ${COLS} gap-3 items-center text-xs`}>
          <input value={desc}      onChange={e => setDesc(e.target.value)}      className={inp} placeholder="Description" />
          <input value={drawingNo} onChange={e => setDrawingNo(e.target.value)} className={inp} placeholder="Drawing No" />
          <input value={qty}       onChange={e => setQty(e.target.value)}       className={`${inp} text-right`} placeholder="Qty" type="number" step="0.001" />
          <input value={weight}    onChange={e => setWeight(e.target.value)}    className={`${inp} text-right`} placeholder="Wt (kg)" type="number" step="0.001" />
          <input value={material}  onChange={e => setMaterial(e.target.value)}  className={`${inp} ml-2`} placeholder="Material" /> {/* ml-2 keeps input inset matching display row pl-2 */}
          <div className="flex items-center gap-1 justify-end">
            <button type="button" onClick={() => save()} disabled={saving} className="text-sky-600 hover:text-sky-800 font-bold text-xs px-2 py-1 rounded border border-sky-200 bg-white hover:bg-sky-50 whitespace-nowrap">
              {saving ? '…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded border border-slate-200 bg-white">✕</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid ${COLS} gap-3 items-center px-3 py-2 rounded-lg border transition-colors cursor-pointer
        ${selected
          ? 'bg-rose-50 border-rose-300 border-l-4 border-l-rose-500'
          : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
        }`}
      onClick={() => onToggle(item.id)}
    >
      <span className="min-w-0 flex items-center gap-1.5">
        {showCheckbox && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(item.id)}
            onClick={e => e.stopPropagation()}
            className="w-3.5 h-3.5 shrink-0 accent-rose-500 cursor-pointer"
          />
        )}
        <span className="min-w-0 text-xs font-medium text-slate-800 truncate">{dispDesc}</span>
      </span>
      <span className="min-w-0 text-xs font-mono text-slate-500 truncate">{item.drawingNo || '—'}</span>
      <span className="text-xs text-right tabular-nums font-semibold text-slate-700">{item.quantity ?? '—'}</span>
      <span className="text-xs text-right tabular-nums text-amber-700 font-semibold">
        {item.weight ? Number(item.weight).toFixed(3) : '—'}
      </span>
      <span className="min-w-0 text-xs text-slate-600 truncate pl-2">{item.material || '—'}</span>
      <div className="flex items-center justify-end">
        <button
          onClick={e => { e.stopPropagation(); setEditing(true); }}
          className="text-slate-400 hover:text-sky-600 text-xs px-2 py-1 rounded border border-slate-200 hover:border-sky-300 bg-white whitespace-nowrap leading-none"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

const LinkedDataSection = forwardRef(function LinkedDataSection({ isEdit, cardData, id, onRefresh, onTotalWeightSaved }, ref) {
  // NOTE: all hooks must run before any early return so the hook order stays
  // stable across renders (cardData goes null → object on load). The
  // `if (!isEdit || !cardData) return null;` guard lives *after* every hook.
  const navigate     = useNavigate();
  // Registry of open-row flush callbacks keyed by item id. The parent form's
  // main "Update" button calls flushPendingEdits() (via ref) to persist any
  // item row still open in edit mode before saving the job card header.
  const flushRegistry = useRef(new Map());
  const registerFlush = (itemId, fn) => {
    flushRegistry.current.set(itemId, fn);
    return () => { flushRegistry.current.delete(itemId); };
  };
  useImperativeHandle(ref, () => ({
    // Returns { ok, totalWeight } where totalWeight is the value the parent's
    // main "Update" button should send in its job-card header PUT. This avoids
    // a race where the header PUT overwrites a freshly-flushed weight with the
    // parent form's stale (async, not-yet-updated) totalWeight value.
    flushPendingEdits: async () => {
      // 1. Commit any open item-row edits.
      const fns = [...flushRegistry.current.values()];
      const results = await Promise.all(fns.map(fn => fn()));
      // 2. Determine the current total-weight the user has entered here.
      const typed = totalWtInput?.trim();
      const validTyped = typed != null && typed !== '' && !Number.isNaN(Number(typed));
      const differs = validTyped && (savedWt == null || Number(typed) !== Number(savedWt));
      if (differs) {
        const ok = await saveTotalWeight(totalWtInput, { silent: true });
        results.push(ok);
      }
      // Hand back the effective weight so the header PUT stays consistent.
      const effectiveWeight = validTyped ? typed : (savedWt != null ? String(savedWt) : null);
      return { ok: results.every(Boolean), totalWeight: effectiveWeight };
    },
  }));
  const [deleting,   setDeleting]   = useState(false);
  const [removing,   setRemoving]   = useState(false);
  const [selected,   setSelected]   = useState(new Set());
  // cardData may be null on the first render (before the job card loads), so
  // these initializers/effects must guard against it — the early return that
  // bails out when cardData is missing lives *below* all hooks.
  const [totalWtInput, setTotalWtInput] = useState(() => cardData?.totalWeight != null ? String(Number(cardData.totalWeight)) : '');
  const [savingWt,   setSavingWt]   = useState(false);
  const [savedWt,    setSavedWt]    = useState(cardData?.totalWeight != null ? Number(cardData.totalWeight) : null);
  const { isManager } = useAuth();
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    const weight = cardData?.totalWeight != null ? Number(cardData.totalWeight) : null;
    setTotalWtInput(weight != null ? String(weight) : '');
    setSavedWt(weight);
  }, [cardData?.totalWeight]);

  // All hooks have run above; safe to bail out now.
  if (!isEdit || !cardData) return null;

  const saveTotalWeight = async (val, { silent = false } = {}) => {
    if (val === undefined || val === null || val === '') {
      if (!silent) toast.error('Enter a weight value first');
      return false;
    }
    setSavingWt(true);
    try {
      const res = await api.put(`/jobcards/${id}`, { totalWeight: val });
      const saved = res.data?.data?.totalWeight;
      const savedWeight = saved != null ? Number(saved) : Number(val);
      setSavedWt(savedWeight);
      setTotalWtInput(String(savedWeight));
      // Sync the just-saved weight back into the parent form so the main
      // "Update" button (which submits the whole form) doesn't overwrite it
      // with a stale/empty value and wipe it in the DB.
      onTotalWeightSaved?.(savedWeight);
      if (!silent) toast.success(`Total weight saved: ${savedWeight.toFixed(3)} kg`);
      onRefresh?.();
      return true;
    } catch (err) {
      if (!silent) toast.error(err?.message || 'Failed to save weight');
      return false;
    }
    finally { setSavingWt(false); }
  };

  const refresh = () => {
    setSelected(new Set());
    onRefresh?.();
  };

  const handleDelete = () => {
    setConfirmDialog({
      title: 'Delete job card?',
      message: 'Delete this job card permanently? This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setDeleting(true);
        try {
          await api.delete(`/jobcards/${id}`);
          toast.success('Job card deleted');
          navigate('/jobcards');
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to delete');
        } finally { setDeleting(false); setConfirmDialog(null); }
      },
    });
  };

  const handleRemoveItems = () => {
    if (selected.size === 0) return;
    const count = selected.size;
    setConfirmDialog({
      title: 'Remove items from job card?',
      message: `Remove ${count} item${count > 1 ? 's' : ''} from this job card? They will return to Pending on the original Inward.`,
      confirmLabel: 'Remove',
      variant: 'danger',
      onConfirm: async () => {
        setRemoving(true);
        try {
          await api.post(`/jobwork/jobcards/${id}/remove-items`, { itemIds: [...selected] });
          toast.success(`${count} item${count > 1 ? 's' : ''} returned to Inward (Pending)`);
          refresh();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to remove items');
        } finally { setRemoving(false); setConfirmDialog(null); }
      },
    });
  };

  const toggleItem  = (itemId) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
    return next;
  });

  const toggleAll = (items) => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map(i => i.id)));
  };

  const linkedItems = cardData.challanItemLinks || [];

  // Get the inward link for context. challanItemLinks reflects each item's
  // actual current challan assignment; cardData.challans[0] is a direct
  // relation that can point to a stale/wrong challan, so check it last.
  const inwardNo = cardData.challanItemLinks?.[0]?.challan?.inwardNo
    || cardData.challans?.[0]?.inwardNo
    || null;

  return (
    <div className="space-y-4 mt-5">

      {/* ── Delete button (manager/admin) ── */}
      {isManager && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            loading={deleting}
            className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700"
          >
            {!deleting && <Trash2 />}
            {deleting ? 'Deleting…' : 'Delete Job Card'}
          </Button>
        </div>
      )}

      {/* ── Items with Remove capability ── */}
      {linkedItems.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 gap-3 flex-wrap">
            <div className="space-y-1 min-w-0">
              <CardTitle>
                Linked Items ({linkedItems.length})
                {inwardNo && <span className="ml-2 text-xs font-semibold text-sky-500">from {inwardNo}</span>}
              </CardTitle>
              {cardData.weightSummary?.inwardTotalWeight > 0 && (
                <CardDescription>
                  Inward Total Weight:
                  <span className="ml-1 font-bold text-amber-700 tabular-nums">
                    {Number(cardData.weightSummary.inwardTotalWeight).toFixed(3)} kg
                  </span>
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <>
                  <span className="text-[11px] text-rose-600 font-bold whitespace-nowrap">{selected.size} selected</span>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleRemoveItems}
                    disabled={removing}
                    loading={removing}
                  >
                    {!removing && <Undo2 />}
                    {removing ? 'Removing…' : 'Remove from Job Card'}
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => toggleAll(linkedItems)}
              >
                {selected.size === linkedItems.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
          {selected.size > 0 && (
            <div className="mb-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
              Selected items will be removed from this Job Card and returned to <span className="font-bold">Pending</span> status on the original Inward{inwardNo ? ` (${inwardNo})` : ''}.
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/70">
            <div className="min-w-[820px]">
              <div className={`grid ${COLS} gap-3 px-3 py-3 text-[10px] font-semibold uppercase text-slate-400`}>
                <span>Description</span><span>Drawing No</span>
                <span className="text-right">Qty</span><span className="text-right">Weight (kg)</span>
                <span className="pl-2">Material</span><span></span>
              </div>
              <div className="space-y-1.5 px-3 pb-3">
                {linkedItems.map(item => (
                  <ItemEditRow
                    key={item.id}
                    item={item}
                    selected={selected.has(item.id)}
                    onToggle={toggleItem}
                    onSaved={refresh}
                    registerFlush={registerFlush}
                    showCheckbox
                  />
                ))}
              </div>
              {(() => {
                const totalQty = linkedItems.reduce((s, it) => s + Number(it.quantity || 0), 0);
                const totalWt  = linkedItems.reduce((s, it) => s + Number(it.weight || 0), 0);
                return (
                  <div className={`grid ${COLS} gap-3 px-3 py-2.5 border-t-2 border-slate-200 bg-slate-100/70 rounded-b-xl text-xs font-bold text-slate-700 items-center`}>
                    <span>Total</span>
                    <span></span>
                    <span className="text-right tabular-nums">{totalQty % 1 === 0 ? totalQty : totalQty.toFixed(3)}</span>
                    <span className="min-w-0 text-right tabular-nums">
                      {totalWt > 0 ? (
                        <span className="text-sky-700">{totalWt.toFixed(3)}</span>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5 min-w-0">
                          <div className="flex items-center justify-end gap-1 min-w-0">
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={totalWtInput}
                              onChange={e => setTotalWtInput(e.target.value)}
                              placeholder="0.000"
                              className="border border-sky-300 rounded px-1 py-0.5 text-[11px] font-mono text-right w-14 focus:outline-none focus:ring-1 focus:ring-sky-400 bg-sky-50"
                            />
                            <span className="text-slate-400 font-normal text-[10px]">kg</span>
                            <button
                              onClick={() => saveTotalWeight(totalWtInput)}
                              disabled={savingWt}
                              className="text-[10px] font-bold text-white bg-sky-600 hover:bg-sky-700 px-1.5 py-0.5 rounded disabled:opacity-50 whitespace-nowrap"
                            >
                              {savingWt ? '…' : 'Save'}
                            </button>
                          </div>
                          {savedWt != null && (
                            <span className="text-[9px] text-emerald-600 font-semibold whitespace-nowrap">✓ Saved: {savedWt.toFixed(3)} kg</span>
                          )}
                        </div>
                      )}
                    </span>
                    <span></span><span></span>
                  </div>
                );
              })()}
            </div>
          </div>
          </CardContent>
        </Card>
      )}

      {/* Legacy: items from challans (no direct link) */}
      {linkedItems.length === 0 && (() => {
        const allItems = cardData.challans?.flatMap(ch => ch.items || []) || [];
        if (!allItems.length) return null;
        return (
          <Card className="overflow-hidden">
            <CardHeader className="mb-3">
              <CardTitle>Items (from Inward) — {allItems.length} item{allItems.length !== 1 ? 's' : ''}</CardTitle>
            </CardHeader>
            <div className={`grid ${COLS} gap-3 px-5 mb-1 text-[10px] font-semibold uppercase text-slate-400`}>
              <span>Description</span><span>Drawing No</span><span className="text-right">Qty</span><span className="text-right">Weight (kg)</span><span className="pl-2">Material</span><span></span>
            </div>
            <div className="space-y-1.5 px-5">
              {allItems.map(item => (
                <ItemEditRow key={item.id} item={item} selected={false} onToggle={() => {}} onSaved={refresh} registerFlush={registerFlush} showCheckbox={false} />
              ))}
            </div>
            {allItems.length > 0 && (() => {
              const totalQty = allItems.reduce((s, it) => s + Number(it.quantity || 0), 0);
              const totalWt  = allItems.reduce((s, it) => s + Number(it.weight || 0), 0);
              return (
                <div className={`grid ${COLS} gap-3 px-5 py-2.5 mt-2 pb-5 border-t-2 border-slate-200 bg-slate-100/70 text-xs font-bold text-slate-700 items-center`}>
                  <span>Total</span>
                  <span></span>
                  <span className="text-right tabular-nums">{totalQty % 1 === 0 ? totalQty : totalQty.toFixed(3)}</span>
                  <span className="min-w-0 text-right tabular-nums">
                    {totalWt > 0 ? (
                      <span className="text-sky-700">{totalWt.toFixed(3)}</span>
                    ) : (
                      <div className="flex items-center justify-end gap-1 min-w-0">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={totalWtInput}
                          onChange={e => setTotalWtInput(e.target.value)}
                          onBlur={e => saveTotalWeight(e.target.value)}
                          placeholder="0.000"
                          className="border border-sky-300 rounded px-1 py-0.5 text-[11px] font-mono text-right w-14 focus:outline-none focus:ring-1 focus:ring-sky-400 bg-sky-50"
                        />
                        <span className="text-slate-400 font-normal text-[10px]">kg</span>
                        {savingWt && <span className="text-[9px] text-sky-400">saving…</span>}
                      </div>
                    )}
                  </span>
                  <span></span>
                  <span></span>
                </div>
              );
            })()}
          </Card>
        );
      })()}

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
});

export default LinkedDataSection;
