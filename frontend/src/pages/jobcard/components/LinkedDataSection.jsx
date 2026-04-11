import React from 'react';
import { Link } from 'react-router-dom';

export default function LinkedDataSection({ isEdit, cardData, id }) {
  if (!isEdit || !cardData) return null;

  const STATUS_COLOR = {
    CREATED: 'bg-slate-100 text-slate-600', IN_PROGRESS: 'bg-blue-100 text-blue-700',
    SENT_FOR_JOBWORK: 'bg-amber-100 text-amber-700', INSPECTION: 'bg-violet-100 text-violet-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700', ON_HOLD: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
      {/* Inspection */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-violet-500 text-[15px]">fact_check</span>
          </div>
          <h3 className="section-title">Inspection</h3>
        </div>
        {cardData.inspection ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Status</span>
              <span className={`badge ${
                cardData.inspection.inspectionStatus === 'PASS'  ? 'bg-emerald-100 text-emerald-700' :
                cardData.inspection.inspectionStatus === 'FAIL'  ? 'bg-rose-100 text-rose-700' :
                cardData.inspection.inspectionStatus === 'CONDITIONAL' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-600'
              }`}>{cardData.inspection.inspectionStatus}</span>
            </div>
            {cardData.inspection.achievedHardness && (
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Achieved</span>
                <span className="text-xs font-bold text-slate-700">{cardData.inspection.achievedHardness} {cardData.inspection.hardnessUnit}</span>
              </div>
            )}
            <Link to={`/jobcards/${id}/inspection`}
              className="block text-center text-xs text-indigo-600 font-semibold hover:underline mt-2 border border-indigo-100 rounded-xl py-1.5 bg-indigo-50/50 hover:bg-indigo-100/50 transition-colors">
              Edit Inspection →
            </Link>
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-xs text-slate-400 mb-3">No inspection done yet.</p>
            <Link to={`/jobcards/${id}/inspection`}
              className="btn-primary text-xs px-4 py-2">
              <span className="material-symbols-outlined text-sm">add</span> Start Inspection
            </Link>
          </div>
        )}
      </div>

      {/* Challans */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-500 text-[15px]">engineering</span>
            </div>
            <h3 className="section-title">Challans</h3>
          </div>
          <Link to="/jobwork/new" className="text-[10px] text-indigo-600 font-bold hover:underline">+ New</Link>
        </div>
        {cardData.challans?.length ? (
          <div className="space-y-2">
            {cardData.challans.map((ch) => (
              <div key={ch.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <Link to={`/jobwork/${ch.id}`} className="text-xs font-mono text-indigo-600 hover:underline">{ch.challanNo}</Link>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{new Date(ch.challanDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-xs text-slate-400">No jobwork challans created.</p>
          </div>
        )}
      </div>
    </div>
  );
}
