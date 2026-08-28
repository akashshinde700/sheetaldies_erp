import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Eye, Pencil, Trash2, X, Users, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import ListSearchInput from '../../components/ListSearchInput';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const TYPE_BADGE = {
  CUSTOMER: 'bg-sky-100 text-sky-800',
  VENDOR:   'bg-violet-100 text-violet-800',
  BOTH:     'bg-emerald-100 text-emerald-800',
};

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

const SkeletonRow = () => (
  <tr>
    <td className="td"><Skeleton className="h-3.5 w-36" /></td>
    <td className="td hidden sm:table-cell"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td hidden md:table-cell"><Skeleton className="h-3.5 w-32" /></td>
    <td className="td"><Skeleton className="h-3.5 w-20" /></td>
    <td className="td"><Skeleton className="h-3.5 w-20 ml-auto" /></td>
  </tr>
);

export default function PartyList() {
  const { isManager } = useAuth();
  const PAGE_SIZE = 10;
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('ALL');
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = (searchTerm = '') => {
    setLoading(true);
    api.get('/parties', { params: { limit: 100, ...(searchTerm ? { search: searchTerm } : {}) } })
      .then(r => setParties(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [search, filter]);

  // Server-side search (covers name / party code / city / state / PIN across
  // every party, not just the first page held in memory). Runs on mount too.
  useEffect(() => {
    const term = search.trim();
    const t = setTimeout(() => load(term), term ? 300 : 0);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = parties.filter(p => {
    const q = search.toLowerCase();
    const matchType   = filter === 'ALL' || p.partyType === filter;
    const matchSearch = !q || p.name?.toLowerCase().includes(q)
      || p.partyCode?.toLowerCase().includes(q)
      || p.gstin?.toLowerCase().includes(q)
      || p.city?.toLowerCase().includes(q)
      || p.state?.toLowerCase().includes(q)
      || p.pinCode?.toLowerCase().includes(q);
    return matchType && matchSearch;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedParties = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/parties/${confirmDelete.id}`);
      toast.success('Party deleted.');
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting party.');
    } finally { setDeleting(false); }
  };

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Parties</h1>
          <p className="page-subtitle">{filtered.length > 0 ? `${filtered.length} of ${parties.length}` : 'Customers, Vendors & Both'}</p>
        </div>
        <Button asChild className="shrink-0">
          <Link to="/admin/parties/new"><Plus /> Add Party</Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
            <div className="space-y-1 flex-1 min-w-[220px]">
              <FilterLabel>Search</FilterLabel>
              <ListSearchInput
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, GSTIN, city..."
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <FilterLabel>Type</FilterLabel>
              <div className="flex gap-1.5">
                {['ALL', 'CUSTOMER', 'VENDOR', 'BOTH'].map(t => (
                  <button key={t} type="button" onClick={() => setFilter(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      filter === t
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-200'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-sky-300 hover:text-sky-600'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {(search || filter !== 'ALL') && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setFilter('ALL'); }}
                className="text-slate-500 hover:text-rose-600"
              >
                <X /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-left min-w-[560px]">
            <thead>
              <tr>
                <th className="th">Name</th>
                <th className="th">Phone</th>
                <th className="th hidden md:table-cell">Email</th>
                <th className="th">Type</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                        <Users className="h-5 w-5 text-sky-300" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {(search || filter !== 'ALL') ? 'No parties match your filters.' : 'No parties yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : pagedParties.map(p => (
                <tr key={p.id} className="tr">
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/parties/${p.id}`} className="text-sm font-bold text-slate-800 hover:text-sky-700 hover:underline">{p.name}</Link>
                      {p.partyCode && <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{p.partyCode}</span>}
                    </div>
                    {p.address && <div className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5">{p.address}</div>}
                  </td>
                  <td className="td text-xs text-slate-600 whitespace-nowrap">{p.phone || '—'}</td>
                  <td className="td text-xs text-slate-600 hidden md:table-cell">{p.email || '—'}</td>
                  <td className="td">
                    <Badge className={`px-2 py-0.5 text-[10px] ${TYPE_BADGE[p.partyType] || 'bg-slate-100 text-slate-600'}`}>{p.partyType}</Badge>
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon-sm" asChild
                        className="text-slate-400 hover:text-slate-700">
                        <Link to={`/admin/parties/${p.id}`} title="View" aria-label={`View party ${p.name}`}>
                          <Eye />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon-sm" asChild
                        title="Edit" aria-label={`Edit party ${p.name}`}
                        className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                        <Link to={`/admin/parties/${p.id}/edit`}>
                          <Pencil />
                        </Link>
                      </Button>
                      {isManager && (
                        <Button type="button" variant="ghost" size="icon-sm"
                          onClick={() => setConfirmDelete(p)}
                          title="Delete" aria-label={`Delete party ${p.name}`}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-500 tabular-nums">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Prev
              </Button>
              <span className="text-xs font-semibold text-slate-600 tabular-nums">{page} / {totalPages}</span>
              <Button type="button" variant="outline" size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm — portal to body avoids broken fixed positioning inside Layout's transformed main */}
      {confirmDelete &&
        createPortal(
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] animate-backdrop-in" onClick={() => setConfirmDelete(null)} aria-hidden />
            <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-card-elevated border border-slate-200 overflow-hidden animate-scale-in">
              <div className="px-6 py-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                    <Trash2 className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Delete Party?</h3>
                    <p className="text-xs text-slate-500 mt-0.5">This cannot be undone.</p>
                  </div>
                </div>
                <p className="text-sm text-slate-700 mb-1">
                  <span className="font-bold">{confirmDelete.name}</span>
                  {confirmDelete.partyCode && <span className="text-slate-400 font-mono text-xs ml-1">({confirmDelete.partyCode})</span>}
                </p>
                <p className="text-xs text-slate-500 mb-5">If this party has linked challans, invoices, or job cards the delete will fail.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
                  <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting} className="flex-1">
                    {deleting
                      ? <><Loader2 className="animate-spin" /> Deleting...</>
                      : <><Trash2 /> Delete</>
                    }
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
