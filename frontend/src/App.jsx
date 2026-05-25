import { useState, useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar         from './components/Navbar';
import Sidebar        from './components/Sidebar';
import LoginModal     from './components/LoginModal';
import Dashboard      from './pages/Dashboard';
import Rankings       from './pages/Rankings';
import SquadsPage     from './pages/SquadsPage';
import SquadMatchView from './pages/SquadMatchView';
import AdminPanel     from './pages/AdminPanel';
import MatchManagement  from './pages/MatchManagement';
import PlayerSearch   from './pages/PlayerSearch';
import CompareTeams   from './pages/CompareTeams';
import { LayoutDashboard, Trophy, Users, Shield, Calendar, Search, Scale, Zap, X } from 'lucide-react';

// ── Mobile bottom nav ─────────────────────────────────────────────────────────
function BottomNav() {
  const { isAdmin } = useAuth();
  const items = [
    { to: '/',         label: 'Home',     icon: LayoutDashboard },
    { to: '/rankings', label: 'Rankings', icon: Trophy },
    { to: '/compare',  label: 'Compare',  icon: Scale },
    { to: '/squads',   label: 'Squads',   icon: Users },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: Shield }] : []),
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden
                    flex justify-around items-center h-16
                    bg-[#0C0C0C]/98 backdrop-blur-xl border-t border-white/[0.07]">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-4 py-1.5 transition-all
            ${isActive ? 'text-[#F5C518]' : 'text-white/30 hover:text-white/60'}`}>
          <Icon size={18}/>
          <span className="text-[10px] font-semibold tracking-wide uppercase">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

// ── Live Match Control Bar ───────────────────────────────────────────────────
function LiveMatchBar() {
  const {
    matchMode, setMatchMode,
    teamAFilter, setTeamAFilter,
    teamBFilter, setTeamBFilter
  } = useAuth();

  if (!matchMode) return null;

  const IPL_TEAMS = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'GT', 'LSG', 'PBKS', 'DC'];

  return (
    <div className="card mb-6 p-4 border border-[#F5C518]/20 bg-[#12120B]/90 backdrop-blur-md transition-all duration-300">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Info */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#F5C518]/10 flex items-center justify-center border border-[#F5C518]/30 text-[#F5C518]">
            <Zap size={12} className="fill-current animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5 leading-none">
              Live Match Mode
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse shrink-0" />
            </span>
            <span className="text-[9px] text-white/30 font-semibold mt-0.5">Filtering players across all views</span>
          </div>
        </div>

        {/* Center: Dropdowns */}
        <div className="flex items-center gap-2.5 bg-black/40 px-3 py-1.5 rounded-xl border border-white/[0.04]">
          <div className="flex items-center gap-1.5">
            <select
              value={teamAFilter}
              onChange={e => setTeamAFilter(e.target.value)}
              className="bg-[#0C0C0C] border border-white/10 hover:border-white/20 focus:border-[#F5C518] rounded-lg text-[10px] px-2 py-1 text-white font-extrabold outline-none transition cursor-pointer"
            >
              <option value="">-- TEAM A --</option>
              {IPL_TEAMS.map(team => (
                <option key={team} value={team} disabled={team === teamBFilter}>{team}</option>
              ))}
            </select>
          </div>

          <span className="text-[10px] font-black text-[#F5C518]">VS</span>

          <div className="flex items-center gap-1.5">
            <select
              value={teamBFilter}
              onChange={e => setTeamBFilter(e.target.value)}
              className="bg-[#0C0C0C] border border-white/10 hover:border-white/20 focus:border-[#F5C518] rounded-lg text-[10px] px-2 py-1 text-white font-extrabold outline-none transition cursor-pointer"
            >
              <option value="">-- TEAM B --</option>
              {IPL_TEAMS.map(team => (
                <option key={team} value={team} disabled={team === teamAFilter}>{team}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Exit */}
        <button
          onClick={() => setMatchMode(false)}
          className="px-2.5 py-1 rounded-lg bg-red-950/20 hover:bg-red-900/30 border border-red-900/40 text-red-300 text-[10px] font-extrabold tracking-wider uppercase transition active:scale-95 flex items-center gap-1"
          title="Exit Live Match Mode"
        >
          <X size={10} /> Exit Mode
        </button>
      </div>
    </div>
  );
}

// ── Main layout ───────────────────────────────────────────────────────────────
function Layout() {
  const [loginOpen,   setLoginOpen]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = () => setLoginOpen(true);
    window.addEventListener('open:login', handler);
    return () => window.removeEventListener('open:login', handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#0C0C0C]">
      <Navbar onAdminClick={() => setLoginOpen(true)} onMenuClick={() => setSidebarOpen(true)}/>

      <div className="flex min-h-screen pt-[64px]">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-[240px] shrink-0">
          <div className="fixed top-[64px] left-0 w-[240px] h-[calc(100vh-64px)]">
            <Sidebar/>
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && <Sidebar mobile onClose={() => setSidebarOpen(false)}/>}

        {/* Page content */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 lg:px-10 py-8 max-w-[1200px] w-full mx-auto pb-24 md:pb-10">
          <LiveMatchBar />
          <Routes>
            <Route path="/"                          element={<Dashboard/>}/>
            <Route path="/rankings"                  element={<Rankings/>}/>
            <Route path="/squads"                    element={<SquadsPage/>}/>
            <Route path="/squads/:teamSlug"          element={<SquadMatchView/>}/>
            <Route path="/squad/:teamSlug"           element={<SquadMatchView/>}/>  {/* legacy */}
            <Route path="/compare"                   element={<CompareTeams/>}/>
            <Route path="/admin"                     element={<AdminPanel/>}/>
            <Route path="/matches"                   element={<MatchManagement/>}/>
            <Route path="/player-search"             element={<PlayerSearch/>}/>
          </Routes>
        </main>
      </div>

      <BottomNav/>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)}/>
    </div>
  );
}

export default function App() {
  return <AuthProvider><Layout/></AuthProvider>;
}
