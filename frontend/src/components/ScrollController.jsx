import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScrollController() {
  const [scrollY, setScrollY] = useState(0);

  // Monitor scroll position
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

  const scrollLeft = () => {
    // Find the main horizontal scrollable element on the page, else scroll window
    const container = document.querySelector('.overflow-auto') || document.querySelector('.overflow-x-auto') || window;
    container.scrollBy({ left: -280, behavior: 'smooth' });
  };

  const scrollRight = () => {
    const container = document.querySelector('.overflow-auto') || document.querySelector('.overflow-x-auto') || window;
    container.scrollBy({ left: 280, behavior: 'smooth' });
  };

  // Determine visibility states
  const showScrollDownHint = scrollY < 60;
  const showDpad = scrollY >= 60;

  return (
    <>
      {/* ── 1. Animated Mouse Scroll Down Hint (Bottom Center) ── */}
      <AnimatePresence>
        {showScrollDownHint && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 0.65, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5 pointer-events-none select-none"
          >
            {/* Bouncing mouse icon */}
            <div className="w-5 h-8 rounded-full border-2 border-[#F5C518]/50 flex justify-center p-1 bg-black/10 backdrop-blur-sm">
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                className="w-1 h-1.5 bg-[#F5C518] rounded-full"
              />
            </div>
            {/* Sleek micro text */}
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#F5C518] flex items-center gap-1">
              Scroll Down <ChevronDown size={8} className="animate-bounce" />
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. Luxury Directional D-Pad Controller (Bottom Right) ── */}
      <AnimatePresence>
        {showDpad && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-[#0C0C0C]/90 backdrop-blur-md border border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
          >
            {/* Top: Up Arrow */}
            <button
              onClick={scrollToTop}
              className="w-9 h-9 rounded-full bg-[#12120B]/90 border border-[#F5C518]/30 text-[#F5C518] hover:bg-[#F5C518]/20 flex items-center justify-center shadow-[0_0_12px_rgba(245,197,24,0.1)] hover:scale-105 active:scale-95 transition-all duration-200 group"
              title="Scroll to Top"
            >
              <ChevronUp size={16} className="group-hover:-translate-y-0.5 transition-transform" />
            </button>

            {/* Middle: Horizontal Pair (Left & Right Scroll) */}
            <div className="flex gap-1.5">
              <button
                onClick={scrollLeft}
                className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.08] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 group"
                title="Scroll Left"
              >
                <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={scrollRight}
                className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.08] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 group"
                title="Scroll Right"
              >
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Bottom: Down Arrow */}
            <button
              onClick={scrollToBottom}
              className="w-9 h-9 rounded-full bg-[#12120B]/90 border border-[#F5C518]/30 text-[#F5C518] hover:bg-[#F5C518]/20 flex items-center justify-center shadow-[0_0_12px_rgba(245,197,24,0.1)] hover:scale-105 active:scale-95 transition-all duration-200 group"
              title="Scroll to Bottom"
            >
              <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
