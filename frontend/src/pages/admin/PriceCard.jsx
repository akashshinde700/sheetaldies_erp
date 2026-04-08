import { useEffect, useState, useRef } from 'react';
import api from '../../utils/api';

const PROCESS_META = {
  SR:  { icon: 'thermostat',            color: 'bg-blue-50   text-blue-700   border-blue-200',   badge: 'bg-blue-100   text-blue-800'   },
  HRD: { icon: 'local_fire_department', color: 'bg-red-50    text-red-700    border-red-200',    badge: 'bg-red-100    text-red-800'    },
  TMP: { icon: 'heat',                  color: 'bg-orange-50 text-orange-700 border-orange-200', badge: 'bg-orange-100 text-orange-800' },
  ANN: { icon: 'flare',                 color: 'bg-yellow-50 text-yellow-700 border-yellow-200', badge: 'bg-yellow-100 text-yellow-800' },
  BRZ: { icon: 'merge',                 color: 'bg-purple-50 text-purple-700 border-purple-200', badge: 'bg-purple-100 text-purple-800' },
  PN:  { icon: 'bubble_chart',          color: 'bg-indigo-50 text-indigo-700 border-indigo-200', badge: 'bg-indigo-100 text-indigo-800' },
  SZ:  { icon: 'ac_unit',               color: 'bg-cyan-50   text-cyan-700   border-cyan-200',   badge: 'bg-cyan-100   text-cyan-800'   },
  SC:  { icon: 'clean_hands',           color: 'bg-teal-50   text-teal-700   border-teal-200',   badge: 'bg-teal-100   text-teal-800'   },
};

const DEFAULT_META = { icon: 'settings', color: 'bg-slate-50 text-slate-700 border-slate-200', badge: 'bg-slate-100 text-slate-800' };

