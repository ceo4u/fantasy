import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Trophy, Zap, Users, TrendingUp,
  Star, Shield, Activity
} from 'lucide-react';
import { useRankings, usePlayers } from '../hooks/usePlayers';

// ─── Constants ────────────────────────────────────────────────────────────────
const IPL_COLORS = {
  CSK:  { bg: '#D4A017', text: '#000', glow: 'rgba(212,160,23,0.25)' },
  MI:   { bg: '#1A56B0', text: '#fff', glow: 'rgba(26,86,176,0.25)'  },
  RCB:  { bg: '#CC1418', text: '#fff', glow: 'rgba(204,20,24,0.25)'  },
  KKR:  { bg: '#3A225D', text: '#FFD700', glow: 'rgba(58,34,93,0.35)' },
  SRH:  { bg: '#E05A00', text: '#fff', glow: 'rgba(224,90,0,0.25)'   },
  RR:   { bg: '#C0176A', text: '#fff', glow: 'rgba(192,23,106,0.25)' },
  GT:   { bg: '#1C2B5E', text: '#C9A84C', glow: 'rgba(28,43,94,0.35)'},
  LSG:  { bg: '#00A0B4', text: '#000', glow: 'rgba(0,160,180,0.25)'  },
  PBKS: { bg: '#B5121B', text: '#fff', glow: 'rgba(181,18,27,0.25)'  },
  DC:   { bg: '#0F4B9C', text: '#fff', glow: 'rgba(15,75,156,0.25)'  },
  PUN:  { bg: '#7B26CC', text: '#fff', glow: 'rgba(123,38,204,0.25)' },
};

const ROLE_CONFIG = {
  BAT:  { label: 'Batters',         color: '#60A5FA', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  icon: '🏏' },
  WK:   { label: 'Wicketkeepers',   color: '#C084FC', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)', icon: '🧤' },
  ALL:  { label: 'All-rounders',    color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)', icon: '⚡' },
  BOWL: { label: 'Bowlers',         color: '#FB923C', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.2)', icon: '🎯' },
};

const RANK_META = [
  { emoji: '🥇', glow: 'rgba(245,197,24,0.18)', border: 'rgba(245,197,24,0.35)', pts: '#F5C518' },
  { emoji: '🥈', glow: 'rgba(200,200,200,0.10)', border: 'rgba(255,255,255,0.18)', pts: '#E0E0E0' },
  { emoji: '🥉', glow: 'rgba(205,127,50,0.15)', border: 'rgba(205,127,50,0.30)', pts: '#CD7F32' },
];

