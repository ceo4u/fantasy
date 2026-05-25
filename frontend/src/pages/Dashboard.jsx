import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Star, RefreshCw, Search, X } from 'lucide-react';
import { usePlayers } from '../hooks/usePlayers';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.025 } } };
const row     = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2 } } };

const SKILL_CHIP = {
  BAT:  'chip chip-bat',
  BOWL: 'chip chip-bowl',
  ALL:  'chip chip-all',
  WK:   'chip chip-wk',
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-white/[0.05]">
      <div className="skeleton w-5 h-3" />
      <div className="skeleton flex-1 max-w-[160px] h-3.5" />
      <div className="skeleton flex-1 max-w-[120px] h-3" />
      <div className="skeleton w-10 h-5 ml-auto" />
      <div className="skeleton w-12 h-3.5" />
    </div>
  );
}

const SKILLS = ['ALL', 'BAT', 'BOWL', 'WK'];

export default function Dashboard() {
  const { players, loading, error, refetch } = usePlayers();
  const [search, setSearch]       = useState('');
  const [skill,  setSkill]        = useState('ALL');

  const filtered = useMemo(() => {
    let r = players;
    if (skill !== 'ALL') r = r.filter(p => p.skill === skill);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q) ||
        p.iplTeam?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [players, search, skill]);

  const total    = players.length;
  const pts      = players.reduce((s, p) => s + (p.points || 0), 0);
  const topScore = players.reduce((b, p) => (!b || (p.points || 0) > (b.points || 0) ? p : b), null);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="label text-[#F5C518] mb-1.5">Fantasy IPL 2025</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Player Dashboard</h1>
          <p className="text-sm text-white/35 mt-0.5">Live squad data &amp; points</p>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          title="Refresh"
          className="mt-1 p-2 rounded-lg text-white/25 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all shrink-0"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin text-[#F5C518]' : ''} />
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Players */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="label">Total Players</span>
            <Users size={13} className="text-white/20" />
          </div>
          <p className="text-3xl font-bold text-white">{loading ? '—' : total}</p>
        </div>

        {/* Total Points — featured */}
        <div className="card-yellow p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="label" style={{ color: '#F5C518' }}>Total Points</span>
            <TrendingUp size={13} className="text-[#F5C518]/50" />
          </div>
          <p className="text-3xl font-bold text-white">{loading ? '—' : pts.toLocaleString()}</p>
        </div>

        {/* Top Scorer */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="label">Top Scorer</span>
            <Star size={13} className="text-white/20" />
          </div>
          {loading ? (
            <div className="skeleton h-7 w-36" />
          ) : (
            <>
              <p className="text-base font-semibold text-white truncate">{topScore?.name || '—'}</p>
              {topScore && (
                <p className="text-xs font-mono text-[#F5C518] mt-0.5">{topScore.points.toLocaleString()} pts</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Search + Filter ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white">
              <X size={13} />
            </button>
          )}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search player, team..."
            className="input pl-8 pr-8"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {SKILLS.map(s => (
            <button
              key={s}
              onClick={() => setSkill(skill === s && s !== 'ALL' ? 'ALL' : s)}
              className={`btn text-[10px] tracking-widest ${
                skill === s
                  ? 'bg-[#F5C518] text-black border-transparent'
                  : 'btn-secondary text-white/40'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        {/* Desktop header */}
        <div className="hidden sm:grid grid-cols-[2rem_1fr_1fr_3.5rem_5rem] gap-4 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
          {['#', 'Player', 'Team', 'Role', 'Points'].map((h, i) => (
            <span key={h} className={`label ${i === 4 ? 'text-right' : ''}`}>{h}</span>
          ))}
        </div>

        {/* Loading */}
        {loading && <div>{Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} />)}</div>}

        {/* Error */}
        {error && !loading && (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-red-400 mb-1">Failed to load data</p>
            <p className="text-xs text-white/25 font-mono mb-4">{error}</p>
            <button onClick={refetch} className="btn btn-primary text-xs px-4">Retry</button>
          </div>
        )}

        {/* Rows */}
        {!loading && !error && (
          <motion.div variants={stagger} initial="hidden" animate="show" className="divide-y divide-white/[0.04]">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-white/25">No players found</div>
            ) : filtered.map((p, i) => (
              <motion.div
                key={p.id}
                variants={row}
                className="group hover:bg-white/[0.025] transition-colors duration-100"
              >
                {/* Desktop */}
                <div className="hidden sm:grid grid-cols-[2rem_1fr_1fr_3.5rem_5rem] gap-4 px-4 py-3 items-center">
                  <span className="text-xs font-mono text-white/20">{i + 1}</span>
                  <span className="text-sm font-medium text-white group-hover:text-[#F5C518] transition-colors truncate">
                    {p.name}
                  </span>
                  <span className="text-xs text-white/40 truncate">{p.team}</span>
                  <span className={SKILL_CHIP[p.skill] || 'chip bg-white/5 text-white/30'}>{p.skill || '—'}</span>
                  <span className="text-right text-sm font-mono font-semibold text-[#F5C518]">
                    {(p.points || 0).toLocaleString()}
                  </span>
                </div>

                {/* Mobile */}
                <div className="sm:hidden flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center
                                  text-[10px] font-bold text-white/50 shrink-0">
                    {p.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    <p className="text-xs text-white/30 truncate">{p.team}{p.iplTeam ? ` · ${p.iplTeam}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono font-semibold text-[#F5C518]">{(p.points || 0).toLocaleString()}</p>
                    <span className={`${SKILL_CHIP[p.skill] || 'chip bg-white/5 text-white/30'} mt-0.5`}>{p.skill || '—'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="label text-center">{filtered.length} of {total} players</p>
      )}
    </div>
  );
}
