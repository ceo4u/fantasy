import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, RefreshCw, ChevronRight, Zap, Scale, CheckCircle2, Shield, Crown, HelpCircle } from 'lucide-react';
import { useRankings } from '../hooks/usePlayers';
import { fetchSquad } from '../utils/api';

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
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wider"
      style={{ background: c.bg, color: c.text }}
    >
      {team}
    </span>
  );
}

export default function SquadsPage() {
  const navigate = useNavigate();
  const { rankings, loading, error, refetch } = useRankings();

  // Match Mode & Filtering States
  const [matchMode, setMatchMode] = useState(false);
  const [teamAFilter, setTeamAFilter] = useState('');
  const [teamBFilter, setTeamBFilter] = useState('');
  const [allSquadsPlayers, setAllSquadsPlayers] = useState({});
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [selectedFantasyTeams, setSelectedFantasyTeams] = useState([]);

  // Fetch squad details for all teams when Match Mode is enabled
  useEffect(() => {
    async function loadAllSquadPlayers() {
      if (!matchMode || rankings.length === 0 || Object.keys(allSquadsPlayers).length > 0) return;
      setLoadingPlayers(true);
      try {
        const results = await Promise.all(
          rankings.map(r => fetchSquad(r.team).then(data => ({ team: r.team, data })))
        );
        const map = {};
        results.forEach(res => {
          map[res.team] = res.data;
        });
        setAllSquadsPlayers(map);
        setSelectedFantasyTeams(rankings.map(r => r.team));
      } catch (err) {
        console.error('Failed to load all squad players', err);
      } finally {
        setLoadingPlayers(false);
      }
    }
    loadAllSquadPlayers();
  }, [matchMode, rankings, allSquadsPlayers]);

  // Handle fantasy squad selections
  const toggleFantasyTeam = (teamName) => {
    setSelectedFantasyTeams(prev =>
      prev.includes(teamName) ? prev.filter(t => t !== teamName) : [...prev, teamName]
    );
  };

  const selectAllFantasyTeams = () => {
    setSelectedFantasyTeams(rankings.map(r => r.team));
  };

  const clearFantasyTeams = () => {
    setSelectedFantasyTeams([]);
  };

  // Compile active players for selected match-up
  const parsedSquadMatchups = useMemo(() => {
    if (!teamAFilter && !teamBFilter) return [];
    
    return selectedFantasyTeams.map(teamName => {
      const squadData = allSquadsPlayers[teamName];
      if (!squadData) return { teamName, players: [], countA: 0, countB: 0 };
      
      const filtered = (squadData.players || []).filter(p => {
        const team = p.iplTeam?.toUpperCase();
        const matchesA = teamAFilter ? team === teamAFilter.toUpperCase() : false;
        const matchesB = teamBFilter ? team === teamBFilter.toUpperCase() : false;
        return matchesA || matchesB;
      });

      // Sort: IPL team, then by Name
      filtered.sort((a, b) => {
        if (a.iplTeam !== b.iplTeam) {
          return a.iplTeam.localeCompare(b.iplTeam);
        }
        return a.name.localeCompare(b.name);
      });

      const countA = filtered.filter(p => p.iplTeam?.toUpperCase() === teamAFilter?.toUpperCase()).length;
      const countB = filtered.filter(p => p.iplTeam?.toUpperCase() === teamBFilter?.toUpperCase()).length;

      return {
        teamName,
        players: filtered,
        countA,
        countB,
        rankInfo: rankings.find(r => r.team === teamName)
      };
    });
  }, [selectedFantasyTeams, allSquadsPlayers, teamAFilter, teamBFilter, rankings]);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="label text-[#F5C518] mb-1.5">Season 2025</p>
          <h1 className="text-2xl font-black text-white tracking-tight">League Squads</h1>
          <p className="text-sm text-white/30 mt-0.5">Explore full squad details or compare player matches side-by-side</p>
        </div>
        <div className="flex items-center gap-2 bg-[#141414] border border-white/5 p-1 rounded-xl w-fit shrink-0">
          <button
            onClick={() => setMatchMode(false)}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition ${
              !matchMode ? 'bg-white/10 text-white shadow-md' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            Full Squads
          </button>
          <button
            onClick={() => setMatchMode(true)}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition flex items-center gap-1.5 ${
              matchMode ? 'bg-[#F5C518]/15 text-[#F5C518] border border-[#F5C518]/30 shadow-[0_0_12px_rgba(245,197,24,0.15)]' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <Zap size={12} className="fill-current" /> Live Match Mode
          </button>
        </div>
      </div>

      {/* ── Match Mode Controls Panel ── */}
      <AnimatePresence>
        {matchMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card border border-[#F5C518]/15 bg-gradient-to-r from-[#181812] to-[#11110B] p-5 rounded-xl space-y-4 overflow-hidden shadow-xl"
          >
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#F5C518]/10 flex items-center justify-center border border-[#F5C518]/25 text-[#F5C518]">
                  <Scale size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Live Fixture Comparison</h4>
                  <p className="text-[10px] text-white/35">Compare players playing in original IPL fixtures side-by-side</p>
                </div>
              </div>

              {/* IPL Team A Select */}
              <div className="flex flex-col gap-1 min-w-[130px]">
                <span className="text-[9px] uppercase font-black text-white/40 tracking-wider">IPL Team A</span>
                <select
                  value={teamAFilter}
                  onChange={e => setTeamAFilter(e.target.value)}
                  className="bg-[#0C0C0C] border border-white/10 hover:border-white/20 focus:border-[#F5C518] rounded-lg text-xs px-2.5 py-1.5 text-white font-semibold outline-none transition cursor-pointer"
                >
                  <option value="">-- Select Team --</option>
                  {Object.keys(IPL_COLORS).map(team => (
                    <option key={team} value={team} disabled={team === teamBFilter}>{team}</option>
                  ))}
                </select>
              </div>

              {/* IPL Team B Select */}
              <div className="flex flex-col gap-1 min-w-[130px]">
                <span className="text-[9px] uppercase font-black text-white/40 tracking-wider">IPL Team B</span>
                <select
                  value={teamBFilter}
                  onChange={e => setTeamBFilter(e.target.value)}
                  className="bg-[#0C0C0C] border border-white/10 hover:border-white/20 focus:border-[#F5C518] rounded-lg text-xs px-2.5 py-1.5 text-white font-semibold outline-none transition cursor-pointer"
                >
                  <option value="">-- Select Team --</option>
                  {Object.keys(IPL_COLORS).map(team => (
                    <option key={team} value={team} disabled={team === teamAFilter}>{team}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fantasy Squad Selection Chips */}
            {!loadingPlayers && rankings.length > 0 && (teamAFilter || teamBFilter) && (
              <div className="space-y-2 pt-2 border-t border-white/[0.05]">
                <div className="flex justify-between items-center text-[10px] uppercase font-black text-white/40 tracking-wider">
                  <span>Fantasy Squads to Show</span>
                  <div className="flex gap-2 text-[9px] font-bold text-[#F5C518]">
                    <button onClick={selectAllFantasyTeams} className="hover:underline">Select All</button>
                    <span>|</span>
                    <button onClick={clearFantasyTeams} className="hover:underline">Clear</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rankings.map(r => {
                    const active = selectedFantasyTeams.includes(r.team);
                    return (
                      <button
                        key={r.team}
                        onClick={() => toggleFantasyTeam(r.team)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition duration-150 ${
                          active
                            ? 'bg-[#F5C518]/10 border-[#F5C518]/60 text-white shadow-[0_0_8px_rgba(245,197,24,0.08)]'
                            : 'bg-[#111] border-white/5 text-white/40 hover:text-white/60 hover:border-white/10'
                        }`}
                      >
                        {r.team}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content view ── */}
      {loading || loadingPlayers ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 card">
          <div className="w-8 h-8 border-2 border-[#F5C518]/30 border-t-[#F5C518] rounded-full animate-spin" />
          <p className="text-sm text-white/30">Loading squad layouts…</p>
        </div>
      ) : error ? (
        <div className="card py-16 text-center">
          <p className="text-sm text-red-400 mb-3">{error}</p>
          <button onClick={refetch} className="btn btn-primary">Retry</button>
        </div>
      ) : (
        <>
          {/* A. Standard / Full Squad View */}
          {!matchMode && rankings.length > 0 && (
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

          {/* B. Match Comparison (Matchup mode) View */}
          {matchMode && (!teamAFilter && !teamBFilter) && (
            <div className="card py-16 text-center space-y-4 max-w-md mx-auto border border-dashed border-white/10 bg-transparent">
              <Scale size={42} className="mx-auto text-white/15 animate-bounce" style={{ animationDuration: '3s' }} />
              <div>
                <h3 className="text-sm font-bold text-white/80">Configure Original IPL Fixture</h3>
                <p className="text-xs text-white/35 mt-1 max-w-xs mx-auto">
                  Select Team A and Team B (e.g. MI & RR) in the selector panel above to display matched player rosters across your fantasy leagues.
                </p>
              </div>
            </div>
          )}

          {matchMode && (teamAFilter || teamBFilter) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {parsedSquadMatchups.map(squadMatch => {
                const { teamName, players: matchedPlayers, countA, countB, rankInfo } = squadMatch;
                if (selectedFantasyTeams.length > 0 && !selectedFantasyTeams.includes(teamName)) return null;

                const top3 = rankInfo?.rank <= 3;
                
                return (
                  <motion.div
                    key={teamName}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card p-5 space-y-4 border border-white/10 hover:border-white/15 transition duration-150 flex flex-col justify-between"
                  >
                    <div>
                      {/* Squad Header */}
                      <div className="flex justify-between items-start border-b border-white/[0.05] pb-3">
                        <div className="min-w-0">
                          <p className="text-[10px] text-[#F5C518] font-bold uppercase tracking-wider mb-0.5">
                            {rankInfo?.rank ? `Rank #${rankInfo.rank}` : 'Squad'}
                          </p>
                          <h3 className="font-extrabold text-white text-sm truncate leading-tight">{teamName}</h3>
                          <p className="text-[10px] text-white/30 truncate mt-0.5">{rankInfo?.owner || 'Unknown'}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-black text-white/90">
                            {matchedPlayers.length} Active
                          </span>
                          <p className="text-[9px] text-white/35 mt-0.5">
                            {teamAFilter && `${teamAFilter}:${countA}`} {teamBFilter && `${teamBFilter}:${countB}`}
                          </p>
                        </div>
                      </div>

                      {/* Matched Players Roster */}
                      <div className="space-y-2.5 pt-3">
                        {matchedPlayers.map(p => (
                          <div
                            key={p.name}
                            className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.02] last:border-0 hover:bg-white/[0.015] px-1 rounded transition"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <IplBadge team={p.iplTeam} />
                              <span className="font-semibold text-white truncate">{p.name}</span>
                              {p.isC && (
                                <span className="text-[8px] font-black px-1 py-0.5 bg-[#F5C518] text-black rounded flex items-center justify-center shrink-0">
                                  C
                                </span>
                              )}
                              {p.isVC && (
                                <span className="text-[8px] font-black px-1 py-0.5 bg-white/20 text-white border border-white/30 rounded flex items-center justify-center shrink-0">
                                  VC
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-semibold text-white/50 shrink-0 ml-2">
                              {p.calculatedTotal.toFixed(1)} pts
                            </span>
                          </div>
                        ))}

                        {matchedPlayers.length === 0 && (
                          <div className="py-8 text-center space-y-1">
                            <HelpCircle size={20} className="mx-auto text-white/10" />
                            <p className="text-[11px] text-white/20 italic">No playing athletes drafted</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Total points */}
                    <div className="pt-3 border-t border-white/[0.04] flex justify-between items-center mt-auto">
                      <button
                        onClick={() => navigate(`/squads/${encodeURIComponent(teamName)}`)}
                        className="text-[10px] font-bold text-[#F5C518]/70 hover:text-[#F5C518] transition flex items-center gap-1"
                      >
                        View Full History <ChevronRight size={10} />
                      </button>
                      <div className="text-right">
                        <span className="text-xs text-white/30 block">Total points</span>
                        <span className="font-mono font-bold text-white text-xs">{rankInfo?.totalPoints?.toLocaleString()}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
