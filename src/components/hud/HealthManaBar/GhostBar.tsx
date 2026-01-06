import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './HealthManaBar.module.css';

interface GhostBarProps {
  previousPercent: number;
  currentPercent: number;
  delayMs?: number;
  durationMs?: number;
}

/**
 * Ghost bar that shows trailing damage indicator.
 * Appears when health decreases and fades out after a delay.
 */
export const GhostBar: React.FC<GhostBarProps> = ({
  previousPercent,
  currentPercent,
  delayMs = 300,
  durationMs = 500,
}) => {
  const [showGhost, setShowGhost] = useState(false);
  const [ghostPercent, setGhostPercent] = useState(previousPercent);

  useEffect(() => {
    // Only show ghost when damage is taken (health decreased)
    if (previousPercent > currentPercent) {
      setGhostPercent(previousPercent);
      setShowGhost(true);

      // Start fade out after delay
      const timer = setTimeout(() => {
        setShowGhost(false);
      }, delayMs + durationMs);

      return () => clearTimeout(timer);
    }
  }, [previousPercent, currentPercent, delayMs, durationMs]);

  return (
    <AnimatePresence>
      {showGhost && ghostPercent > currentPercent && (
        <motion.div
          className={styles.ghostBar}
          initial={{ width: `${ghostPercent}%`, opacity: 0.8 }}
          animate={{ width: `${ghostPercent}%`, opacity: 0.8 }}
          exit={{ opacity: 0 }}
          transition={{
            width: { duration: durationMs / 1000, delay: delayMs / 1000 },
            opacity: { duration: durationMs / 1000, delay: (delayMs + 200) / 1000 },
          }}
        />
      )}
    </AnimatePresence>
  );
};
