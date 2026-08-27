import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

function usePendingCount() {
  const { data } = useQuery({
    queryKey: ['pending-items'],
    queryFn: async () => {
      const r = await api.get('/analytics/pending-items');
      return r.data.data;
    },
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
  return data?.summary?.totalPending ?? 0;
}

const NAV_MAIN = [
  { label: 'Dashboard',    icon: 'dashboard',    to: '/',                       end: true },
  { label: 'Parties',      icon: 'group',        to: '/admin/parties' },
  { label: 'Inwards',      icon: 'import_export', to: '/jobwork/register' },
  { label: 'Job Cards',    icon: 'description',  to: '/jobcards' },
  { label: 'VHT Runsheet', icon: 'thermostat',   to: '/manufacturing/runsheet' },
  { label: 'Certificates', icon: 'verified',     to: '/quality/certificates' },
  { label: 'Pending List', icon: 'pending_actions', to: '/pending', badge: true },
];

const NAV_OPERATIONS = [
  { label: 'Invoices',     icon: 'receipt_long', to: '/invoices' },
  { label: 'Analytics',    icon: 'analytics',    to: '/analytics' },
  { label: 'Inventory', icon: 'warehouse', to: '/inventory' },
  { label: 'Customer Quotes', icon: 'request_quote', to: '/customer-quotes' },
  { label: 'Dispatch', icon: 'local_shipping', to: '/dispatch' },
];

const NAV_ADMIN = [
  { label: 'Processes',   icon: 'settings_suggest', to: '/admin/processes' },
  { label: 'HT Specs',   icon: 'local_fire_department', to: '/admin/heat-treat-specs' },
  { label: 'Temp Cycle Graphs', icon: 'show_chart', to: '/admin/temp-cycle-graphs' },
  { label: 'Party Rates', icon: 'price_check',      to: '/admin/party-rates' },
  { label: 'Items',       icon: 'inventory',         to: '/admin/items' },
  { label: 'Machines',    icon: 'precision_manufacturing', to: '/admin/machines' },
  { label: 'Audit Logs',  icon: 'history',           to: '/admin/audit-logs' },
];

const NavItem = ({ item, onNavigate, pendingCount = 0, collapsed = false }) => {
  const { pathname } = useLocation();
  const resolvedActive = (routerActive) => {
    if (item.to === '/jobwork' && pathname.startsWith('/jobwork/register')) return false;
    return routerActive;
  };

  return (
  <NavLink
    to={item.to}
    end={item.end ?? false}
    onClick={onNavigate}
    title={collapsed ? item.label : undefined}
    className={({ isActive }) => {
      const active = resolvedActive(isActive);
      return `group flex items-center gap-2.5 min-h-[44px] sm:min-h-0 sm:h-9 rounded-lg text-sm font-semibold mb-0.5
       transition-all duration-200 ease-out
       ${collapsed ? 'lg:justify-center lg:px-0 px-3' : 'px-3'}
       ${
         active
           ? 'bg-white text-slate-900 shadow-nav-active border border-transparent border-l-[3px] !border-l-sky-600'
           : 'text-slate-700 hover:text-slate-900 hover:bg-white/85 border border-transparent border-l-[3px] border-l-transparent hover:border-slate-200/70 active:scale-[0.99]'
       }`;
    }}
  >
    {({ isActive }) => (
      <>
        <span
          className={`material-symbols-outlined text-[18px] transition-colors duration-200 shrink-0
            ${resolvedActive(isActive) ? 'text-sky-700' : 'text-slate-500 group-hover:text-sky-700'}`}
        >
          {item.icon}
        </span>
        <span className={`truncate flex-1 text-left ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
        {item.badge && pendingCount > 0 && (
          <span className={`min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm ring-1 ring-rose-400/50
            ${collapsed ? 'lg:absolute lg:right-1 lg:top-1 lg:min-w-0 lg:h-2 lg:w-2 lg:p-0 lg:ring-0' : 'ml-auto'}`}>
            <span className={collapsed ? 'lg:hidden' : ''}>{pendingCount > 99 ? '99+' : pendingCount}</span>
          </span>
        )}
      </>
    )}
  </NavLink>
  );
};

const SectionLabel = ({ label, collapsed }) =>
  collapsed ? (
    <div className="mx-3 my-3 border-t border-slate-300/60 lg:block hidden" aria-hidden />
  ) : (
    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 px-3 pt-4 pb-1.5 select-none">
      {label}
    </p>
  );

export default function Sidebar({ open, onClose, collapsed = false, onToggleCollapsed }) {
  const { user, logout, isManager, isAdmin } = useAuth();
  const navigate     = useNavigate();
  const pendingCount = usePendingCount();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="print:hidden fixed inset-0 z-30 lg:hidden bg-slate-900/40 backdrop-blur-[2px] animate-backdrop-in"
          onClick={onClose}
        />
      )}

      <aside
        role="navigation"
        aria-label="Main menu"
        className={`print:hidden h-dvh h-screen max-h-dvh fixed left-0 top-0 z-40 flex flex-col w-64 max-w-[min(16rem,calc(100vw-1.5rem))]
          border-r border-slate-200/90 shadow-[8px_0_30px_-10px_rgba(15,23,42,0.14)] lg:shadow-none lg:max-w-none
          transition-[transform,width] duration-300 ease-out will-change-transform
          bg-app-sidebar safe-pt safe-pb
          ${collapsed ? 'lg:w-[4.75rem]' : 'lg:w-64'}
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-sky-500 via-sky-400 to-blue-500 shrink-0" />

        <div className={`px-4 sm:px-5 py-4 sm:py-5 border-b border-sky-200/60 shrink-0 ${collapsed ? 'lg:px-0' : ''}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'lg:justify-center' : ''}`}>
            <img
              src="/logo.png"
              alt="SVT"
              className="h-10 w-auto flex-shrink-0 rounded transition-transform duration-200 hover:scale-[1.02]"
            />
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <h1 className="text-slate-950 font-extrabold text-sm tracking-tight font-headline truncate">SVT ERP</h1>
              <p className="text-slate-600 text-[10px] tracking-widest uppercase font-semibold">Shital Vacuum Treat</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 sm:px-3 overscroll-contain [scrollbar-width:thin]" aria-label="Primary navigation">
          <SectionLabel label="Main" collapsed={collapsed} />
          {NAV_MAIN.map(item => <NavItem key={item.to} item={item} onNavigate={onClose} pendingCount={pendingCount} collapsed={collapsed} />)}

          {isManager && (
            <>
              <SectionLabel label="Operations" collapsed={collapsed} />
              {NAV_OPERATIONS.map(item => <NavItem key={item.to} item={item} onNavigate={onClose} collapsed={collapsed} />)}
            </>
          )}

          {isAdmin && (
            <>
              <SectionLabel label="Admin" collapsed={collapsed} />
              {NAV_ADMIN.map(item => <NavItem key={item.to} item={item} onNavigate={onClose} collapsed={collapsed} />)}
              <NavItem item={{ label: 'Users', icon: 'manage_accounts', to: '/admin/users' }} onNavigate={onClose} collapsed={collapsed} />
            </>
          )}
        </nav>

        {/* Collapse toggle — desktop only */}
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex items-center gap-2.5 mx-2 sm:mx-3 mb-1 h-9 px-3 rounded-lg text-slate-500
              hover:text-slate-900 hover:bg-white/85 text-sm font-medium transition-all duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" /> : <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />}
            <span className={collapsed ? 'lg:hidden' : ''}>Collapse</span>
          </button>
        )}

        <div className="px-2 sm:px-3 py-3 sm:py-4 border-t border-sky-200/60 space-y-1 shrink-0 safe-pb">
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-sm
            ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0
                bg-gradient-to-br from-slate-800 to-slate-900 shadow-sm"
              title={collapsed ? `${user?.name} · ${user?.role}` : undefined}
            >
              {initials}
            </div>
            <div className={`flex-1 min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="text-slate-900 text-xs font-bold truncate">{user?.name}</p>
              <p className="text-slate-500 text-[10px] truncate font-semibold uppercase tracking-wide">{user?.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? 'Sign out' : undefined}
            className={`w-full flex items-center gap-2.5 min-h-[44px] sm:min-h-0 sm:h-10 px-3 rounded-lg text-slate-700
              hover:text-rose-600 hover:bg-rose-50 active:scale-[0.99]
              text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300
              ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className={collapsed ? 'lg:hidden' : ''}>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
