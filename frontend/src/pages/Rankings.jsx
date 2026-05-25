import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRankings } from '../hooks/usePlayers';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="skeleton w-9 h-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-36" />
        <div className="skeleton h-3 w-24" />
      </div>
      <div className="skeleton h-7 w-24" />
    </div>
  );
}

// ─── IPL Team → color map ─────────────────────────────────────────────────────
const IPL_COLORS = {
  CSK:  { bg: '#F5C518', text: '#000' },
  MI:   { bg: '#004BA0', text: '#fff' },
  RCB:  { bg: '#EC1C24', text: '#fff' },
  KKR:  { bg: '#3A225D', text: '#FFD700' },
  SRH:  { bg: '#FF6B00', text: '#fff' },
  RR:   { bg: '#E91E8C', text: '#fff' },
  GT:   { bg: '#1B2A5F', text: '#B8860B' },
  LSG:  { bg: '#00BCD4', text: '#000' },
  PBKS: { bg: '#DC143C', text: '#fff' },
  DC:   { bg: '#17479E', text: '#FF3B3B' },
  PUN:  { bg: '#8A2BE2', text: '#fff' },
};

function IplBadge({ team }) {
  const c = IPL_COLORS[team] || { bg: '#333', text: '#fff' };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wide"
      style={{ background: c.bg, color: c.text }}
    >
      {team}
    </span>
  );
}

const SKILL_CHIP = {
  BAT:  'chip-bat',
  BOWL: 'chip-bowl',
  ALL:  'chip-all',
  WK:   'chip-wk',
};

// ─── Rank card styling ────────────────────────────────────────────────────────
const RANK_STYLES = [
  { card: 'border border-[#F5C518]/30', badge: 'bg-[#F5C518] text-black', pts: 'text-[#F5C518]', emoji: '🥇', glow: '0 0 30px rgba(245,197,24,0.10)' },
  { card: 'border border-white/10',     badge: 'bg-white/15 text-white',   pts: 'text-white',    emoji: '🥈', glow: '' },
  { card: 'border border-orange-800/30',badge: 'bg-orange-700/40 text-orange-300', pts: 'text-orange-300', emoji: '🥉', glow: '' },
];

const STATUS_STYLE = {
  '🥇 CHAMPION':    'text-[#F5C518]   bg-[#F5C518]/8   border-[#F5C518]/20',
  '🥈 RUNNER UP':   'text-white/70    bg-white/5       border-white/10',
  '🥉 3rd PLACE':   'text-orange-300  bg-orange-900/20 border-orange-700/30',
  '🔥 IN FORM':     'text-emerald-400 bg-emerald-900/20 border-emerald-700/30',
  '✅ MID TABLE':   'text-blue-400    bg-blue-900/20   border-blue-700/30',
  '⚠️ LOWER HALF': 'text-amber-400   bg-amber-900/20  border-amber-700/30',
  '🔴 BOTTOM 2':   'text-red-400     bg-red-900/20    border-red-700/30',
};

