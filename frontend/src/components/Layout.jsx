import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Search, LogOut } from 'lucide-react';

import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import { useAuth } from '../context/AuthContext';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const PAGE_TITLES = {
  '/':                         { title: 'Dashboard',         icon: 'dashboard' },
  '/jobcards':                 { title: 'Job Cards',          icon: 'description' },
  '/jobcards/new':             { title: 'New Job Card',        icon: 'add_circle' },
  '/jobwork':                  { title: 'Jobwork Challans',    icon: 'engineering' },
  '/jobwork/register':         { title: 'Inwards',            icon: 'import_export' },
  '/jobwork/inward-entry':     { title: 'Inward Entry',        icon: 'add_circle' },
  '/jobwork/new':              { title: 'New Inward + Job Card', icon: 'add_circle' },
  '/pending':                  { title: 'Pending List',        icon: 'pending_actions' },
  '/quality/certificates':     { title: 'Test Certificates',  icon: 'verified' },
  '/quality/certificates/new': { title: 'New Certificate',    icon: 'add_circle' },
  '/invoices':                 { title: 'Tax Invoices',        icon: 'receipt_long' },
  '/invoices/new':             { title: 'New Invoice',         icon: 'add_circle' },
  '/analytics':                { title: 'Analytics',           icon: 'analytics' },
  '/analytics/advanced':       { title: 'Advanced analytics', icon: 'insights' },
  '/dispatch':                 { title: 'Dispatch challans',   icon: 'local_shipping' },
  '/dispatch/new':             { title: 'New dispatch',        icon: 'add_circle' },
  '/customer-quotes':          { title: 'Customer Quotes',     icon: 'request_quote' },
  '/inventory':                { title: 'Inventory',           icon: 'warehouse' },
  '/purchase/inventory':       { title: 'Inventory (purchase)', icon: 'warehouse' },
  '/admin/parties':            { title: 'Parties',             icon: 'group' },
  '/admin/party-rates':        { title: 'Party Process Rates', icon: 'price_check' },
  '/admin/processes':          { title: 'Process Types',       icon: 'settings_suggest' },
  '/admin/heat-treat-specs':   { title: 'Heat Treatment Specs', icon: 'local_fire_department' },
  '/admin/temp-cycle-graphs':  { title: 'Temp Cycle Graphs',   icon: 'show_chart' },
  '/admin/items':              { title: 'Items',               icon: 'inventory' },
  '/admin/machines':           { title: 'Machines',            icon: 'precision_manufacturing' },
  '/admin/users':              { title: 'User Management',     icon: 'manage_accounts' },
  '/admin/audit-logs':         { title: 'Audit logs',          icon: 'history' },
  '/manufacturing/runsheet':   { title: 'VHT Run Sheet',       icon: 'thermostat' },
  '/manufacturing/runsheet/new': { title: 'New VHT Run Sheet', icon: 'add_circle' },
};

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('svt_sidebar_collapsed') === '1'; } catch { return false; }
  });
  const mainRef = useRef(null);

  const toggleCollapsed = () => setCollapsed((c) => {
    const next = !c;
    try { localStorage.setItem('svt_sidebar_collapsed', next ? '1' : '0'); } catch { /* ignore */ }
    return next;
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Reset scroll to top on every route change
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [location.pathname]);

  useEffect(() => {
    const handleScrollKeys = (e) => {
      if (!mainRef.current) return;
      const keys = ['PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
      if (!keys.includes(e.key)) return;

      const active = document.activeElement;
      const editable = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
      // PgUp/PgDn always scroll — inputs don't use them
      // ArrowUp/ArrowDown/Home/End skip when an editable field is focused
      if (editable && e.key !== 'PageDown' && e.key !== 'PageUp') return;
      // Skip contenteditable elements — they own their own arrow-key behaviour
      if (active?.isContentEditable) return;
      // Skip when focus is inside the sidebar — let the sidebar handle its own scroll
      const sidebar = document.querySelector('aside');
      if (sidebar?.contains(active)) return;

      const target = mainRef.current;
      const pageHeight = target.clientHeight * 0.85;

      switch (e.key) {
        case 'PageDown':
          target.scrollBy({ top: pageHeight, behavior: 'smooth' });
          e.preventDefault();
          break;
        case 'PageUp':
          target.scrollBy({ top: -pageHeight, behavior: 'smooth' });
          e.preventDefault();
          break;
        case 'ArrowDown':
          target.scrollBy({ top: 80, behavior: 'smooth' });
          e.preventDefault();
          break;
        case 'ArrowUp':
          target.scrollBy({ top: -80, behavior: 'smooth' });
          e.preventDefault();
          break;
        case 'Home':
          target.scrollTo({ top: 0, behavior: 'smooth' });
          e.preventDefault();
          break;
        case 'End':
          target.scrollTo({ top: target.scrollHeight, behavior: 'smooth' });
          e.preventDefault();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleScrollKeys);
    return () => window.removeEventListener('keydown', handleScrollKeys);
  }, []);

  const page =
    PAGE_TITLES[location.pathname] ||
    (() => {
      if (/^\/manufacturing\/runsheet\/\d+\/print$/.test(location.pathname)) {
        return { title: 'VHT Run Sheet (Print)', icon: 'print' };
      }
      if (/^\/manufacturing\/runsheet\/\d+$/.test(location.pathname)) {
        return { title: 'VHT Run Sheet', icon: 'thermostat' };
      }
      if (/^\/jobcards\/\d+\/inspection$/.test(location.pathname)) {
        return { title: 'Incoming inspection', icon: 'fact_check' };
      }
      if (/^\/jobcards\/\d+\/edit$/.test(location.pathname)) {
        return { title: 'Edit Job Card', icon: 'description' };
      }
      if (/^\/jobcards\/\d+$/.test(location.pathname)) {
        return { title: 'Job Card', icon: 'description' };
      }
      if (/^\/jobwork\/\d+$/.test(location.pathname)) {
        return { title: 'Challan detail', icon: 'engineering' };
      }
      if (/^\/invoices\/\d+\/print$/.test(location.pathname)) {
        return { title: 'Invoice print', icon: 'print' };
      }
      if (/^\/invoices\/\d+$/.test(location.pathname)) {
        return { title: 'Invoice detail', icon: 'receipt_long' };
      }
      if (/^\/dispatch\/\d+$/.test(location.pathname)) {
        return { title: 'Dispatch challan', icon: 'local_shipping' };
      }
      if (/^\/quality\/certificates\/\d+\/print$/.test(location.pathname)) {
        return { title: 'Certificate print', icon: 'print' };
      }
      if (/^\/quality\/certificates\/\d+$/.test(location.pathname)) {
        return { title: 'Certificate', icon: 'verified' };
      }
      if (location.pathname === '/admin/parties/new') {
        return { title: 'Add New Party', icon: 'add_circle' };
      }
      if (/^\/admin\/parties\/\d+\/edit$/.test(location.pathname)) {
        return { title: 'Edit Party', icon: 'group' };
      }
      if (/^\/admin\/parties\/\d+$/.test(location.pathname)) {
        return { title: 'Party profile', icon: 'person' };
      }
      return { title: 'SVT ERP', icon: 'home' };
    })();
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="flex h-dvh h-screen bg-app-shell overflow-hidden print:block print:overflow-visible print:h-auto">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />

      <div className={`flex-1 min-w-0 w-full flex flex-col h-dvh h-screen print:ml-0 print:h-auto print:block transition-[margin] duration-300 ease-out ${collapsed ? 'lg:ml-[4.75rem]' : 'lg:ml-64'}`}>

        <header
          className={`print:hidden fixed top-0 right-0 left-0 z-30 flex items-center gap-3 transition-[left] duration-300 ease-out
            ${collapsed ? 'lg:left-[4.75rem]' : 'lg:left-64'}
            h-[calc(3.75rem+env(safe-area-inset-top,0px))] header-bar-padding
            pt-[env(safe-area-inset-top,0px)]
            bg-white/90 supports-[backdrop-filter]:bg-white/75 backdrop-blur-xl backdrop-saturate-150
            border-b border-slate-200/80 shadow-header`}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg
                text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95
                transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>

            <div className="hidden xl:flex flex-col min-w-0 pr-3 border-r border-slate-200/80 mr-1 select-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-none">SVT</span>
              <span className="text-xs font-extrabold text-slate-900 font-headline leading-tight truncate max-w-[10rem]">ERP</span>
            </div>

            <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-sky-100 to-sky-50 border border-sky-200/90 shadow-sm flex items-center justify-center shrink-0 ring-1 ring-white/80">
              <span className="material-symbols-outlined text-sky-800 text-[18px] sm:text-[17px]">{page.icon}</span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 font-headline truncate min-w-0 tracking-tight">
              {page.title}
            </h1>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 min-h-[38px] text-slate-500
                hover:border-slate-300 hover:text-slate-800 transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-label="Search (Ctrl+K)"
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:inline text-xs font-medium">Search</span>
              <kbd className="hidden md:inline rounded border border-slate-200 bg-slate-50 px-1 text-[10px] font-app-mono text-slate-400">Ctrl K</kbd>
            </button>

            <div className="pl-2 sm:pl-3 border-l border-slate-200/80">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2.5 rounded-lg p-1 pr-2 hover:bg-slate-100 transition-colors
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    aria-label="Account menu"
                  >
                    <span className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold
                      bg-gradient-to-br from-slate-800 to-slate-900 shadow-sm ring-2 ring-white">
                      {initials}
                    </span>
                    <span className="hidden sm:block min-w-0 text-left">
                      <span className="block text-xs font-semibold text-slate-900 leading-tight truncate max-w-[140px] md:max-w-[200px]">
                        {user?.name}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-0.5 font-semibold uppercase tracking-wide">{user?.role}</span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 font-app">
                  <DropdownMenuLabel>
                    <span className="block truncate text-sm font-semibold normal-case tracking-normal text-slate-800">{user?.name}</span>
                    <span className="block truncate text-xs font-normal normal-case tracking-normal text-slate-500">{user?.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onSelect={handleLogout}>
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

        <main
          ref={mainRef}
          style={{ touchAction: 'pan-y' }}
          className="flex-1 min-h-0 flex flex-col mt-[calc(3.75rem+env(safe-area-inset-top,0px))] main-area-padding
            py-2 sm:py-3 overflow-x-hidden overflow-y-auto overscroll-contain animate-fade-in safe-pb
            print:mt-0 print:overflow-visible print:p-0 print:block"
        >
          <div className="w-full flex-1 min-h-0 flex flex-col animate-slide-up print:block">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
