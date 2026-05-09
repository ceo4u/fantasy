import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Loader } from 'lucide-react';
import { updateMatchResult } from '../utils/api';

export default function EditResultModal({ open, onClose, match, onResultUpdated }) {
  const [formData, setFormData] = useState({
    winner: match?.winner || '',
    margin: match?.margin || '',
  });
  
  // A simple structured string input for points to make it easy for Admin to paste
  // E.g., "Virat Kohli: 50, MS Dhoni: 20"
  const [pointsInput, setPointsInput] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.winner || !formData.margin) {
      setError('Please specify winner and margin');
      return;
    }

    setSubmitting(true);
    setError('');

    // Parse the points input
    const matchPoints = {};
    if (pointsInput.trim()) {
      const entries = pointsInput.split(',').map(e => e.trim()).filter(e => e);
      for (const entry of entries) {
        const [name, pts] = entry.split(':').map(s => s.trim());
        if (name && !isNaN(Number(pts))) {
          matchPoints[name.toUpperCase()] = Number(pts);
        }
      }
    }

    try {
      await updateMatchResult(match.matchId || match.date, formData.winner, formData.margin, matchPoints);
      onResultUpdated();
      onClose();
    } catch (err) {
      setError('Failed to update result. ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !match) return null;

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
            className="relative w-full max-w-lg bg-[#0F0F0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08] bg-[#141414]">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-400" /> Update Result
                </h3>
                <p className="text-xs text-white/40 mt-1">{match.teamA} vs {match.teamB} - {match.date}</p>
              </div>
              <button 
                onClick={onClose} 
                disabled={submitting}
                className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition"
              >
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
              {error && (
                <div className="mb-5 p-3 rounded-xl bg-red-900/20 border border-red-800/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1.5">Winner</label>
                    <select
                      value={formData.winner}
                      onChange={e => setFormData(p => ({ ...p, winner: e.target.value }))}
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#F5C518]/50 focus:ring-1 focus:ring-[#F5C518]/30 outline-none transition"
                    >
                      <option value="">Select Winner</option>
                      <option value={match.teamA}>{match.teamA}</option>
                      <option value={match.teamB}>{match.teamB}</option>
                      <option value="Draw">Draw/No Result</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1.5">Margin</label>
                    <input
                      type="text"
                      placeholder="e.g. 6 wickets, 15 runs"
                      value={formData.margin}
                      onChange={e => setFormData(p => ({ ...p, margin: e.target.value }))}
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#F5C518]/50 focus:ring-1 focus:ring-[#F5C518]/30 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1.5 flex justify-between">
                    <span>Player Points (Optional)</span>
                  </label>
                  <p className="text-[10px] text-white/30 mb-2">
                    Enter points in format: Player Name: Points, Player 2: Points
                  </p>
                  <textarea
                    rows={4}
                    placeholder="e.g. VIRAT KOHLI: 85, MS DHONI: 40"
                    value={pointsInput}
                    onChange={e => setPointsInput(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-[#F5C518]/50 focus:ring-1 focus:ring-[#F5C518]/30 outline-none transition font-mono"
                  />
                  <p className="text-[10px] text-[#F5C518]/70 mt-2">
                    Note: For production, we recommend updating points via the Match Points Editor tab for full accuracy.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={onClose}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-[0_0_15px_rgba(5,150,105,0.3)]"
                >
                  {submitting ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Mark Completed
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
