import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Trophy, Shield, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const baseLinks = [
  { to: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { to: '/rankings', label: 'Rankings',  icon: Trophy },
];

export default function Sidebar({ mobile, onClose }) {
  const { isAdmin } = useAuth();
  const navItems = isAdmin
    ? [...baseLinks, { to: '/admin', label: 'Admin', icon: Shield }]
    : baseLinks;

  return (
    <aside className={`${mobile ? 'fixed inset-0 z-40 flex' : 'hidden md:flex'} flex-col`}>
      {mobile && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      )}

      <nav className={`
        relative z-10 flex flex-col
        w-[240px] h-full
        bg-[#0C0C0C] border-r border-white/[0.07]
        pt-[64px]
      `}>
        {mobile && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-md text-white/30 hover:text-white hover:bg-white/5 transition"
          >
            <X size={16} />
          </button>
        )}

        {/* Nav section */}
        <div className="px-4 pt-6 pb-3">
          <p className="label px-3 mb-3">Menu</p>
          <div className="flex flex-col gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={mobile ? onClose : undefined}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="px-6 py-5 border-t border-white/[0.06]">
          <p className="label">IPL Season 2025</p>
        </div>
      </nav>
    </aside>
  );
}
