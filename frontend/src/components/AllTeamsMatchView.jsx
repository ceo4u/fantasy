import { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader, Save, CheckCircle, RefreshCw, AlertTriangle, Crown, Shield, Users } from 'lucide-react';
import { fetchSquad, updateMatchPoints } from '../utils/api';

const IPL_COLORS = {
  CSK:{bg:'#D4A017',text:'#000'}, MI:{bg:'#1A56B0',text:'#fff'},
  RCB:{bg:'#CC1418',text:'#fff'}, KKR:{bg:'#3A225D',text:'#FFD700'},
  SRH:{bg:'#E05A00',text:'#fff'}, RR:{bg:'#C0176A',text:'#fff'},
  GT:{bg:'#1C2B5E',text:'#C9A84C'}, LSG:{bg:'#00A0B4',text:'#000'},
  PBKS:{bg:'#B5121B',text:'#fff'}, DC:{bg:'#0F4B9C',text:'#fff'},
  PUN:{bg:'#7B26CC',text:'#fff'},
};

// Unique fantasy team colors for the "team badge"
const FANTASY_PALETTE = [
  '#F5C518','#34D399','#60A5FA','#F87171','#A78BFA',
  '#FB923C','#38BDF8','#4ADE80','#E879F9','#FACC15',
];

