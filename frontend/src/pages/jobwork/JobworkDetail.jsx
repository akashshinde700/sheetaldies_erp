import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Pencil, Printer, Trash2, Loader2, Scale, ClipboardList, SquarePlus,
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const stripDesc = (desc, mat, proc) => {
  let d = desc || '';
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (proc) d = d.replace(new RegExp('\\s*[-–]\\s*' + esc(proc) + '\\s*$', 'i'), '').trim();
  if (mat)  d = d.replace(new RegExp('\\s*[-–]\\s*' + esc(mat)  + '\\s*$', 'i'), '').trim();
  return d;
};

const PROD_STATUS_VARIANT = {
  COMPLETED: 'success',
  PARTIAL:   'warning',
  PENDING:   'neutral',
};

const STATUS_VARIANT = {
  DRAFT:      'neutral',
  SENT:       'warning',
  RECEIVED:   'info',
  COMPLETED:  'success',
  CANCELLED:  'error',
};

const JC_STATUS_VARIANT = {
  SENT_FOR_JOBWORK: 'warning',
  IN_PROGRESS:      'info',
  COMPLETED:        'success',
  ON_HOLD:          'error',
};

/* Definition-list style row: small uppercase label + value */
const Info = ({ label, className = '', children }) => (
  <div className={className}>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
    <div className="text-sm font-semibold text-slate-800">{children}</div>
  </div>
);

function ItemRow({ item, index, challanId }) {
  const prodStatus = item.itemStatus || 'PENDING';
  return (
    <tr className="tr group">
      <td className="td text-slate-400 text-center font-mono">{index + 1}</td>
      <td className="td font-medium text-slate-800">{stripDesc(item.description || item.item?.description, item.material, item.processName) || '—'}</td>
      <td className="td text-slate-600 font-mono">{item.drawingNo || '—'}</td>
      <td className="td text-slate-600 font-semibold">{item.material || '—'}</td>
      <td className="td text-slate-600">{item.processName || '—'}</td>
      <td className="td text-slate-600">{item.hrc || '—'}</td>
      <td className="td text-slate-700 text-right tabular-nums font-semibold">{item.quantity ?? '—'}</td>
      <td className="td text-slate-600 text-right tabular-nums">{item.weight ? Number(item.weight).toFixed(3) : '—'}</td>
      <td className="td text-right tabular-nums font-semibold text-emerald-700">
        {item.completedQty != null ? Number(item.completedQty).toFixed(3) : '0.000'}
      </td>
      <td className="td text-right tabular-nums font-semibold text-amber-700">
        {item.pendingQty != null ? Number(item.pendingQty).toFixed(3) : (item.quantity ?? '—')}
      </td>
      <td className="td">
        <Badge variant={PROD_STATUS_VARIANT[prodStatus]} className="px-1.5 py-0.5 text-[10px]">{prodStatus}</Badge>
      </td>
      <td className="td">
        {item.jobCard ? (
          <Link to={`/jobcards/${item.jobCard.id}`} className="text-sky-700 hover:underline font-mono text-[11px] font-semibold">
            {item.jobCard.jobCardNo}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block"></span>
            Pending
          </span>
        )}
      </td>
      <td className="td text-slate-400 text-[10px]">
        <Link to={`/jobwork/${challanId}/edit`} className="hover:text-sky-600 hover:underline">Edit in Challan</Link>
      </td>
    </tr>
  );
}

