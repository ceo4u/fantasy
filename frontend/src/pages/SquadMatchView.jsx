import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Save, CheckCircle, Loader, AlertTriangle, Edit3, X } from 'lucide-react';
import { useSquad, useRankings } from '../hooks/usePlayers';
import { useAuth } from '../context/AuthContext';
import { updateMatchPoints } from '../utils/api';

const IPL_COLORS = {
  CSK:{bg:'#D4A017',text:'#000'}, MI:{bg:'#1A56B0',text:'#fff'},
  RCB:{bg:'#CC1418',text:'#fff'}, KKR:{bg:'#3A225D',text:'#FFD700'},
  SRH:{bg:'#E05A00',text:'#fff'}, RR:{bg:'#C0176A',text:'#fff'},
  GT:{bg:'#1C2B5E',text:'#C9A84C'}, LSG:{bg:'#00A0B4',text:'#000'},
  PBKS:{bg:'#B5121B',text:'#fff'}, DC:{bg:'#0F4B9C',text:'#fff'},
  PUN:{bg:'#7B26CC',text:'#fff'},
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  return { toasts, add };
}

function ToastStack({ toasts }) {
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium pointer-events-auto
              ${t.type === 'success' ? 'bg-[#0C1F12] border-emerald-800/50 text-emerald-300'
                                     : 'bg-[#1F0C0C] border-red-800/50 text-red-300'}`}>
            {t.type === 'success' ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Match cell (editable or read-only) ───────────────────────────────────────
function MatchCell({ value, isAdmin, editMode, onChange }) {
  const empty  = value === 0 || value == null;
  const neg    = value < 0;

  if (isAdmin && editMode) {
    return (
      <input
        type="number"
        value={value ?? 0}
        onChange={e => onChange(Number(e.target.value))}
        className="w-14 text-center bg-[#1A1A2E] border border-[#F5C518]/40 rounded-lg
                   text-[#F5C518] font-mono text-xs py-1 outline-none
                   focus:border-[#F5C518] focus:ring-1 focus:ring-[#F5C518]/20"
        style={{ minWidth: 52 }}
      />
    );
  }

  return (
    <span className={`text-xs font-mono tabular-nums
      ${neg ? 'text-red-400' : empty ? 'text-white/15' : 'text-white/80'}`}>
      {empty ? '—' : value}
    </span>
  );
}

// ─── Player Row ───────────────────────────────────────────────────────────────
function PlayerRow({ player, teamName, isAdmin, matchLabels, onSaved, toast }) {
  const [editMode,  setEditMode]  = useState(false);
  const [draft,     setDraft]     = useState([...player.matchPoints]);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const ipl = IPL_COLORS[player.iplTeam] || { bg:'#333', text:'#fff' };
  const dirty = editMode && draft.some((v, i) => v !== player.matchPoints[i]);

  function cancelEdit() { setDraft([...player.matchPoints]); setEditMode(false); }

  async function handleSave() {
    setSaving(true);
    let anyChanged = false;
    try {
      for (let i = 0; i < draft.length; i++) {
        if (draft[i] !== player.matchPoints[i]) {
          await updateMatchPoints(teamName, player.rawName, i, draft[i]);
          anyChanged = true;
        }
      }
      if (anyChanged) { toast('Saved: ' + player.name, 'success'); onSaved(); }
      setSaved(true);
      setTimeout(() => { setSaved(false); setEditMode(false); }, 1500);
    } catch (err) {
      toast('Error: ' + (err.response?.data?.error || err.message), 'error');
    } finally { setSaving(false); }
  }

  return (
    <tr className={`border-b border-white/[0.04] last:border-0 transition-colors
                    ${editMode ? 'bg-[#F5C518]/[0.03]' : 'hover:bg-white/[0.02]'}`}>

      {/* Sticky player info */}
      <td className="sticky left-0 z-10 px-4 py-3 bg-[#111] min-w-[200px]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
               style={{ background: ipl.bg, color: ipl.text }}>
            {player.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[12px] font-semibold text-white leading-tight truncate">{player.name}</span>
              {player.isC  && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-[#F5C518] text-black shrink-0">
                  C <span className="text-[9px] opacity-70">2×</span>
                </span>
              )}
              {player.isVC && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-white/25 text-white border border-white/30 shrink-0">
                  VC <span className="text-[9px] opacity-70">1.5×</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: ipl.bg, color: ipl.text }}>{player.iplTeam}</span>
              <span className="text-[9px] text-white/30">{player.skill} · ₹{player.price}Cr</span>
            </div>
          </div>
        </div>
      </td>

      {/* Match cells */}
      {matchLabels.map((_, mi) => (
        <td key={mi} className="px-2 py-3 text-center">
          <MatchCell
            value={draft[mi]}
            isAdmin={isAdmin}
            editMode={editMode}
            onChange={v => setDraft(p => { const n=[...p]; n[mi]=v; return n; })}
          />
        </td>
      ))}

      {/* Total */}
      <td className="sticky right-0 z-10 px-4 py-3 text-right bg-[#111]">
        <span className={`text-sm font-black font-mono ${player.calculatedTotal > 0 ? 'text-[#F5C518]' : 'text-white/20'}`}>
          {player.calculatedTotal > 0 ? player.calculatedTotal.toLocaleString() : '—'}
        </span>
      </td>

      {/* Admin actions */}
      {isAdmin && (
        <td className="px-3 py-3 text-center">
          {!editMode ? (
            <button onClick={() => setEditMode(true)}
              className="p-1.5 rounded-lg text-white/25 hover:text-[#F5C518] hover:bg-[#F5C518]/10 transition">
              <Edit3 size={13}/>
            </button>
          ) : saving ? (
            <Loader size={13} className="animate-spin text-[#F5C518] mx-auto"/>
          ) : saved ? (
            <CheckCircle size={13} className="text-emerald-400 mx-auto"/>
          ) : (
            <div className="flex gap-1 justify-center">
              <button onClick={handleSave} disabled={!dirty}
                className={`p-1.5 rounded-lg transition ${dirty
                  ? 'text-black bg-[#F5C518] hover:bg-[#EDB800]'
                  : 'text-white/20 cursor-not-allowed'}`}>
                <Save size={12}/>
              </button>
              <button onClick={cancelEdit}
                className="p-1.5 rounded-lg text-white/25 hover:text-red-400 transition">
                <X size={12}/>
              </button>
            </div>
          )}
        </td>
      )}
    </tr>
  );
}

// ─── Main SquadMatchView ──────────────────────────────────────────────────────
export default function SquadMatchView() {
  const { teamSlug }  = useParams();
  const navigate      = useNavigate();
  const { isAdmin }   = useAuth();
  const teamName      = decodeURIComponent(teamSlug || '');
  const { squad, loading, error, refetch } = useSquad(teamName);
  const { rankings }  = useRankings();
  const { toasts, add: toast } = useToast();

  const rankEntry = rankings.find(r => r.team?.toLowerCase().trim() === teamName.toLowerCase().trim());
  const RANK_EMOJI = ['🥇','🥈','🥉'];

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-8 h-8 border-2 border-[#F5C518]/30 border-t-[#F5C518] rounded-full animate-spin"/>
      <p className="text-sm text-white/30">Loading squad data…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <AlertTriangle size={32} className="text-red-400"/>
      <p className="text-white/40 text-sm">{error}</p>
      <button onClick={refetch} className="btn btn-primary">Retry</button>
    </div>
  );

  if (!squad) return null;

  const { players, matchTotals, matchLabels } = squad;
  const grandTotal = players.reduce((s, p) => s + p.calculatedTotal, 0);
  const rank = rankEntry?.rank;

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      <ToastStack toasts={toasts}/>

      {/* Back */}
      <button onClick={() => navigate('/squads')}
        className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition group">
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform"/>
        All Squads
      </button>

      {/* Hero header */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="text-4xl">
            {rank && rank <= 3 ? RANK_EMOJI[rank-1] : rank ? `#${rank}` : '—'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="label text-[#F5C518] mb-1">Fantasy Squad</p>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{teamName}</h1>
            {rankEntry?.owner && <p className="text-sm text-white/35 mt-0.5">{rankEntry.owner}</p>}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-3xl font-black font-mono text-[#F5C518]">{grandTotal.toLocaleString()}</p>
              <p className="label">Total Points</p>
            </div>
            <button onClick={refetch}
              className="p-2 rounded-lg text-white/25 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition">
              <RefreshCw size={14}/>
            </button>
          </div>
        </div>
        {isAdmin && (
          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2">
            <Edit3 size={12} className="text-[#F5C518]"/>
            <p className="text-[11px] text-white/40">Admin mode: click the edit icon on any row to update match points</p>
          </div>
        )}
      </div>

      {/* Match-wise table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full" style={{ minWidth: 900 }}>

            {/* Head */}
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                <th className="sticky left-0 z-20 px-4 py-3 text-left bg-[#111] min-w-[200px]">
                  <span className="label">Player</span>
                </th>
                {matchLabels.map((lbl, i) => (
                  <th key={i} className="px-2 py-3 text-center min-w-[52px]">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                      ${['Q1','EL','Q2','F'].includes(lbl)
                        ? 'bg-purple-900/40 text-purple-300 border border-purple-800/30'
                        : 'bg-[#F5C518]/10 text-[#F5C518]'}`}>
                      {lbl}
                    </span>
                  </th>
                ))}
                <th className="sticky right-0 z-20 px-4 py-3 text-right bg-[#111]">
                  <span className="label">Total</span>
                </th>
                {isAdmin && <th className="px-3 py-3"><span className="label">Edit</span></th>}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {players.map((p) => (
                <PlayerRow
                  key={p.sno}
                  player={p}
                  teamName={teamName}
                  isAdmin={isAdmin}
                  matchLabels={matchLabels}
                  onSaved={refetch}
                  toast={toast}
                />
              ))}
            </tbody>

            {/* Footer: match totals */}
            <tfoot>
              <tr className="border-t border-white/[0.08] bg-white/[0.02]">
                <td className="sticky left-0 z-10 px-4 py-3 bg-[#111]">
                  <span className="label text-[#F5C518]">Match Total</span>
                </td>
                {matchTotals.map((tot, i) => (
                  <td key={i} className="px-2 py-3 text-center">
                    <span className={`text-xs font-bold font-mono ${tot > 0 ? 'text-white/60' : 'text-white/15'}`}>
                      {tot > 0 ? tot : '—'}
                    </span>
                  </td>
                ))}
                <td className="sticky right-0 z-10 px-4 py-3 text-right bg-[#111]">
                  <span className="text-sm font-black font-mono text-[#F5C518]">{grandTotal.toLocaleString()}</span>
                </td>
                {isAdmin && <td/>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[11px] text-white/30">
        <span className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded bg-[#F5C518] text-black text-[9px] font-black">C · 2×</span>
          Captain — points doubled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded bg-white/20 text-white text-[9px] font-black">VC · 1.5×</span>
          Vice Captain — points × 1.5
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-purple-300 font-bold">Q1 / EL / Q2 / F</span>
          Playoff matches
        </span>
      </div>
    </div>
  );
}
