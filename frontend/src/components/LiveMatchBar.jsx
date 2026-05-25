import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Zap, X } from 'lucide-react';

export default function LiveMatchBar() {
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