export default function PriceCard() {
  const [processes, setProcesses] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const printRef = useRef();

  useEffect(() => {
    api.get('/processes')
      .then(r => setProcesses(r.data.data.filter(p => p.isActive)))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => window.print();

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <span className="material-symbols-outlined animate-spin">progress_activity</span>
      <span className="text-sm">Loading price card...</span>
    </div>
  );

  return (
    <div>
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Process Price Card</h2>
          <p className="text-xs text-slate-400 mt-0.5">Sheetal Vacuum Heat Pvt. Ltd. — Current Rate Card</p>
        </div>
        <button onClick={handlePrint} className="btn-primary">
          <span className="material-symbols-outlined text-sm">print</span> Print Price Card
        </button>
      </div>

      {/* ── PRICE CARD ── */}
      <div ref={printRef} className="price-card-wrap rounded-xl overflow-hidden shadow-xl border border-slate-200">

        {/* Header */}
        <div className="text-white px-8 py-6 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <span className="material-symbols-outlined text-white text-2xl">local_fire_department</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-widest uppercase font-headline">Sheetal Vacuum Heat Pvt. Ltd.</h1>
              <p className="text-slate-400 text-xs mt-0.5">Gat No. 120, Jyotiba Nagar, Talawade, Pune – 411062 | GSTIN: 27MMMPP5678K1Z9</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Rate Card</p>
            <p className="text-white font-bold text-sm">{new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}</p>
            <p className="text-[10px] text-indigo-300 mt-0.5">TUV Certified • ISO 9001</p>
          </div>
        </div>

        {/* Subtitle bar */}
        <div className="px-8 py-2 flex items-center justify-between"
          style={{ background: 'linear-gradient(90deg, #1e1b4b, #312e81)' }}>
          <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest">Heat Treatment Services — Process Rate Schedule</p>
          <p className="text-slate-400 text-[10px]">All prices in INR (₹) • GST Extra as applicable</p>
        </div>

        {/* Process Cards Grid */}
        <div className="bg-slate-50 px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {processes.map((proc) => {
              const meta = PROCESS_META[proc.code] || DEFAULT_META;
              const borderCls = meta.color.split(' ').find(c => c.startsWith('border')) || 'border-slate-200';
              const bgTextCls = meta.color.split(' ').filter(c => c.startsWith('bg') || c.startsWith('text')).join(' ');
              return (
                <div key={proc.id}
                  className={`bg-white rounded-xl border-2 ${borderCls} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
                  {/* Card Header */}
                  <div className={`px-4 py-3 flex items-center gap-3 ${bgTextCls}`}>
                    <span className="material-symbols-outlined text-xl">{meta.icon}</span>
                    <div>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${meta.badge}`}>{proc.code}</span>
                      <p className="text-sm font-extrabold mt-0.5 leading-tight font-headline">{proc.name}</p>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="px-4 py-3 space-y-2.5">
                    {proc.pricePerKg && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-slate-400 text-sm">scale</span>
                          <span className="text-[11px] font-semibold text-slate-500">Per KG</span>
                        </div>
                        <span className="text-base font-extrabold text-slate-800">
                          ₹ {parseFloat(proc.pricePerKg).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {proc.pricePerPc && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-slate-400 text-sm">tag</span>
                          <span className="text-[11px] font-semibold text-slate-500">Per Piece</span>
                        </div>
                        <span className="text-base font-extrabold text-slate-800">
                          ₹ {parseFloat(proc.pricePerPc).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {proc.minCharge && (
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Min. Charge</span>
                        <span className="text-sm font-bold text-slate-600">
                          ₹ {parseFloat(proc.minCharge).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">GST</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>{proc.gstRate}%</span>
                    </div>
                  </div>

                  {proc.description && (
                    <div className="px-4 pb-3">
                      <p className="text-[10px] text-slate-400 italic leading-relaxed border-t border-slate-50 pt-2">{proc.description}</p>
                    </div>
                  )}
                  {proc.hsnSacCode && (
                    <div className="px-4 pb-3">
                      <span className="text-[9px] text-slate-400 font-mono">HSN/SAC: {proc.hsnSacCode}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Consolidated Rate Table */}
        <div className="bg-white px-8 py-6 border-t border-slate-200">
          <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-4">Consolidated Rate Table</h3>
          <table className="w-full text-left border-collapse overflow-hidden rounded-xl">
            <thead>
              <tr className="text-white"
                style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }}>
                <th className="px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-widest rounded-tl-lg">Sr.</th>
                <th className="px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-widest">Code</th>
                <th className="px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-widest">Process Name</th>
                <th className="px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-widest">HSN/SAC</th>
                <th className="px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-widest text-right">Rate/KG (₹)</th>
                <th className="px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-widest text-right">Rate/PC (₹)</th>
                <th className="px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-widest text-right">Min Charge (₹)</th>
                <th className="px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-widest text-center rounded-tr-lg">GST %</th>
              </tr>
            </thead>
            <tbody>
              {processes.map((proc, idx) => (
                <tr key={proc.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}>
                  <td className="px-4 py-2.5 text-xs text-slate-400 font-medium">{String(idx + 1).padStart(2, '0')}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-extrabold font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{proc.code}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-bold text-slate-800">{proc.name}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{proc.hsnSacCode || '—'}</td>
                  <td className="px-4 py-2.5 text-xs font-extrabold text-slate-800 text-right">
                    {proc.pricePerKg ? `₹ ${parseFloat(proc.pricePerKg).toLocaleString('en-IN', {minimumFractionDigits:2})}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-bold text-slate-600 text-right">
                    {proc.pricePerPc ? `₹ ${parseFloat(proc.pricePerPc).toLocaleString('en-IN', {minimumFractionDigits:2})}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 text-right">
                    {proc.minCharge ? `₹ ${parseFloat(proc.minCharge).toLocaleString('en-IN', {minimumFractionDigits:2})}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{proc.gstRate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="text-white px-8 py-4 flex items-center justify-between rounded-b-xl"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)' }}>
          <div>
            <p className="text-xs font-semibold text-slate-300">Terms & Conditions</p>
            <p className="text-[10px] text-slate-500 mt-0.5">• Prices subject to change without prior notice. &nbsp;• GST extra as applicable. &nbsp;• Minimum batch weight: 5 KG. &nbsp;• Payment: 30 days from invoice date.</p>
          </div>
          <div className="text-right shrink-0 ml-8">
            <p className="text-[10px] text-slate-400">For Sheetal Vacuum Heat Pvt. Ltd.</p>
            <p className="text-xs font-bold text-white mt-3">Authorized Signatory</p>
          </div>
        </div>

      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .price-card-wrap { box-shadow: none; }
        }
      `}</style>
    </div>
  );
}
