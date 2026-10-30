import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Pencil, Printer, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import { formatDate, formatCurrency } from '../../utils/formatters';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_VARIANT = {
  DRAFT:    'neutral',
  SENT:     'info',
  ACCEPTED: 'success',
  REJECTED: 'error',
  EXPIRED:  'warning',
};
const UNIT_LABEL = { KGS: '/ Kg', PCS: '/ Pc', LOT: '(Lot)' };

const NEXT_STATUSES = {
  DRAFT: ['SENT'],
  SENT:  ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['EXPIRED'],
  REJECTED: [],
  EXPIRED: [],
};

const Def = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
    <div className="text-sm font-semibold text-slate-800 break-words">{children}</div>
  </div>
);

export default function CustomerQuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [q, setQ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const load = () => {
    setLoading(true);
    api.get(`/customer-quotes/${id}`)
      .then(r => setQ(r.data.data))
      .catch(() => toast.error('Failed to load quote.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const updateStatus = (status) => {
    setConfirmDialog({
      title: `Change status to ${status}?`,
      message: `This quote's status will be updated to ${status}.`,
      confirmLabel: `Mark ${status}`,
      variant: 'primary',
      onConfirm: async () => {
        setUpdatingStatus(true);
        try {
          await api.patch(`/customer-quotes/${id}/status`, { status });
          toast.success(`Status → ${status}`);
          load();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed.');
        } finally {
          setUpdatingStatus(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleDelete = () => {
    const isDraft = q?.status === 'DRAFT';
    setConfirmDialog({
      title: isDraft ? 'Delete draft quote?' : `Delete ${q?.status} quote?`,
      message: isDraft
        ? 'This will permanently delete this draft quote.'
        : `${q?.quoteNo} is ${q?.status} — the customer has already been shown this quote. `
          + 'Deleting it removes the record of what was offered. This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setDeleting(true);
        try {
          await api.delete(`/customer-quotes/${id}`);
          toast.success('Quote deleted.');
          navigate('/customer-quotes');
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed.');
        } finally {
          setDeleting(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3.5 w-64" />
        </div>
      </div>
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
  if (!q) return <div className="p-8 text-center text-slate-500">Quote not found.</div>;

  const nextStatuses = NEXT_STATUSES[q.status] || [];

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <Button type="button" variant="ghost" size="icon-sm"
            onClick={() => navigate('/customer-quotes')}
            title="Back to quotations" aria-label="Back to quotations"
            className="text-slate-400 hover:text-sky-700 border border-slate-200 bg-white shrink-0 mt-0.5">
            <ArrowLeft />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title font-mono">{q.quoteNo}</h1>
              <Badge variant={STATUS_VARIANT[q.status] || 'neutral'} className="px-2 py-0.5 text-[10px]">
                {q.status}
              </Badge>
            </div>
            <p className="page-subtitle">Customer Quotation · Created by {q.createdBy?.name} · {formatDate(q.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {nextStatuses.map(s => (
            <Button key={s} type="button" variant="outline" size="sm"
              onClick={() => updateStatus(s)} disabled={updatingStatus}>
              Mark {s}
            </Button>
          ))}
          {q.status === 'DRAFT' && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/customer-quotes/${id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to={`/customer-quotes/${id}/print`} target="_blank">
              <Printer /> Print
            </Link>
          </Button>
          {(q.status === 'DRAFT' || isAdmin) && (
            <Button type="button" variant="ghost" size="icon-sm"
              onClick={handleDelete}
              disabled={deleting}
              title={q.status === 'DRAFT' ? 'Delete quote' : `Delete ${q.status} quote (admin only)`}
              aria-label="Delete quote"
              className="text-rose-400 hover:text-rose-600 hover:bg-rose-50">
              <Trash2 />
            </Button>
          )}
        </div>
      </div>

      {/* Customer + Dates */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Def label="Customer">{q.customer?.name}</Def>
            <Def label="Kind Attn">{q.kindAttn ? `Mr. ${q.kindAttn}` : '—'}</Def>
            <Def label="GSTIN"><span className="font-mono text-slate-600 font-normal">{q.customer?.gstin || '—'}</span></Def>
            <Def label="Quote Date">{formatDate(q.quoteDate)}</Def>
            <Def label="Valid Until">{q.validUntil ? formatDate(q.validUntil) : '—'}</Def>
          </div>
          {q.paymentTerms && <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100"><strong>Payment Terms:</strong> {q.paymentTerms}</p>}
          {q.notes && <p className="text-xs text-slate-500 mt-2"><strong>Notes:</strong> {q.notes}</p>}
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <div className="table-responsive">
          <table className="w-full text-left min-w-[520px]">
            <thead>
              <tr>
                <th className="th">#</th>
                <th className="th">Description / Part Name</th>
                <th className="th">Process</th>
                <th className="th">Material</th>
                <th className="th text-right">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {q.items.map((item, i) => (
                <tr key={item.id} className="tr">
                  <td className="td text-slate-400 font-mono">{i+1}</td>
                  <td className="td font-medium text-slate-800">{item.partName}</td>
                  <td className="td text-slate-600">{item.processType?.name || '—'}</td>
                  <td className="td text-slate-600">{item.material || '—'}</td>
                  <td className="td text-right font-mono font-bold text-slate-800 tabular-nums">{+item.rate > 0 ? `₹${formatCurrency(item.rate)} ${UNIT_LABEL[item.unit] || UNIT_LABEL.KGS}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