export default function JobworkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [ch, setCh] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingJC, setCreatingJC] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const handleDelete = () => {
    setConfirmDialog({
      title: 'Delete inward?',
      message: 'Delete this inward permanently? This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setDeleting(true);
        try {
          await api.delete(`/jobwork/${id}`);
          toast.success('Inward deleted');
          navigate('/jobwork');
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to delete');
        } finally { setDeleting(false); setConfirmDialog(null); }
      },
    });
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
      const r = await api.post(`/jobwork/jobcard-from-items`, { itemIds: [...selectedItems] });
      toast.success(r.data.message || 'Job Card created!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating job card.');
    } finally { setCreatingJC(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
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
      <div className="page-header">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Button variant="outline" size="icon" asChild className="rounded-xl shrink-0 text-slate-500 hover:text-slate-900">
            <Link to="/jobwork" aria-label="Back to jobwork list">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="page-title">{ch.inwardNo || ch.challanNo}</h1>
              <Badge variant={STATUS_VARIANT[ch.status] || 'neutral'}>{ch.status}</Badge>
            </div>
            <p className="page-subtitle">Rule 45(1) CGST Rules, 2017 — Jobwork Challan</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Most inwards are entered one after another, so the next one should
              be reachable from here without going back to the list first. */}
          <Button asChild>
            <Link to="/jobwork/inward-entry">
              <Plus /> New Inward
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/jobwork/${id}/edit`}>
              <Pencil /> Edit
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/jobwork/${id}/print`}>
              <Printer /> Print
            </Link>
          </Button>
          {isManager && (
            <Button type="button" variant="outline" onClick={handleDelete} disabled={deleting}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300">
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          )}
        </div>
      </div>

      {/* Part 1: Challan Info */}
      <Card>
        <CardHeader>
          <CardTitle>Part 1 — Challan Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
            <Info label="Inward No">
              <span className="font-bold text-sky-700 font-mono">{ch.inwardNo || '—'}</span>
            </Info>
            <Info label="Challan No">
              <span className="font-mono">{ch.challanNo}</span>
            </Info>
            <Info label="Challan Date">{formatDate(ch.challanDate)}</Info>
            <Info label="From (Customer)">{ch.fromParty?.name}</Info>
            <Info label="To (Processor)">{ch.toParty?.name}</Info>
            <Info label="Vehicle No">
              <span className="font-mono">{ch.vehicleNo || '—'}</span>
            </Info>
            <Info label="Delivery Person">{ch.deliveryPerson || '—'}</Info>
            <Info label="Issued By">{ch.issuedBy || '—'}</Info>
            <Info label="PO No">
              <span className="font-mono">{ch.poNo || '—'}</span>
            </Info>
            {ch.processingNotes && (
              <Info label="Processing Notes" className="sm:col-span-2 md:col-span-3">
                {ch.processingNotes}
              </Info>
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Items Table (read-only — edit/add/remove items from the Edit Challan page) */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Items Received</CardTitle>
            <CardDescription>{ch.items?.length || 0} item{(ch.items?.length || 0) !== 1 ? 's' : ''} on this challan</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/jobwork/${id}/edit`}>
              <Pencil /> Edit Items
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-responsive">
            <table className="w-full text-xs table-fixed" style={{ minWidth: '1400px' }}>
              <colgroup>
                <col style={{ width: '48px' }} />
                <col style={{ width: '220px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '64px' }} />
                <col style={{ width: '96px' }} />
                <col style={{ width: '96px' }} />
                <col style={{ width: '96px' }} />
                <col style={{ width: '96px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '72px' }} />
              </colgroup>
              <thead>
                <tr>
                  {['Sr.', 'Description', 'Drawing No', 'Material', 'Process', 'HRC', 'Assigned Qty', 'Weight (kg)', 'Completed', 'Pending', 'Status', 'Job Card', ''].map((h, hIdx) => (
                    <th key={`${h}-${hIdx}`} className="th whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {ch.items?.map((it, i) => (
                  <ItemRow key={it.id} item={it} index={i} challanId={id} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Weight Summary */}
      {ch.weightSummary && ch.weightSummary.inwardTotalWeight > 0 && (() => {
        const ws = ch.weightSummary;
        const pct = ws.consumptionPct ?? (ws.inwardTotalWeight > 0
          ? Math.min(100, Number(((ws.consumedWeight / ws.inwardTotalWeight) * 100).toFixed(1)))
          : 0);
        const fully = ws.fullyConsumed ?? (ws.remainingWeight <= 0 && ws.inwardTotalWeight > 0);
        return (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Scale className="h-4 w-4 text-amber-600" />
                </div>
                <CardTitle>Inward Weight Tracking</CardTitle>
              </div>
              {fully && (
                <Badge variant="success">Fully Consumed</Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Total Weight</p>
                  <p className="text-2xl font-extrabold text-slate-800 tabular-nums">
                    {Number(ws.inwardTotalWeight).toFixed(3)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">kg</p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">Consumed</p>
                  <p className="text-2xl font-extrabold text-amber-700 tabular-nums">
                    {Number(ws.consumedWeight).toFixed(3)}
                  </p>
                  <p className="text-xs text-amber-400 mt-0.5">kg used</p>
                </div>
                <div className={`rounded-xl border p-4 text-center ${fully ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${fully ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {fully ? 'Exhausted' : 'Remaining'}
                  </p>
                  <p className={`text-2xl font-extrabold tabular-nums ${fully ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {Number(ws.remainingWeight).toFixed(3)}
                  </p>
                  <p className={`text-xs mt-0.5 ${fully ? 'text-rose-400' : 'text-emerald-400'}`}>kg available</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span className="font-bold uppercase tracking-wider text-slate-400">Consumption</span>
                  <span className="font-bold tabular-nums">{pct}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* ── Job Cards Section ── */}
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
            <ClipboardList className="h-4 w-4 text-sky-500" />
          </div>
          <CardTitle>Job Cards</CardTitle>
          {relatedJobCards.length > 0 && (
            <Badge variant="info" className="ml-1">
              {relatedJobCards.length} created
            </Badge>
          )}
          {pendingItems.length > 0 && (
            <Badge variant="warning">
              {pendingItems.length} pending item{pendingItems.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Related Job Cards */}
          {relatedJobCards.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Related Job Cards</p>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="table-responsive">
                  <table className="w-full text-xs min-w-[560px]">
                    <thead>
                      <tr>
                        <th className="th">Job Card No</th>
                        <th className="th">Inward No</th>
                        <th className="th text-center">Items</th>
                        <th className="th text-right">Weight Used (kg)</th>
                        <th className="th">Status</th>
                        <th className="th"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50/80">
                      {relatedJobCards.map(jc => (
                        <tr key={jc.id} className="tr">
                          <td className="td font-mono font-bold text-slate-800">{jc.jobCardNo}</td>
                          <td className="td font-mono text-sky-700 font-semibold">{ch.inwardNo || ch.challanNo}</td>
                          <td className="td text-center font-bold text-slate-700 tabular-nums">{jc.itemCount}</td>
                          <td className="td text-right tabular-nums font-semibold text-amber-700">
                            {jc.totalWeight ? Number(jc.totalWeight).toFixed(3) : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="td">
                            <Badge variant={JC_STATUS_VARIANT[jc.status] || 'neutral'} className="px-1.5 py-0.5 text-[10px]">
                              {jc.status?.replace(/_/g, ' ') || '—'}
                            </Badge>
                          </td>
                          <td className="td text-right">
                            <Link to={`/jobcards/${jc.id}`} className="text-sky-700 hover:underline font-semibold">
                              View →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Pending Items — Select to Create Job Card */}
          {pendingItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Pending Items — Select to Create Job Card
                </p>
                <Button type="button" variant="link" size="sm" onClick={toggleAll} className="h-auto px-0">
                  {allSelected ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <div className="rounded-xl border border-amber-200 overflow-hidden">
                <div className="table-responsive">
                  <table className="w-full text-xs min-w-[640px]">
                    <thead>
                      <tr className="bg-amber-50 border-b border-amber-200">
                        <th className="px-3 py-2.5 w-10">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={toggleAll}
                            aria-label="Select all pending items"
                          />
                        </th>
                        <th className="text-left px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-amber-800">Description</th>
                        <th className="text-left px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-amber-800">Material</th>
                        <th className="text-left px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-amber-800">Process</th>
                        <th className="text-left px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-amber-800">Drawing No</th>
                        <th className="text-right px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-amber-800">Qty</th>
                        <th className="text-right px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-amber-800">Weight (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {pendingItems.map(it => {
                        const checked = selectedItems.has(it.id);
                        return (
                          <tr
                            key={it.id}
                            onClick={() => toggleItem(it.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleItem(it.id); } }}
                            tabIndex={0}
                            role="checkbox"
                            aria-checked={checked}
                            className={`cursor-pointer transition-colors border-l-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-300 ${checked ? 'bg-sky-50 hover:bg-sky-100 border-l-sky-500' : 'bg-white hover:bg-amber-50/50 border-l-transparent'}`}
                          >
                            <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleItem(it.id)}
                                aria-label={`Select item ${stripDesc(it.description, it.material, it.processName) || it.id}`}
                              />
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-800">{stripDesc(it.description, it.material, it.processName) || '—'}</td>
                            <td className="px-3 py-2.5 font-semibold text-slate-700">{it.material || '—'}</td>
                            <td className="px-3 py-2.5 text-slate-600">{it.processName || '—'}</td>
                            <td className="px-3 py-2.5 font-mono text-slate-500 text-[11px]">{it.drawingNo || '—'}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-sky-700">{it.quantity ?? '—'}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-amber-700 font-semibold">
                              {it.weight ? Number(it.weight).toFixed(3) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {selectedItems.size > 0 && (
                      <tfoot className="bg-sky-50 border-t border-sky-200">
                        <tr>
                          <td colSpan={5} className="px-3 py-2 text-xs font-bold text-sky-700">
                            {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-black text-sky-700">
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
              </div>

              <div className="flex items-center gap-3 mt-3">
                <Button
                  type="button"
                  onClick={handleCreateJobCard}
                  disabled={creatingJC || selectedItems.size === 0}
                >
                  {creatingJC ? (
                    <><Loader2 className="animate-spin" /> Creating…</>
                  ) : (
                    <><SquarePlus />
                      Create Job Card{selectedItems.size > 0 ? ` (${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''})` : ''}
                    </>
                  )}
                </Button>
                {selectedItems.size === 0 && (
                  <p className="text-xs text-slate-400">Select items above to create a Job Card</p>
                )}
              </div>
            </div>
          )}

          {relatedJobCards.length === 0 && pendingItems.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">All items have been sent to Job Cards.</p>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-[11px] text-slate-400 text-right pb-2">
        Created by {ch.createdBy?.name} · {formatDate(ch.createdAt, true)}
      </p>

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