export default function AllTeamsMatchView({ rankings, teamAFilter, teamBFilter, highlightMatchIdx, addToast }) {
  const [allSquads, setAllSquads]   = useState({}); // { teamName: squadData }
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  // drafts: { teamName: { playerSno: [...matchPoints] } }
  const [drafts, setDrafts]         = useState({});
  const [saving, setSaving]         = useState({}); // { `${team}-${sno}`: bool }
  const [saved, setSaved]           = useState({});

  const teamNames = useMemo(() => rankings.map(r => r.team), [rankings]);

  const loadAll = useCallback(async () => {
    if (!teamNames.length) return;
    setLoading(true); setError('');
    try {
      const results = await Promise.all(teamNames.map(t => fetchSquad(t).then(d => [t, d]).catch(() => [t, null])));
      const map = {};
      const draftMap = {};
      results.forEach(([name, data]) => {
        if (!data) return;
        map[name] = data;
        draftMap[name] = {};
        data.players.forEach(p => { draftMap[name][p.sno] = [...p.matchPoints]; });
      });
      setAllSquads(map);
      setDrafts(draftMap);
    } catch (e) {
      setError('Failed to load squad data: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [teamNames]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Collect all filtered players across all teams
  const filteredRows = useMemo(() => {
    const rows = [];
    const filterTeams = [teamAFilter?.toUpperCase(), teamBFilter?.toUpperCase()].filter(Boolean);

    Object.entries(allSquads).forEach(([fantasyTeam, squad]) => {
      if (!squad) return;
      squad.players.forEach(p => {
        const ipl = p.iplTeam?.toUpperCase();
        if (filterTeams.length === 0 || filterTeams.includes(ipl)) {
          rows.push({ ...p, fantasyTeam, matchLabels: squad.matchLabels });
        }
      });
    });

    // Sort: by iplTeam first, then fantasyTeam, then name
    rows.sort((a, b) => {
      if (a.iplTeam !== b.iplTeam) return a.iplTeam.localeCompare(b.iplTeam);
      if (a.fantasyTeam !== b.fantasyTeam) return a.fantasyTeam.localeCompare(b.fantasyTeam);
      return a.name.localeCompare(b.name);
    });

    return rows;
  }, [allSquads, teamAFilter, teamBFilter]);

  // Common match labels (use first available)
  const matchLabels = useMemo(() => {
    const first = Object.values(allSquads).find(s => s?.matchLabels);
    return first?.matchLabels || [];
  }, [allSquads]);

  // Fantasy team index for color
  const teamColorMap = useMemo(() => {
    const map = {};
    teamNames.forEach((t, i) => { map[t] = FANTASY_PALETTE[i % FANTASY_PALETTE.length]; });
    return map;
  }, [teamNames]);

  const getKey = (fantasyTeam, sno) => `${fantasyTeam}::${sno}`;

  const handleCellChange = (fantasyTeam, sno, mi, val) => {
    setDrafts(prev => {
      const next = { ...prev, [fantasyTeam]: { ...prev[fantasyTeam], [sno]: [...(prev[fantasyTeam]?.[sno] || [])] } };
      next[fantasyTeam][sno][mi] = val;
      return next;
    });
  };

  const handleSave = async (p) => {
    const { fantasyTeam, sno, rawName, matchPoints } = p;
    const draft = drafts[fantasyTeam]?.[sno] || matchPoints;
    const changed = draft.map((v, i) => ({ i, v: Number(v), orig: Number(matchPoints[i]) })).filter(c => c.v !== c.orig);
    if (!changed.length) return;
    const key = getKey(fantasyTeam, sno);
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      await Promise.all(changed.map(c => updateMatchPoints(fantasyTeam, rawName, c.i, c.v)));
      setSaved(prev => ({ ...prev, [key]: true }));
      addToast?.(`✓ ${p.name} (${fantasyTeam}) saved!`, 'success');
      setTimeout(() => setSaved(prev => { const n = {...prev}; delete n[key]; return n; }), 2500);
      // Update allSquads to reflect new matchPoints
      setAllSquads(prev => {
        const squad = prev[fantasyTeam];
        if (!squad) return prev;
        return {
          ...prev,
          [fantasyTeam]: {
            ...squad,
            players: squad.players.map(pl => pl.sno === sno ? { ...pl, matchPoints: [...draft] } : pl)
          }
        };
      });
    } catch (err) {
      addToast?.(`Error: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setSaving(prev => { const n = {...prev}; delete n[key]; return n; });
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 card">
      <div className="w-8 h-8 border-2 border-[#F5C518]/30 border-t-[#F5C518] rounded-full animate-spin" />
      <p className="text-sm text-white/30">Fetching all {teamNames.length} squads simultaneously…</p>
    </div>
  );

  if (error) return (
    <div className="card p-5 flex items-center gap-3 text-red-400 border border-red-900/40">
      <AlertTriangle size={18} /> <span className="text-sm">{error}</span>
    </div>
  );

  if (!filteredRows.length) return (
    <div className="card py-14 text-center text-sm text-white/25 italic">
      No players found for the selected IPL teams across all squads.
    </div>
  );

  return (
    <div className="space-y-3">

      {/* Header stat */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Users size={13} />
          <span><strong className="text-white">{filteredRows.length}</strong> players across <strong className="text-white">{teamNames.length}</strong> fantasy teams</span>
          {(teamAFilter || teamBFilter) && (
            <span className="flex gap-1">
              {[teamAFilter, teamBFilter].filter(Boolean).map(t => {
                const c = IPL_COLORS[t] || { bg: '#333', text: '#fff' };
                return (
                  <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: c.bg, color: c.text }}>{t}</span>
                );
              })}
            </span>
          )}
        </div>
        <button onClick={loadAll} className="p-1.5 rounded-lg text-white/25 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-auto max-h-[68vh] custom-scrollbar scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full" style={{ minWidth: 1050 }}>
            <thead className="sticky top-0 z-30">
              <tr className="border-b border-white/[0.06] bg-[#111]">
                {/* Sticky: IPL Team */}
                <th className="sticky left-0 z-40 px-3 py-2.5 text-left bg-[#111] min-w-[90px] border-b border-white/[0.06]">
                  <span className="label text-[10px]">IPL</span>
                </th>
                {/* Player */}
                <th className="sticky left-[90px] z-40 px-3 py-2.5 text-left bg-[#111] min-w-[160px] border-b border-white/[0.06]">
                  <span className="label text-[10px]">Player</span>
                </th>
                {/* Fantasy Team */}
                <th className="px-3 py-2.5 text-left min-w-[100px] border-b border-white/[0.06]">
                  <span className="label text-[10px]">Fantasy Team</span>
                </th>
                {/* Match columns */}
                {matchLabels.map((lbl, i) => (
                  <th key={i} className={`px-0.5 py-2.5 text-center min-w-[52px] border-b border-white/[0.06] transition-colors ${highlightMatchIdx === i ? 'bg-[#7C3AED]/10' : ''}`}>
                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded transition ${
                      highlightMatchIdx === i ? 'bg-[#7C3AED] text-white shadow-[0_0_8px_rgba(124,58,237,0.4)]'
                      : ['Q1','EL','Q2','F'].includes(lbl) ? 'bg-purple-900/40 text-purple-300'
                      : 'bg-[#F5C518]/10 text-[#F5C518]'}`}>
                      {lbl}
                    </span>
                  </th>
                ))}
                {/* Total + Save */}
                <th className="sticky right-[68px] z-40 px-3 py-2.5 text-right bg-[#111] min-w-[60px] border-b border-white/[0.06]">
                  <span className="label text-[10px]">Total</span>
                </th>
                <th className="sticky right-0 z-40 px-2 py-2.5 bg-[#111] w-[68px] border-b border-white/[0.06]">
                  <span className="label text-[10px]">Save</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map(p => {
                const ipl = IPL_COLORS[p.iplTeam] || { bg: '#333', text: '#fff' };
                const draft = drafts[p.fantasyTeam]?.[p.sno] || p.matchPoints;
                const isDirty = draft.some((v, i) => Number(v) !== Number(p.matchPoints[i]));
                const baseTotal = draft.reduce((s, v) => s + (Number(v) || 0), 0);
                const mult = p.isC ? 2 : p.isVC ? 1.5 : 1;
                const displayTotal = parseFloat((baseTotal * mult).toFixed(1));
                const key = getKey(p.fantasyTeam, p.sno);
                const isSaving = !!saving[key];
                const isSaved  = !!saved[key];
                const ftColor  = teamColorMap[p.fantasyTeam] || '#888';

                return (
                  <tr key={key} className={`border-b border-white/[0.035] last:border-0 transition-colors ${isDirty ? 'bg-[#F5C518]/[0.015]' : 'hover:bg-white/[0.012]'}`}>

                    {/* IPL Badge — sticky */}
                    <td className="sticky left-0 z-10 px-3 py-2 bg-[#111]">
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: ipl.bg, color: ipl.text }}>{p.iplTeam}</span>
                    </td>

                    {/* Player name — sticky */}
                    <td className="sticky left-[90px] z-10 px-3 py-2 bg-[#111] min-w-[160px]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: ipl.bg, color: ipl.text }}>
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-semibold text-white leading-tight">{p.name}</span>
                            {p.isC  && <Crown size={9} className="text-[#F5C518]" />}
                            {p.isVC && <Shield size={9} className="text-blue-400" />}
                          </div>
                          <span className="text-[9px] text-white/30">{p.skill} · ₹{p.price}Cr</span>
                        </div>
                      </div>
                    </td>

                    {/* Fantasy Team badge */}
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: ftColor, borderColor: ftColor + '40', background: ftColor + '15' }}>
                        {p.fantasyTeam}
                      </span>
                    </td>

                    {/* Match point cells */}
                    {matchLabels.map((_, mi) => {
                      const val = draft[mi] ?? 0;
                      const origVal = p.matchPoints[mi] ?? 0;
                      const cellDirty = Number(val) !== Number(origVal);
                      const highlighted = highlightMatchIdx === mi;
                      return (
                        <td key={mi} className={`px-0.5 py-2 text-center transition-colors ${highlighted ? 'bg-[#7C3AED]/[0.04]' : ''}`}>
                          <input
                            type="number" min="0"
                            value={val === 0 && !cellDirty ? '' : val}
                            placeholder="0"
                            onChange={e => handleCellChange(p.fantasyTeam, p.sno, mi, e.target.value === '' ? 0 : Number(e.target.value))}
                            className={`w-12 text-center font-mono text-xs py-1.5 rounded-lg border outline-none transition-all
                              ${highlighted
                                ? cellDirty ? 'bg-[#1E1E0A] border-[#F5C518] text-[#F5C518] ring-1 ring-[#F5C518]/20'
                                           : 'bg-[#15152A] border-[#7C3AED]/60 text-white ring-1 ring-[#7C3AED]/10'
                                : cellDirty ? 'bg-[#18180F] border-[#F5C518]/70 text-[#F5C518]'
                                            : 'bg-transparent border-white/[0.06] text-white/40 hover:border-white/15 focus:border-white/25 focus:text-white/80'}`}
                            style={{ minWidth: 48 }}
                          />
                        </td>
                      );
                    })}

                    {/* Total */}
                    <td className="sticky right-[68px] z-10 px-3 py-2 text-right bg-[#111]">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-black font-mono ${isDirty || p.isC || p.isVC ? 'text-[#F5C518]' : displayTotal > 0 ? 'text-white/60' : 'text-white/15'}`}>
                          {displayTotal > 0 ? displayTotal : '—'}
                        </span>
                        {(p.isC || p.isVC) && <span className="text-[8px] text-white/30">{p.isC ? '2×' : '1.5×'}</span>}
                      </div>
                    </td>

                    {/* Save */}
                    <td className="sticky right-0 z-10 px-2 py-2 bg-[#111] w-[68px]">
                      <button onClick={() => handleSave(p)} disabled={!isDirty || isSaving || isSaved}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95
                          ${isSaved   ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/40 cursor-default'
                          : isDirty && !isSaving ? 'bg-[#F5C518] text-black hover:bg-[#EDB800]'
                          : 'bg-transparent text-white/15 cursor-not-allowed border border-white/[0.05]'}`}>
                        {isSaving ? <Loader size={11} className="animate-spin" />
                         : isSaved  ? <><CheckCircle size={11}/> OK</>
                         : <><Save size={11}/> Save</>}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[10px] text-white/25">
        <span><Crown size={10} className="inline mr-1 text-[#F5C518]" />Captain = 2× pts</span>
        <span><Shield size={10} className="inline mr-1 text-blue-400" />VC = 1.5× pts</span>
        <span>Coloured badge = Fantasy Team owner</span>
      </div>
    </div>
  );
}
