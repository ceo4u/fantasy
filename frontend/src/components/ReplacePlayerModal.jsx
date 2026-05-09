import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Loader } from 'lucide-react';
import { replacePlayer } from '../utils/api';

export default function ReplacePlayerModal({ open, onClose, teamName, oldPlayerName, onPlayerReplaced }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Free-text inputs
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerIPLTeam, setNewPlayerIPLTeam] = useState('');
  const [newPlayerSkill, setNewPlayerSkill] = useState('');
  const [newPlayerPrice, setNewPlayerPrice] = useState('');

  useEffect(() => {
    if (open) {
      setNewPlayerName('');
      setNewPlayerIPLTeam('');
      setNewPlayerSkill('');
      setNewPlayerPrice('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) {
      setError('Please enter the new player name');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await replacePlayer(
        teamName,
        oldPlayerName,
        newPlayerName.trim().toUpperCase(),
        newPlayerIPLTeam.trim().toUpperCase(),
        newPlayerSkill.trim().toUpperCase(),
        Number(newPlayerPrice) || 0
      );
      onPlayerReplaced(newPlayerName.trim().toUpperCase());
      onClose();
    } catch (err) {
      setError('Replacement failed. ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={!submitting ? onClose : undefined}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-[#0F0F0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08] bg-[#141414]">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus size={18} className="text-[#F5C518]" /> Replace Player
                </h3>
                <p className="text-xs text-white/40 mt-1">Manually enter the new player details</p>
              </div>
              <button 
                onClick={onClose} 
                disabled={submitting}
                className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition"
              >
                <X size={20}/>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {error && (
                <div className="mb-5 p-3 rounded-xl bg-red-900/20 border border-red-800/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Current Player (Being Replaced)</label>
                <div className="px-4 py-3 bg-red-900/10 border border-red-900/30 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">{oldPlayerName}</div>
                    <div className="text-[10px] text-red-400 font-medium mt-1">This player will be removed from team and moved to Transfer Log.</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">New Player Details</label>
                
                <div>
                  <label className="block text-xs text-white/40 mb-1">Player Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="e.g. VIRAT KOHLI"
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#F5C518]/50 focus:ring-1 focus:ring-[#F5C518]/30 outline-none transition uppercase"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-white/40 mb-1">IPL Team (Optional)</label>
                    <input
                      type="text"
                      value={newPlayerIPLTeam}
                      onChange={(e) => setNewPlayerIPLTeam(e.target.value)}
                      placeholder="e.g. RCB"
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:border-[#F5C518]/50 outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/40 mb-1">Skill (Optional)</label>
                    <input
                      type="text"
                      value={newPlayerSkill}
                      onChange={(e) => setNewPlayerSkill(e.target.value)}
                      placeholder="e.g. BAT"
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:border-[#F5C518]/50 outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/40 mb-1">Price (Optional)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newPlayerPrice}
                      onChange={(e) => setNewPlayerPrice(e.target.value)}
                      placeholder="e.g. 15.0"
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:border-[#F5C518]/50 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-white/[0.08] bg-[#141414] flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={!newPlayerName.trim() || submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#F5C518] text-black hover:bg-[#EDB800] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-[0_0_15px_rgba(245,197,24,0.15)]"
              >
                {submitting ? <Loader size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Confirm Replacement
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
