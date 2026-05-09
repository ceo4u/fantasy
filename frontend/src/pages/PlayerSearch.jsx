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
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-white">
          Player Search & Match History
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Search players and view their complete match-wise performance with opponent details
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder={initialLoading ? "Loading players database..." : "Search by player name... (e.g. Kohli)"}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={initialLoading}
          className="w-full pl-12 pr-24 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
        />
        {initialLoading && (
          <div className="absolute right-24 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
          </div>
        )}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 px-3 py-1.5 bg-gray-800 rounded-lg text-sm text-gray-400 hover:text-white flex items-center gap-1"
        >
          <Filter className="w-4 h-4" />
          Filters
          {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <select
                value={filters.fantasyTeam}
                onChange={(e) => setFilters({ ...filters, fantasyTeam: e.target.value })}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="">All Fantasy Teams</option>
                {teams.map(team => <option key={team} value={team}>{team}</option>)}
              </select>

              <select
                value={filters.iplTeam}
                onChange={(e) => setFilters({ ...filters, iplTeam: e.target.value })}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="">All IPL Teams</option>
                {iplTeams.map(team => <option key={team} value={team}>{team}</option>)}
              </select>

              <select
                value={filters.skill}
                onChange={(e) => setFilters({ ...filters, skill: e.target.value })}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="">All Skills</option>
                {skills.map(skill => <option key={skill} value={skill}>{skill}</option>)}
              </select>

              <input
                type="number"
                placeholder="Min Points"
                value={filters.minPoints}
                onChange={(e) => setFilters({ ...filters, minPoints: e.target.value })}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              />

              <input
                type="number"
                placeholder="Max Points"
                value={filters.maxPoints}
                onChange={(e) => setFilters({ ...filters, maxPoints: e.target.value })}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Results List */}
        <div className="lg:col-span-1 bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col max-h-[600px]">
          <div className="p-4 border-b border-gray-700 shrink-0">
            <h2 className="font-semibold text-white">Players</h2>
            <p className="text-xs text-gray-500">
              {searchTerm || Object.values(filters).some(v => v) ? `${searchResults.length} results found` : 'Type to search...'}
            </p>
          </div>
          
          <div className="divide-y divide-gray-700 overflow-y-auto custom-scrollbar flex-1">
            {initialLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                <span className="text-xs text-gray-500">Syncing players database...</span>
              </div>
            ) : !searchTerm && !Object.values(filters).some(v => v) ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Start typing a player's name</p>
                <p className="text-xs text-gray-600 mt-1">Results will appear instantly</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No players found</p>
              </div>
            ) : (
              searchResults.map((player) => (
                <div
                  key={`${player.name}-${player.fantasyTeam}`}
                  onClick={() => getPlayerMatchHistory(player)}
                  className={`p-4 cursor-pointer transition-all hover:bg-gray-700/50 ${
                    selectedPlayer?.cleanName === player.cleanName ? 'bg-purple-500/10 border-l-2 border-purple-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-white flex items-center gap-2">
                        {player.cleanName}
                        {player.isCaptain && <Crown className="w-3 h-3 text-yellow-400" title="Captain" />}
                        {player.isViceCaptain && <Star className="w-3 h-3 text-purple-400" title="Vice Captain" />}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {player.fantasyTeam} • {player.iplTeam} • {player.skill}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-yellow-400">{player.points}</p>
                      <p className="text-[10px] text-gray-500 uppercase">total pts</p>
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
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
              {/* Player Info Header */}
              <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-purple-900/20 to-yellow-900/20">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-display font-bold text-white">
                      {matchHistory.name}
                      {matchHistory.isCaptain && <Crown className="inline w-4 h-4 text-yellow-400 ml-2" />}
                      {matchHistory.isViceCaptain && <Star className="inline w-4 h-4 text-purple-400 ml-2" />}
                    </h2>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="text-sm font-semibold text-gray-300">{matchHistory.fantasyTeam}</span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-400">{matchHistory.iplTeam}</span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-400">{matchHistory.skill}</span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-400 font-mono">₹{matchHistory.price} Cr</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-yellow-400">{matchHistory.totalPoints}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total Points</p>
                    <p className="text-xs text-gray-400 mt-1">Avg: <span className="text-white">{matchHistory.averagePoints}</span>/match</p>
                    <p className="text-xs text-gray-400"><span className="text-white">{matchHistory.matchesPlayed}</span> matches</p>
                  </div>
                </div>
              </div>

              {/* Match History Table */}
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Match</th>
                      <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Opponent</th>
                      <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Date/Venue</th>
                      <th className="text-center py-3 px-4 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Pts</th>
                      <th className="text-center py-3 px-4 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Mult</th>
                      <th className="text-center py-3 px-4 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchHistory.matchHistory.map((match, idx) => (
                      <React.Fragment key={idx}>
                        <tr 
                          className={`border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer transition-colors ${
                            match.isLive ? 'bg-red-500/5' : ''
                          }`}
                          onClick={() => setExpandedMatch(expandedMatch === idx ? null : idx)}
                        >
                          <td className="py-3 px-4">
                            <span className="text-sm font-mono text-gray-300">M{match.matchNumber}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <span className="text-sm font-medium text-white">{match.opponent}</span>
                              <p className="text-[10px] text-gray-500 uppercase">{match.opponentIPL}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Calendar className="w-3 h-3 text-gray-500" />
                              <span>{match.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-1">
                              <MapPin className="w-3 h-3 text-gray-600" />
                              <span className="truncate max-w-[120px]">{match.venue}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-sm font-mono font-bold text-yellow-400">
                              {match.matchPoints}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {match.multiplier > 1 ? (
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${match.multiplier === 2 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                {match.multiplier}×
                              </span>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {getMatchStatusBadge(match)}
                          </td>
                        </tr>
                        <AnimatePresence>
                          {expandedMatch === idx && (
                            <tr>
                              <td colSpan="6" className="p-0 border-b border-gray-700/50">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="bg-[#0f0f0f] p-4 shadow-inner"
                                >
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/50">
                                      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Base Points</p>
                                      <p className="text-xl font-mono text-gray-300">
                                        {match.matchPoints}
                                      </p>
                                    </div>
                                    <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/50">
                                      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">C/VC Multiplier</p>
                                      <p className="text-xl font-mono text-purple-400">
                                        {match.multiplier}×
                                      </p>
                                    </div>
                                    <div className="bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/20">
                                      <p className="text-[10px] uppercase tracking-wider text-yellow-500/70 mb-1">Final League Points</p>
                                      <p className="text-xl font-mono font-bold text-yellow-400">
                                        {match.leaguePoints}
                                      </p>
                                    </div>
                                    <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/50 flex flex-col justify-center">
                                      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Match Location</p>
                                      <p className="text-xs text-gray-400 leading-tight">
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
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 flex items-center justify-center h-[400px]">
              <div className="text-center">
                {historyLoading ? (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-gray-700 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-gray-400 font-medium">Fetching Match Data...</p>
                    <p className="text-xs text-gray-500">Loading schedules and opponent info</p>
                  </motion.div>
                ) : fetchError ? (
                  <div className="flex flex-col items-center gap-3 px-6">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 mb-2">
                      <X size={32} />
                    </div>
                    <p className="text-red-400 font-medium text-lg">Failed to fetch data</p>
                    <p className="text-sm text-gray-400 max-w-md">{fetchError}</p>
                    <button 
                      onClick={() => getPlayerMatchHistory(selectedPlayer)}
                      className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <>
                    <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium text-lg">Select a player to view match history</p>
                    <p className="text-sm text-gray-500 mt-2">See detailed opponent info, points multipliers, and dates.</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
