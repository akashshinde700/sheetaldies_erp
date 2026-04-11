import React from 'react';

interface RegisterPaginationProps {
  page: number;
  setPage: (v: number) => void;
  totalPages: number;
  filteredCount: number;
  pageSize: number;
}

export default function RegisterPagination({ 
  page, setPage, totalPages, filteredCount, pageSize 
}: RegisterPaginationProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-4">
        <p className="text-xs text-slate-500">
          Showing <span className="font-bold text-slate-900">{Math.min(filteredCount, (page - 1) * pageSize + 1)}</span> to{' '}
          <span className="font-bold text-slate-900">{Math.min(filteredCount, page * pageSize)}</span> of{' '}
          <span className="font-bold text-slate-900">{filteredCount}</span> records
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all font-bold"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>
        <div className="flex items-center gap-1.5 px-3 h-10 border border-slate-100 bg-slate-50/50 rounded-xl">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Page</span>
          <span className="text-sm font-black text-indigo-700">{page}</span>
          <span className="text-xs text-slate-400 font-bold">/</span>
          <span className="text-sm font-bold text-slate-600">{totalPages}</span>
        </div>
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all font-bold"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
