import React from 'react';
import ListSearchInput from '../../../components/ListSearchInput';

interface RegisterFiltersProps {
  search: string;
  setSearch: (v: string) => void;
  fromDate: string;
  setFromDate: (v: string) => void;
  toDate: string;
  setToDate: (v: string) => void;
  viewMode: 'table' | 'card';
  setViewMode: (v: 'table' | 'card') => void;
}

export default function RegisterFilters({ 
  search, setSearch, 
  fromDate, setFromDate, 
  toDate, setToDate, 
  viewMode, setViewMode 
}: RegisterFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto] items-end">
      <ListSearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by company, challan, material, jobcard, invoice..."
      />
      <div className="flex gap-2 items-center">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</label>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="form-input text-xs"
        />
      </div>
      <div className="flex gap-2 items-center">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</label>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="form-input text-xs"
        />
      </div>
      <div className="flex items-center gap-3">
        {(search || fromDate || toDate) ? (
          <button
            type="button"
            onClick={() => { setSearch(''); setFromDate(''); setToDate(''); }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium"
          >
            <span className="material-symbols-outlined text-sm">close</span> Clear
          </button>
        ) : <div />}
        
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
              viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
              viewMode === 'card' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Card
          </button>
        </div>
      </div>
    </div>
  );
}
