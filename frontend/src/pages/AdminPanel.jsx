import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, CheckCircle, AlertCircle, Loader, ShieldOff, RefreshCw, AlertTriangle, Users, Clock, Zap, Crown, Shield, UserX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSquad, useRankings } from '../hooks/usePlayers';
import { updateMatchPoints, markCaptainVC, undoReplace, getMatches, fetchSquad } from '../utils/api';
import ReplacePlayerModal from '../components/ReplacePlayerModal';

const IPL_COLORS = {
  CSK:{bg:'#D4A017',text:'#000'}, MI:{bg:'#1A56B0',text:'#fff'},
  RCB:{bg:'#CC1418',text:'#fff'}, KKR:{bg:'#3A225D',text:'#FFD700'},
  SRH:{bg:'#E05A00',text:'#fff'}, RR:{bg:'#C0176A',text:'#fff'},
  GT:{bg:'#1C2B5E',text:'#C9A84C'}, LSG:{bg:'#00A0B4',text:'#000'},
  PBKS:{bg:'#B5121B',text:'#fff'}, DC:{bg:'#0F4B9C',text:'#fff'},
  PUN:{bg:'#7B26CC',text:'#fff'},
};

function Toast({ toasts }) {
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium pointer-events-auto
              ${t.type === 'success' ? 'bg-[#0C1F12] border-emerald-800/50 text-emerald-300' : 'bg-[#1F0C0C] border-red-800/50 text-red-300'}`}>
            {t.type === 'success' ? <CheckCircle size={15} className="text-emerald-400 shrink-0" /> : <AlertCircle size={15} className="text-red-400 shrink-0" />}
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── C/VC Badge Button ────────────────────────────────────────────────────────
function RoleBadge({ currentRole, role, label, color, onMark, disabled }) {
  const active = currentRole === role;
  return (
    <button
      onClick={() => onMark(active ? '' : role)}
      disabled={disabled}
      title={active ? `Remove ${role}` : `Mark as ${role}`}
      className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all duration-150 border
        ${active
          ? color
          : 'bg-transparent border-white/10 text-white/20 hover:border-white/25 hover:text-white/40'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
    >
      {label}
    </button>
  );
}

// ─── Single Match Cell ────────────────────────────────────────────────────────
const MatchCell = ({ value, originalValue, onChange, disabled, highlighted }) => {
  const isDirty = Number(value) !== Number(originalValue);
  return (
    <input
      type="number" min="0"
      value={value === 0 && !isDirty ? '' : value}
      placeholder="0"
      disabled={disabled}
      onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      className={`w-12 text-center font-mono text-xs py-1.5 rounded-lg border outline-none transition-all duration-150
        ${highlighted 
          ? isDirty
            ? 'bg-[#1E1E0A] border-[#F5C518] text-[#F5C518] ring-2 ring-[#F5C518]/20 scale-105'
            : 'bg-[#15152A] border-[#7C3AED]/60 text-white font-bold ring-2 ring-[#7C3AED]/10 scale-105'
          : isDirty
            ? 'bg-[#18180F] border-[#F5C518]/70 text-[#F5C518] focus:ring-1 focus:ring-[#F5C518]/30'
            : 'bg-transparent border-white/[0.06] text-white/40 hover:border-white/15 focus:border-white/25 focus:text-white/80'}`}
      style={{ minWidth: 48 }}
    />
  );
};

// ─── Player Row ───────────────────────────────────────────────────────────────
const PlayerRow = ({ player, rowIdx, matchLabels, draft, savingRows, savedRows, markingRows, teamName, onCellChange, onSaveRow, onMarkRole, onReplaceClick, onUndoReplaceClick, highlightMatchIdx }) => {
  const ipl     = IPL_COLORS[player.iplTeam] || { bg: '#333', text: '#fff' };
  const saving  = savingRows.has(player.sno);
  const saved   = savedRows.has(player.sno);
  const marking = markingRows.has(player.sno);

  const dirty = draft.some((v, i) => Number(v) !== Number(player.matchPoints[i]));
  const baseTotal = draft.reduce((s, v) => s + (Number(v) || 0), 0);
  const mult = player.isC ? 2 : player.isVC ? 1.5 : 1;
  const displayTotal = parseFloat((baseTotal * mult).toFixed(1));

  return (
    <tr className={`border-b border-white/[0.035] last:border-0 transition-colors duration-150 ${dirty ? 'bg-[#F5C518]/[0.018]' : ''}`}>

      {/* Player info + C/VC buttons */}
      <td className="sticky left-0 z-10 px-3 py-2 bg-[#111] min-w-[200px]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
               style={{ background: ipl.bg, color: ipl.text }}>{player.name.charAt(0)}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] font-semibold text-white truncate leading-tight">{player.name}</span>
              {player.isC  && <Crown size={10} className="text-[#F5C518] shrink-0" />}
              {player.isVC && <Shield size={10} className="text-blue-400 shrink-0" />}
            </div>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <span className="text-[8px] font-bold px-1 rounded" style={{ background: ipl.bg, color: ipl.text }}>{player.iplTeam}</span>
              {/* C / VC toggle buttons */}
              <RoleBadge currentRole={player.isC ? 'C' : player.isVC ? 'VC' : ''} role="C"
                label="C" color="bg-[#F5C518] text-black border-[#F5C518]"
                onMark={r => onMarkRole(rowIdx, r)} disabled={marking || saving} />
              <RoleBadge currentRole={player.isC ? 'C' : player.isVC ? 'VC' : ''} role="VC"
                label="VC" color="bg-blue-600/80 text-white border-blue-500"
                onMark={r => onMarkRole(rowIdx, r)} disabled={marking || saving} />
              {marking && <Loader size={9} className="animate-spin text-[#F5C518]" />}
              
              <button 
                onClick={() => onReplaceClick(player.name)}
                className="ml-2 flex items-center gap-1 text-[9px] font-semibold text-red-400 hover:text-red-300 bg-red-900/20 border border-red-900/30 px-1.5 py-0.5 rounded transition"
                title="Replace Player"
              >
                <UserX size={10} /> Replace
              </button>
              {player.name.includes('/') && (
                <button 
                  onClick={() => onUndoReplaceClick(player.name)}
                  className="ml-1 flex items-center gap-1 text-[9px] font-semibold text-orange-400 hover:text-orange-300 bg-orange-900/20 border border-orange-900/30 px-1.5 py-0.5 rounded transition"
                  title="Undo Replace"
                >
                  <RefreshCw size={10} /> Undo
                </button>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Match cells */}
      {matchLabels.map((_, mi) => (
        <td key={mi} className={`px-0.5 py-2 text-center transition-colors duration-150 ${highlightMatchIdx === mi ? 'bg-[#7C3AED]/[0.03]' : ''}`}>
          <MatchCell value={draft[mi]} originalValue={player.matchPoints[mi]}
            onChange={val => onCellChange(rowIdx, mi, val)} disabled={saving} highlighted={highlightMatchIdx === mi} />
        </td>
      ))}

      {/* Total */}
      <td className="sticky right-[68px] z-10 px-3 py-2 text-right bg-[#111] min-w-[60px]">
        <div className="flex flex-col items-end">
          <span className={`text-sm font-black font-mono tabular-nums
            ${dirty || player.isC || player.isVC ? 'text-[#F5C518]' : displayTotal > 0 ? 'text-white/60' : 'text-white/15'}`}>
            {displayTotal > 0 ? displayTotal : '—'}
          </span>
          {(player.isC || player.isVC) && (
            <span className="text-[8px] text-white/30">{player.isC ? '2×' : '1.5×'} applied</span>
          )}
        </div>
      </td>

      {/* Save */}
      <td className="sticky right-0 z-10 px-2 py-2 bg-[#111] w-[68px]">
        <button onClick={() => onSaveRow(rowIdx)} disabled={!dirty || saving || saved}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 active:scale-95
            ${saved ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/40 cursor-default'
              : dirty && !saving ? 'bg-[#F5C518] text-black hover:bg-[#EDB800] shadow-[0_0_10px_rgba(245,197,24,0.2)]'
              : 'bg-transparent text-white/15 cursor-not-allowed border border-white/[0.05]'}`}>
          {saving ? <Loader size={12} className="animate-spin" />
           : saved  ? <><CheckCircle size={11}/> OK</>
           : <><Save size={11}/> Save</>}
        </button>
      </td>
    </tr>
  );
};

