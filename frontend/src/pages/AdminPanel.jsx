import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Save, CheckCircle, AlertCircle, Loader,
  ShieldOff, RefreshCw, Clock, Zap, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayers } from '../hooks/usePlayers';
import { updatePoints } from '../utils/api';

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium pointer-events-auto
              ${t.type === 'success'
                ? 'bg-[#0C1F12] border-emerald-800/50 text-emerald-300'
                : 'bg-[#1F0C0C] border-red-800/50 text-red-300'}`}
          >
            {t.type === 'success'
              ? <CheckCircle size={15} className="text-emerald-400 shrink-0" />
              : <AlertCircle size={15} className="text-red-400 shrink-0" />}
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Player Row ───────────────────────────────────────────────────────────────
function PlayerRow({ player, onSave }) {
  const [value,   setValue]   = useState(String(player.points ?? 0));
  const [status,  setStatus]  = useState('idle'); // idle | saving | saved
  const dirty = parseInt(value, 10) !== (player.points ?? 0) && !isNaN(parseInt(value, 10));

  // Sync if player data refreshes from server
  useEffect(() => {
    if (status !== 'saving') setValue(String(player.points ?? 0));
  }, [player.points]);

  async function handleSave() {
    const val = parseInt(value, 10);
    if (isNaN(val) || val < 0 || status === 'saving') return;
    setStatus('saving');
    try {
      await onSave(player.name, val);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('idle');
    }
  }

  const isSaving = status === 'saving';
  const isSaved  = status === 'saved';

  return (
    <tr className={`group border-b border-white/[0.04] last:border-0 transition-colors
                    ${dirty ? 'bg-[#F5C518]/[0.025]' : 'hover:bg-white/[0.02]'}`}>

      {/* Player */}
      <td className="px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2.5">
          {/* Dirty indicator */}
          {dirty && !isSaved && !isSaving && (
            <span className="w-2 h-2 rounded-full bg-[#F5C518] shrink-0 animate-pulse" title="Unsaved changes" />
          )}
          {isSaved && (
            <CheckCircle size={14} className="text-emerald-400 shrink-0" />
          )}
          {!dirty && !isSaved && <span className="w-2 h-2 shrink-0" />}
          <span className="text-sm font-medium text-white leading-tight">{player.name}</span>
        </div>
      </td>

      {/* Fantasy team */}
      <td className="px-3 py-3.5 hidden sm:table-cell">
        <span className="text-sm text-white/45 truncate max-w-[120px] block">{player.team}</span>
      </td>

      {/* IPL team */}
      <td className="px-3 py-3.5 hidden md:table-cell">
        <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/[0.07] text-white/60">{player.iplTeam}</span>
      </td>

      {/* Skill */}
      <td className="px-3 py-3.5 hidden lg:table-cell">
        <span className={`chip text-[10px] ${
          { BAT: 'chip-bat', BOWL: 'chip-bowl', ALL: 'chip-all', WK: 'chip-wk' }[player.skill?.toUpperCase()] || 'chip-all'
        }`}>{player.skill || '—'}</span>
      </td>

      {/* Points input */}
      <td className="px-3 py-3 sm:px-4">
        <input
          type="number"
          min="0"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          disabled={isSaving}
          className={`w-full sm:w-24 md:w-28 text-right font-mono text-sm py-2.5 sm:py-2 px-3 rounded-lg border
                      bg-[#181818] outline-none transition-all duration-150 disabled:opacity-50
                      ${dirty
                        ? 'border-[#F5C518]/50 text-[#F5C518] focus:ring-1 focus:ring-[#F5C518]/30'
                        : 'border-white/[0.08] text-white/70 focus:border-white/20'
                      }`}
          style={{ minHeight: 44 }}
        />
      </td>

      {/* Save button */}
      <td className="px-3 py-3 pr-4 sm:pr-5">
        <button
          onClick={handleSave}
          disabled={!dirty || isSaving || isSaved}
          style={{ minHeight: 44, minWidth: 44 }}
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold
                      transition-all duration-150 active:scale-95
                      ${isSaved
                        ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/40'
                        : dirty && !isSaving
                          ? 'bg-[#F5C518] text-black hover:bg-[#EDB800] shadow-[0_0_14px_rgba(245,197,24,0.2)] hover:shadow-[0_0_20px_rgba(245,197,24,0.35)]'
                          : 'bg-white/[0.04] text-white/20 cursor-not-allowed border border-white/[0.06]'
                      }`}
        >
          {isSaving ? (
            <Loader size={13} className="animate-spin" />
          ) : isSaved ? (
            <><CheckCircle size={13} /> Saved</>
          ) : (
            <><Save size={13} /> Save</>
          )}
        </button>
      </td>
    </tr>
  );
}

