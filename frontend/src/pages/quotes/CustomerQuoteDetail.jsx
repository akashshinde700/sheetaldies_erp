import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { formatDate, formatCurrency } from '../../utils/formatters';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
  DRAFT:    'bg-slate-100 text-slate-700 border-slate-200',
  SENT:     'bg-blue-100 text-blue-700 border-blue-200',
  ACCEPTED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-100 text-rose-700 border-rose-200',
  EXPIRED:  'bg-orange-100 text-orange-700 border-orange-200',
};
const UNIT_LABEL = { KGS: '/ Kg', PCS: '/ Pc', LOT: '(Lot)' };

const NEXT_STATUSES = {
  DRAFT: ['SENT'],
  SENT:  ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['EXPIRED'],
  REJECTED: [],
  EXPIRED: [],
};

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

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent" /></div>;
  if (!q) return <div className="p-8 text-center text-slate-500">Quote not found.</div>;

  const nextStatuses = NEXT_STATUSES[q.status] || [];

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/customer-quotes')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 font-mono">{q.quoteNo}</h2>
            <p className="text-xs text-slate-400">Customer Quotation · Created by {q.createdBy?.name} · {formatDate(q.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 text-xs font-bold rounded-full border ${STATUS_COLORS[q.status]}`}>{q.status}</span>
          {nextStatuses.map(s => (
            <button key={s} onClick={() => updateStatus(s)} disabled={updatingStatus}
              className="btn-outline text-xs disabled:opacity-50">
              Mark {s}
            </button>
          ))}
          {q.status === 'DRAFT' && (
            <Link to={`/customer-quotes/${id}/edit`} className="btn-outline text-xs">
              <span className="material-symbols-outlined text-sm">edit</span> Edit
            </Link>
          )}
          <Link to={`/customer-quotes/${id}/print`} target="_blank" className="btn-outline text-xs">
            <span className="material-symbols-outlined text-sm">print</span> Print
          </Link>
          {(q.status === 'DRAFT' || isAdmin) && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              title={q.status === 'DRAFT' ? 'Delete quote' : `Delete ${q.status} quote (admin only)`}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50">
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Customer + Dates */}
      <div className="card p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div><p className="form-label">Customer</p><p className="font-semibold text-slate-800">{q.customer?.name}</p></div>
          <div><p className="form-label">Kind Attn</p><p className="font-semibold text-slate-800">{q.kindAttn ? `Mr. ${q.kindAttn}` : '—'}</p></div>
          <div><p className="form-label">GSTIN</p><p className="font-mono text-slate-600">{q.customer?.gstin || '—'}</p></div>
          <div><p className="form-label">Quote Date</p><p className="font-semibold text-slate-800">{formatDate(q.quoteDate)}</p></div>
          <div><p className="form-label">Valid Until</p><p className="font-semibold text-slate-800">{q.validUntil ? formatDate(q.validUntil) : '—'}</p></div>
        </div>
        {q.paymentTerms && <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100"><strong>Payment Terms:</strong> {q.paymentTerms}</p>}
        {q.notes && <p className="text-xs text-slate-500 mt-2"><strong>Notes:</strong> {q.notes}</p>}
      </div>

      {/* Items Table */}
      <div className="card p-5">
        <p className="section-title mb-4">Line Items</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">#</th>
                <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">Description / Part Name</th>
                <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">Process</th>
                <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">Material</th>
                <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase text-[10px]">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {q.items.map((item, i) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 text-slate-400">{i+1}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-800">{item.partName}</td>
                  <td className="px-3 py-2.5 text-slate-600">{item.processType?.name || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{item.material || '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">{+item.rate > 0 ? `₹${formatCurrency(item.rate)} ${UNIT_LABEL[item.unit] || UNIT_LABEL.KGS}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
