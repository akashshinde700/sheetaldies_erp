import * as React from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

/**
 * RowActions — a `⋮` overflow menu for table rows, replacing the strips of
 * 4–8 icon-only buttons. Put the single most-common action inline next to
 * it; everything else goes inside.
 *
 *   <RowActions label="Actions for invoice INV-01">
 *     <DropdownMenuItem asChild><Link to="…/print"><Printer /> Print</Link></DropdownMenuItem>
 *     <DropdownMenuItem onSelect={() => …}><Download /> Export</DropdownMenuItem>
 *     <DropdownMenuSeparator />
 *     <DropdownMenuItem destructive onSelect={() => …}><Trash2 /> Delete</DropdownMenuItem>
 *   </RowActions>
 */
export function RowActions({ label = 'Row actions', align = 'end', children, className }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          className={`text-slate-400 hover:text-slate-800 hover:bg-slate-100 ${className || ''}`}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48 font-app">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator };
