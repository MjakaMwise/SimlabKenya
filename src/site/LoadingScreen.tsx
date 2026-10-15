import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IMG } from "./data";

interface LoadingScreenProps {
  onComplete: () => void;
}

const LOADING_MS = 3600; // flask loader
const SPOTLIGHT_MS = 3800; // Ocean Shujaa spotlight before the site is revealed

/**
 * First-visit intro. Phase 1: flask loader with the Ocean Shujaa mark at the bottom.
 * Phase 2: the mark floats to the top and grows to introduce the new program, then the
 * whole overlay fades away.
 */
const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [showSkip, setShowSkip] = useState(false);
  const [phase, setPhase] = useState<"loading" | "spotlight">("loading");

  useEffect(() => {
    const skipTimer = setTimeout(() => setShowSkip(true), 1000);
    const spotTimer = setTimeout(() => setPhase("spotlight"), LOADING_MS);
    const completeTimer = setTimeout(() => onComplete(), LOADING_MS + SPOTLIGHT_MS);
    return () => {
      clearTimeout(skipTimer);
      clearTimeout(spotTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary overflow-hidden"
    >
      <AnimatePresence>
        {phase === "loading" && (
          <motion.div
            key="loader"
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center pb-28"
          >
            {/* Flask Animation */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative mb-8"
            >
              <div className="relative w-32 h-40">
                <svg viewBox="0 0 100 120" className="w-full h-full">
                  <path
                    d="M35 10 L35 50 L15 100 Q10 115 25 115 L75 115 Q90 115 85 100 L65 50 L65 10 Z"
                    fill="none"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="3"
                    className="drop-shadow-lg"
                  />
                  <rect x="35" y="5" width="30" height="10" rx="2" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
                  <motion.path
                    d="M20 100 Q15 110 25 110 L75 110 Q85 110 80 100 L65 60 L35 60 L20 100 Z"
                    fill="hsl(var(--secondary))"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.8, scale: 1 }}
                    transition={{ duration: 1.5, delay: 0.3 }}
                  />
                  <motion.circle cx="40" cy="85" r="4" fill="white" opacity="0.6" initial={{ y: 0 }} animate={{ y: -20, opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} />
                  <motion.circle cx="55" cy="90" r="3" fill="white" opacity="0.6" initial={{ y: 0 }} animate={{ y: -25, opacity: 0 }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.8 }} />
                  <motion.circle cx="65" cy="88" r="2" fill="white" opacity="0.6" initial={{ y: 0 }} animate={{ y: -15, opacity: 0 }} transition={{ duration: 1.2, repeat: Infinity, delay: 1 }} />
                </svg>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1 }}
              className="text-4xl md:text-5xl font-heading font-bold text-white mb-2"
              style={{ margin: "0 0 0.5rem" }}
            >
              SIM-Lab
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.5 }}
              className="text-secondary text-lg tracking-[0.3em] uppercase font-medium"
            >
              Science in Motion
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 1: Ocean Shujaa mark at the bottom */}
      {phase === "loading" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.9 }}
          className="absolute inset-x-0 bottom-5 flex flex-col items-center pointer-events-none"
        >
          <span className="text-white/70 text-[10px] tracking-[0.3em] uppercase font-medium">New holiday program</span>
          <motion.img
            layoutId="os-mark"
            transition={{ layout: { duration: 1.1, ease: [0.2, 0.8, 0.2, 1] } }}
            src={IMG.ostl}
            alt="Ocean Shujaa"
            width={704}
            height={477}
            className="h-20 md:h-24 w-auto"
          />
        </motion.div>
      )}

      {/* Phase 2: the mark floats to the top and grows to introduce the program */}
      {phase === "spotlight" && (
        <div className="absolute inset-0 flex flex-col items-center justify-start px-6 pt-[7vh] text-center">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="inline-block rounded-full bg-accent px-4 py-1 text-xs font-bold tracking-wider text-accent-foreground"
          >
            NEW HOLIDAY PROGRAM
          </motion.span>
          <motion.img
            layoutId="os-mark"
            transition={{ layout: { duration: 1.1, ease: [0.2, 0.8, 0.2, 1] } }}
            src={IMG.ostl}
            alt="Ocean Shujaa"
            width={704}
            height={477}
            className="mt-2 h-[42vh] min-h-[170px] max-h-[400px] w-auto drop-shadow-2xl"
          />
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="font-heading font-bold text-accent text-xl md:text-2xl"
          >
            From the Ocean to the Laboratory
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="mt-2 max-w-md text-white/80"
          >
            Five days of real ocean science, in the field and in partner laboratories.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
            className="mt-4 flex flex-wrap justify-center gap-2 text-sm text-white"
          >
            {["5 days", "Primary to college", "IOME001 Innovation Hub, Mombasa"].map((f) => (
              <span key={f} className="rounded-full border border-white/30 bg-white/10 px-3 py-1">
                {f}
              </span>
            ))}
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showSkip && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onComplete}
            className="absolute top-6 right-6 text-white/60 hover:text-white text-sm transition-colors"
          >
            Skip →
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LoadingScreen;
