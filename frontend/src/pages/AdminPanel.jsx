import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, CheckCircle, AlertCircle, Loader, ShieldOff, RefreshCw, AlertTriangle, Users, Clock, Zap, Crown, Shield, UserX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSquad, useRankings } from '../hooks/usePlayers';
import { updateMatchPoints, markCaptainVC } from '../utils/api';
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
const MatchCell = ({ value, originalValue, onChange, disabled }) => {
  const isDirty = Number(value) !== Number(originalValue);
  return (
    <input
      type="number" min="0"
      value={value === 0 && !isDirty ? '' : value}
      placeholder="0"
      disabled={disabled}
      onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      className={`w-12 text-center font-mono text-xs py-1.5 rounded-lg border outline-none transition-colors duration-150
        ${isDirty
          ? 'bg-[#18180F] border-[#F5C518]/70 text-[#F5C518] focus:ring-1 focus:ring-[#F5C518]/30'
          : 'bg-transparent border-white/[0.06] text-white/40 hover:border-white/15 focus:border-white/25 focus:text-white/80'}`}
      style={{ minWidth: 48 }}
    />
  );
};

// ─── Player Row ───────────────────────────────────────────────────────────────
const PlayerRow = ({ player, rowIdx, matchLabels, draft, savingRows, savedRows, markingRows, teamName, onCellChange, onSaveRow, onMarkRole, onReplaceClick }) => {
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
            </div>
          </div>
        </div>
      </td>

      {/* Match cells */}
      {matchLabels.map((_, mi) => (
        <td key={mi} className="px-0.5 py-2 text-center">
          <MatchCell value={draft[mi]} originalValue={player.matchPoints[mi]}
            onChange={val => onCellChange(rowIdx, mi, val)} disabled={saving} />
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

  // Replacement Modal State
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [playerToReplace, setPlayerToReplace] = useState('');

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
    <div className="space-y-3">

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
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full" style={{ minWidth: 1000 }}>
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                <th className="sticky left-0 z-20 px-3 py-2.5 text-left bg-[#111] min-w-[200px]">
                  <span className="label text-[10px]">Player <span className="text-white/20 font-normal">(click C/VC to assign)</span></span>
                </th>
                {matchLabels.map((lbl, i) => (
                  <th key={i} className="px-0.5 py-2.5 text-center min-w-[52px]">
                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded
                      ${['Q1','EL','Q2','F'].includes(lbl) ? 'bg-purple-900/40 text-purple-300' : 'bg-[#F5C518]/10 text-[#F5C518]'}`}>
                      {lbl}
                    </span>
                  </th>
                ))}
                <th className="sticky right-[68px] z-20 px-3 py-2.5 text-right bg-[#111] min-w-[70px]"><span className="label text-[10px]">Total</span></th>
                <th className="sticky right-0 z-20 px-2 py-2.5 bg-[#111] w-[68px]"><span className="label text-[10px]">Save</span></th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, ri) => (
                <PlayerRow key={p.sno} player={p} rowIdx={ri} matchLabels={matchLabels}
                  draft={drafts[ri] || p.matchPoints} savingRows={savingRows} savedRows={savedRows}
                  markingRows={markingRows} teamName={teamName}
                  onCellChange={handleCellChange} onSaveRow={handleSaveRow} onMarkRole={handleMarkRole}
                  onReplaceClick={(name) => { setPlayerToReplace(name); setReplaceModalOpen(true); }} />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/[0.07] bg-white/[0.015]">
                <td className="sticky left-0 z-10 px-3 py-2.5 bg-[#111]"><span className="label text-[#F5C518] text-[10px]">Team Total</span></td>
                {matchLabels.map((_, i) => {
                  const colTotal = players.reduce((s, p, ri) => s + (Number(drafts[ri]?.[i]) || 0), 0);
                  return <td key={i} className="px-0.5 py-2.5 text-center"><span className={`text-[10px] font-bold font-mono ${colTotal > 0 ? 'text-white/45' : 'text-white/10'}`}>{colTotal > 0 ? colTotal : '—'}</span></td>;
                })}
                <td className="sticky right-[68px] z-10 px-3 py-2.5 text-right bg-[#111]"><span className="text-sm font-black font-mono text-[#F5C518]">{grandTotal.toLocaleString()}</span></td>
                <td className="sticky right-0 z-10 bg-[#111]"/>
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

// ─── Main Admin Panel ─────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { isAdmin } = useAuth();
  const { rankings, loading: rLoading } = useRankings();
  const [selectedTeam, setSelectedTeam] = useState('');
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
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-900/20 border border-emerald-800/30 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>Live Sync
        </div>
      </div>

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

      <Toast toasts={toasts} />
    </div>
  );
}
