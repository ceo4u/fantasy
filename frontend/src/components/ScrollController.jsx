import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScrollController() {
  const [isVisible, setIsVisible] = useState(false);

  // Monitor scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
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

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
        >
          {/* Scroll to Top */}
          <button
            onClick={scrollToTop}
            className="w-10 h-10 rounded-full bg-[#12120B]/90 backdrop-blur-md border border-[#F5C518]/30 text-[#F5C518] hover:bg-[#F5C518]/10 flex items-center justify-center shadow-[0_0_15px_rgba(245,197,24,0.15)] hover:shadow-[0_0_20px_rgba(245,197,24,0.3)] hover:scale-105 active:scale-95 transition-all duration-200 group"
            title="Scroll to Top"
          >
            <ChevronUp size={18} className="group-hover:-translate-y-0.5 transition-transform" />
          </button>

          {/* Scroll to Bottom */}
          <button
            onClick={scrollToBottom}
            className="w-10 h-10 rounded-full bg-[#12120B]/90 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-white/5 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 group"
            title="Scroll to Bottom"
          >
            <ChevronDown size={18} className="group-hover:translate-y-0.5 transition-transform" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
