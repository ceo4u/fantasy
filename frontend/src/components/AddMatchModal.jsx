import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarPlus, Loader } from 'lucide-react';
import { addMatch } from '../utils/api';

export default function AddMatchModal({ open, onClose, onMatchAdded }) {
  const [formData, setFormData] = useState({
    teamA: '',
    teamB: '',
    date: '',
    venue: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.teamA || !formData.teamB || !formData.date || !formData.venue) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await addMatch(formData.teamA, formData.teamB, formData.date, formData.venue, 'upcoming');
      onMatchAdded();
      onClose();
      setFormData({ teamA: '', teamB: '', date: '', venue: '' });
    } catch (err) {
      setError('Failed to add match. ' + (err.response?.data?.error || err.message));
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
            className="relative w-full max-w-md bg-[#0F0F0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08] bg-[#141414]">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CalendarPlus size={18} className="text-[#F5C518]" /> Schedule Match
                </h3>
                <p className="text-xs text-white/40 mt-1">Add a new upcoming match fixture</p>
              </div>
              <button 
                onClick={onClose} 
                disabled={submitting}
                className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition"
              >
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-5 p-3 rounded-xl bg-red-900/20 border border-red-800/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1.5">Team A</label>
                    <input
                      type="text"
                      placeholder="e.g. CSK"
                      value={formData.teamA}
                      onChange={e => setFormData(p => ({ ...p, teamA: e.target.value.toUpperCase() }))}
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#F5C518]/50 focus:ring-1 focus:ring-[#F5C518]/30 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1.5">Team B</label>
                    <input
                      type="text"
                      placeholder="e.g. MI"
                      value={formData.teamB}
                      onChange={e => setFormData(p => ({ ...p, teamB: e.target.value.toUpperCase() }))}
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#F5C518]/50 focus:ring-1 focus:ring-[#F5C518]/30 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1.5">Date & Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 2025-05-06 19:30 IST"
                    value={formData.date}
                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#F5C518]/50 focus:ring-1 focus:ring-[#F5C518]/30 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1.5">Venue</label>
                  <input
                    type="text"
                    placeholder="e.g. M. A. Chidambaram Stadium, Chennai"
                    value={formData.venue}
                    onChange={e => setFormData(p => ({ ...p, venue: e.target.value }))}
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#F5C518]/50 focus:ring-1 focus:ring-[#F5C518]/30 outline-none transition"
                  />
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
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#F5C518] text-black hover:bg-[#EDB800] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-[0_0_15px_rgba(245,197,24,0.15)]"
                >
                  {submitting ? <Loader size={16} className="animate-spin" /> : null}
                  Schedule Match
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
