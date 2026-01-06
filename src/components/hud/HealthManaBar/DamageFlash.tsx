import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './HealthManaBar.module.css';

interface DamageFlashProps {
  /** Triggers flash when health decreases */
  triggerKey: number;
  /** Duration of the flash in ms */
  durationMs?: number;
}

/**
 * Red flash overlay that appears when damage is taken.
 * Provides immediate visual feedback for health loss.
 */
export const DamageFlash: React.FC<DamageFlashProps> = ({
  triggerKey,
  durationMs = 300,
}) => {
  const [isFlashing, setIsFlashing] = useState(false);
  const [lastTrigger, setLastTrigger] = useState(triggerKey);

  useEffect(() => {
    // Only flash when triggerKey changes and is different from initial
    if (triggerKey !== lastTrigger && triggerKey > 0) {
      setIsFlashing(true);
      setLastTrigger(triggerKey);

      const timer = setTimeout(() => {
        setIsFlashing(false);
      }, durationMs);

      return () => clearTimeout(timer);
    }
  }, [triggerKey, lastTrigger, durationMs]);

  return (
    <AnimatePresence>
      {isFlashing && (
        <motion.div
          className={styles.damageFlash}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: durationMs / 1000,
            times: [0, 0.1, 1],
            ease: 'easeOut',
          }}
        />
      )}
    </AnimatePresence>
  );
};
