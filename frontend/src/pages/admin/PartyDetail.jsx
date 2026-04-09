import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');
const fmtMoney = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(n || 0));

const TYPE_BADGE = {
  CUSTOMER: 'bg-indigo-100 text-indigo-700',
  VENDOR: 'bg-violet-100 text-violet-700',
  BOTH: 'bg-emerald-100 text-emerald-700',
};

export default function PartyDetail() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

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

  return (
    <div className="space-y-6 animate-slide-up max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <button type="button" onClick={() => navigate('/admin/parties')} className="text-xs font-semibold text-indigo-600 hover:underline mb-2">
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
          ['Total billed (₹)', fmtMoney(summary.billedTotal)],
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
                  <th className="py-2">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {summary.invoiceLinesByProcess.map((row) => (
                  <tr key={row.name} className="border-b border-slate-50">
                    <td className="py-2 pr-3 font-medium text-slate-800">{row.name}</td>
                    <td className="py-2 pr-3">{row.count}</td>
                    <td className="py-2">{fmtMoney(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              ) : jobCards.map((jc) => (
                <tr key={jc.id} className="tr">
                  <td className="td">
                    <Link className="font-semibold text-indigo-600 hover:underline" to={`/jobcards/${jc.id}`}>{jc.jobCardNo}</Link>
                  </td>
                  <td className="td text-xs">{jc.part?.partNo || '—'}{jc.part?.description ? ` · ${jc.part.description}` : ''}</td>
                  <td className="td text-xs">{jc.operationMode || '—'}</td>
                  <td className="td text-xs">{jc.status?.replace(/_/g, ' ')}</td>
                  <td className="td">{jc.quantity}</td>
                  <td className="td text-xs">{fmtDate(jc.receivedDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              ) : invoices.map((inv) => (
                <tr key={inv.id} className="tr">
                  <td className="td">
                    <Link className="font-semibold text-indigo-600 hover:underline" to={`/invoices/${inv.id}`}>{inv.invoiceNo}</Link>
                  </td>
                  <td className="td text-xs">{fmtDate(inv.invoiceDate)}</td>
                  <td className="td">₹{fmtMoney(inv.grandTotal)}</td>
                  <td className="td text-xs">{inv.paymentStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              ) : certificates.map((c) => (
                <tr key={c.id} className="tr">
                  <td className="td">
                    <Link className="font-semibold text-indigo-600 hover:underline" to={`/quality/certificates/${c.id}`}>
                      {c.certNo}
                    </Link>
                  </td>
                  <td className="td text-xs">{c.jobCard?.jobCardNo || '—'}</td>
                  <td className="td text-xs">{fmtDate(c.issueDate)}</td>
                  <td className="td text-xs">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(jobworkAsFromParty.length + jobworkAsToParty.length + dispatchToParty.length + dispatchFromParty.length) > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {jobworkAsFromParty.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-bold text-slate-600 mb-2">Jobwork (party = sender)</p>
              <ul className="text-sm space-y-1">
                {jobworkAsFromParty.map((ch) => (
                  <li key={ch.id}>
                    <Link className="text-indigo-600 hover:underline" to={`/jobwork/${ch.id}`}>{ch.challanNo}</Link>
                    <span className="text-slate-400 text-xs"> → {ch.toParty?.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {jobworkAsToParty.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-bold text-slate-600 mb-2">Jobwork (party = receiver / processor)</p>
              <ul className="text-sm space-y-1">
                {jobworkAsToParty.map((ch) => (
                  <li key={ch.id}>
                    <span className="text-slate-400 text-xs">{ch.fromParty?.name} → </span>
                    <Link className="text-indigo-600 hover:underline" to={`/jobwork/${ch.id}`}>{ch.challanNo}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {dispatchToParty.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-bold text-slate-600 mb-2">Dispatch (delivered to party)</p>
              <ul className="text-sm space-y-1">
                {dispatchToParty.map((d) => (
                  <li key={d.id}>
                    <Link className="text-indigo-600 hover:underline" to={`/dispatch/${d.id}`}>{d.challanNo}</Link>
                    <span className="text-slate-400 text-xs"> {fmtDate(d.challanDate)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {dispatchFromParty.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-bold text-slate-600 mb-2">Dispatch (sent from party)</p>
              <ul className="text-sm space-y-1">
                {dispatchFromParty.map((d) => (
                  <li key={d.id}>
                    <Link className="text-indigo-600 hover:underline" to={`/dispatch/${d.id}`}>{d.challanNo}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
