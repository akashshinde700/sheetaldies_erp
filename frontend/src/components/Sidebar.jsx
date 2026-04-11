import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_MAIN = [
  { label: 'Dashboard',    icon: 'dashboard',    to: '/',                       end: true },
  { label: 'Job Cards',    icon: 'description',  to: '/jobcards' },
  { label: 'Job Work',     icon: 'engineering',  to: '/jobwork' },
  { label: 'Inward / Outward', icon: 'import_export', to: '/jobwork/register' },
  { label: 'Certificates', icon: 'verified',     to: '/quality/certificates' },
  { label: 'Invoices',     icon: 'receipt_long', to: '/invoices' },
  /* One entry: highlights on /analytics and /analytics/advanced (prefix match) */
  { label: 'Analytics',    icon: 'analytics',    to: '/analytics' },
];

const NAV_OPERATIONS = [
  { label: 'Pricing & rules', icon: 'payments', to: '/admin/pricing' },
  { label: 'Purchase Orders', icon: 'shopping_cart', to: '/purchase' },
  { label: 'Goods Receipt (GRN)', icon: 'inbox', to: '/purchase/grn' },
  { label: 'Inventory', icon: 'warehouse', to: '/purchase/inventory' },
  { label: 'Supplier Quotes', icon: 'description', to: '/quotes' },
  { label: 'Dispatch', icon: 'local_shipping', to: '/dispatch' },
  { label: 'Manufacturing Batches', icon: 'precision_manufacturing', to: '/manufacturing/batches' },
  { label: 'VHT Runsheet', icon: 'thermostat', to: '/manufacturing/runsheet' },
  { label: 'Daily Planning', icon: 'event_note', to: '/manufacturing/planning' },
  { label: 'Mfg Reports', icon: 'assessment', to: '/manufacturing/reports' },
];

const NAV_ADMIN = [
  { label: 'Parties',         icon: 'group',        to: '/admin/parties' },
  { label: 'Items',           icon: 'inventory',    to: '/admin/items' },
  { label: 'Machines',        icon: 'precision_manufacturing', to: '/admin/machines' },
  { label: 'Process Pricing', icon: 'price_change', to: '/admin/processes' },
  { label: 'Audit Logs',      icon: 'history',      to: '/admin/audit-logs' },
];

const NavItem = ({ item, onNavigate }) => {
  const { pathname } = useLocation();
  /* Job Work matches /jobwork/*; keep register page from highlighting both items */
  const resolvedActive = (routerActive) => {
    if (item.to === '/jobwork' && pathname.startsWith('/jobwork/register')) return false;
    return routerActive;
  };

  return (
  <NavLink
    to={item.to}
    end={item.end ?? false}
    onClick={onNavigate}
    className={({ isActive }) => {
      const active = resolvedActive(isActive);
      return `group flex items-center gap-3 min-h-[44px] sm:min-h-[42px] px-3.5 rounded-xl text-sm font-semibold mb-1
       transition-all duration-200 ease-out
       ${
         active
           ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90 shadow-[inset_3px_0_0_0_rgb(2,132,199)]'
           : 'text-slate-700 hover:text-slate-900 hover:bg-white/85 border border-transparent hover:border-slate-200/70 active:scale-[0.99]'
       }`;
    }}
  >
    {({ isActive }) => (
      <>
        <span
          className={`material-symbols-outlined text-[20px] transition-colors duration-200 shrink-0
            ${resolvedActive(isActive) ? 'text-sky-700' : 'text-slate-500 group-hover:text-sky-700'}`}
        >
          {item.icon}
        </span>
        <span className="truncate flex-1 text-left">{item.label}</span>
      </>
    )}
  </NavLink>
  );
};

const SectionLabel = ({ label }) => (
  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 px-3.5 pt-4 pb-1.5">
    {label}
  </p>
);

export default function Sidebar({ open, onClose }) {
  const { user, logout, isManager, isAdmin } = useAuth();
  const navigate = useNavigate();

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
          className="fixed inset-0 z-30 lg:hidden bg-slate-900/40 backdrop-blur-[2px] animate-backdrop-in"
          onClick={onClose}
        />
      )}

      <aside
        className={`h-dvh h-screen max-h-dvh fixed left-0 top-0 z-40 flex flex-col w-64 max-w-[min(16rem,calc(100vw-1.5rem))]
          border-r border-slate-200/90 shadow-[8px_0_30px_-10px_rgba(15,23,42,0.14)] lg:shadow-none lg:max-w-none
          transition-transform duration-300 ease-out will-change-transform
          bg-app-sidebar safe-pt safe-pb
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-sky-500 via-sky-400 to-blue-500 shrink-0" />

        <div className="px-4 sm:px-5 py-4 sm:py-5 border-b border-sky-200/60 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-slate-900/15
                bg-slate-900 text-white ring-2 ring-white/90 transition-transform duration-200 hover:scale-[1.02]"
            >
              <span className="material-symbols-outlined text-[20px]">precision_manufacturing</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-slate-950 font-extrabold text-sm tracking-tight font-headline truncate">Sheetal Dies</h1>
              <p className="text-slate-600 text-[10px] tracking-widest uppercase font-semibold">ERP System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 sm:px-3 overscroll-contain [scrollbar-width:thin]">
          <SectionLabel label="Main" />
          {NAV_MAIN.map(item => <NavItem key={item.to} item={item} onNavigate={onClose} />)}

          {isManager && (
            <>
              <SectionLabel label="Operations" />
              {NAV_OPERATIONS.map(item => <NavItem key={item.to} item={item} onNavigate={onClose} />)}
            </>
          )}

          {isAdmin && (
            <>
              <SectionLabel label="Admin" />
              {NAV_ADMIN.map(item => <NavItem key={item.to} item={item} onNavigate={onClose} />)}
              <NavItem item={{ label: 'Users', icon: 'manage_accounts', to: '/admin/users' }} onNavigate={onClose} />
            </>
          )}
        </nav>

        <div className="px-2 sm:px-3 py-3 sm:py-4 border-t border-sky-200/60 space-y-1 shrink-0 safe-pb">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition-colors">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0
                bg-slate-800 shadow-sm"
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-900 text-xs font-bold truncate">{user?.name}</p>
              <p className="text-slate-600 text-[10px] truncate font-semibold uppercase tracking-wide">{user?.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 min-h-[44px] px-3 rounded-lg text-slate-700
              hover:text-rose-600 hover:bg-rose-50 active:scale-[0.99]
              text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 rounded-lg"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
