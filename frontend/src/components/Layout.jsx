import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const PAGE_TITLES = {
  '/':                         { title: 'Dashboard',         icon: 'dashboard' },
  '/jobcards':                 { title: 'Job Cards',          icon: 'description' },
  '/jobcards/new':             { title: 'New Job Card',        icon: 'add_circle' },
  '/jobwork':                  { title: 'Jobwork Challans',    icon: 'engineering' },
  '/jobwork/new':              { title: 'New Challan',         icon: 'add_circle' },
  '/quality/certificates':     { title: 'Test Certificates',  icon: 'verified' },
  '/quality/certificates/new': { title: 'New Certificate',    icon: 'add_circle' },
  '/invoices':                 { title: 'Tax Invoices',        icon: 'receipt_long' },
  '/invoices/new':             { title: 'New Invoice',         icon: 'add_circle' },
  '/admin/parties':            { title: 'Party Management',    icon: 'group' },
  '/admin/processes':          { title: 'Process Pricing',     icon: 'price_change' },
  '/admin/price-card':         { title: 'Price Card',          icon: 'receipt' },
  '/admin/users':              { title: 'User Management',     icon: 'manage_accounts' },
  '/manufacturing/planning':   { title: 'Daily Planning',      icon: 'event_note' },
  '/manufacturing/runsheet':   { title: 'VHT Run Sheet',       icon: 'thermostat' },
  '/manufacturing/runsheet/new': { title: 'New VHT Run Sheet', icon: 'add_circle' },
};

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const page =
    PAGE_TITLES[location.pathname] ||
    (() => {
      if (/^\/manufacturing\/runsheet\/\d+\/print$/.test(location.pathname)) {
        return { title: 'VHT Run Sheet (Print)', icon: 'print' };
      }
      if (/^\/manufacturing\/runsheet\/\d+$/.test(location.pathname)) {
        return { title: 'VHT Run Sheet', icon: 'thermostat' };
      }
      return { title: 'Sheetal Dies ERP', icon: 'home' };
    })();
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f0ff 50%, #f8f9ff 100%)' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

        {/* ── Top Bar ── */}
        <header className="fixed top-0 right-0 left-0 lg:left-64 h-14 z-30 bg-white/90 backdrop-blur-md border-b border-indigo-100/80 flex items-center justify-between px-4 sm:px-6"
          style={{ boxShadow: '0 1px 12px 0 rgb(99 102 241 / 0.06)' }}>

          {/* Left: hamburger (mobile) + page title */}
          <div className="flex items-center gap-3">
            {/* Hamburger — only on mobile/tablet */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>

            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-500 text-[16px]">{page.icon}</span>
            </div>
            <h1 className="text-sm font-bold text-slate-700 font-headline truncate max-w-[160px] sm:max-w-none">{page.title}</h1>
          </div>

          {/* Right: user chip */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-100">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shadow-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 leading-none">{user?.name}</p>
                <p className="text-[10px] text-indigo-400 mt-0.5 font-medium">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="flex-1 mt-14 p-3 sm:p-4 md:p-6 overflow-auto animate-fade-in">
          <Outlet />
        </main>

        {/* ── Footer ── */}
        <footer className="px-4 sm:px-6 py-3 border-t border-indigo-50 bg-white/60">
          <p className="text-[10px] text-slate-400 text-center">
            Sheetal Dies &amp; Tools Pvt. Ltd. · Precision Engineering ERP
          </p>
        </footer>
      </div>
    </div>
  );
}