// ─── Access Denied ────────────────────────────────────────────────────────────
function AccessDenied({ onLoginClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 gap-5"
    >
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
        <ShieldOff size={28} className="text-white/20" />
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-white">Access Denied</p>
        <p className="text-sm text-white/35 mt-1">You need admin privileges to view this page.</p>
      </div>
      <button onClick={onLoginClick} className="btn btn-primary px-6 py-2.5">
        Admin Login
      </button>
    </motion.div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { isAdmin } = useAuth();
  const { players, loading, error, refetch } = usePlayers();
  const [search,    setSearch]    = useState('');
  const [toasts,    setToasts]    = useState([]);
  const [lastSync,  setLastSync]  = useState(null);
  const [saveAllOn, setSaveAllOn] = useState(false);
  const rowRefs = useRef({});

  // Track dirty row names for "Save All" count
  const [dirtyNames, setDirtyNames] = useState(new Set());

  // Toast system
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // Handle save
  const handleSave = useCallback(async (name, points) => {
    try {
      await updatePoints(name, points);
      setLastSync(new Date());
      addToast(`✓ ${name} → ${points} pts`);
      setDirtyNames(prev => { const s = new Set(prev); s.delete(name); return s; });
      await new Promise(r => setTimeout(r, 1000));
      refetch();
    } catch (err) {
      addToast(err.response?.data?.error || `Failed to update ${name}`, 'error');
      throw err;
    }
  }, [addToast, refetch]);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return players;
    const q = search.toLowerCase();
    return players.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.team?.toLowerCase().includes(q) ||
      p.iplTeam?.toLowerCase().includes(q)
    );
  }, [players, search]);

  // Stats
  const stats = useMemo(() => {
    const total = players.reduce((s, p) => s + (p.points || 0), 0);
    const maxP = players.reduce((m, p) => p.points > m.points ? p : m, players[0] || {});
    return { count: players.length, total, topPlayer: maxP };
  }, [players]);

  if (!isAdmin) {
    return <AccessDenied onLoginClick={() => window.dispatchEvent(new Event('open:login'))} />;
  }

  return (
    <div className="space-y-5 animate-fade-in pb-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="label text-[#F5C518] mb-1.5">Admin Only</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Admin Panel</h1>
          <p className="text-sm text-white/30 mt-0.5">Edit player points — syncs to Google Sheets</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Last sync */}
          {lastSync && (
            <span className="flex items-center gap-1.5 text-[11px] text-white/30 font-mono">
              <Clock size={11} />
              {lastSync.toLocaleTimeString()}
            </span>
          )}

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400
                          bg-emerald-900/20 border border-emerald-800/30 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Sync
          </div>

          {/* Refresh */}
          <button
            onClick={refetch}
            disabled={loading}
            className="p-2 rounded-lg text-white/25 hover:text-white hover:bg-white/5
                       border border-transparent hover:border-white/10 transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[#F5C518]' : ''} />
          </button>
        </div>
      </div>

      {/* ── Stats strip ────────────────────────────────────────────────────── */}
      {!loading && players.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total Players', value: stats.count, icon: <Zap size={13} className="text-[#F5C518]" /> },
            { label: 'Total Points', value: stats.total.toLocaleString(), icon: <CheckCircle size={13} className="text-emerald-400" /> },
            { label: 'Top Scorer', value: stats.topPlayer?.name?.split(' ')[0] || '—', sub: `${(stats.topPlayer?.points || 0).toLocaleString()} pts`, icon: <Zap size={13} className="text-purple-400" /> },
          ].map((s, i) => (
            <div key={i} className={`card p-3.5 sm:p-4 ${i === 2 ? 'hidden sm:block' : ''}`}>
              <div className="flex items-center gap-2 mb-1.5">{s.icon}<p className="label">{s.label}</p></div>
              <p className="text-xl font-bold text-white font-mono tracking-tight">{s.value}</p>
              {s.sub && <p className="text-xs text-white/30 mt-0.5 font-mono">{s.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search players, teams…"
          className="input pl-9 py-2.5"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white transition"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {/* Sticky scrollable wrapper */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">

            {/* Table head */}
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                {[
                  ['Player', 'text-left px-4 sm:px-5 py-3'],
                  ['Fantasy Team', 'text-left px-3 py-3 hidden sm:table-cell'],
                  ['IPL', 'text-left px-3 py-3 hidden md:table-cell'],
                  ['Skill', 'text-left px-3 py-3 hidden lg:table-cell'],
                  ['Points', 'text-right px-3 sm:px-4 py-3'],
                  ['', 'px-3 pr-4 sm:pr-5 py-3 w-24'],
                ].map(([h, cls], i) => (
                  <th key={i} className={`${cls} label whitespace-nowrap`}>{h}</th>
                ))}
              </tr>
            </thead>

            {/* Loading */}
            {loading && (
              <tbody>
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <Loader size={20} className="animate-spin text-[#F5C518] mx-auto mb-3" />
                    <p className="text-sm text-white/25">Loading players…</p>
                  </td>
                </tr>
              </tbody>
            )}

            {/* Error */}
            {error && !loading && (
              <tbody>
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <AlertTriangle size={20} className="text-red-400 mx-auto mb-3" />
                    <p className="text-sm text-red-400 mb-3">{error}</p>
                    <button onClick={refetch} className="btn btn-primary">Retry</button>
                  </td>
                </tr>
              </tbody>
            )}

            {/* Rows */}
            {!loading && !error && (
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-sm text-white/25">
                      No players match "{search}"
                    </td>
                  </tr>
                ) : (
                  filtered.map(player => (
                    <PlayerRow
                      key={player.id}
                      player={player}
                      onSave={handleSave}
                    />
                  ))
                )}
              </tbody>
            )}
          </table>
        </div>

        {/* Row count footer */}
        {!loading && !error && players.length > 0 && (
          <div className="border-t border-white/[0.05] px-5 py-3 flex items-center justify-between bg-white/[0.01]">
            <p className="text-[11px] text-white/25 font-mono">
              {filtered.length === players.length
                ? `${players.length} players`
                : `${filtered.length} of ${players.length} players`}
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="text-[11px] text-white/30 hover:text-white/60 transition">
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Toast stack ────────────────────────────────────────────────────── */}
      <Toast toasts={toasts} />
    </div>
  );
}
