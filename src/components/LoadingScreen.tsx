import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    const skipTimer = setTimeout(() => setShowSkip(true), 1000);
    const completeTimer = setTimeout(() => onComplete(), 3000);

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary"
      >
        {/* Flask Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-8"
        >
          {/* Flask Container */}
          <div className="relative w-32 h-40">
            {/* Flask Outline */}
            <svg viewBox="0 0 100 120" className="w-full h-full">
              {/* Flask Body */}
              <path
                d="M35 10 L35 50 L15 100 Q10 115 25 115 L75 115 Q90 115 85 100 L65 50 L65 10 Z"
                fill="none"
                stroke="hsl(var(--secondary))"
                strokeWidth="3"
                className="drop-shadow-lg"
              />
              {/* Flask Neck */}
              <rect
                x="35"
                y="5"
                width="30"
                height="10"
                rx="2"
                fill="none"
                stroke="hsl(var(--secondary))"
                strokeWidth="3"
              />
              {/* Liquid Fill with Animation */}
              <motion.path
                d="M20 100 Q15 110 25 110 L75 110 Q85 110 80 100 L65 60 L35 60 L20 100 Z"
                fill="hsl(var(--secondary))"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.8, scale: 1 }}
                transition={{ duration: 1.5, delay: 0.3 }}
              />
              {/* Bubbles */}
              <motion.circle
                cx="40"
                cy="85"
                r="4"
                fill="white"
                opacity="0.6"
                initial={{ y: 0 }}
                animate={{ y: -20, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              />
              <motion.circle
                cx="55"
                cy="90"
                r="3"
                fill="white"
                opacity="0.6"
                initial={{ y: 0 }}
                animate={{ y: -25, opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, delay: 0.8 }}
              />
              <motion.circle
                cx="65"
                cy="88"
                r="2"
                fill="white"
                opacity="0.6"
                initial={{ y: 0 }}
                animate={{ y: -15, opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 1 }}
              />
            </svg>
          </div>
        </motion.div>

        {/* Logo Text */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="text-4xl md:text-5xl font-heading font-bold text-white mb-2"
        >
          SIM-Lab
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.5 }}
          className="text-secondary text-lg tracking-[0.3em] uppercase font-medium"
        >
          Science in Motion
        </motion.p>

        {/* Skip Button */}
        <AnimatePresence>
          {showSkip && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onComplete}
              className="absolute bottom-8 right-8 text-white/60 hover:text-white text-sm transition-colors"
            >
              Skip →
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default LoadingScreen;
