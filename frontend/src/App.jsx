import { useState, useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar         from './components/Navbar';
import Sidebar        from './components/Sidebar';
import ScrollController from './components/ScrollController';
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
      <ScrollController />
    </div>
  );
}

export default function App() {
  return <AuthProvider><Layout/></AuthProvider>;
}
