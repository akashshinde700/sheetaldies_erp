import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';

export default function JobCardPrint() {
  const { id } = useParams();
  const [jc, setJc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/jobcards/${id}`)
      .then(r => setJc(r.data.data))
      .catch(() => setError('Job Card not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-slate-400">Loading Job Card details...</div>;
  if (error || !jc) return (
    <div className="p-10 space-y-2 text-center">
      <p className="text-rose-500 font-bold">{error || 'Job Card not found.'}</p>
      <Link to="/jobcards" className="btn-ghost">← Back to List</Link>
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen py-10 print:bg-white print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page { 
            box-shadow: none !important; 
            margin: 0 !important; 
            border: none !important; 
            width: 100% !important;
            max-width: 100% !important;
          }
          body { background: white !important; }
          @page { margin: 1cm; size: A4; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print max-w-[800px] mx-auto mb-6 flex items-center justify-between px-4">
        <Link to={`/jobcards`} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Back to List
        </Link>
        <button 
          onClick={() => window.print()}
          className="btn-primary shadow-indigo-200/50"
        >
          <span className="material-symbols-outlined text-[20px]">print</span>
          Print Job Card
        </button>
      </div>

      <div className="page max-w-[800px] mx-auto bg-white shadow-2xl border-2 border-slate-900 print:shadow-none">
        {/* Company Header */}
        <div className="p-6 border-b-2 border-slate-900 flex justify-between items-center bg-slate-50">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">SHEETAL DIES & TOOLS</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Production Tracking Card · Internal Copy</p>
          </div>
          <div className="text-right">
            <div className="bg-slate-900 text-white px-6 py-2 rounded-lg text-xl font-black font-mono shadow-md">
              {jc.jobCardNo}
            </div>
          </div>
        </div>

        {/* Primary Info */}
        <div className="grid grid-cols-2 border-b-2 border-slate-900">
          <div className="p-5 border-r border-slate-900 space-y-4">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">CUSTOMER NAME</p>
              <p className="text-lg font-black text-slate-900 uppercase leading-none">{jc.party?.name || jc.customerName || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">PART NO / DIE NO</p>
              <p className="text-sm font-black text-indigo-700 font-mono italic">{jc.dieNo || jc.part?.partNo || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">DRAWING NO</p>
                <p className="text-sm font-black text-slate-700 font-mono">{jc.part?.drawingNo || '—'}</p>
              </div>
            </div>
          </div>
          <div className="p-5 flex flex-col justify-center space-y-4 bg-slate-50/30">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">JOB DATE</p>
                <p className="text-sm font-black text-slate-800 font-mono">{formatDate(jc.createdAt)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TARGET DATE</p>
                <p className="text-sm font-black text-rose-600 font-mono">{formatDate(jc.dueDate)}</p>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">MACHINE ALLOCATED</p>
              <p className="text-sm font-black text-slate-800 uppercase">{jc.machine?.name || jc.machineCode || '—'}</p>
            </div>
          </div>
        </div>

        {/* Technical Specification */}
        <div className="p-5 border-b-2 border-slate-900">
          <h3 className="text-[11px] font-black text-slate-900 bg-slate-100 px-3 py-1.5 inline-block rounded mb-4 tracking-widest border border-slate-200">TECHNICAL SPECIFICATIONS</h3>
          <div className="grid grid-cols-4 gap-6 text-center">
            <div className="border-r border-slate-100 last:border-0 pr-4 last:pr-0">
              <p className="text-[9px] font-black text-slate-400 uppercase">DIE MATERIAL</p>
              <p className="text-sm font-black text-slate-900 uppercase">{jc.dieMaterial || jc.part?.material || '—'}</p>
            </div>
            <div className="border-r border-slate-100 last:border-0 px-4 last:pr-0">
              <p className="text-[9px] font-black text-slate-400 uppercase">HARDNESS REQ.</p>
              <p className="text-sm font-black text-slate-900">{jc.hrcRange || (jc.hardnessMin ? `${jc.hardnessMin}-${jc.hardnessMax} HRC` : '—')}</p>
            </div>
            <div className="border-r border-slate-100 last:border-0 px-4 last:pr-0">
              <p className="text-[9px] font-black text-slate-400 uppercase">QTY (PCS)</p>
              <p className="text-sm font-black text-slate-900">{jc.quantity || 0}</p>
            </div>
            <div className="px-4 last:pr-0">
              <p className="text-[9px] font-black text-slate-400 uppercase">TOTAL WEIGHT</p>
              <p className="text-sm font-black text-slate-900">{jc.totalWeight || 0.00} KGS</p>
            </div>
          </div>
        </div>

        {/* Process Path */}
        <div className="p-5 min-h-[300px]">
          <h3 className="text-[11px] font-black text-slate-900 bg-slate-100 px-3 py-1.5 inline-block rounded mb-4 tracking-widest border border-slate-200 uppercase">Process Workflow & Checkpoints</h3>
          <table className="w-full text-xs font-bold divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50 text-slate-400 uppercase text-[9px] tracking-widest">
                <th className="p-3 text-left w-12 text-center">SR</th>
                <th className="p-3 text-left">PROCESS / OPERATION</th>
                <th className="p-3 text-center w-32">ESTIMATED (HRS)</th>
                <th className="p-3 text-center w-32">ACTUAL TIME</th>
                <th className="p-3 text-center w-32">OPERATOR SIGN</th>
              </tr>
            </thead>
            <tbody>
              {(jc.inspection?.heatProcesses?.length > 0 
                ? jc.inspection.heatProcesses.map(hp => hp.processType?.name || hp.equipment || 'Process')
                : [
                    'Incoming Inspection',
                    'Vacuum Hardening',
                    'Tempering - Cycle 1',
                    'Tempering - Cycle 2',
                    'Final Inspection',
                    'Quality Certification',
                  ]
              ).map((op, idx) => (
                <tr key={`${op}-${idx}`} className="border-b border-slate-50">
                  <td className="p-4 text-center text-slate-300 font-mono">{idx + 1}</td>
                  <td className="p-4 text-slate-900 uppercase font-black">{op}</td>
                  <td className="p-4 border-l border-slate-50"></td>
                  <td className="p-4 border-l border-slate-50 border-r"></td>
                  <td className="p-4"></td>
                </tr>
              ))}
              {/* Extra rows for manual processes */}
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={`extra-${i}`} className="border-b border-slate-50 h-10">
                  <td className="border-r border-slate-50"></td>
                  <td className="border-r border-slate-50"></td>
                  <td className="border-r border-slate-50"></td>
                  <td className="border-r border-slate-50"></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Visual Documentation (New Section) */}
        {(jc.image1 || jc.image2 || jc.image3 || jc.image4 || jc.image5) && (
          <div className="p-5 border-b-2 border-slate-900 page-break-before-auto">
            <h3 className="text-[11px] font-black text-slate-900 bg-slate-100 px-3 py-1.5 inline-block rounded mb-4 tracking-widest border border-slate-200 uppercase">Visual Documentation / Part Orientation</h3>
            <div className="grid grid-cols-3 gap-2">
              {[jc.image1, jc.image2, jc.image3, jc.image4, jc.image5].filter(Boolean).map((img, idx) => (
                <div key={idx} className="aspect-video border-2 border-slate-100 rounded-lg overflow-hidden flex items-center justify-center bg-slate-50">
                  <img 
                    src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${img}`} 
                    alt={`Part Reference ${idx + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ))}
            </div>
            <p className="text-[8px] text-slate-400 mt-2 italic font-bold">Note: Photos provided for identification and critical orientation reference only.</p>
          </div>
        )}

        {/* Footer Area */}
        <div className="grid grid-cols-2 bg-slate-50 border-t-2 border-slate-900">
          <div className="p-6 border-r border-slate-900 space-y-4">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-2">SPECIAL LOADING INSTRUCTIONS</p>
              <div className="h-20 border-2 border-dashed border-slate-200 rounded-lg p-3 text-[10px] text-slate-400 italic">
                {jc.specialInstructions || 'No special loading instructions provided for this job card.'}
              </div>
            </div>
          </div>
          <div className="p-6 flex flex-col justify-between">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase">APPROVED BY</p>
              <p className="text-xs font-black text-slate-900 uppercase mt-1">Management / QA Dept</p>
            </div>
            <div className="text-right flex justify-end gap-10 items-end">
              <div className="text-center">
                <div className="h-10 w-24 border-b border-slate-400 mx-auto" />
                <p className="text-[8px] font-black text-slate-400 uppercase mt-1">SHOP SUPERVISOR</p>
              </div>
              <div className="text-center">
                <div className="h-10 w-24 border-b border-slate-400 mx-auto" />
                <p className="text-[8px] font-black text-slate-400 uppercase mt-1">FINAL QC</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-900 flex justify-between items-center px-6">
          <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Job Card · Reference ID: {jc.id}</p>
          <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">SHEETAL DIES ERP · {formatDate(new Date())}</p>
        </div>
      </div>
      
      {/* Visual Indicator for paper cut */}
      <div className="no-print max-w-[800px] mx-auto mt-4 text-center">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">A4 Vertical (Portrait) Layout Optimized</p>
      </div>
    </div>
  );
}
