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

// One flat list, in the exact order requested — no section headers.
// `gate` mirrors the route's own role requirement in App.jsx (isManager /
// isAdmin), so an item that would 403 on click never shows in the sidebar.
const NAV_ITEMS = [
  { label: 'Dashboard',       icon: 'dashboard',              to: '/',       end: true },
  // Full connected chain, in the order the work actually happens:
  // Parties -> Inward -> Job Card -> Daily Planning -> VHT Runsheet
  // -> Tempering (hardening's own next step) -> Energy Log (recorded per cycle)
  // -> Certificate -> Rework Data (raised when a cert fails) -> NC Register (raised from that rework) -> Invoice
  { label: 'Parties',         icon: 'group',                  to: '/admin/parties', gate: 'manager' },
  { label: 'Inwards',         icon: 'import_export',          to: '/jobwork/register' },
  { label: 'Job Cards',       icon: 'description',            to: '/jobcards' },
  { label: 'Daily Planning',  icon: 'event_note',             to: '/manufacturing/planning', gate: 'manager' },
  { label: 'VHT Runsheet',    icon: 'thermostat',             to: '/manufacturing/runsheet', gate: 'manager' },
  { label: 'Tempering Plan',  icon: 'device_thermostat',      to: '/manufacturing/tempering', gate: 'manager' },
  { label: 'Energy Log',      icon: 'bolt',                   to: '/manufacturing/energy', gate: 'manager' },
  { label: 'Certificates',    icon: 'verified',               to: '/quality/certificates' },
  { label: 'Rework Data',     icon: 'build_circle',           to: '/quality/rework-data', gate: 'operator' },
  { label: 'NC Register',     icon: 'report_problem',         to: '/quality/nc-register', gate: 'operator' },
  { label: 'Invoices',        icon: 'receipt_long',           to: '/invoices' },
  // Periodic furnace registers — their own connected chain: daily entry ->
  // monthly rollup -> derived plant-wide summary. Not per-job, so kept
  // together right after the main chain rather than inside it.
  { label: 'Furnace Utilisation', icon: 'speed',               to: '/manufacturing/utilization', gate: 'manager' },
  { label: 'Monthly Idle Time', icon: 'hourglass_empty',       to: '/manufacturing/idle-time', gate: 'manager' },
  { label: 'Plant Losses',    icon: 'trending_down',           to: '/manufacturing/plant-losses', gate: 'manager' },
  { label: 'Customer Quotes', icon: 'request_quote',          to: '/customer-quotes' },
  { label: 'Pending List',    icon: 'pending_actions',        to: '/pending', badge: true },
  { label: 'Analytics',       icon: 'analytics',              to: '/analytics' },
  { label: 'Dispatch',        icon: 'local_shipping',         to: '/dispatch' },
  { label: 'Inventory',       icon: 'warehouse',              to: '/inventory' },
  { label: 'Party Rates',       icon: 'price_check',             to: '/admin/party-rates',       gate: 'manager' },
  { label: 'Processes',         icon: 'settings_suggest',        to: '/admin/processes',          gate: 'manager' },
  { label: 'HT Specs',          icon: 'local_fire_department',   to: '/admin/heat-treat-specs',   gate: 'manager' },
  { label: 'Temp Cycle Graphs', icon: 'show_chart',              to: '/admin/temp-cycle-graphs',  gate: 'manager' },
  { label: 'Items',             icon: 'inventory',               to: '/admin/items',              gate: 'manager' },
  { label: 'Machines',          icon: 'precision_manufacturing', to: '/admin/machines',           gate: 'manager' },
  { label: 'Users',      icon: 'manage_accounts', to: '/admin/users',      gate: 'admin' },
  { label: 'Audit Logs', icon: 'history',         to: '/admin/audit-logs', gate: 'admin' },
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
           ? 'bg-primary-600 text-white shadow-nav-active'
           : 'text-[#DDD8D2] hover:text-white hover:bg-white/10 active:scale-[0.99]'
       }`;
    }}
  >
    {({ isActive }) => (
      <>
        <span
          className={`material-symbols-outlined text-[18px] transition-colors duration-200 shrink-0
            ${resolvedActive(isActive) ? 'text-white' : 'text-[#948C7F] group-hover:text-[#DDD8D2]'}`}
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

export default function Sidebar({ open, onClose, collapsed = false, onToggleCollapsed }) {
  const { user, logout, isManager, isAdmin, isOperator } = useAuth();
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
          className="print:hidden fixed inset-0 z-30 lg:hidden bg-[#171412]/40 backdrop-blur-[2px] animate-backdrop-in"
          onClick={onClose}
        />
      )}

      <aside
        role="navigation"
        aria-label="Main menu"
        className={`print:hidden h-dvh h-screen max-h-dvh fixed left-0 top-0 z-40 flex flex-col w-64 max-w-[min(16rem,calc(100vw-1.5rem))]
          border-r border-white/10 shadow-[8px_0_30px_-10px_rgba(23,20,18,0.35)] lg:shadow-none lg:max-w-none
          transition-[transform,width] duration-300 ease-out will-change-transform
          bg-[#262220] dark:bg-[#171412] safe-pt safe-pb
          ${collapsed ? 'lg:w-[4.75rem]' : 'lg:w-64'}
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="h-0.5 w-full bg-primary-600 shrink-0" />

        <div className={`px-4 sm:px-5 py-4 sm:py-5 border-b border-white/10 shrink-0 ${collapsed ? 'lg:px-0' : ''}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'lg:justify-center' : ''}`}>
            <img
              src="/logo.png"
              alt="SVT"
              className="h-10 w-auto flex-shrink-0 rounded transition-transform duration-200 hover:scale-[1.02]"
            />
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <h1 className="text-white font-extrabold text-sm tracking-tight font-headline truncate">SVT ERP</h1>
              <p className="text-[#DDD8D2]/60 text-[10px] tracking-widest uppercase font-semibold">Shital Vacuum Treat</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 sm:px-3 overscroll-contain [scrollbar-width:thin]" aria-label="Primary navigation">
          {NAV_ITEMS
            .filter(item => item.gate === 'admin' ? isAdmin : item.gate === 'manager' ? isManager : item.gate === 'operator' ? isOperator : true)
            .map(item => (
              <NavItem key={item.to} item={item} onNavigate={onClose} pendingCount={pendingCount} collapsed={collapsed} />
            ))}
        </nav>

        {/* Collapse toggle — desktop only */}
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex items-center gap-2.5 mx-2 sm:mx-3 mb-1 h-9 px-3 rounded-lg text-[#948C7F]
              hover:text-white hover:bg-white/10 text-sm font-medium transition-all duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" /> : <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />}
            <span className={collapsed ? 'lg:hidden' : ''}>Collapse</span>
          </button>
        )}

        <div className="px-2 sm:px-3 py-3 sm:py-4 border-t border-white/10 space-y-1 shrink-0 safe-pb">
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10
            ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0
                bg-primary-600 shadow-sm"
              title={collapsed ? `${user?.name} · ${user?.role}` : undefined}
            >
              {initials}
            </div>
            <div className={`flex-1 min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="text-white text-xs font-bold truncate">{user?.name}</p>
              <p className="text-[#DDD8D2]/60 text-[10px] truncate font-semibold uppercase tracking-wide">{user?.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? 'Sign out' : undefined}
            className={`w-full flex items-center gap-2.5 min-h-[44px] sm:min-h-0 sm:h-10 px-3 rounded-lg text-[#DDD8D2]
              hover:text-rose-400 hover:bg-rose-500/10 active:scale-[0.99]
              text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40
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
