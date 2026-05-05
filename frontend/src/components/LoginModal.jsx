import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Eye, EyeOff, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginModal({ open, onClose }) {
  const { login } = useAuth();
  const [form,    setForm]    = useState({ username: '', password: '' });
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Reset form when opened
  useEffect(() => {
    if (open) { setForm({ username: '', password: '' }); setError(''); setShowPw(false); }
  }, [open]);

  const handleClose = useCallback(() => {
    if (loading) return; // don't close during submit
    setError('');
    onClose();
  }, [loading, onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(form.username.trim(), form.password);
      setForm({ username: '', password: '' });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="relative w-full z-10"
            style={{ maxWidth: 'min(90vw, 440px)' }}
          >
            <div className="bg-[#111111] border border-white/[0.09] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

              {/* Top accent bar */}
              <div className="h-0.5 w-full bg-gradient-to-r from-[#F5C518]/60 via-[#F5C518] to-[#F5C518]/60" />

              <div className="p-7 sm:p-8">
                {/* Close button */}
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="absolute top-4 right-4 p-2 rounded-lg text-white/25 hover:text-white hover:bg-white/8 transition disabled:opacity-30"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>

                {/* Icon + heading */}
                <div className="flex flex-col items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-[#F5C518]/10 border border-[#F5C518]/20 flex items-center justify-center
                                  shadow-[0_0_24px_rgba(245,197,24,0.12)]">
                    <Shield size={24} className="text-[#F5C518]" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Admin Login</h2>
                    <p className="text-sm text-white/35 mt-1">Sign in to manage player points</p>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {/* Username */}
                  <div>
                    <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      className="input py-3.5 text-[15px]"
                      placeholder="admin"
                      autoComplete="username"
                      autoFocus
                      disabled={loading}
                      required
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        className="input py-3.5 text-[15px] pr-12"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        disabled={loading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        disabled={loading}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition p-1"
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                      >
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-start gap-2.5 text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-3"
                      >
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2.5
                               py-3.5 rounded-xl text-[15px] font-bold
                               bg-[#F5C518] text-black
                               hover:bg-[#EDB800] active:scale-[0.98]
                               disabled:opacity-60 disabled:cursor-not-allowed
                               transition-all duration-150 mt-2
                               shadow-[0_4px_20px_rgba(245,197,24,0.25)]
                               hover:shadow-[0_4px_28px_rgba(245,197,24,0.4)]"
                  >
                    {loading ? (
                      <><Loader size={15} className="animate-spin" /> Signing in...</>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>

                {/* Footer hint */}
                <p className="text-center text-[11px] text-white/15 mt-6 font-mono tracking-wide">
                  Session expires after 60 minutes
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