// ─── Access Denied ────────────────────────────────────────────────────────────
function AccessDenied() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 gap-5">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
        <ShieldOff size={28} className="text-white/20" />
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-white">Access Denied</p>
        <p className="text-sm text-white/35 mt-1">You need admin privileges to view this page.</p>
      </div>
    </motion.div>
  );
}

// ─── Team Match Editor ────────────────────────────────────────────────────────
function TeamMatchEditor({ teamName, addToast }) {
  const { squad, loading, error, refetch } = useSquad(teamName);
  const [drafts,      setDrafts]      = useState(null);
  const [savingRows,  setSavingRows]  = useState(new Set());
  const [savedRows,   setSavedRows]   = useState(new Set());
  const [markingRows, setMarkingRows] = useState(new Set());
  const [lastSync,    setLastSync]    = useState(null);
  const squadRef = useRef(null);

  // Match & Team Filter States
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId]   = useState('');
  const [teamAFilter, setTeamAFilter]           = useState('');
  const [teamBFilter, setTeamBFilter]           = useState('');
  const [highlightMatchIdx, setHighlightMatchIdx] = useState(-1);

  // Replacement Modal State
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [playerToReplace, setPlayerToReplace] = useState('');

  // Fetch scheduled matches
  useEffect(() => {
    async function loadMatches() {
      try {
        const list = await getMatches();
        setScheduledMatches(list || []);
      } catch (err) {
        console.error('Failed to load scheduled matches', err);
      }
    }
    loadMatches();
  }, []);

  useEffect(() => {
    if (squad && squad !== squadRef.current) {
      squadRef.current = squad;
      setDrafts(squad.players.map(p => [...p.matchPoints]));
      setSavingRows(new Set()); setSavedRows(new Set()); setMarkingRows(new Set());
    }
  }, [squad]);

  const handleCellChange = useCallback((rowIdx, matchIdx, val) => {
    setDrafts(prev => { const next = prev.map(r => [...r]); next[rowIdx][matchIdx] = val; return next; });
    setSavedRows(prev => { const s = new Set(prev); s.delete(rowIdx); return s; });
  }, []);

  const handleSaveRow = useCallback(async (rowIdx) => {
    if (!squad || !drafts) return;
    const player = squad.players[rowIdx];
    const draft  = drafts[rowIdx];
    const changed = draft.map((v, i) => ({ i, v: Number(v), orig: Number(player.matchPoints[i]) })).filter(c => c.v !== c.orig);
    if (changed.length === 0) return;
    setSavingRows(prev => new Set([...prev, player.sno]));
    try {
      await Promise.all(changed.map(c => updateMatchPoints(teamName, player.rawName, c.i, c.v)));
      // Optimistic update
      squadRef.current = {
        ...squadRef.current,
        players: squadRef.current.players.map((p, idx) =>
          idx === rowIdx ? { ...p, matchPoints: [...draft] } : p
        ),
      };
      addToast(`✓ ${player.name} saved!`, 'success');
      setLastSync(new Date());
      setSavedRows(prev => new Set([...prev, player.sno]));
      setTimeout(() => setSavedRows(prev => { const s = new Set(prev); s.delete(player.sno); return s; }), 2500);
    } catch (err) {
      addToast(`Error: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setSavingRows(prev => { const s = new Set(prev); s.delete(player.sno); return s; });
    }
  }, [squad, drafts, teamName, addToast]);

  const handleMarkRole = useCallback(async (rowIdx, role) => {
    if (!squad) return;
    const player = squad.players[rowIdx];
    setMarkingRows(prev => new Set([...prev, player.sno]));
    try {
      const result = await markCaptainVC(teamName, player.name, role);
      addToast(
        role === 'C'  ? `👑 ${player.name} marked as Captain (2×)!` :
        role === 'VC' ? `🛡️ ${player.name} marked as Vice-Captain (1.5×)!` :
                        `✓ ${player.name} role cleared`,
        'success'
      );
      setLastSync(new Date());
      // Refetch to get fresh C/VC state from sheet
      refetch();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      if (msg.includes('Unknown action')) {
        addToast('⚠️ Please redeploy the Apps Script first (see apps-script.js)', 'error');
      } else {
        addToast(`Error: ${msg}`, 'error');
      }
    } finally {
      setMarkingRows(prev => { const s = new Set(prev); s.delete(player.sno); return s; });
    }
  }, [squad, teamName, addToast, refetch]);

  const handleUndoReplace = useCallback(async (currentName) => {
    const originalName = currentName.split('/')[0].trim();
    if (!confirm(`Are you sure you want to undo replace and revert to ${originalName}?`)) return;
    
    try {
      await undoReplace(teamName, currentName, originalName);
      addToast(`Successfully restored ${originalName}`, 'success');
      refetch();
    } catch (err) {
      addToast(`Error: ${err.response?.data?.error || err.message}`, 'error');
    }
  }, [teamName, addToast, refetch]);

  const handleFixtureSelect = (e) => {
    const val = e.target.value;
    setSelectedMatchId(val);
    if (!val) {
      setTeamAFilter('');
      setTeamBFilter('');
      return;
    }
    const match = scheduledMatches.find(m => m.matchId === val || `${m.teamA}-${m.teamB}` === val);
    if (match) {
      setTeamAFilter(match.teamA);
      setTeamBFilter(match.teamB);
      
      // Auto highlight matching column
      const numMatch = match.matchId?.match(/\d+/);
      if (numMatch && squad) {
        const numStr = numMatch[0];
        const idx = squad.matchLabels.indexOf(numStr);
        if (idx !== -1) setHighlightMatchIdx(idx);
      } else if (squad) {
        const label = match.matchId?.toUpperCase();
        const idx = squad.matchLabels.findIndex(l => l.toUpperCase() === label);
        if (idx !== -1) setHighlightMatchIdx(idx);
      }
    }
  };

  const clearFilters = () => {
    setTeamAFilter('');
    setTeamBFilter('');
    setHighlightMatchIdx(-1);
    setSelectedMatchId('');
  };

  // Filter and sort squad players based on selected IPL teams
  const filteredAndSortedPlayers = useMemo(() => {
    if (!squad) return [];
    let list = squad.players.map((p, originalIndex) => ({ ...p, originalIndex }));

    if (teamAFilter || teamBFilter) {
      list = list.filter(p => {
        const team = p.iplTeam?.toUpperCase();
        const matchesA = teamAFilter ? team === teamAFilter.toUpperCase() : false;
        const matchesB = teamBFilter ? team === teamBFilter.toUpperCase() : false;
        return matchesA || matchesB;
      });
    }

    // Sort: first by iplTeam, then by name
    list.sort((a, b) => {
      if (a.iplTeam !== b.iplTeam) {
        return a.iplTeam.localeCompare(b.iplTeam);
      }
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [squad, teamAFilter, teamBFilter]);

  const dirtyCount = useMemo(() => {
    if (!drafts || !squad) return 0;
    return squad.players.filter((p, i) => drafts[i]?.some((v, j) => Number(v) !== Number(p.matchPoints[j]))).length;
  }, [drafts, squad]);

  async function handleSaveAll() {
    if (!squad || !drafts) return;
    const dirty = squad.players.map((_, i) => i).filter(i => drafts[i]?.some((v, j) => Number(v) !== Number(squad.players[i].matchPoints[j])));
    for (const i of dirty) await handleSaveRow(i);
  }

  if (loading) return <div className="flex flex-col items-center justify-center py-20 gap-3"><Loader size={22} className="animate-spin text-[#F5C518]" /><p className="text-sm text-white/30">Loading {teamName}…</p></div>;
  if (error)   return <div className="flex flex-col items-center justify-center py-14 gap-4"><AlertTriangle size={26} className="text-red-400" /><p className="text-sm text-red-400">{error}</p><button onClick={refetch} className="btn btn-primary">Retry</button></div>;
  if (!squad || !drafts) return null;

  const { players, matchLabels } = squad;
  const captain = players.find(p => p.isC);
  const vc      = players.find(p => p.isVC);
  const grandTotal = players.reduce((s, p, i) => {
    const base = drafts[i]?.reduce((a, v) => a + (Number(v) || 0), 0) || 0;
    const mult = p.isC ? 2 : p.isVC ? 1.5 : 1;
    return s + parseFloat((base * mult).toFixed(1));
  }, 0);

  return (
    <div className="space-y-4">

      {/* ⚡ Match-specific Player Filtering Widget */}
      <div className="card bg-gradient-to-r from-[#171725] to-[#11111E] border border-[#7C3AED]/20 p-4 rounded-xl flex flex-wrap gap-4 items-center shadow-lg relative overflow-hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 flex items-center justify-center border border-[#7C3AED]/30 text-[#a78bfa]">
            <Zap size={14} className="fill-[#a78bfa]/20 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Fixture Points entry helper</h4>
            <p className="text-[10px] text-white/35">Filter squad by real match-up & highlight target column</p>
          </div>
        </div>

        {/* Scheduled fixtures dropdown */}
        {scheduledMatches.length > 0 && (
          <div className="flex flex-col gap-1 min-w-[170px]">
            <span className="text-[9px] uppercase font-extrabold text-white/40 tracking-wider">Scheduled fixture</span>
            <select
              value={selectedMatchId}
              onChange={handleFixtureSelect}
              className="bg-[#0C0C0C] border border-white/10 hover:border-white/20 focus:border-[#7C3AED] rounded-lg text-xs px-2.5 py-1.5 text-white font-semibold outline-none transition cursor-pointer"
            >
              <option value="">-- Choose Fixture --</option>
              {scheduledMatches.map(m => (
                <option key={m.matchId || m.date + m.teamA} value={m.matchId || `${m.teamA}-${m.teamB}`}>
                  {m.teamA} vs {m.teamB} ({m.date})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Team A selector */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] uppercase font-extrabold text-white/40 tracking-wider">IPL Team 1</span>
          <select
            value={teamAFilter}
            onChange={e => { setTeamAFilter(e.target.value); setSelectedMatchId(''); }}
            className="bg-[#0C0C0C] border border-white/10 hover:border-white/20 focus:border-[#7C3AED] rounded-lg text-xs px-2.5 py-1.5 text-white font-semibold outline-none transition cursor-pointer"
          >
            <option value="">-- All --</option>
            {Object.keys(IPL_COLORS).map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        {/* Team B selector */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] uppercase font-extrabold text-white/40 tracking-wider">IPL Team 2</span>
          <select
            value={teamBFilter}
            onChange={e => { setTeamBFilter(e.target.value); setSelectedMatchId(''); }}
            className="bg-[#0C0C0C] border border-white/10 hover:border-white/20 focus:border-[#7C3AED] rounded-lg text-xs px-2.5 py-1.5 text-white font-semibold outline-none transition cursor-pointer"
          >
            <option value="">-- All --</option>
            {Object.keys(IPL_COLORS).map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        {/* Highlight column */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] uppercase font-extrabold text-white/40 tracking-wider">Edit Column</span>
          <select
            value={highlightMatchIdx}
            onChange={e => setHighlightMatchIdx(Number(e.target.value))}
            className="bg-[#0C0C0C] border border-white/10 hover:border-white/20 focus:border-[#7C3AED] rounded-lg text-xs px-2.5 py-1.5 text-[#F5C518] font-mono font-semibold outline-none transition cursor-pointer"
          >
            <option value="-1">-- Select Column --</option>
            {matchLabels.map((lbl, idx) => (
              <option key={idx} value={idx}>Match {lbl}</option>
            ))}
          </select>
        </div>

        {/* Reset button */}
        {(teamAFilter || teamBFilter || highlightMatchIdx !== -1) && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 bg-red-950/20 hover:bg-red-900/30 border border-red-900/40 text-red-300 rounded-lg text-[10px] font-bold tracking-wider uppercase transition active:scale-95 flex items-center gap-1 sm:ml-auto self-end"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* C/VC status bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold
          ${captain ? 'bg-[#F5C518]/10 border-[#F5C518]/30 text-[#F5C518]' : 'bg-white/[0.03] border-white/[0.07] text-white/25'}`}>
          <Crown size={12} />
          {captain ? `C: ${captain.name}` : 'No Captain set'}
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold
          ${vc ? 'bg-blue-900/30 border-blue-700/30 text-blue-300' : 'bg-white/[0.03] border-white/[0.07] text-white/25'}`}>
          <Shield size={12} />
          {vc ? `VC: ${vc.name}` : 'No Vice-Captain set'}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#F5C518]"><Zap size={11} className="inline mr-1" />{grandTotal.toLocaleString()} pts</span>
          {lastSync && <span className="text-[11px] text-emerald-400"><Clock size={10} className="inline mr-1" />{lastSync.toLocaleTimeString()}</span>}
          {dirtyCount > 0 && (
            <button onClick={handleSaveAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5C518] text-black text-xs font-bold hover:bg-[#EDB800] transition shadow-[0_0_12px_rgba(245,197,24,0.25)]">
              <Save size={12}/> Save All ({dirtyCount})
            </button>
          )}
          <button onClick={refetch} className="p-1.5 rounded-lg text-white/25 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition">
            <RefreshCw size={13}/>
          </button>
        </div>
      </div>

      {/* Hint */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg px-4 py-2 flex items-center gap-2">
        <Crown size={12} className="text-[#F5C518]/50 shrink-0"/>
        <p className="text-[11px] text-white/30">
          Click <strong className="text-[#F5C518]/60">C</strong> or <strong className="text-blue-400/60">VC</strong> buttons next to any player to set Captain (2×) or Vice-Captain (1.5×). Totals recalculate automatically in Google Sheets.
        </p>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-auto max-h-[60vh] custom-scrollbar scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full" style={{ minWidth: 1000 }}>
            <thead className="sticky top-0 z-30 shadow-md">
              <tr className="border-b border-white/[0.06] bg-[#111]">
                <th className="sticky left-0 top-0 z-40 px-3 py-2.5 text-left bg-[#111] min-w-[200px] border-b border-white/[0.06]">
                  <span className="label text-[10px]">Player <span className="text-white/20 font-normal">(click C/VC to assign)</span></span>
                </th>
                {matchLabels.map((lbl, i) => (
                  <th key={i} className={`sticky top-0 z-30 px-0.5 py-2.5 text-center min-w-[52px] bg-[#111] border-b border-white/[0.06] transition-colors duration-150
                    ${highlightMatchIdx === i ? 'bg-[#7C3AED]/10 border-b-[#7C3AED]' : ''}`}>
                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded transition
                      ${highlightMatchIdx === i
                        ? 'bg-[#7C3AED] text-white shadow-[0_0_8px_rgba(124,58,237,0.4)]'
                        : ['Q1','EL','Q2','F'].includes(lbl) ? 'bg-purple-900/40 text-purple-300' : 'bg-[#F5C518]/10 text-[#F5C518]'}`}>
                      {lbl}
                    </span>
                  </th>
                ))}
                <th className="sticky right-[68px] top-0 z-40 px-3 py-2.5 text-right bg-[#111] min-w-[70px] border-b border-white/[0.06]"><span className="label text-[10px]">Total</span></th>
                <th className="sticky right-0 top-0 z-40 px-2 py-2.5 bg-[#111] w-[68px] border-b border-white/[0.06]"><span className="label text-[10px]">Save</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedPlayers.map((p) => (
                <PlayerRow key={p.sno} player={p} rowIdx={p.originalIndex} matchLabels={matchLabels}
                  draft={drafts[p.originalIndex] || p.matchPoints} savingRows={savingRows} savedRows={savedRows}
                  markingRows={markingRows} teamName={teamName}
                  onCellChange={handleCellChange} onSaveRow={handleSaveRow} onMarkRole={handleMarkRole}
                  onReplaceClick={(name) => { setPlayerToReplace(name); setReplaceModalOpen(true); }} 
                  onUndoReplaceClick={handleUndoReplace} highlightMatchIdx={highlightMatchIdx} />
              ))}
              {filteredAndSortedPlayers.length === 0 && (
                <tr>
                  <td colSpan={matchLabels.length + 3} className="text-center py-10 text-xs text-white/20 italic">
                    No players found matching current IPL team filters.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="sticky bottom-0 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.5)]">
              <tr className="border-t border-white/[0.07] bg-[#111]">
                <td className="sticky left-0 bottom-0 z-40 px-3 py-2.5 bg-[#111] border-t border-white/[0.07]"><span className="label text-[#F5C518] text-[10px]">Team Total</span></td>
                {matchLabels.map((_, i) => {
                  const colTotal = players.reduce((s, p, ri) => s + (Number(drafts[ri]?.[i]) || 0), 0);
                  return <td key={i} className={`sticky bottom-0 z-30 px-0.5 py-2.5 text-center bg-[#111] border-t border-white/[0.07] transition-colors
                    ${highlightMatchIdx === i ? 'bg-[#7C3AED]/5' : ''}`}>
                    <span className={`text-[10px] font-bold font-mono ${colTotal > 0 ? 'text-white/45' : 'text-white/10'}`}>{colTotal > 0 ? colTotal : '—'}</span>
                  </td>;
                })}
                <td className="sticky right-[68px] bottom-0 z-40 px-3 py-2.5 text-right bg-[#111] border-t border-white/[0.07]"><span className="text-sm font-black font-mono text-[#F5C518]">{grandTotal.toLocaleString()}</span></td>
                <td className="sticky right-0 bottom-0 z-40 bg-[#111] border-t border-white/[0.07]"/>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[10px] text-white/25">
        <span><Crown size={10} className="inline mr-1 text-[#F5C518]" />Captain = 2× points</span>
        <span><Shield size={10} className="inline mr-1 text-blue-400" />Vice-Captain = 1.5× points</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded border border-[#F5C518]/60 bg-[#18180F]"/>Yellow = unsaved change</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded border border-[#7C3AED] bg-[#15152A]"/>Purple = highlighted match column</span>
      </div>

      <ReplacePlayerModal
        open={replaceModalOpen}
        onClose={() => setReplaceModalOpen(false)}
        teamName={teamName}
        oldPlayerName={playerToReplace}
        onPlayerReplaced={(newName) => {
          addToast(`Successfully replaced ${playerToReplace} with ${newName}`, 'success');
          refetch(); // Refresh squad
        }}
      />
    </div>
  );
}

// ─── Unified Fixture Editor (Bulk Point Entry) ─────────────────────────────────
function UnifiedFixtureEditor({ rankings, addToast }) {
  const [allSquadsData, setAllSquadsData] = useState({});
  const [loading, setLoading] = useState(false);

  // Match & Team Filter States
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId]   = useState('');
  const [teamAFilter, setTeamAFilter]           = useState('');
  const [teamBFilter, setTeamBFilter]           = useState('');
  const [highlightMatchIdx, setHighlightMatchIdx] = useState(-1);

  // Fetch scheduled matches
  useEffect(() => {
    async function loadMatches() {
      try {
        const list = await getMatches();
        setScheduledMatches(list || []);
      } catch (err) {
        console.error('Failed to load scheduled matches', err);
      }
    }
    loadMatches();
  }, []);

  // Fetch all squads in parallel
  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const results = await Promise.all(
          rankings.map(r => fetchSquad(r.team).then(data => ({ team: r.team, data })))
        );
        const map = {};
        results.forEach(res => {
          map[res.team] = res.data;
        });
        setAllSquadsData(map);
      } catch (err) {
        console.error(err);
        addToast('Failed to load squad datasets', 'error');
      } finally {
        setLoading(false);
      }
    }
    if (rankings.length > 0) loadAll();
  }, [rankings]);

  // Extract match labels from first loaded squad
  const matchLabels = useMemo(() => {
    const firstSquad = Object.values(allSquadsData)[0];
    return firstSquad?.matchLabels || [];
  }, [allSquadsData]);

  // Compile unique players belonging to playing teams across all fantasy squads
  const uniquePlayers = useMemo(() => {
    const playerMap = {};

    Object.entries(allSquadsData).forEach(([teamName, squadData]) => {
      squadData.players.forEach(p => {
        const iplTeam = p.iplTeam?.toUpperCase();
        const matchesA = teamAFilter ? iplTeam === teamAFilter.toUpperCase() : false;
        const matchesB = teamBFilter ? iplTeam === teamBFilter.toUpperCase() : false;
        if ((teamAFilter || teamBFilter) && !matchesA && !matchesB) return;

        if (!playerMap[p.name]) {
          playerMap[p.name] = {
            name: p.name,
            iplTeam: p.iplTeam,
            skill: p.skill,
            squads: []
          };
        }

        playerMap[p.name].squads.push({
          teamName,
          rawName: p.rawName,
          originalPoints: highlightMatchIdx !== -1 ? (p.matchPoints[highlightMatchIdx] || 0) : 0
        });
      });
    });

    const list = Object.values(playerMap);
    list.sort((a, b) => {
      if (a.iplTeam !== b.iplTeam) return a.iplTeam.localeCompare(b.iplTeam);
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [allSquadsData, teamAFilter, teamBFilter, highlightMatchIdx]);

  // Point Drafts
  const [draftPoints, setDraftPoints] = useState({});
  const [savingPlayers, setSavingPlayers] = useState(new Set());
  const [savedPlayers, setSavedPlayers] = useState(new Set());

  useEffect(() => {
    const initial = {};
    uniquePlayers.forEach(p => {
      initial[p.name] = p.squads[0]?.originalPoints ?? 0;
    });
    setDraftPoints(initial);
    setSavingPlayers(new Set());
    setSavedPlayers(new Set());
  }, [uniquePlayers]);

  const handlePointsChange = (name, val) => {
    setDraftPoints(prev => ({ ...prev, [name]: val }));
    setSavedPlayers(prev => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  };

  const handleSavePlayer = async (playerObj) => {
    if (highlightMatchIdx === -1) {
      addToast('Please select a match column to update!', 'error');
      return;
    }
    const val = draftPoints[playerObj.name] ?? 0;
    const targets = playerObj.squads.filter(s => Number(s.originalPoints) !== Number(val));
    if (targets.length === 0) return;

    setSavingPlayers(prev => new Set([...prev, playerObj.name]));
    try {
      await Promise.all(
        targets.map(t => updateMatchPoints(t.teamName, t.rawName, highlightMatchIdx, val))
      );

      addToast(`✓ Updated ${playerObj.name} in ${targets.length} squads!`, 'success');

      // Update local cache optimistically
      setAllSquadsData(prev => {
        const next = { ...prev };
        targets.forEach(t => {
          const squad = next[t.teamName];
          if (squad) {
            squad.players = squad.players.map(p => {
              if (p.name === playerObj.name) {
                const newMatchPoints = [...p.matchPoints];
                newMatchPoints[highlightMatchIdx] = val;
                return { ...p, matchPoints: newMatchPoints };
              }
              return p;
            });
          }
        });
        return next;
      });

      setSavedPlayers(prev => new Set([...prev, playerObj.name]));
      setTimeout(() => {
        setSavedPlayers(prev => {
          const next = new Set(prev);
          next.delete(playerObj.name);
          return next;
        });
      }, 2500);

    } catch (err) {
      addToast(`Error saving ${playerObj.name}: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setSavingPlayers(prev => {
        const next = new Set(prev);
        next.delete(playerObj.name);
        return next;
      });
    }
  };

  const handleSaveAll = async () => {
    const dirty = uniquePlayers.filter(p => {
      const val = draftPoints[p.name] ?? 0;
      return p.squads.some(s => Number(s.originalPoints) !== Number(val));
    });

    if (dirty.length === 0) return;

    // Save one by one to prevent rate limits
    for (const p of dirty) {
      await handleSavePlayer(p);
    }
    addToast(`✓ Successfully updated all match-day points!`, 'success');
  };

  const handleFixtureSelect = (e) => {
    const val = e.target.value;
    setSelectedMatchId(val);
    if (!val) {
      setTeamAFilter('');
      setTeamBFilter('');
      return;
    }
    const match = scheduledMatches.find(m => m.matchId === val || `${m.teamA}-${m.teamB}` === val);
    if (match) {
      setTeamAFilter(match.teamA);
      setTeamBFilter(match.teamB);
      
      const numMatch = match.matchId?.match(/\d+/);
      if (numMatch && matchLabels.length > 0) {
        const numStr = numMatch[0];
        const idx = matchLabels.indexOf(numStr);
        if (idx !== -1) setHighlightMatchIdx(idx);
      } else if (matchLabels.length > 0) {
        const label = match.matchId?.toUpperCase();
        const idx = matchLabels.findIndex(l => l.toUpperCase() === label);
        if (idx !== -1) setHighlightMatchIdx(idx);
      }
    }
  };

  const clearFilters = () => {
    setTeamAFilter('');
    setTeamBFilter('');
    setHighlightMatchIdx(-1);
    setSelectedMatchId('');
  };

  const dirtyCount = useMemo(() => {
    return uniquePlayers.filter(p => {
      const val = draftPoints[p.name] ?? 0;
      return p.squads.some(s => Number(s.originalPoints) !== Number(val));
    }).length;
  }, [uniquePlayers, draftPoints]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader size={22} className="animate-spin text-[#F5C518]" />
        <p className="text-sm text-white/30">Loading players database across all squads…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters widget */}
      <div className="card bg-gradient-to-r from-[#181812] to-[#11110B] border border-[#F5C518]/15 p-5 rounded-xl flex flex-wrap gap-4 items-center shadow-lg relative overflow-hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F5C518]/10 flex items-center justify-center border border-[#F5C518]/25 text-[#F5C518]">
            <Zap size={14} className="fill-[#F5C518]/10 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Fixture Points entry helper</h4>
            <p className="text-[10px] text-white/35">Filter all squads simultaneously by real match-up</p>
          </div>
        </div>

        {/* Scheduled fixtures dropdown */}
        {scheduledMatches.length > 0 && (
          <div className="flex flex-col gap-1 min-w-[170px]">
            <span className="text-[9px] uppercase font-extrabold text-white/40 tracking-wider">Scheduled fixture</span>
            <select
              value={selectedMatchId}
              onChange={handleFixtureSelect}
              className="bg-[#0C0C0C] border border-white/10 hover:border-white/20 focus:border-[#F5C518] rounded-lg text-xs px-2.5 py-1.5 text-white font-semibold outline-none transition cursor-pointer"
            >
              <option value="">-- Choose Fixture --</option>
              {scheduledMatches.map(m => (
                <option key={m.matchId || m.date + m.teamA} value={m.matchId || `${m.teamA}-${m.teamB}`}>
                  {m.teamA} vs {m.teamB} ({m.date})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Team A selector */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] uppercase font-extrabold text-white/40 tracking-wider">IPL Team A</span>
          <select
            value={teamAFilter}
            onChange={e => { setTeamAFilter(e.target.value); setSelectedMatchId(''); }}
            className="bg-[#0C0C0C] border border-white/10 hover:border-white/20 focus:border-[#F5C518] rounded-lg text-xs px-2.5 py-1.5 text-white font-semibold outline-none transition cursor-pointer"
          >
            <option value="">-- All --</option>
            {Object.keys(IPL_COLORS).map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        {/* Team B selector */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] uppercase font-extrabold text-white/40 tracking-wider">IPL Team B</span>
          <select
            value={teamBFilter}
            onChange={e => { setTeamBFilter(e.target.value); setSelectedMatchId(''); }}
            className="bg-[#0C0C0C] border border-white/10 hover:border-white/20 focus:border-[#F5C518] rounded-lg text-xs px-2.5 py-1.5 text-white font-semibold outline-none transition cursor-pointer"
          >
            <option value="">-- All --</option>
            {Object.keys(IPL_COLORS).map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        {/* Highlight column */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] uppercase font-extrabold text-white/40 tracking-wider">Edit Column</span>
          <select
            value={highlightMatchIdx}
            onChange={e => setHighlightMatchIdx(Number(e.target.value))}
            className="bg-[#0C0C0C] border border-white/10 hover:border-white/20 focus:border-[#F5C518] rounded-lg text-xs px-2.5 py-1.5 text-[#F5C518] font-mono font-semibold outline-none transition cursor-pointer"
          >
            <option value="-1">-- Select Column --</option>
            {matchLabels.map((lbl, idx) => (
              <option key={idx} value={idx}>Match {lbl}</option>
            ))}
          </select>
        </div>

        {/* Action Button Group */}
        <div className="flex items-center gap-2 sm:ml-auto self-end">
          {dirtyCount > 0 && (
            <button
              onClick={handleSaveAll}
              className="px-3.5 py-1.5 bg-[#F5C518] hover:bg-[#EDB800] text-black font-extrabold text-[11px] rounded-lg transition-all duration-150 active:scale-95 flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,197,24,0.3)]"
            >
              <Save size={12} /> Save All ({dirtyCount})
            </button>
          )}

          {(teamAFilter || teamBFilter || highlightMatchIdx !== -1) && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 bg-red-950/20 hover:bg-red-900/30 border border-red-900/40 text-red-300 rounded-lg text-[10px] font-bold tracking-wider uppercase transition active:scale-95 flex items-center gap-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Roster Table */}
      <div className="card overflow-hidden">
        <div className="overflow-auto max-h-[65vh] custom-scrollbar scroll-smooth">
          <table className="w-full text-left border-collapse" style={{ minWidth: 800 }}>
            <thead>
              <tr className="border-b border-white/[0.06] bg-[#111] text-[10px] uppercase font-black tracking-wider text-white/40">
                <th className="px-4 py-3 min-w-[220px]">Playing Athlete</th>
                <th className="px-4 py-3 min-w-[280px]">Drafted in Fantasy Teams</th>
                <th className="px-4 py-3 text-center w-[120px]">Points Value</th>
                <th className="px-4 py-3 text-center w-[100px]">Save Action</th>
              </tr>
            </thead>
            <tbody>
              {uniquePlayers.map(p => {
                const draftVal = draftPoints[p.name] ?? 0;
                const isSaving = savingPlayers.has(p.name);
                const isSaved = savedPlayers.has(p.name);
                const isDirty = p.squads.some(s => Number(s.originalPoints) !== Number(draftVal));
                const iplColor = IPL_COLORS[p.iplTeam] || { bg: '#333', text: '#fff' };

                return (
                  <tr key={p.name} className={`border-b border-white/[0.03] hover:bg-white/[0.01] transition-all duration-100 ${isDirty ? 'bg-[#F5C518]/[0.015]' : ''}`}>
                    
                    {/* Athlete info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0" style={{ background: iplColor.bg, color: iplColor.text }}>
                          {p.name.charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-white truncate block">{p.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[8px] font-extrabold px-1 rounded uppercase tracking-wider" style={{ background: iplColor.bg, color: iplColor.text }}>
                              {p.iplTeam}
                            </span>
                            <span className="text-[9px] text-white/30">{p.skill}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Drafted Squad Chips */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {p.squads.map(s => {
                          const isC = s.rawName.includes('(C)');
                          const isVC = s.rawName.includes('(VC)');
                          return (
                            <span key={s.teamName} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border transition ${
                              isC ? 'bg-[#F5C518]/10 border-[#F5C518]/30 text-[#F5C518]' :
                              isVC ? 'bg-blue-900/30 border-blue-800/30 text-blue-300' :
                              'bg-white/[0.03] border-white/[0.06] text-white/50'
                            }`}>
                              {s.teamName}
                              {isC && <Crown size={9} />}
                              {isVC && <Shield size={9} />}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* Points Input */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        disabled={highlightMatchIdx === -1 || isSaving}
                        value={draftVal === 0 && !isDirty ? '' : draftVal}
                        placeholder={highlightMatchIdx === -1 ? 'Select Match' : '0'}
                        onChange={e => handlePointsChange(p.name, e.target.value === '' ? 0 : Number(e.target.value))}
                        className={`w-20 text-center font-mono text-xs py-1.5 rounded-lg border outline-none transition-all duration-150 ${
                          highlightMatchIdx === -1 ? 'bg-white/[0.01] border-white/5 text-white/20 cursor-not-allowed' :
                          isDirty ? 'bg-[#1E1E0A] border-[#F5C518] text-[#F5C518] font-bold scale-105 shadow-sm' :
                          'bg-transparent border-white/[0.08] text-white/70 hover:border-white/15 focus:border-[#7C3AED] focus:text-white'
                        }`}
                      />
                    </td>

                    {/* Save action button */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleSavePlayer(p)}
                        disabled={!isDirty || isSaving || isSaved || highlightMatchIdx === -1}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 ${
                          isSaved ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/40 cursor-default' :
                          isDirty && !isSaving ? 'bg-[#F5C518] text-black hover:bg-[#EDB800] shadow-sm' :
                          'bg-transparent text-white/15 cursor-not-allowed border border-white/[0.05]'
                        }`}
                      >
                        {isSaving ? <Loader size={11} className="animate-spin" /> :
                         isSaved ? <><CheckCircle2 size={11} /> OK</> :
                         <><Save size={11} /> Save</>}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {uniquePlayers.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-xs text-white/25 italic bg-[#111]/30">
                    {teamAFilter || teamBFilter ?
                      'No drafted playing athletes found for selected match fixture.' :
                      'Select fixture above or enter Team names to load roster players.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Panel ─────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { isAdmin } = useAuth();
  const { rankings, loading: rLoading } = useRankings();
  const [selectedTeam, setSelectedTeam] = useState('');
  const [adminMode, setAdminMode] = useState('squad'); // 'squad' or 'unified'
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (rankings.length > 0 && !selectedTeam) setSelectedTeam(rankings[0].team);
  }, [rankings]);

  const addToast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  if (!isAdmin) return <AccessDenied />;

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="label text-[#F5C518] mb-1.5">Admin Only</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Match Points Editor</h1>
          <p className="text-sm text-white/30 mt-0.5">Edit points & assign Captain/VC per team — syncs live to Google Sheets</p>
        </div>
        
        {/* Unified / Single Toggle */}
        <div className="flex items-center gap-2 bg-[#141414] border border-white/5 p-1 rounded-xl w-fit shrink-0">
          <button
            onClick={() => setAdminMode('squad')}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition ${
              adminMode === 'squad' ? 'bg-[#F5C518] text-black shadow-md' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            Fantasy Team View
          </button>
          <button
            onClick={() => setAdminMode('unified')}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition flex items-center gap-1.5 ${
              adminMode === 'unified' ? 'bg-[#F5C518]/15 text-[#F5C518] border border-[#F5C518]/30 shadow-[0_0_12px_rgba(245,197,24,0.15)]' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <Zap size={12} className="fill-current" /> Unified Fixture View
          </button>
        </div>
      </div>

      {adminMode === 'squad' ? (
        <>
          {/* Team Selector */}
          <div className="card p-4">
            <p className="label mb-3">Select Fantasy Team</p>
            {rLoading ? (
              <div className="flex gap-2 flex-wrap">{Array.from({length:6}).map((_,i)=><div key={i} className="skeleton h-9 w-28 rounded-lg"/>)}</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {rankings.map(r => (
                  <button key={r.team} onClick={() => setSelectedTeam(r.team)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-150
                      ${selectedTeam === r.team
                        ? 'bg-[#F5C518] text-black border-[#F5C518] shadow-[0_0_14px_rgba(245,197,24,0.2)]'
                        : 'bg-white/[0.04] text-white/55 border-white/[0.08] hover:bg-white/[0.07] hover:text-white'}`}>
                    {r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank-1] : `#${r.rank}`} {r.team}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedTeam && (
            <motion.div key={selectedTeam} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
              <TeamMatchEditor teamName={selectedTeam} addToast={addToast} />
            </motion.div>
          )}
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          <UnifiedFixtureEditor rankings={rankings} addToast={addToast} />
        </motion.div>
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
