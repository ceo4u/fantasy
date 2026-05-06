import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, RefreshCw, ChevronRight } from 'lucide-react';
import { useRankings } from '../hooks/usePlayers';

const RANK_EMOJI = ['🥇','🥈','🥉'];

const STATUS_STYLE = {
  '🥇 CHAMPION':    'text-[#F5C518]   bg-[#F5C518]/8   border-[#F5C518]/20',
  '🥈 RUNNER UP':   'text-white/70    bg-white/5       border-white/10',
  '🥉 3rd PLACE':   'text-orange-300  bg-orange-900/20 border-orange-700/30',
  '🔥 IN FORM':     'text-emerald-400 bg-emerald-900/20 border-emerald-700/30',
  '✅ MID TABLE':   'text-blue-400    bg-blue-900/20   border-blue-700/30',
  '⚠️ LOWER HALF': 'text-amber-400   bg-amber-900/20  border-amber-700/30',
  '🔴 BOTTOM 2':   'text-red-400     bg-red-900/20    border-red-700/30',
};

export default function SquadsPage() {
  const navigate = useNavigate();
  const { rankings, loading, error, refetch } = useRankings();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="label text-[#F5C518] mb-1.5">Season 2025</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">All Squads</h1>
          <p className="text-sm text-white/30 mt-0.5">Select a team to view match-wise squad breakdown</p>
        </div>
        <button onClick={refetch} disabled={loading}
          className="mt-1 p-2 rounded-lg text-white/25 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all">
          <RefreshCw size={15} className={loading ? 'animate-spin text-[#F5C518]' : ''}/>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({length:6}).map((_,i) => (
            <div key={i} className="card p-5 flex items-center gap-4">
              <div className="skeleton w-12 h-12 rounded-xl"/><div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-36"/><div className="skeleton h-3 w-20"/>
              </div><div className="skeleton h-8 w-20"/>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="card py-16 text-center">
          <p className="text-sm text-red-400 mb-3">{error}</p>
          <button onClick={refetch} className="btn btn-primary">Retry</button>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rankings.map((entry, i) => {
            const top3 = entry.rank <= 3;
            return (
              <motion.div key={entry.team}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/squads/${encodeURIComponent(entry.team)}`)}
                className={`card-hover rounded-xl cursor-pointer p-5 flex items-center gap-4 group
                            transition-all duration-150
                            ${top3 ? 'border border-[#F5C518]/25' : ''}`}
                style={entry.rank === 1 ? {boxShadow:'0 0 24px rgba(245,197,24,0.07)'} : {}}>

                {/* Rank */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0
                                 ${top3 ? 'bg-[#F5C518]/10 border border-[#F5C518]/20'
                                        : 'bg-white/[0.04] border border-white/[0.07]'}`}>
                  {top3 ? RANK_EMOJI[entry.rank-1] : <span className="text-sm font-bold font-mono text-white/30">#{entry.rank}</span>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm leading-tight truncate">{entry.team}</p>
                  <p className="text-xs text-white/30 mt-0.5 truncate">{entry.owner}</p>
                  {entry.status && (
                    <span className={`inline-flex items-center border rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide mt-1
                                     ${STATUS_STYLE[entry.status] || 'text-white/40 bg-white/5 border-white/10'}`}>
                      {entry.status}
                    </span>
                  )}
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <p className={`font-mono font-bold text-lg leading-tight ${top3 ? 'text-[#F5C518]' : 'text-white'}`}>
                    {entry.totalPoints?.toLocaleString()}
                  </p>
                  <p className="label">pts</p>
                </div>

                <ChevronRight size={14} className="text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all shrink-0"/>
              </motion.div>
            );
          })}
        </div>
      )}

      {!loading && !error && rankings.length === 0 && (
        <div className="card py-16 text-center">
          <Users size={32} className="text-white/10 mx-auto mb-3"/>
          <p className="text-sm text-white/25">No squads available</p>
        </div>
      )}
    </div>
  );
}
