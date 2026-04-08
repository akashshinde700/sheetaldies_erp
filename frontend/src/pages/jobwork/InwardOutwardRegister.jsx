import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { exportToExcel } from '../../utils/export';

export default function InwardOutwardRegister() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/jobwork/register', { params: { limit: 500 } })
      .then((r) => setRows(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.companyName?.toLowerCase().includes(q) ||
      r.challanNo?.toLowerCase().includes(q) ||
      r.material?.toLowerCase().includes(q) ||
      r.jobcardNo?.toLowerCase().includes(q) ||
      r.invoiceNos?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const exportRows = () => {
    const data = filtered.map((r) => ({
      'Sr No': r.srNo,
      'Company Name': r.companyName,
      Material: r.material,
      'Challan No': r.challanNo,
      'Challan Date': r.challanDate ? new Date(r.challanDate).toLocaleDateString('en-IN') : '',
      'Material In Date': r.materialInDate ? new Date(r.materialInDate).toLocaleDateString('en-IN') : '',
      Qty: r.qty,
      Weight: r.weight,
      'Jobcard No': r.jobcardNo,
      'Jobcard Date': r.jobcardDate ? new Date(r.jobcardDate).toLocaleDateString('en-IN') : '',
      Invoice: r.invoiceNos,
      'Dispatch Qty': r.dispatchQty,
      'Dispatch Date': r.dispatchDate ? new Date(r.dispatchDate).toLocaleDateString('en-IN') : '',
      'Bal Qty': r.balQty,
      Velocity: r.velocity,
      'Del Perf %': r.delPerfPct,
      'Delivery %': r.deliveryPct,
    }));
    exportToExcel(data, 'Inward-Outward-Register');
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Inward / Outward Register</h2>
          <p className="text-xs text-slate-400 mt-0.5">Company to Challan to Material In to Process to Invoice to Dispatch to Balance/Performance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportRows} className="btn-outline">
            <span className="material-symbols-outlined text-sm">file_download</span> Export Excel
          </button>
          <Link to="/jobwork" className="btn-ghost">Back</Link>
        </div>
      </div>

      <div className="card p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company, challan, material, jobcard, invoice..."
          className="form-input"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b">
                {['Sr No','Company Name','Material','Challan No','Challan Date','Material In Date','Qty','Weight','Jobcard No','Jobcard Date','Invoice','Dispatch Qty','Dispatch Date','Bal Qty','Velocity','Del Perf %','Delivery %'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={17} className="px-4 py-8 text-center text-slate-400">Loading register...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={17} className="px-4 py-8 text-center text-slate-400">No register data.</td></tr>
              ) : filtered.map((r) => (
                <tr key={`${r.challanItemId}-${r.srNo}`} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2">{r.srNo}</td>
                  <td className="px-3 py-2 font-semibold text-slate-700">{r.companyName}</td>
                  <td className="px-3 py-2">{r.material}</td>
                  <td className="px-3 py-2 font-mono text-indigo-600">{r.challanNo}</td>
                  <td className="px-3 py-2">{r.challanDate ? new Date(r.challanDate).toLocaleDateString('en-IN') : '-'}</td>
                  <td className="px-3 py-2">{r.materialInDate ? new Date(r.materialInDate).toLocaleDateString('en-IN') : '-'}</td>
                  <td className="px-3 py-2 text-right">{r.qty}</td>
                  <td className="px-3 py-2 text-right">{r.weight}</td>
                  <td className="px-3 py-2 font-mono">{r.jobcardNo}</td>
                  <td className="px-3 py-2">{r.jobcardDate ? new Date(r.jobcardDate).toLocaleDateString('en-IN') : '-'}</td>
                  <td className="px-3 py-2">{r.invoiceNos || '-'}</td>
                  <td className="px-3 py-2 text-right">{r.dispatchQty}</td>
                  <td className="px-3 py-2">{r.dispatchDate ? new Date(r.dispatchDate).toLocaleDateString('en-IN') : '-'}</td>
                  <td className="px-3 py-2 text-right font-bold">{r.balQty}</td>
                  <td className="px-3 py-2 text-right">{r.velocity}</td>
                  <td className="px-3 py-2 text-right">{r.delPerfPct}</td>
                  <td className="px-3 py-2 text-right">{r.deliveryPct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
