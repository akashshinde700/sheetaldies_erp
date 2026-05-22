import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const PAGE_TITLES = {
  '/':                         { title: 'Dashboard',         icon: 'dashboard' },
  '/jobcards':                 { title: 'Job Cards',          icon: 'description' },
  '/jobcards/new':             { title: 'New Job Card',        icon: 'add_circle' },
  '/jobwork':                  { title: 'Jobwork Challans',    icon: 'engineering' },
  '/jobwork/register':         { title: 'Inward + Job Card',   icon: 'import_export' },
  '/jobwork/new':              { title: 'New Inward + Job Card', icon: 'add_circle' },
  '/quality/certificates':     { title: 'Test Certificates',  icon: 'verified' },
  '/quality/certificates/new': { title: 'New Certificate',    icon: 'add_circle' },
  '/invoices':                 { title: 'Tax Invoices',        icon: 'receipt_long' },
  '/invoices/new':             { title: 'New Invoice',         icon: 'add_circle' },
  '/analytics':                { title: 'Analytics',           icon: 'analytics' },
  '/analytics/advanced':       { title: 'Advanced analytics', icon: 'insights' },
  '/dispatch':                 { title: 'Dispatch challans',   icon: 'local_shipping' },
  '/dispatch/new':             { title: 'New dispatch',        icon: 'add_circle' },
  '/purchase':                 { title: 'Purchase orders',     icon: 'shopping_cart' },
  '/purchase/grn':             { title: 'Goods receipt (GRN)', icon: 'inbox' },
  '/purchase/inventory':       { title: 'Inventory',           icon: 'warehouse' },
  '/admin/parties':            { title: 'Party Management',    icon: 'group' },
  '/admin/party-rates':        { title: 'Party Process Rates', icon: 'price_check' },
  '/admin/items':              { title: 'Items',               icon: 'inventory' },
  '/admin/machines':           { title: 'Machines',            icon: 'precision_manufacturing' },
  '/admin/users':              { title: 'User Management',     icon: 'manage_accounts' },
  '/admin/audit-logs':         { title: 'Audit logs',          icon: 'history' },
  '/manufacturing/batches':    { title: 'Manufacturing batches', icon: 'precision_manufacturing' },
  '/manufacturing/reports':    { title: 'Mfg reports',         icon: 'assessment' },
  '/manufacturing/planning':   { title: 'Daily Planning',      icon: 'event_note' },
  '/manufacturing/planning/print': { title: 'Planning print', icon: 'print' },
  '/manufacturing/runsheet':   { title: 'VHT Run Sheet',       icon: 'thermostat' },
  '/manufacturing/runsheet/new': { title: 'New VHT Run Sheet', icon: 'add_circle' },
};

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef(null);

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
      if (/^\/admin\/parties\/\d+$/.test(location.pathname)) {
        return { title: 'Party profile', icon: 'person' };
      }
      return { title: 'SVT ERP', icon: 'home' };
    })();
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="flex h-dvh h-screen bg-app-shell overflow-hidden print:block print:overflow-visible print:h-auto">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 w-full flex flex-col h-dvh h-screen lg:ml-64 print:ml-0 print:h-auto print:block">

        <header
          className="print:hidden fixed top-0 right-0 left-0 lg:left-64 z-30 flex items-center gap-3
            h-[calc(3.75rem+env(safe-area-inset-top,0px))] header-bar-padding
            pt-[env(safe-area-inset-top,0px)]
            bg-white/90 supports-[backdrop-filter]:bg-white/75 backdrop-blur-xl backdrop-saturate-150
            border-b border-slate-200/80 shadow-header"
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

            <div className="hidden xl:flex flex-col min-w-0 pr-2 border-r border-slate-200/80 mr-1">
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

          <div className="hidden md:flex flex-1 justify-center max-w-lg min-w-0 mx-2 lg:mx-6">
            <div
              className="relative w-full rounded-lg bg-slate-100/70 border border-slate-200/70 shadow-inner
                transition-all duration-200 focus-within:bg-white focus-within:border-sky-300/80 focus-within:ring-2 focus-within:ring-sky-400/25"
            >
              <label className="flex items-center w-full cursor-text">
                <span className="material-symbols-outlined pl-3 text-slate-500 text-[18px] shrink-0" aria-hidden>
                  search
                </span>
                <input
                  type="search"
                  placeholder="Search job cards, parties, invoices…"
                  className="w-full min-w-0 py-2.5 pr-3 pl-2 bg-transparent border-0 text-sm text-slate-900
                    placeholder:text-slate-400 focus:outline-none focus:ring-0"
                  aria-label="Quick search"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
            <button
              type="button"
              className="hidden sm:flex min-w-[40px] min-h-[40px] items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100/90
                transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/50"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
            </button>
            <button
              type="button"
              className="hidden sm:flex min-w-[40px] min-h-[40px] items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100/90
                transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/50"
              aria-label="Settings"
            >
              <span className="material-symbols-outlined text-[22px]">settings</span>
            </button>
            <div className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l border-slate-200/80">
              <div
                className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold
                  bg-gradient-to-br from-slate-800 to-slate-900 shadow-sm ring-2 ring-white"
              >
                {initials}
              </div>
              <div className="hidden sm:block min-w-0">
                <p className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[140px] md:max-w-[200px]">
                  {user?.name}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5 font-semibold uppercase tracking-wide">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        <main
          ref={mainRef}
          style={{ touchAction: 'pan-y' }}
          className="flex-1 mt-[calc(3.75rem+env(safe-area-inset-top,0px))] main-area-padding
            py-4 sm:py-5 md:py-7 pb-8 sm:pb-10 overflow-x-hidden overflow-y-auto overscroll-contain animate-fade-in safe-pb
            print:mt-0 print:overflow-visible print:p-0"
        >
          <div className="w-full animate-slide-up">
            <Outlet />
          </div>
        </main>

        <footer className="footer-bar-padding py-2.5 border-t border-slate-200/70 bg-white/85 backdrop-blur-sm safe-pb">
          <p className="text-[10px] text-slate-400 text-center leading-relaxed tracking-wide">
            Shital Vacuum Treat Pvt. Ltd. · SVT ERP
          </p>
        </footer>
      </div>
    </div>
  );
}
