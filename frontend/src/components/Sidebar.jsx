import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_MAIN = [
  { label: 'Dashboard',    icon: 'dashboard',    to: '/',                       end: true },
  { label: 'Job Cards',    icon: 'description',  to: '/jobcards' },
  { label: 'Job Work',     icon: 'engineering',  to: '/jobwork' },
  { label: 'Certificates', icon: 'verified',     to: '/quality/certificates' },
  { label: 'Invoices',     icon: 'receipt_long', to: '/invoices' },
  { label: 'Analytics',    icon: 'analytics',    to: '/analytics' },
];

const NAV_OPERATIONS = [
  { label: 'Purchase Orders', icon: 'shopping_cart', to: '/purchase' },
  { label: 'Goods Receipt (GRN)', icon: 'inbox', to: '/purchase/grn' },
  { label: 'Inventory', icon: 'warehouse', to: '/purchase/inventory' },
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

const NavItem = ({ item, onNavigate }) => (
  <NavLink
    to={item.to}
    end={item.end}
    onClick={onNavigate}
    className={({ isActive }) =>
      `flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
        isActive
          ? 'bg-indigo-500/20 text-indigo-200 shadow-sm'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <span className={`material-symbols-outlined text-[18px] transition-colors ${isActive ? 'text-indigo-300' : ''}`}>
          {item.icon}
        </span>
        <span className="truncate">{item.label}</span>
        {isActive && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
        )}
      </>
    )}
  </NavLink>
);

const SectionLabel = ({ label }) => (
  <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-600 px-3 pt-4 pb-1.5">
    {label}
  </p>
);

export default function Sidebar({ open, onClose }) {
  const { user, logout, isManager, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <>
      {/* Mobile backdrop overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`h-screen w-64 fixed left-0 top-0 z-40 flex flex-col transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)' }}
      >
        {/* Subtle top border accent */}
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 opacity-80" />

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <span className="material-symbols-outlined text-white text-[18px]">precision_manufacturing</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-extrabold text-sm tracking-wide font-headline truncate">Sheetal Dies</h1>
              <p className="text-indigo-400 text-[9px] tracking-[0.15em] uppercase font-medium">ERP System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-3">
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

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-white/5 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
              <p className="text-indigo-400 text-[10px] truncate font-medium">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 text-sm font-semibold transition-all duration-150"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
