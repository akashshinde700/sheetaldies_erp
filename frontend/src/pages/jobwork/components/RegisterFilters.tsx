import React from 'react';
import { X, Table2, LayoutGrid } from 'lucide-react';
import ListSearchInput from '../../../components/ListSearchInput';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

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

const FilterLabel = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

export default function RegisterFilters({
  search, setSearch,
  fromDate, setFromDate,
  toDate, setToDate,
  viewMode, setViewMode
}: RegisterFiltersProps) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
          <div className="space-y-1 flex-1 min-w-[220px]">
            <FilterLabel>Search</FilterLabel>
            <ListSearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company, challan, material, jobcard, invoice..."
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <FilterLabel htmlFor="reg-from-date">From</FilterLabel>
            <input
              id="reg-from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="form-input text-xs sm:w-36"
            />
          </div>
          <div className="space-y-1">
            <FilterLabel htmlFor="reg-to-date">To</FilterLabel>
            <input
              id="reg-to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="form-input text-xs sm:w-36"
            />
          </div>
          {(search || fromDate || toDate) && (
            <Button type="button" variant="ghost" size="sm"
              onClick={() => { setSearch(''); setFromDate(''); setToDate(''); }}
              className="text-slate-500 hover:text-rose-600">
              <X /> Clear
            </Button>
          )}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 sm:ml-auto">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Table2 className="h-3.5 w-3.5" /> Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              aria-pressed={viewMode === 'card'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'card' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Card
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