// ─── Player Card ──────────────────────────────────────────────────────────────
function PlayerCard({ player, rank, maxPts, totalPts, idx }) {
  const ipl    = IPL_COLORS[player.iplTeam] || { bg: '#2A2A2A', text: '#fff', glow: 'transparent' };
  const role   = ROLE_CONFIG[player.skill?.toUpperCase()] || ROLE_CONFIG.ALL;
  const pct    = maxPts > 0 ? (player.points / maxPts) * 100 : 0;
  const contPct = totalPts > 0 ? ((player.points / totalPts) * 100).toFixed(1) : '0';
  const isTop  = rank <= 3 && idx === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, duration: 0.3, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-xl border bg-[#111] transition-all duration-200
                 hover:border-white/15 hover:-translate-y-0.5 hover:shadow-lg group"
      style={{ borderColor: 'rgba(255,255,255,0.07)' }}
    >
      {/* IPL team color top strip */}
      <div className="h-1 w-full" style={{ background: ipl.bg }} />

      {/* Points bar background */}
      {player.points > 0 && (
        <div
          className="absolute bottom-0 left-0 h-0.5 transition-all duration-700"
          style={{ width: `${pct}%`, background: ipl.bg, opacity: 0.8 }}
        />
      )}

      <div className="p-4">
        {/* Top row: IPL badge + skill chip */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded"
            style={{ background: ipl.bg, color: ipl.text }}
          >
            {player.iplTeam || '—'}
          </span>
          <span
            className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded"
            style={{ color: role.color, background: role.bg, border: `1px solid ${role.border}` }}
          >
            {player.skill || '—'}
          </span>
        </div>

        {/* Player avatar initial + name */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
            style={{ background: ipl.bg, color: ipl.text, boxShadow: `0 0 12px ${ipl.glow}` }}
          >
            {player.name?.charAt(0) || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-white leading-tight truncate">
              {player.name}
            </p>
            <p className="text-[11px] text-white/30 mt-0.5 font-mono">
              ₹{player.price}Cr
            </p>
          </div>
        </div>

        {/* Points + contribution */}
        <div className="flex items-end justify-between">
          <div>
            <p className={`text-xl font-black font-mono leading-none ${player.points > 0 ? 'text-white' : 'text-white/20'}`}>
              {player.points > 0 ? player.points.toLocaleString() : '—'}
            </p>
            <p className="text-[10px] text-white/30 mt-0.5 uppercase tracking-wider">points</p>
          </div>
          {player.points > 0 && (
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: role.color }}>{contPct}%</p>
              <p className="text-[10px] text-white/25">of team</p>
            </div>
          )}
        </div>

        {/* Mini points bar */}
        {player.points > 0 && (
          <div className="mt-3 h-1 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: idx * 0.04 + 0.3, duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${ipl.bg}, ${role.color})` }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Role Section ─────────────────────────────────────────────────────────────
function RoleSection({ skill, players, maxPts, totalPts, rankEntry }) {
  const cfg = ROLE_CONFIG[skill] || ROLE_CONFIG.ALL;
  if (!players.length) return null;

  const sectionPts = players.reduce((s, p) => s + p.points, 0);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{cfg.icon}</span>
          <div>
            <h3 className="text-sm font-bold text-white">{cfg.label}</h3>
            <p className="text-[11px] text-white/30">{players.length} player{players.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold font-mono" style={{ color: cfg.color }}>
            {sectionPts.toLocaleString()}
          </p>
          <p className="text-[10px] text-white/25">pts from role</p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {players.map((p, i) => (
          <PlayerCard
            key={p.id}
            player={p}
            rank={rankEntry?.rank}
            maxPts={maxPts}
            totalPts={totalPts}
            idx={i}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({ icon: Icon, label, value, accent }) {
  return (
    <div className="card p-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Icon size={12} style={{ color: accent }} />
        <span className="label" style={{ color: accent }}>{label}</span>
      </div>
      <p className="text-lg font-bold text-white font-mono leading-tight">{value}</p>
    </div>
  );
}

// ─── Main SquadView ───────────────────────────────────────────────────────────
export default function SquadView() {
  const { teamSlug } = useParams();
  const navigate     = useNavigate();
  const { rankings, loading: rLoading } = useRankings();
  const { players,  loading: pLoading } = usePlayers();

  const teamName = decodeURIComponent(teamSlug || '');

  // Find the ranking entry for this team
  const rankEntry = useMemo(() =>
    rankings.find(r => r.team?.toLowerCase().trim() === teamName.toLowerCase().trim()),
  [rankings, teamName]);

  // Filter + sort players for this team
  const squad = useMemo(() => {
    if (!players.length) return [];
    return players
      .filter(p => p.team?.toLowerCase().trim() === teamName.toLowerCase().trim())
      .sort((a, b) => b.points - a.points);
  }, [players, teamName]);

  // Group by skill
  const byRole = useMemo(() => {
    const groups = { BAT: [], WK: [], ALL: [], BOWL: [] };
    squad.forEach(p => {
      const s = p.skill?.toUpperCase();
      if (groups[s]) groups[s].push(p);
      else groups.BOWL.push(p);
    });
    return groups;
  }, [squad]);

  const maxPts   = useMemo(() => Math.max(...squad.map(p => p.points), 1), [squad]);
  const totalPts = useMemo(() => squad.reduce((s, p) => s + p.points, 0), [squad]);
  const avgPrice = useMemo(() => squad.length
    ? (squad.reduce((s, p) => s + (p.price || 0), 0) / squad.length).toFixed(1)
    : 0, [squad]);
  const topPlayer = squad[0];

  const rankMeta = rankEntry ? RANK_META[rankEntry.rank - 1] : null;
  const loading  = rLoading || pLoading;

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-2 border-[#F5C518]/30 border-t-[#F5C518] rounded-full animate-spin" />
        <p className="text-sm text-white/30">Loading squad…</p>
      </div>
    );
  }

  // ── Not found ──
  if (!rankEntry && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield size={36} className="text-white/15" />
        <p className="text-white/40">Team not found</p>
        <button onClick={() => navigate('/rankings')} className="btn btn-primary">← Back to Rankings</button>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-fade-in pb-12">

      {/* ── Back button ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/rankings')}
        className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors group"
      >
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        League Rankings
      </button>

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border bg-[#111]"
        style={{
          borderColor: rankMeta?.border || 'rgba(255,255,255,0.08)',
          boxShadow: rankMeta?.glow ? `0 0 40px ${rankMeta.glow}` : 'none',
        }}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(245,197,24,0.04) 0%, transparent 60%)' }} />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Rank badge */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 text-3xl"
              style={{
                background: rankMeta ? 'rgba(245,197,24,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${rankMeta?.border || 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {rankMeta?.emoji || `#${rankEntry?.rank}`}
            </div>

            {/* Team info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="label text-[#F5C518]">Fantasy Team · Rank #{rankEntry?.rank}</p>
                {rankEntry?.status && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border
                                   text-emerald-400 bg-emerald-900/20 border-emerald-800/30">
                    {rankEntry.status}
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
                {rankEntry?.team}
              </h1>
              <p className="text-sm text-white/40 mt-1.5">{rankEntry?.owner}</p>
              {rankEntry?.capVc && (
                <p className="text-xs text-white/30 mt-1 font-mono">⚡ {rankEntry.capVc}</p>
              )}
            </div>

            {/* Total points */}
            <div className="text-left sm:text-right shrink-0">
              <p className="label mb-1">Total Points</p>
              <p
                className="text-5xl font-black font-mono leading-none"
                style={{ color: rankMeta?.pts || 'white' }}
              >
                {rankEntry?.totalPoints?.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatChip icon={Users}      label="Squad Size"   value={squad.length}          accent="#60A5FA" />
        <StatChip icon={TrendingUp} label="Avg Price"    value={`₹${avgPrice}Cr`}      accent="#34D399" />
        <StatChip icon={Star}       label="Top Scorer"   value={topPlayer?.name?.split(' ')[0] || '—'} accent="#F5C518" />
        <StatChip icon={Activity}   label="Best Score"   value={(topPlayer?.points || 0).toLocaleString()} accent="#FB923C" />
      </div>

      {/* ── Role sections ───────────────────────────────────────────────────── */}
      {['BAT', 'WK', 'ALL', 'BOWL'].map(role => (
        byRole[role]?.length > 0 && (
          <motion.section
            key={role}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {/* Role divider */}
            <div className="flex items-center gap-4 mb-5">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span
                className="text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border"
                style={{
                  color: ROLE_CONFIG[role].color,
                  borderColor: ROLE_CONFIG[role].border,
                  background: ROLE_CONFIG[role].bg,
                }}
              >
                {ROLE_CONFIG[role].icon} {ROLE_CONFIG[role].label}
              </span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            <RoleSection
              skill={role}
              players={byRole[role]}
              maxPts={maxPts}
              totalPts={totalPts}
              rankEntry={rankEntry}
            />
          </motion.section>
        )
      ))}

      {/* ── Points contribution chart ────────────────────────────────────────── */}
      {squad.filter(p => p.points > 0).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={14} className="text-[#F5C518]" />
            <h3 className="text-sm font-bold text-white">Points Contribution</h3>
            <span className="text-xs text-white/25 ml-auto">sorted by contribution</span>
          </div>

          <div className="space-y-3">
            {squad.filter(p => p.points > 0).map((player, idx) => {
              const pct = (player.points / totalPts) * 100;
              const ipl = IPL_COLORS[player.iplTeam] || { bg: '#555' };
              const role = ROLE_CONFIG[player.skill?.toUpperCase()] || ROLE_CONFIG.ALL;
              return (
                <div key={player.id} className="flex items-center gap-3">
                  <span className="text-[11px] text-white/20 w-4 text-right font-mono shrink-0">{idx + 1}</span>

                  {/* Color dot */}
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ipl.bg }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[12px] text-white/70 font-medium truncate">{player.name}</span>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded hidden sm:inline"
                          style={{ color: role.color, background: role.bg }}
                        >
                          {player.skill}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-white/40 shrink-0 ml-2">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: idx * 0.035 + 0.4, duration: 0.5, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${ipl.bg}, ${role.color})` }}
                      />
                    </div>
                  </div>

                  <span className="text-[12px] font-mono font-bold text-white/50 w-14 text-right shrink-0">
                    {player.points.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
