import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, X, Calendar, MapPin, Trophy, 
  TrendingUp, Users, ChevronRight, Star, Crown,
  Loader2, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { fetchSheet, getPlayerMatchHistory as apiGetPlayerMatchHistory } from '../utils/api';

export default function PlayerSearch() {
  const [allPlayers, setAllPlayers] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [matchHistory, setMatchHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    fantasyTeam: '',
    iplTeam: '',
    skill: '',
    minPoints: '',
    maxPoints: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [fetchError, setFetchError] = useState(null); // <--- Added error state

  const teams = ['Finisherz', "AB's", 'Master Blasters', 'Firestorm Fury',
    'Drinking Buds', 'Knights1126', 'Thunder Blasters', 'Old Monk',
    'Dynamos', 'Cultureless Brutes'];
  
  const iplTeams = ['CSK', 'MI', 'RCB', 'GT', 'KKR', 'RR', 'DC', 'LSG', 'PUN', 'SRH'];
  const skills = ['BAT', 'BOWL', 'ALL', 'WK'];

  // Fetch all players ONCE on mount for instant searching
  useEffect(() => {
    const loadAllPlayers = async () => {
      try {
        const players = await fetchSheet();
        // Process players to extract C/VC and clean names
        const processed = players.map(p => {
          const rawName = p.name || '';
          const isCaptain = /\(C\)/i.test(rawName) && !/\(VC\)/i.test(rawName);
          const isViceCaptain = /\(VC\)/i.test(rawName);
          const cleanName = rawName.replace(/\s*\(C\)|\s*\(VC\)/gi, '').trim();
          
          return {
            ...p,
            cleanName,
            isCaptain,
            isViceCaptain,
            fantasyTeam: p.team || '', // The API returns 'team' for fantasy team
            points: p.points || 0
          };
        });
        setAllPlayers(processed);
      } catch (err) {
        console.error('Failed to load players:', err);
      } finally {
        setInitialLoading(false);
      }
    };
    
    loadAllPlayers();
  }, []);

  // Instant client-side filtering
  const searchResults = useMemo(() => {
    if (!searchTerm && !Object.values(filters).some(v => v)) {
      return []; 
    }
    
    const searchLower = searchTerm.toLowerCase();
    const minPts = filters.minPoints ? parseFloat(filters.minPoints) : null;
    const maxPts = filters.maxPoints ? parseFloat(filters.maxPoints) : null;

    return allPlayers.filter(p => {
      if (searchTerm && !p.cleanName.toLowerCase().includes(searchLower)) return false;
      if (filters.fantasyTeam && p.fantasyTeam !== filters.fantasyTeam) return false;
      if (filters.iplTeam && p.iplTeam !== filters.iplTeam) return false;
      if (filters.skill && p.skill !== filters.skill) return false;
      if (minPts !== null && p.points < minPts) return false;
      if (maxPts !== null && p.points > maxPts) return false;
      return true;
    }).slice(0, 100); 
  }, [allPlayers, searchTerm, filters]);

  // Get player match history with opponents
  const getPlayerMatchHistory = async (player) => {
    setHistoryLoading(true);
    setSelectedPlayer(player);
    setMatchHistory(null); 
    setExpandedMatch(null);
    setFetchError(null); // <--- Reset error
    try {
      const data = await apiGetPlayerMatchHistory(player.cleanName, player.fantasyTeam);
      if (data.success) {
        setMatchHistory(data.player);
      } else {
        setFetchError(data.error || 'Unknown error from backend');
      }
    } catch (error) {
      console.error('Failed to fetch match history:', error);
      setFetchError(error.response?.data?.error || error.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Get match status badge
  const getMatchStatusBadge = (match) => {
    if (match.isLive) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 animate-pulse flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
          LIVE
        </span>
      );
    }
    if (match.status === 'completed') {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
          ✓ Completed
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-600/30 text-gray-500">
        Upcoming
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto relative min-h-screen">
      {/* Premium Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-screen" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-gray-400 tracking-tight">
          Player Search & Match History
        </h1>
        <p className="text-sm text-gray-400 mt-2 font-medium">
          Search players and view their complete match-wise performance with opponent details
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6 group">
        <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-400 transition-colors duration-300" />
        <input
          type="text"
          placeholder={initialLoading ? "Loading players database..." : "Search by player name... (e.g. Kohli)"}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={initialLoading}
          className="w-full pl-14 pr-32 py-4 bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.04] transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.4)] disabled:opacity-50 text-lg font-medium tracking-wide"
        />
        {initialLoading && (
          <div className="absolute right-32 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
          </div>
        )}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] rounded-xl text-sm font-semibold text-gray-300 hover:text-white flex items-center gap-2 transition-all duration-300"
        >
          <Filter className="w-4 h-4" />
          Filters
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mb-8 p-6 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
              <select
                value={filters.fantasyTeam}
                onChange={(e) => setFilters({ ...filters, fantasyTeam: e.target.value })}
                className="px-4 py-3 bg-black/60 border border-white/[0.08] rounded-xl text-white text-sm focus:border-purple-500/50 focus:bg-white/[0.05] transition-colors outline-none cursor-pointer"
              >
                <option value="" className="bg-gray-900">All Fantasy Teams</option>
                {teams.map(team => <option key={team} value={team} className="bg-gray-900">{team}</option>)}
              </select>

              <select
                value={filters.iplTeam}
                onChange={(e) => setFilters({ ...filters, iplTeam: e.target.value })}
                className="px-4 py-3 bg-black/60 border border-white/[0.08] rounded-xl text-white text-sm focus:border-purple-500/50 focus:bg-white/[0.05] transition-colors outline-none cursor-pointer"
              >
                <option value="" className="bg-gray-900">All IPL Teams</option>
                {iplTeams.map(team => <option key={team} value={team} className="bg-gray-900">{team}</option>)}
              </select>

              <select
                value={filters.skill}
                onChange={(e) => setFilters({ ...filters, skill: e.target.value })}
                className="px-4 py-3 bg-black/60 border border-white/[0.08] rounded-xl text-white text-sm focus:border-purple-500/50 focus:bg-white/[0.05] transition-colors outline-none cursor-pointer"
              >
                <option value="" className="bg-gray-900">All Skills</option>
                {skills.map(skill => <option key={skill} value={skill} className="bg-gray-900">{skill}</option>)}
              </select>

              <input
                type="number"
                placeholder="Min Points"
                value={filters.minPoints}
                onChange={(e) => setFilters({ ...filters, minPoints: e.target.value })}
                className="px-4 py-3 bg-black/60 border border-white/[0.08] rounded-xl text-white text-sm focus:border-purple-500/50 focus:bg-white/[0.05] transition-colors outline-none placeholder-gray-500"
              />

              <input
                type="number"
                placeholder="Max Points"
                value={filters.maxPoints}
                onChange={(e) => setFilters({ ...filters, maxPoints: e.target.value })}
                className="px-4 py-3 bg-black/60 border border-white/[0.08] rounded-xl text-white text-sm focus:border-purple-500/50 focus:bg-white/[0.05] transition-colors outline-none placeholder-gray-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Search Results List */}
        <div className="lg:col-span-1 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden flex flex-col h-[600px] shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <div className="p-5 border-b border-white/[0.08] shrink-0 bg-white/[0.02]">
            <h2 className="font-display font-bold text-lg text-white">Players</h2>
            <p className="text-xs text-purple-300 mt-1 font-medium tracking-wide uppercase">
              {searchTerm || Object.values(filters).some(v => v) ? `${searchResults.length} results found` : 'Type to search...'}
            </p>
          </div>
          
          <div className="divide-y divide-white/[0.04] overflow-y-auto custom-scrollbar flex-1 scroll-smooth">
            {initialLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                <span className="text-sm font-medium text-gray-400">Syncing players database...</span>
              </div>
            ) : !searchTerm && !Object.values(filters).some(v => v) ? (
              <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.02)] border border-white/[0.05]">
                  <Search className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-gray-300 font-medium text-lg">Start typing a player's name</p>
                <p className="text-sm text-gray-500 mt-2">Results will appear instantly</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                  <Users className="w-8 h-8 text-red-400/80" />
                </div>
                <p className="text-gray-300 font-medium text-lg">No players found</p>
              </div>
            ) : (
              searchResults.map((player) => (
                <div
                  key={`${player.name}-${player.fantasyTeam}`}
                  onClick={() => getPlayerMatchHistory(player)}
                  className={`p-5 cursor-pointer transition-all duration-300 border-l-4 ${
                    selectedPlayer?.cleanName === player.cleanName 
                      ? 'bg-gradient-to-r from-purple-500/20 to-transparent border-l-purple-500' 
                      : 'border-l-transparent hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-white flex items-center gap-2 text-[15px]">
                        {player.cleanName}
                        {player.isCaptain && <Crown className="w-3.5 h-3.5 text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]" title="Captain" />}
                        {player.isViceCaptain && <Star className="w-3.5 h-3.5 text-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.5)]" title="Vice Captain" />}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-bold tracking-wider text-purple-300 uppercase px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                          {player.fantasyTeam}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          {player.iplTeam} • {player.skill}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-yellow-600 drop-shadow-sm">{player.points}</p>
                      <p className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mt-0.5">pts</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Match History Details */}
        <div className="lg:col-span-2">
          {matchHistory ? (
            <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)] h-[600px] flex flex-col">
              {/* Player Info Header */}
              <div className="p-6 border-b border-white/[0.08] bg-gradient-to-r from-purple-900/30 to-blue-900/10 relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <div className="flex justify-between items-start flex-wrap gap-4 relative z-10">
                  <div>
                    <h2 className="text-2xl font-display font-black text-white tracking-wide">
                      {matchHistory.name}
                      {matchHistory.isCaptain && <Crown className="inline w-5 h-5 text-yellow-400 ml-2 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />}
                      {matchHistory.isViceCaptain && <Star className="inline w-5 h-5 text-purple-400 ml-2 drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]" />}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <span className="text-xs font-bold tracking-wider text-white uppercase px-2.5 py-1 rounded bg-white/[0.1] border border-white/[0.1]">
                        {matchHistory.fantasyTeam}
                      </span>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{matchHistory.iplTeam}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{matchHistory.skill}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                      <span className="text-[11px] font-bold text-emerald-400 font-mono tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">₹{matchHistory.price} CR</span>
                    </div>
                  </div>
                  <div className="text-right bg-black/40 backdrop-blur-md px-5 py-3 rounded-xl border border-white/[0.05] shadow-inner">
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-md">{matchHistory.totalPoints}</p>
                    <p className="text-[9px] text-yellow-500/70 uppercase tracking-widest font-bold mt-1 mb-2">Total Points</p>
                    <div className="flex gap-4">
                      <p className="text-[10px] text-gray-400 font-medium">Avg: <span className="text-white font-bold">{matchHistory.averagePoints}</span>/match</p>
                      <p className="text-[10px] text-gray-400 font-medium"><span className="text-white font-bold">{matchHistory.matchesPlayed}</span> matches</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match History Table */}
              <div className="overflow-auto custom-scrollbar flex-1 scroll-smooth bg-black/20">
                <table className="w-full">
                  <thead className="bg-white/[0.02] sticky top-0 z-20 backdrop-blur-md border-b border-white/[0.05]">
                    <tr>
                      <th className="text-left py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-gray-400">Match</th>
                      <th className="text-left py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-gray-400">Opponent</th>
                      <th className="text-left py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-gray-400">Date/Venue</th>
                      <th className="text-center py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-gray-400">Pts</th>
                      <th className="text-center py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-gray-400">Mult</th>
                      <th className="text-center py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {matchHistory.matchHistory.map((match, idx) => (
                      <React.Fragment key={idx}>
                        <tr 
                          className={`hover:bg-white/[0.04] cursor-pointer transition-colors duration-200 group ${
                            match.isLive ? 'bg-red-500/10 hover:bg-red-500/15' : ''
                          }`}
                          onClick={() => setExpandedMatch(expandedMatch === idx ? null : idx)}
                        >
                          <td className="py-4 px-6">
                            <span className="text-[13px] font-mono font-medium text-gray-300 bg-white/[0.05] px-2 py-1 rounded border border-white/[0.05]">M{match.matchNumber}</span>
                          </td>
                          <td className="py-4 px-6">
                            <div>
                              <span className="text-[14px] font-semibold text-white group-hover:text-purple-300 transition-colors">{match.opponent}</span>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{match.opponentIPL}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2 text-xs text-gray-300 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-purple-400" />
                              <span>{match.date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1.5 font-medium">
                              <MapPin className="w-3 h-3 text-blue-400" />
                              <span className="truncate max-w-[140px]">{match.venue}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="text-[15px] font-mono font-black text-yellow-400 drop-shadow-sm">
                              {match.matchPoints}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            {match.multiplier > 1 ? (
                              <span className={`text-[11px] font-black px-2 py-1 rounded shadow-sm ${match.multiplier === 2 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'}`}>
                                {match.multiplier}×
                              </span>
                            ) : (
                              <span className="text-gray-600 font-bold">-</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center">
                            {getMatchStatusBadge(match)}
                          </td>
                        </tr>
                        <AnimatePresence>
                          {expandedMatch === idx && (
                            <tr>
                              <td colSpan="6" className="p-0 border-b border-white/[0.05]">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="bg-black/60 p-6 shadow-inner"
                                >
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                    <div className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.05] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Base Points</p>
                                      <p className="text-2xl font-mono font-bold text-gray-200">
                                        {match.matchPoints}
                                      </p>
                                    </div>
                                    <div className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.05] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Multiplier</p>
                                      <p className="text-2xl font-mono font-bold text-purple-400">
                                        {match.multiplier}×
                                      </p>
                                    </div>
                                    <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 p-4 rounded-xl border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.05)]">
                                      <p className="text-[9px] font-bold uppercase tracking-widest text-yellow-500/70 mb-1.5">Final Points</p>
                                      <p className="text-2xl font-mono font-black text-yellow-400">
                                        {match.leaguePoints}
                                      </p>
                                    </div>
                                    <div className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.05] flex flex-col justify-center">
                                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Match Details</p>
                                      <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                                        {match.venue}
                                      </p>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/[0.08] flex items-center justify-center h-[600px] shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
              
              <div className="text-center relative z-10 px-8">
                {historyLoading ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-5"
                  >
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-white/[0.05] rounded-full"></div>
                      <div className="absolute top-0 left-0 w-20 h-20 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <TrendingUp className="w-8 h-8 text-purple-400/50" />
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-display font-bold text-xl tracking-wide">Fetching Match Data</p>
                      <p className="text-sm text-gray-400 mt-2 font-medium">Analyzing opponent info & multipliers...</p>
                    </div>
                  </motion.div>
                ) : fetchError ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mb-2 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                      <X size={40} />
                    </div>
                    <p className="text-red-400 font-display font-bold text-2xl tracking-wide">Failed to fetch data</p>
                    <p className="text-sm text-gray-400 max-w-sm font-medium">{fetchError}</p>
                    <button 
                      onClick={() => getPlayerMatchHistory(selectedPlayer)}
                      className="mt-6 px-6 py-3 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] rounded-xl text-sm font-bold text-white transition-all shadow-lg active:scale-95"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-28 h-28 mx-auto mb-8 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center shadow-[0_0_60px_rgba(168,85,247,0.1)] group-hover:scale-105 transition-transform duration-700">
                      <TrendingUp className="w-12 h-12 text-purple-400/60" />
                    </div>
                    <p className="text-white font-display font-bold text-2xl tracking-wide">Select a player</p>
                    <p className="text-[15px] text-gray-400 mt-3 font-medium max-w-sm mx-auto">
                      View their complete match history, opponent details, and performance trends.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