// ─── Team Detail Modal ────────────────────────────────────────────────────────
function TeamDetailModal({ entry, allPlayers, onClose }) {
  const teamPlayers = useMemo(() => {
    if (!allPlayers.length) return [];
    return allPlayers
      .filter(p => p.team?.toLowerCase().trim() === entry.team?.toLowerCase().trim())
      .sort((a, b) => b.points - a.points);
  }, [allPlayers, entry.team]);

  const maxPts = Math.max(...teamPlayers.map(p => p.points), 1);

  // Role breakdown
  const roleBreakdown = useMemo(() => {
    const roles = {};
    teamPlayers.forEach(p => {
      const s = p.skill?.toUpperCase() || 'OTHER';
      if (!roles[s]) roles[s] = { count: 0, pts: 0 };
      roles[s].count++;
      roles[s].pts += p.points;
    });
    return Object.entries(roles).sort((a, b) => b[1].pts - a[1].pts);
  }, [teamPlayers]);

  const cfg = RANK_STYLES[entry.rank - 1];
  const top3 = entry.rank <= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-3xl mb-10"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className={`card ${top3 ? cfg.card : ''} p-6 mb-3`}
             style={top3 && cfg.glow ? { boxShadow: cfg.glow } : {}}>
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-white/25 hover:text-white hover:bg-white/8 transition"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-5">
            {/* Rank badge */}
            <div className={`rank-badge text-xl shrink-0 ${top3 ? cfg.badge : 'bg-white/[0.05] text-white/40 font-bold font-mono'}`}
                 style={{ width: 52, height: 52, fontSize: top3 ? 26 : 18 }}>
              {top3 ? cfg.emoji : entry.rank}
            </div>

            <div className="flex-1 min-w-0">
              <p className="label text-[#F5C518] mb-1">Fantasy Team</p>
              <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">{entry.team}</h2>
              <p className="text-sm text-white/40 mt-0.5">{entry.owner}</p>
            </div>

            <div className="text-right shrink-0">
              <p className={`text-3xl font-black font-mono ${top3 ? cfg.pts : 'text-white'}`}>
                {entry.totalPoints?.toLocaleString()}
              </p>
              <p className="label mt-0.5">Total Points</p>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/[0.06]">
            {entry.status && (
              <span className={`inline-flex items-center border rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide
                               ${STATUS_STYLE[entry.status] || 'text-white/40 bg-white/5 border-white/10'}`}>
                {entry.status}
              </span>
            )}
            {entry.capVc && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10
                               text-[11px] text-white/50 font-mono">
                <Zap size={10} className="text-[#F5C518]" /> {entry.capVc}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 text-[11px] text-white/40">
              <Users size={10} /> {teamPlayers.length} Players
            </span>
          </div>
        </div>

        {/* ── Role breakdown ──────────────────────────────────────────────────── */}
        {roleBreakdown.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {roleBreakdown.map(([role, data]) => (
              <div key={role} className="card p-3 text-center">
                <span className={`chip ${SKILL_CHIP[role] || 'chip-all'} mb-2`}>{role}</span>
                <p className="text-base font-bold text-white font-mono">{data.pts.toLocaleString()}</p>
                <p className="label mt-0.5">{data.count} player{data.count > 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Player table ────────────────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2rem_1fr_4rem_3.5rem_5rem] gap-3 px-5 py-3
                          bg-white/[0.02] border-b border-white/[0.06]">
            {['#', 'Player', 'IPL', 'Skill', 'Points'].map((h, i) => (
              <span key={i} className={`label ${i === 4 ? 'text-right' : ''}`}>{h}</span>
            ))}
          </div>

          {teamPlayers.length === 0 ? (
            <div className="py-12 text-center text-sm text-white/25">
              No players found for this team
            </div>
          ) : (
            <div>
              {teamPlayers.map((player, idx) => {
                const pct = maxPts > 0 ? (player.points / maxPts) * 100 : 0;
                const hasPoints = player.points > 0;
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.025, duration: 0.2 }}
                    className="relative grid grid-cols-[2rem_1fr_4rem_3.5rem_5rem] gap-3
                               px-5 py-3 items-center border-b border-white/[0.04] last:border-0
                               hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Points bar background */}
                    {hasPoints && (
                      <div
                        className="absolute inset-y-0 left-0 opacity-[0.04] pointer-events-none"
                        style={{
                          width: `${pct}%`,
                          background: idx === 0 ? '#F5C518' : '#7C3AED',
                          borderRadius: '0 4px 4px 0',
                        }}
                      />
                    )}

                    {/* Rank number */}
                    <span className="text-xs font-mono text-white/20 font-semibold z-10">{idx + 1}</span>

                    {/* Player name */}
                    <span className="text-sm font-medium text-white truncate z-10">{player.name}</span>

                    {/* IPL team badge */}
                    <div className="z-10">
                      <IplBadge team={player.iplTeam} />
                    </div>

                    {/* Skill chip */}
                    <div className="z-10">
                      <span className={`chip ${SKILL_CHIP[player.skill?.toUpperCase()] || 'chip-all'}`}>
                        {player.skill || '—'}
                      </span>
                    </div>

                    {/* Points */}
                    <span className={`text-right text-sm font-mono font-bold z-10 ${
                      !hasPoints ? 'text-white/15' : idx === 0 ? 'text-[#F5C518]' : 'text-white'
                    }`}>
                      {hasPoints ? player.points.toLocaleString() : '—'}
                    </span>
                  </motion.div>
                );
              })}

              {/* Team total row */}
              <div className="grid grid-cols-[2rem_1fr_4rem_3.5rem_5rem] gap-3
                              px-5 py-3.5 items-center bg-white/[0.02] border-t border-white/[0.08]">
                <span />
                <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Team Total</span>
                <span />
                <span />
                <span className="text-right text-base font-black font-mono text-[#F5C518]">
                  {entry.totalPoints?.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Points contribution bar chart ───────────────────────────────────── */}
        {teamPlayers.length > 0 && (
          <div className="card p-5 mt-3">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-[#F5C518]" />
              <p className="text-sm font-semibold text-white">Points Contribution</p>
            </div>
            <div className="space-y-2">
              {teamPlayers.filter(p => p.points > 0).map((player, idx) => {
                const pct = (player.points / entry.totalPoints) * 100;
                return (
                  <div key={player.id} className="flex items-center gap-3">
                    <span className="text-[11px] text-white/40 w-5 text-right font-mono">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-white/70 truncate font-medium">{player.name}</span>
                        <span className="text-[11px] font-mono text-white/50 shrink-0 ml-2">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: idx * 0.04, duration: 0.5, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{
                            background: idx < 3
                              ? `linear-gradient(90deg, #F5C518, #EDB800)`
                              : `linear-gradient(90deg, #7C3AED, #6D28D9)`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-white/60 w-12 text-right shrink-0">
                      {player.points.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Rank Card (list item) ────────────────────────────────────────────────────
function RankCard({ entry, index }) {
  const navigate = useNavigate();
  const cfg  = RANK_STYLES[entry.rank - 1];
  const top3 = entry.rank <= 3;

  function goToSquad() {
    navigate(`/squad/${encodeURIComponent(entry.team)}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.22 }}
      className={`card-hover overflow-hidden rounded-xl cursor-pointer transition-all duration-150 ${top3 ? cfg.card : ''}`}
      style={top3 && cfg.glow ? { boxShadow: cfg.glow } : {}}
      onClick={goToSquad}
    >
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Rank badge */}
        <div className={`rank-badge shrink-0 ${
          top3
            ? cfg.badge
            : 'bg-white/[0.05] text-white/35 text-sm font-bold font-mono'
        }`} style={top3 ? { fontSize: 20 } : {}}>
          {top3 ? cfg.emoji : entry.rank}
        </div>

        {/* Team name + owner */}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-white truncate leading-tight ${entry.rank === 1 ? 'text-base' : 'text-sm'}`}>
            {entry.team}
          </p>
          <p className="text-xs text-white/30 mt-0.5 truncate">{entry.owner}</p>
        </div>

        {/* Points + status + arrow */}
        <div className="flex items-center gap-3 shrink-0">
          {entry.status && (
            <span className={`hidden sm:inline-flex items-center border rounded-full px-2.5 py-0.5
                             text-[10px] font-semibold tracking-wide
                             ${STATUS_STYLE[entry.status] || 'text-white/40 bg-white/5 border-white/10'}`}>
              {entry.status}
            </span>
          )}
          <div className="text-right">
            <p className={`font-mono font-bold text-lg leading-tight ${top3 ? cfg.pts : 'text-white'}`}>
              {entry.totalPoints?.toLocaleString()}
            </p>
            <p className="label">pts</p>
          </div>
          <ArrowRight size={14} className="text-white/15 group-hover:text-white/40 transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}

export default function Rankings() {
  const navigate = useNavigate();
  const { rankings, loading, error, refetch } = useRankings();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="label text-[#F5C518] mb-1.5">Season 2025</p>
          <h1 className="text-2xl font-black text-white tracking-tight">League Rankings</h1>
          <p className="text-sm text-white/30 mt-0.5">Click any team to view full squad →</p>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="mt-1 p-2 rounded-lg text-white/25 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all shrink-0"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin text-[#F5C518]' : ''} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="card py-16 text-center">
          <p className="text-sm text-red-400 mb-3">{error}</p>
          <button onClick={refetch} className="btn btn-primary">Retry</button>
        </div>
      )}

      {/* Rankings list */}
      {!loading && !error && (
        <div className="space-y-2">
          {rankings.map((entry, i) => (
            <RankCard
              key={entry.team}
              entry={entry}
              index={i}
            />
          ))}
          {rankings.length === 0 && (
            <div className="card py-16 text-center text-sm text-white/25">No rankings available</div>
          )}
        </div>
      )}
    </div>
  );
}
