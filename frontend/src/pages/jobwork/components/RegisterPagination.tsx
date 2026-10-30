import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

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
    <Card>
      <CardContent className="flex items-center justify-between gap-3 px-4 py-2.5">
        <p className="text-xs text-slate-500">
          Showing <span className="font-bold text-slate-900 tabular-nums">{Math.min(filteredCount, (page - 1) * pageSize + 1)}</span> to{' '}
          <span className="font-bold text-slate-900 tabular-nums">{Math.min(filteredCount, page * pageSize)}</span> of{' '}
          <span className="font-bold text-slate-900 tabular-nums">{filteredCount}</span> records
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            aria-label="Previous page"
            className="text-slate-500"
          >
            <ChevronLeft />
          </Button>
          <span className="text-xs text-slate-500 whitespace-nowrap px-1">
            Page <span className="font-bold text-slate-900 tabular-nums">{page}</span> / <span className="font-semibold tabular-nums">{totalPages}</span>
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            aria-label="Next page"
            className="text-slate-500"
          >
            <ChevronRight />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
