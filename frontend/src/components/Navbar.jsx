import { Shield, LogOut, Zap, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ onAdminClick, onMenuClick }) {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[64px] flex items-center justify-between px-5 sm:px-6
                       bg-[#0C0C0C]/97 backdrop-blur-lg border-b border-white/[0.07]">
      {/* ── Left: hamburger + logo ── */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-white/40 hover:text-white transition rounded-lg hover:bg-white/5 active:scale-95"
          aria-label="Open menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[#F5C518] flex items-center justify-center shadow-[0_0_12px_rgba(245,197,24,0.3)]">
            <Zap size={15} className="text-black" fill="currentColor" />
          </div>
          <span className="font-black text-[17px] tracking-tight text-white select-none">
            Fantasy<span className="text-[#F5C518]"> IPL</span>
          </span>
        </a>

        <div className="live-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse-dot" />
          Live
        </div>
      </div>

      {/* ── Right: auth controls ── */}
      <div className="flex items-center gap-2 sm:gap-3">
        {isAdmin ? (
          <>
            {/* Admin badge — visible on sm+ */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl
                            bg-[#F5C518]/10 border border-[#F5C518]/25
                            shadow-[0_0_16px_rgba(245,197,24,0.08)]">
              <UserCircle size={15} className="text-[#F5C518]" />
              <span className="text-[12px] font-bold tracking-wider text-[#F5C518] uppercase">Admin</span>
            </div>

            {/* Mobile admin dot */}
            <div className="sm:hidden w-2 h-2 rounded-full bg-[#F5C518] shadow-[0_0_6px_rgba(245,197,24,0.6)]" />

            <button
              onClick={() => { logout(); navigate('/'); }}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5
                         rounded-xl text-[12px] sm:text-[13px] font-semibold
                         text-white/50 border border-white/10
                         hover:text-white hover:border-white/20 hover:bg-white/5
                         active:scale-95 transition-all duration-150"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </>
        ) : (
          <button
            onClick={onAdminClick}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5
                       rounded-xl text-[13px] font-semibold
                       text-white/70 border border-white/15
                       hover:text-white hover:border-white/30 hover:bg-white/5
                       hover:shadow-[0_0_20px_rgba(124,58,237,0.15)]
                       active:scale-95 transition-all duration-150"
          >
            <Shield size={14} className="text-white/50" />
            Admin Login
          </button>
        )}
      </div>
    </header>
  );
}
