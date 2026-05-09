import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle, Calendar, MapPin, Loader, AlertTriangle, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMatches } from '../utils/api';
import AddMatchModal from '../components/AddMatchModal';
import EditResultModal from '../components/EditResultModal';

export default function MatchManagement() {
  const { isAdmin } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [tab, setTab] = useState('upcoming'); // 'upcoming' | 'completed'
  
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const fetchMatchData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMatches();
      setMatches(data || []);
    } catch (err) {
      setError('Failed to load matches. ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchData();
  }, []);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
          <AlertTriangle size={28} className="text-white/20" />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-white">Access Denied</p>
          <p className="text-sm text-white/35 mt-1">You need admin privileges to manage matches.</p>
        </div>
      </div>
    );
  }

  const upcomingMatches = matches.filter(m => m.status === 'upcoming');
  const completedMatches = matches.filter(m => m.status === 'completed');

  const displayedMatches = tab === 'upcoming' ? upcomingMatches : completedMatches;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="label text-[#F5C518] mb-1.5">Match Center</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Schedule & Results</h1>
          <p className="text-sm text-white/30 mt-0.5">Manage upcoming fixtures and update match results</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#F5C518] text-black rounded-lg text-sm font-bold hover:bg-[#EDB800] transition shadow-[0_0_15px_rgba(245,197,24,0.15)]"
        >
          <Plus size={16} /> Add Match
        </button>
      </div>

      <div className="flex gap-2 p-1 bg-[#141414] border border-white/5 rounded-xl w-fit">
        <button
          onClick={() => setTab('upcoming')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
            tab === 'upcoming' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
          }`}
        >
          Upcoming ({upcomingMatches.length})
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
            tab === 'completed' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
          }`}
        >
          Completed ({completedMatches.length})
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <Loader size={24} className="animate-spin text-[#F5C518]" />
          <p className="text-sm text-white/30">Loading matches...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-900/30 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle size={18} />
          <p className="text-sm">{error}</p>
        </div>
      ) : displayedMatches.length === 0 ? (
        <div className="text-center py-20 bg-[#141414] border border-white/5 rounded-2xl">
          <Calendar size={32} className="mx-auto text-white/20 mb-3" />
          <p className="text-white/50 text-sm">No {tab} matches found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedMatches.map((match) => (
            <motion.div
              key={match.matchId || match.date + match.teamA}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-b from-[#1A1A1A] to-[#141414] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition shadow-lg relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                  match.status === 'upcoming' 
                    ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50' 
                    : 'bg-blue-900/30 text-blue-400 border border-blue-800/50'
                }`}>
                  {match.status === 'upcoming' ? '🟢 Upcoming' : '🔵 Completed'}
                </span>
                {match.status === 'completed' && (
                  <button 
                    onClick={() => { setSelectedMatch(match); setEditModalOpen(true); }}
                    className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition"
                    title="Edit Result"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
                {match.status === 'upcoming' && (
                  <button 
                    onClick={() => { setSelectedMatch(match); setEditModalOpen(true); }}
                    className="p-1.5 bg-[#F5C518]/10 hover:bg-[#F5C518]/20 rounded-lg text-[#F5C518] transition text-xs font-semibold"
                  >
                    Update Result
                  </button>
                )}
              </div>

              <div className="flex justify-between items-center my-6 px-2">
                <div className="text-center w-[40%]">
                  <div className="text-xl font-black text-white">{match.teamA}</div>
                </div>
                <div className="text-xs font-bold text-white/20 bg-white/5 px-2 py-1 rounded-md">VS</div>
                <div className="text-center w-[40%]">
                  <div className="text-xl font-black text-white">{match.teamB}</div>
                </div>
              </div>

              <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-white/50 text-xs">
                  <Calendar size={12} /> {match.date}
                </div>
                <div className="flex items-center gap-2 text-white/50 text-xs">
                  <MapPin size={12} /> {match.venue}
                </div>
                {match.status === 'completed' && match.winner && (
                  <div className="flex items-center gap-2 text-[#F5C518] text-xs font-bold mt-2 pt-2 border-t border-white/5">
                    <CheckCircle size={12} /> {match.winner} won by {match.margin}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AddMatchModal 
        open={addModalOpen} 
        onClose={() => setAddModalOpen(false)} 
        onMatchAdded={fetchMatchData}
      />
      
      {selectedMatch && (
        <EditResultModal
          open={editModalOpen}
          onClose={() => { setEditModalOpen(false); setSelectedMatch(null); }}
          match={selectedMatch}
          onResultUpdated={fetchMatchData}
        />
      )}
    </div>
  );
}
