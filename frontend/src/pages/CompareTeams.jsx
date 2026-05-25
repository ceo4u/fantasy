import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRankings } from '../hooks/usePlayers';
import { fetchSquad } from '../utils/api';
import { Scale, Users, Trophy, Crown, Shield, Star, Award, TrendingUp, Sparkles, BarChart2, AlertCircle, ArrowRight } from 'lucide-react';

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
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider"
      style={{ background: c.bg, color: c.text }}
    >
      {team}
    </span>
  );
}

const SKILL_CHIP = {
  BAT:  'chip chip-bat',
  BOWL: 'chip chip-bowl',
  ALL:  'chip chip-all',
  WK:   'chip chip-wk',
};

export default function CompareTeams() {
  const { rankings, loading: rankingsLoading } = useRankings();
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');

  const [squadA, setSquadA] = useState(null);
  const [squadB, setSquadB] = useState(null);
  const [loadingSquads, setLoadingSquads] = useState(false);
  const [error, setError] = useState('');

  // Fetch squad details when selections change
  useEffect(() => {
    async function loadSquads() {
      if (!teamA || !teamB) {
        setSquadA(null);
        setSquadB(null);
        return;
      }
      setLoadingSquads(true);
      setError('');
      try {
        const [resA, resB] = await Promise.all([
          fetchSquad(teamA),
          fetchSquad(teamB)
        ]);
        setSquadA(resA);
        setSquadB(resB);
      } catch (err) {
        setError('Failed to load squad details: ' + err.message);
      } finally {
        setLoadingSquads(false);
      }
    }
    loadSquads();
  }, [teamA, teamB]);

  const rankingsMap = useMemo(() => {
    const map = {};
    rankings.forEach(r => {
      map[r.team] = r;
    });
    return map;
  }, [rankings]);

  // Compute all metrics and points for team A and B
  const comparisonData = useMemo(() => {
    if (!squadA || !squadB) return null;

    const parseSquad = (squad, rankingEntry) => {
      const players = squad.players || [];
      const matchLabels = squad.matchLabels || [];

      // Calculate total match-by-match points (with C/VC multipliers!)
      const matchPointsBreakdown = matchLabels.map((_, mi) => {
        return players.reduce((sum, p) => {
          const raw = p.matchPoints[mi] || 0;
          return sum + (raw * (p.isC ? 2 : p.isVC ? 1.5 : 1));
        }, 0);
      });

      // Calculate cumulative match points for line chart
      let cumSum = 0;
      const cumulativePoints = matchPointsBreakdown.map(pts => {
        cumSum += pts;
        return cumSum;
      });

      // Role count breakdown
      const roles = { BAT: 0, BOWL: 0, ALL: 0, WK: 0 };
      players.forEach(p => {
        const s = p.skill?.toUpperCase();
        if (roles[s] !== undefined) roles[s]++;
      });

      // Star player (Highest scorer)
      const topScorer = players.reduce((top, p) => {
        return !top || p.calculatedTotal > top.calculatedTotal ? p : top;
      }, null);

      // Total team cost
      const totalCost = players.reduce((sum, p) => sum + (p.price || 0), 0);

      // Captain and VC names
      const captain = players.find(p => p.isC);
      const vc = players.find(p => p.isVC);

      return {
        players,
        matchPointsBreakdown,
        cumulativePoints,
        roles,
        topScorer,
        totalCost,
        captain,
        vc,
        totalPoints: rankingEntry?.totalPoints || players.reduce((s, p) => s + p.calculatedTotal, 0),
        rank: rankingEntry?.rank || '—',
        owner: rankingEntry?.owner || 'Unknown',
        status: rankingEntry?.status || 'Active'
      };
    };

    return {
      A: parseSquad(squadA, rankingsMap[teamA]),
      B: parseSquad(squadB, rankingsMap[teamB]),
      matchLabels: squadA.matchLabels || []
    };
  }, [squadA, squadB, teamA, teamB, rankingsMap]);

  // Group players by skill for side by side display
  const playersBySkill = useMemo(() => {
    if (!comparisonData) return null;
    const skills = ['WK', 'BAT', 'ALL', 'BOWL'];
    const groups = {};

    skills.forEach(skill => {
      const listA = comparisonData.A.players.filter(p => p.skill?.toUpperCase() === skill);
      const listB = comparisonData.B.players.filter(p => p.skill?.toUpperCase() === skill);
      const maxLen = Math.max(listA.length, listB.length);

      groups[skill] = Array.from({ length: maxLen }).map((_, i) => ({
        playerA: listA[i] || null,
        playerB: listB[i] || null
      }));
    });

    return groups;
  }, [comparisonData]);

  // SVG Chart Calculation
  const chartProps = useMemo(() => {
    if (!comparisonData) return null;
    const ptsA = comparisonData.A.cumulativePoints;
    const ptsB = comparisonData.B.cumulativePoints;
    const maxVal = Math.max(...ptsA, ...ptsB, 100);
    const count = comparisonData.matchLabels.length;

    const width = 600;
    const height = 180;
    const padding = 20;

    const getPointsStr = (pts) => {
      return pts.map((val, idx) => {
        const x = padding + (idx / (count - 1)) * (width - padding * 2);
        const y = height - padding - (val / maxVal) * (height - padding * 2);
        return `${x},${y}`;
      }).join(' ');
    };

    return {
      width,
      height,
      padding,
      pointsA: getPointsStr(ptsA),
      pointsB: getPointsStr(ptsB),
      rawPointsA: ptsA,
      rawPointsB: ptsB,
      maxVal,
      count
    };
  }, [comparisonData]);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#F5C518] mb-1">
            <Scale size={16} />
            <span className="label text-[#F5C518]">Comparison Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Team Comparison</h1>
          <p className="text-sm text-white/30 mt-0.5">Select two squads to compare side-by-side and view point progression</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#F5C518] bg-[#F5C518]/10 border border-[#F5C518]/20 px-3 py-2 rounded-xl shrink-0">
          <Sparkles size={11} className="animate-pulse" /> Live Analysis
        </div>
      </div>

      {/* ── Selectors ── */}
      <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-4 relative overflow-hidden">
        <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white/[0.04] hidden md:block" />

        {/* Team Selector A */}
        <div className="space-y-2">
          <label className="label block">Compare Team 1</label>
          <select
            value={teamA}
            onChange={e => {
              setTeamA(e.target.value);
              if (e.target.value === teamB) setTeamB('');
            }}
            disabled={rankingsLoading}
            className="w-full bg-[#111] border border-white/[0.08] hover:border-white/15 focus:border-[#F5C518] text-white rounded-xl px-4 py-3 text-sm font-semibold outline-none transition duration-150"
          >
            <option value="" className="text-white/30">Select first team...</option>
            {rankings.map(r => (
              <option key={r.team} value={r.team} disabled={r.team === teamB}>
                #{r.rank} {r.team} ({r.owner})
              </option>
            ))}
          </select>
        </div>

        {/* Team Selector B */}
        <div className="space-y-2">
          <label className="label block">Compare Team 2</label>
          <select
            value={teamB}
            onChange={e => {
              setTeamB(e.target.value);
              if (e.target.value === teamA) setTeamA('');
            }}
            disabled={rankingsLoading}
            className="w-full bg-[#111] border border-white/[0.08] hover:border-white/15 focus:border-[#F5C518] text-white rounded-xl px-4 py-3 text-sm font-semibold outline-none transition duration-150"
          >
            <option value="" className="text-white/30">Select second team...</option>
            {rankings.map(r => (
              <option key={r.team} value={r.team} disabled={r.team === teamA}>
                #{r.rank} {r.team} ({r.owner})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Status Info & Error handling ── */}
      {loadingSquads && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 card">
          <div className="w-8 h-8 border-2 border-[#F5C518]/30 border-t-[#F5C518] rounded-full animate-spin" />
          <p className="text-sm text-white/35">Analyzing and compiling squad statistics...</p>
        </div>
      )}

      {error && (
        <div className="card border border-red-900/40 bg-red-950/10 p-5 text-center space-y-3">
          <AlertCircle size={32} className="text-red-400 mx-auto" />
          <p className="text-sm text-red-300 font-medium">{error}</p>
        </div>
      )}

      {/* ── Initial Placeholder ── */}
      {!teamA || !teamB ? (
        <div className="card py-16 text-center space-y-4 max-w-lg mx-auto border border-dashed border-white/10 bg-transparent">
          <Scale size={42} className="mx-auto text-white/15 animate-bounce" style={{ animationDuration: '3s' }} />
          <div>
            <h3 className="text-base font-bold text-white/80">Select Teams to Start</h3>
            <p className="text-xs text-white/35 mt-1 max-w-xs mx-auto">
              Pick two fantasy leagues squads from the dropdown menus above to perform a deep analysis.
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Comparison Dashboard ── */}
      {!loadingSquads && !error && comparisonData && (
        <div className="space-y-6">

          {/* 1. Metric Showdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Rank Card */}
            <div className="card p-5 relative overflow-hidden group">
              <p className="label mb-3">Ranking Position</p>
              <div className="flex justify-between items-center">
                <div className="text-center w-[40%]">
                  <p className="text-xs text-white/40 mb-1 font-semibold truncate">{teamA}</p>
                  <p className={`text-4xl font-black font-mono ${comparisonData.A.rank <= comparisonData.B.rank ? 'text-[#F5C518]' : 'text-white/30'}`}>
                    #{comparisonData.A.rank}
                  </p>
                </div>
                <div className="text-white/10 font-bold text-xs uppercase bg-white/[0.02] px-2 py-0.5 rounded border border-white/[0.04]">VS</div>
                <div className="text-center w-[40%]">
                  <p className="text-xs text-white/40 mb-1 font-semibold truncate">{teamB}</p>
                  <p className={`text-4xl font-black font-mono ${comparisonData.B.rank <= comparisonData.A.rank ? 'text-[#F5C518]' : 'text-white/30'}`}>
                    #{comparisonData.B.rank}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Points Card */}
            <div className="card-yellow p-5 relative overflow-hidden group">
              <p className="label mb-3" style={{ color: '#F5C518' }}>Total Points Comparison</p>
              <div className="flex justify-between items-center">
                <div className="text-center w-[40%]">
                  <p className="text-xs text-white/60 mb-1 font-semibold truncate">{teamA}</p>
                  <p className={`text-3xl font-black font-mono ${comparisonData.A.totalPoints >= comparisonData.B.totalPoints ? 'text-white' : 'text-white/40'}`}>
                    {comparisonData.A.totalPoints}
                  </p>
                </div>
                <div className="text-[#F5C518]/30 font-bold text-xs bg-[#F5C518]/5 px-2 py-0.5 rounded border border-[#F5C518]/10">VS</div>
                <div className="text-center w-[40%]">
                  <p className="text-xs text-white/60 mb-1 font-semibold truncate">{teamB}</p>
                  <p className={`text-3xl font-black font-mono ${comparisonData.B.totalPoints >= comparisonData.A.totalPoints ? 'text-white' : 'text-white/40'}`}>
                    {comparisonData.B.totalPoints}
                  </p>
                </div>
              </div>
            </div>

            {/* Top Scorer Card */}
            <div className="card p-5 relative overflow-hidden">
              <p className="label mb-3">MVP / Top Scorer</p>
              <div className="flex justify-between items-center text-xs">
                <div className="w-[45%] text-left space-y-1">
                  <p className="text-[10px] text-white/30 truncate font-semibold">{teamA}</p>
                  <p className="font-bold text-white truncate">{comparisonData.A.topScorer?.name || '—'}</p>
                  <p className="font-mono text-[#F5C518] font-bold">{(comparisonData.A.topScorer?.calculatedTotal || 0).toLocaleString()} pts</p>
                </div>
                <div className="text-white/10 font-bold text-xs">⚔️</div>
                <div className="w-[45%] text-right space-y-1">
                  <p className="text-[10px] text-white/30 truncate font-semibold">{teamB}</p>
                  <p className="font-bold text-white truncate">{comparisonData.B.topScorer?.name || '—'}</p>
                  <p className="font-mono text-[#F5C518] font-bold">{(comparisonData.B.topScorer?.calculatedTotal || 0).toLocaleString()} pts</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Cumulative Points progression Chart */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-[#F5C518]" />
                <h3 className="text-sm font-bold text-white">Points Accumulation History</h3>
              </div>
              <div className="flex gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-white/70">
                  <span className="w-3 h-1 bg-[#F5C518] rounded" /> {teamA}
                </span>
                <span className="flex items-center gap-1.5 text-white/70">
                  <span className="w-3 h-1 bg-purple-500 rounded" /> {teamB}
                </span>
              </div>
            </div>

            {/* Line SVG Chart */}
            <div className="bg-[#111]/30 border border-white/[0.04] p-3 rounded-xl">
              <svg viewBox={`0 0 ${chartProps.width} ${chartProps.height}`} className="w-full h-auto overflow-visible select-none">
                {/* Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                  const y = chartProps.padding + p * (chartProps.height - chartProps.padding * 2);
                  const label = Math.round(chartProps.maxVal * (1 - p));
                  return (
                    <g key={idx} className="opacity-20">
                      <line x1={chartProps.padding} y1={y} x2={chartProps.width - chartProps.padding} y2={y} stroke="white" strokeWidth="0.5" strokeDasharray="3 3" />
                      <text x={chartProps.padding - 5} y={y + 3} fill="white" fontSize="7" textAnchor="end" fontFamily="monospace">{label}</text>
                    </g>
                  );
                })}

                {/* Team A Polyline (Yellow) */}
                <polyline fill="none" stroke="#F5C518" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={chartProps.pointsA} className="drop-shadow-[0_0_8px_rgba(245,197,24,0.35)]" />

                {/* Team B Polyline (Purple) */}
                <polyline fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={chartProps.pointsB} className="drop-shadow-[0_0_8px_rgba(167,139,250,0.35)]" />

                {/* Markers / Dots */}
                {comparisonData.matchLabels.map((lbl, idx) => {
                  const x = chartProps.padding + (idx / (chartProps.count - 1)) * (chartProps.width - chartProps.padding * 2);
                  const yA = chartProps.height - chartProps.padding - (chartProps.rawPointsA[idx] / chartProps.maxVal) * (chartProps.height - chartProps.padding * 2);
                  const yB = chartProps.height - chartProps.padding - (chartProps.rawPointsB[idx] / chartProps.maxVal) * (chartProps.height - chartProps.padding * 2);

                  return (
                    <g key={idx}>
                      <line x1={x} y1={chartProps.padding} x2={x} y2={chartProps.height - chartProps.padding} stroke="white" strokeWidth="0.5" className="opacity-[0.05]" />
                      <text x={x} y={chartProps.height - 4} fill="white" fontSize="6.5" textAnchor="middle" className="opacity-30 font-bold font-mono">{lbl}</text>
                      
                      {/* Points Circles */}
                      <circle cx={x} cy={yA} r="3" fill="#F5C518" stroke="#111" strokeWidth="1" />
                      <circle cx={x} cy={yB} r="3" fill="#a78bfa" stroke="#111" strokeWidth="1" />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* 3. Match by Match Point Earned Breakdown */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={14} className="text-[#F5C518]" />
              <h3 className="text-sm font-bold text-white">Match-by-Match Points Earned</h3>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[650px] space-y-2">
                {/* Header row */}
                <div className="grid grid-cols-[5rem_1fr_4rem_1fr_5rem] gap-4 px-4 py-2 bg-white/[0.02] border-b border-white/[0.06] rounded-lg">
                  <span className="label">Match</span>
                  <span className="label text-right">{teamA}</span>
                  <span className="label text-center">Outcome</span>
                  <span className="label text-left">{teamB}</span>
                  <span className="label text-right">Margin</span>
                </div>

                {comparisonData.matchLabels.map((lbl, idx) => {
                  const ptsA = comparisonData.A.matchPointsBreakdown[idx] || 0;
                  const ptsB = comparisonData.B.matchPointsBreakdown[idx] || 0;
                  const diff = Math.abs(ptsA - ptsB);

                  if (ptsA === 0 && ptsB === 0) return null;

                  return (
                    <div
                      key={lbl}
                      className="grid grid-cols-[5rem_1fr_4rem_1fr_5rem] gap-4 px-4 py-3 items-center border-b border-white/[0.03] hover:bg-white/[0.015] rounded-lg transition"
                    >
                      {/* Match Name */}
                      <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded w-fit ${
                        ['Q1', 'EL', 'Q2', 'F'].includes(lbl) ? 'bg-purple-900/40 text-purple-300' : 'bg-white/[0.04] text-white/50'
                      }`}>
                        M-{lbl}
                      </span>

                      {/* Points Team A */}
                      <div className="flex items-center justify-end gap-3">
                        <span className={`text-sm font-mono font-bold ${ptsA >= ptsB ? 'text-[#F5C518]' : 'text-white/40'}`}>
                          {ptsA.toFixed(1)}
                        </span>
                        <div className="h-2 flex-1 max-w-[120px] bg-white/[0.03] rounded-full overflow-hidden flex justify-end">
                          {ptsA > 0 && (
                            <div
                              className="h-full bg-[#F5C518]"
                              style={{ width: `${Math.min(100, (ptsA / Math.max(ptsA, ptsB, 1)) * 100)}%` }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Outcome Badge */}
                      <div className="flex justify-center">
                        {ptsA === ptsB ? (
                          <span className="text-[9px] font-black uppercase text-white/40 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">DRAW</span>
                        ) : ptsA > ptsB ? (
                          <span className="text-[9px] font-black uppercase text-[#F5C518] px-1.5 py-0.5 bg-[#F5C518]/10 border border-[#F5C518]/20 rounded">👈 WIN</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-purple-300 px-1.5 py-0.5 bg-purple-950/40 border border-purple-800/30 rounded">WIN 👉</span>
                        )}
                      </div>

                      {/* Points Team B */}
                      <div className="flex items-center justify-start gap-3">
                        <div className="h-2 flex-1 max-w-[120px] bg-white/[0.03] rounded-full overflow-hidden">
                          {ptsB > 0 && (
                            <div
                              className="h-full bg-purple-500"
                              style={{ width: `${Math.min(100, (ptsB / Math.max(ptsA, ptsB, 1)) * 100)}%` }}
                            />
                          )}
                        </div>
                        <span className={`text-sm font-mono font-bold ${ptsB >= ptsA ? 'text-purple-300' : 'text-white/40'}`}>
                          {ptsB.toFixed(1)}
                        </span>
                      </div>

                      {/* Points Margin */}
                      <span className="text-right text-xs font-mono font-semibold text-white/30">
                        {diff > 0 ? `+${diff.toFixed(1)}` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Squad Composition Details */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-[#F5C518]" />
              <h3 className="text-sm font-bold text-white">Squad Composition Comparisons</h3>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center border-b border-white/[0.06] pb-4">
              <div className="space-y-1">
                <span className="label block">Squad Value</span>
                <p className="text-xs text-white/50">{comparisonData.A.totalCost} Cr vs {comparisonData.B.totalCost} Cr</p>
              </div>
              <div className="space-y-1">
                <span className="label block">Captain (2×)</span>
                <p className="text-xs text-white/80 font-bold truncate">
                  {comparisonData.A.captain ? comparisonData.A.captain.name : '—'}
                </p>
                <p className="text-[10px] text-white/35">vs</p>
                <p className="text-xs text-white/80 font-bold truncate">
                  {comparisonData.B.captain ? comparisonData.B.captain.name : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="label block">Vice-Captain (1.5×)</span>
                <p className="text-xs text-white/80 font-bold truncate">
                  {comparisonData.A.vc ? comparisonData.A.vc.name : '—'}
                </p>
                <p className="text-[10px] text-white/35">vs</p>
                <p className="text-xs text-white/80 font-bold truncate">
                  {comparisonData.B.vc ? comparisonData.B.vc.name : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="label block">Role distribution</span>
                <p className="text-xs text-white/50">
                  WK: {comparisonData.A.roles.WK} v {comparisonData.B.roles.WK} | BAT: {comparisonData.A.roles.BAT} v {comparisonData.B.roles.BAT}
                </p>
                <p className="text-[10px] text-white/35">
                  ALL: {comparisonData.A.roles.ALL} v {comparisonData.B.roles.ALL} | BOWL: {comparisonData.A.roles.BOWL} v {comparisonData.B.roles.BOWL}
                </p>
              </div>
            </div>

            {/* Side-by-Side Player Table */}
            <div className="overflow-x-auto pt-2">
              <div className="min-w-[650px] space-y-4">
                {['WK', 'BAT', 'ALL', 'BOWL'].map(role => {
                  const rows = playersBySkill[role] || [];
                  if (rows.length === 0) return null;

                  return (
                    <div key={role} className="space-y-1.5">
                      <div className="px-3 py-1 bg-white/[0.02] border-l-2 border-[#F5C518] rounded-r">
                        <span className="text-[10px] font-black text-white/60 tracking-widest uppercase">{role}</span>
                      </div>
                      
                      {rows.map((row, idx) => {
                        const pA = row.playerA;
                        const pB = row.playerB;

                        return (
                          <div key={idx} className="grid grid-cols-[1fr_20px_1fr] gap-4 px-4 py-2 border-b border-white/[0.02] last:border-0 hover:bg-white/[0.005] items-center text-xs">
                            
                            {/* Player A */}
                            {pA ? (
                              <div className="flex items-center justify-between min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center font-bold text-[9px] text-[#F5C518]">
                                    {pA.name.charAt(0)}
                                  </div>
                                  <span className="font-semibold text-white truncate">{pA.name}</span>
                                  {pA.isC && <Crown size={10} className="text-[#F5C518]" />}
                                  {pA.isVC && <Shield size={10} className="text-blue-400" />}
                                  <IplBadge team={pA.iplTeam} />
                                </div>
                                <span className={`font-mono font-bold ml-2 ${pB && pA.calculatedTotal > pB.calculatedTotal ? 'text-[#F5C518]' : 'text-white/40'}`}>
                                  {pA.calculatedTotal.toFixed(1)} pts
                                </span>
                              </div>
                            ) : <div className="text-white/10 italic text-[11px]">No player</div>}

                            {/* Divider */}
                            <span className="text-white/10 text-center font-bold">⋮</span>

                            {/* Player B */}
                            {pB ? (
                              <div className="flex items-center justify-between min-w-0">
                                <span className={`font-mono font-bold mr-2 ${pA && pB.calculatedTotal > pA.calculatedTotal ? 'text-purple-300' : 'text-white/40'}`}>
                                  {pB.calculatedTotal.toFixed(1)} pts
                                </span>
                                <div className="flex items-center gap-2 min-w-0 justify-end">
                                  <IplBadge team={pB.iplTeam} />
                                  {pB.isC && <Crown size={10} className="text-[#F5C518]" />}
                                  {pB.isVC && <Shield size={10} className="text-blue-400" />}
                                  <span className="font-semibold text-white truncate">{pB.name}</span>
                                  <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center font-bold text-[9px] text-purple-300">
                                    {pB.name.charAt(0)}
                                  </div>
                                </div>
                              </div>
                            ) : <div className="text-white/10 italic text-[11px] text-right">No player</div>}

                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
