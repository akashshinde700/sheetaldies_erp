import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

const inp = 'border border-slate-200 rounded px-1.5 py-1 text-xs font-mono bg-white focus:border-indigo-400 outline-none w-full';

function ItemRow({ item, index, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    description: item.description || '',
    drawingNo:   item.drawingNo   || '',
    material:    item.material    || '',
    processName: item.processName || '',
    hrc:         item.hrc         || '',
    quantity:    item.quantity != null ? String(item.quantity) : '',
    weight:      item.weight    != null ? String(item.weight)  : '',
  });

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/jobwork/items/${item.id}`, form);
      toast.success('Item updated');
      setEditing(false);
      onSaved?.();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  if (editing) {
    return (
      <tr className="bg-indigo-50/40">
        <td className="px-2 py-1.5 text-slate-400 text-center font-mono">{index + 1}</td>
        <td className="px-1 py-1.5"><input value={form.description} onChange={e => set('description', e.target.value)} className={inp} placeholder="Description" /></td>
        <td className="px-1 py-1.5"><input value={form.drawingNo}   onChange={e => set('drawingNo',   e.target.value)} className={inp} placeholder="DRG No" /></td>
        <td className="px-1 py-1.5"><input value={form.material}    onChange={e => set('material',    e.target.value)} className={inp} placeholder="Material" /></td>
        <td className="px-1 py-1.5"><input value={form.processName} onChange={e => set('processName', e.target.value)} className={inp} placeholder="Process" /></td>
        <td className="px-1 py-1.5"><input value={form.hrc}         onChange={e => set('hrc',         e.target.value)} className={inp} placeholder="HRC" /></td>
        <td className="px-1 py-1.5"><input value={form.quantity}    onChange={e => set('quantity',    e.target.value)} className={inp} placeholder="Qty" type="number" step="1" /></td>
        <td className="px-1 py-1.5"><input value={form.weight}      onChange={e => set('weight',      e.target.value)} className={inp} placeholder="kg" type="number" step="0.001" /></td>
        <td className="px-2 py-1.5">
          {item.jobCard ? (
            <Link to={`/jobcards/${item.jobCard.id}`} className="text-indigo-600 hover:underline font-mono text-[11px] font-semibold">
              {item.jobCard.jobCardNo}
            </Link>
          ) : (
            <span className="text-amber-600 text-[10px] font-bold">Pending</span>
          )}
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap">
          <button onClick={save} disabled={saving} className="text-indigo-600 hover:text-indigo-800 font-bold text-xs px-2 py-1 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 mr-1">
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded border border-slate-200">✕</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-2 py-2 text-slate-400 text-center font-mono">{index + 1}</td>
      <td className="px-2 py-2 font-medium text-slate-800">{item.description || item.item?.description || '—'}</td>
      <td className="px-2 py-2 text-slate-600 font-mono">{item.drawingNo || '—'}</td>
      <td className="px-2 py-2 text-slate-600 font-semibold">{item.material || '—'}</td>
      <td className="px-2 py-2 text-slate-600">{item.processName || '—'}</td>
      <td className="px-2 py-2 text-slate-600">{item.hrc || '—'}</td>
      <td className="px-2 py-2 text-slate-600 text-right tabular-nums">{item.quantity}</td>
      <td className="px-2 py-2 text-slate-600 text-right tabular-nums">{item.weight ? Number(item.weight).toFixed(3) : '—'}</td>
      <td className="px-2 py-2">
        {item.jobCard ? (
          <Link to={`/jobcards/${item.jobCard.id}`} className="text-indigo-600 hover:underline font-mono text-[11px] font-semibold">
            {item.jobCard.jobCardNo}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-amber-600 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block"></span>
            Pending
          </span>
        )}
      </td>
      <td className="px-2 py-2">
        <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-600 text-xs px-2 py-1 rounded border border-slate-200 hover:border-indigo-300">
          Edit
        </button>
      </td>
    </tr>
  );
}

const STATUS_COLOR = {
  DRAFT:      'bg-slate-100 text-slate-600',
  SENT:       'bg-amber-100 text-amber-700',
  RECEIVED:   'bg-blue-100 text-blue-700',
  COMPLETED:  'bg-emerald-100 text-emerald-700',
  CANCELLED:  'bg-rose-100 text-rose-700',
};

const JC_STATUS_COLOR = {
  SENT_FOR_JOBWORK: 'bg-amber-100 text-amber-700',
  IN_PROGRESS:      'bg-blue-100 text-blue-700',
  COMPLETED:        'bg-emerald-100 text-emerald-700',
  ON_HOLD:          'bg-rose-100 text-rose-700',
};

const F = ({ label, children }) => (
  <div>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function JobworkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [ch, setCh] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingJC, setCreatingJC] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Delete this inward permanently?')) return;
    setDeleting(true);
    try {
      await api.delete(`/jobwork/${id}`);
      toast.success('Inward deleted');
      navigate('/jobwork');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally { setDeleting(false); }
  };
  const [selectedItems, setSelectedItems] = useState(new Set());

  const [part2, setPart2] = useState({
    status: '', receivedDate: '', natureOfProcess: '',
    qtyReturned: '', reworkQty: '', scrapQtyKg: '', scrapDetails: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/jobwork/${id}`)
      .then(r => {
        const d = r.data.data;
        setCh(d);
        setPart2({
          status:          d.status          || 'DRAFT',
          receivedDate:    d.receivedDate    ? d.receivedDate.split('T')[0] : '',
          natureOfProcess: d.natureOfProcess || '',
          qtyReturned:     d.qtyReturned     || '',
          reworkQty:       d.reworkQty       || '',
          scrapQtyKg:      d.scrapQtyKg      || '',
          scrapDetails:    d.scrapDetails    || '',
        });
        setSelectedItems(new Set());
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleStatusSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/jobwork/${id}/status`, part2);
      toast.success('Challan updated.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating.');
    } finally { setSaving(false); }
  };

  const pendingItems = ch?.pendingItems || [];
  const relatedJobCards = ch?.relatedJobCards || [];
  const allSelected = pendingItems.length > 0 && selectedItems.size === pendingItems.length;

  const toggleItem = (itemId) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(pendingItems.map(it => it.id)));
    }
  };

  const handleCreateJobCard = async () => {
    if (selectedItems.size === 0) { toast.error('Select at least one item.'); return; }
    setCreatingJC(true);
    try {
      const r = await api.post(`/jobwork/${id}/create-jobcards`, { itemIds: [...selectedItems] });
      toast.success(r.data.message || 'Job Card created!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating job card.');
    } finally { setCreatingJC(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        <span className="text-sm">Loading challan...</span>
      </div>
    </div>
  );
  if (!ch) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm text-slate-400">Challan not found.</p>
    </div>
  );

  return (
    <div className="page-stack w-full space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/jobwork"
          className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-800 font-headline font-mono">{ch.inwardNo || ch.challanNo}</h2>
            {ch.inwardNo && (
              <span className="text-xs text-slate-400 font-mono">({ch.challanNo})</span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Rule 45(1) CGST Rules, 2017 — Jobwork Challan</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/jobwork/${id}/edit`} className="btn-outline bg-white">
            <span className="material-symbols-outlined text-[20px]">edit</span>
            Edit
          </Link>
          <Link to={`/jobwork/${id}/print`} className="btn-outline bg-white">
            <span className="material-symbols-outlined text-[20px]">print</span>
            Print
          </Link>
          {isManager && (
            <button onClick={handleDelete} disabled={deleting} className="btn-outline bg-white text-rose-600 border-rose-200 hover:bg-rose-50">
              <span className="material-symbols-outlined text-[20px]">delete</span>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          <span className={`badge ${STATUS_COLOR[ch.status] || 'bg-slate-100 text-slate-600'}`}>{ch.status}</span>
        </div>
      </div>

      {/* Part 1: Challan Info */}
      <div className="card p-5">
        <p className="section-title border-b border-slate-100 pb-2 mb-4">Part 1 — Challan Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 text-sm">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Inward No</span>
            <span className="font-bold text-indigo-700 font-mono">{ch.inwardNo || '—'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Challan No</span>
            <span className="font-semibold text-slate-800 font-mono">{ch.challanNo}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Challan Date</span>
            <span className="font-semibold text-slate-800">{formatDate(ch.challanDate)}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">From (Customer)</span>
            <span className="font-semibold text-slate-800">{ch.fromParty?.name}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">To (Processor)</span>
            <span className="font-semibold text-slate-800">{ch.toParty?.name}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Vehicle No</span>
            <span className="font-semibold text-slate-800 font-mono">{ch.vehicleNo || '—'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Delivery Person</span>
            <span className="font-semibold text-slate-800">{ch.deliveryPerson || '—'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">PO No</span>
            <span className="font-semibold text-slate-800 font-mono">{ch.poNo || '—'}</span>
          </div>
          {ch.processingNotes && (
            <div className="col-span-3">
              <span className="text-xs text-slate-400 block mb-0.5">Processing Notes</span>
              <span className="font-semibold text-slate-800">{ch.processingNotes}</span>
            </div>
          )}
        </div>
      </div>

      {/* All Items Table */}
      <div className="card p-5">
        <p className="section-title border-b border-slate-100 pb-2 mb-4">Items Received</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                {['Sr.', 'Description', 'Drawing No', 'Material', 'Process', 'HRC', 'Qty', 'Weight (kg)', 'Job Card', ''].map(h => (
                  <th key={h} className="px-2 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {ch.items?.map((it, i) => (
                <ItemRow key={it.id} item={it} index={i} onSaved={load} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Job Cards Section ── */}
      <div className="card p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-indigo-500 text-[15px]">assignment</span>
          </div>
          <p className="section-title">Job Cards</p>
          {relatedJobCards.length > 0 && (
            <span className="text-[11px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold ml-1">
              {relatedJobCards.length} created
            </span>
          )}
          {pendingItems.length > 0 && (
            <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
              {pendingItems.length} pending item{pendingItems.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Related Job Cards */}
        {relatedJobCards.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Related Job Cards</p>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-2.5 font-bold text-[11px] uppercase tracking-wide text-slate-600">Job Card No</th>
                    <th className="text-left px-4 py-2.5 font-bold text-[11px] uppercase tracking-wide text-slate-600">Inward No</th>
                    <th className="text-center px-4 py-2.5 font-bold text-[11px] uppercase tracking-wide text-slate-600">Total Items</th>
                    <th className="text-left px-4 py-2.5 font-bold text-[11px] uppercase tracking-wide text-slate-600">Status</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {relatedJobCards.map(jc => (
                    <tr key={jc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-800">{jc.jobCardNo}</td>
                      <td className="px-4 py-2.5 font-mono text-indigo-600 font-semibold">{ch.inwardNo || ch.challanNo}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-slate-700 tabular-nums">{jc.itemCount}</td>
                      <td className="px-4 py-2.5">
                        <span className={`badge text-[10px] ${JC_STATUS_COLOR[jc.status] || 'bg-slate-100 text-slate-600'}`}>
                          {jc.status?.replace(/_/g, ' ') || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link to={`/jobcards/${jc.id}`} className="text-indigo-600 hover:underline font-semibold">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending Items — Select to Create Job Card */}
        {pendingItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Pending Items — Select to Create Job Card
              </p>
              <button type="button" onClick={toggleAll} className="text-xs text-indigo-600 hover:underline font-semibold">
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="rounded-xl border border-amber-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-amber-50 border-b border-amber-200">
                    <th className="px-3 py-2.5 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left px-3 py-2.5 font-bold text-[11px] uppercase tracking-wide text-amber-800">Description</th>
                    <th className="text-left px-3 py-2.5 font-bold text-[11px] uppercase tracking-wide text-amber-800">Material</th>
                    <th className="text-left px-3 py-2.5 font-bold text-[11px] uppercase tracking-wide text-amber-800">Process</th>
                    <th className="text-left px-3 py-2.5 font-bold text-[11px] uppercase tracking-wide text-amber-800">Drawing No</th>
                    <th className="text-right px-3 py-2.5 font-bold text-[11px] uppercase tracking-wide text-amber-800">Qty</th>
                    <th className="text-right px-3 py-2.5 font-bold text-[11px] uppercase tracking-wide text-amber-800">Weight (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {pendingItems.map(it => {
                    const checked = selectedItems.has(it.id);
                    return (
                      <tr
                        key={it.id}
                        onClick={() => toggleItem(it.id)}
                        className={`cursor-pointer transition-colors ${checked ? 'bg-indigo-50 hover:bg-indigo-100' : 'bg-white hover:bg-amber-50/50'}`}
                      >
                        <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleItem(it.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-800">{it.description || '—'}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-700">{it.material || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-600">{it.processName || '—'}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-500 text-[11px]">{it.drawingNo || '—'}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-indigo-700">{it.quantity ?? '—'}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-amber-700 font-semibold">
                          {it.weight ? Number(it.weight).toFixed(3) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {selectedItems.size > 0 && (
                  <tfoot className="bg-indigo-50 border-t border-indigo-200">
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-xs font-bold text-indigo-700">
                        {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-black text-indigo-700">
                        {pendingItems.filter(it => selectedItems.has(it.id)).reduce((s, it) => s + (Number(it.quantity) || 0), 0)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-black text-amber-700">
                        {pendingItems.filter(it => selectedItems.has(it.id)).reduce((s, it) => s + (Number(it.weight) || 0), 0).toFixed(3)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={handleCreateJobCard}
                disabled={creatingJC || selectedItems.size === 0}
                className="btn-primary"
              >
                {creatingJC ? (
                  <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Creating…</>
                ) : (
                  <><span className="material-symbols-outlined text-sm">add_card</span>
                    Create Job Card{selectedItems.size > 0 ? ` (${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''})` : ''}
                  </>
                )}
              </button>
              {selectedItems.size === 0 && (
                <p className="text-xs text-slate-400">Select items above to create a Job Card</p>
              )}
            </div>
          </div>
        )}

        {relatedJobCards.length === 0 && pendingItems.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">All items have been sent to Job Cards.</p>
        )}
      </div>

      {/* Part 2: Processor fills */}
      <div className="card p-5">
        <p className="section-title border-b border-slate-100 pb-2 mb-4">Part 2 — To Be Filled by Processor</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <F label="Status">
            <select value={part2.status} onChange={e => setPart2(p => ({ ...p, status: e.target.value }))} className="form-input">
              {['DRAFT', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </F>
          <F label="Received Date">
            <input type="date" value={part2.receivedDate} onChange={e => setPart2(p => ({ ...p, receivedDate: e.target.value }))} className="form-input" />
          </F>
          <F label="Qty Returned">
            <input type="number" value={part2.qtyReturned} onChange={e => setPart2(p => ({ ...p, qtyReturned: e.target.value }))} className="form-input" placeholder="0" />
          </F>
          <F label="Rework Qty">
            <input type="number" value={part2.reworkQty} onChange={e => setPart2(p => ({ ...p, reworkQty: e.target.value }))} className="form-input" placeholder="0" />
          </F>
          <F label="Nature of Process">
            <input value={part2.natureOfProcess} onChange={e => setPart2(p => ({ ...p, natureOfProcess: e.target.value }))} className="form-input" placeholder="Vacuum Hardening + Tempering" />
          </F>
          <F label="Scrap Qty (kg)">
            <input type="number" step="0.001" value={part2.scrapQtyKg} onChange={e => setPart2(p => ({ ...p, scrapQtyKg: e.target.value }))} className="form-input" placeholder="0.000" />
          </F>
          <F label="Scrap Details">
            <input value={part2.scrapDetails} onChange={e => setPart2(p => ({ ...p, scrapDetails: e.target.value }))} className="form-input" placeholder="Nature of scrap..." />
          </F>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={handleStatusSave} disabled={saving} className="btn-primary">
            {saving
              ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Saving...</>
              : <><span className="material-symbols-outlined text-sm">save</span> Update Challan</>
            }
          </button>
          {relatedJobCards.length > 0 && (
            <Link to={`/jobcards/${relatedJobCards[0].id}/inspection`}
              className="btn-ghost" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: 'white', border: 'none' }}>
              <span className="material-symbols-outlined text-sm">fact_check</span> Go to Inspection
            </Link>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="text-[11px] text-slate-400 text-right pb-2">
        Created by {ch.createdBy?.name} · {formatDate(ch.createdAt, true)}
      </p>
    </div>
  );
}
