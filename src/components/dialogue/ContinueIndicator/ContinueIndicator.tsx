import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ContinueIndicator.module.css';

interface ContinueIndicatorProps {
  /** Whether to show the indicator */
  visible: boolean;
  /** Text to display (optional) */
  text?: string;
  /** Show keyboard hint */
  showKeyHint?: boolean;
}

/**
 * Bouncing continue indicator shown when dialogue can advance.
 */
export const ContinueIndicator: React.FC<ContinueIndicatorProps> = ({
  visible,
  text = 'Click to continue',
  showKeyHint = true,
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={styles.container}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.2 }}
        >
          <span className={styles.text}>{text}</span>

          {showKeyHint && (
            <span className={styles.keyHint}>Space / Enter</span>
          )}

          <div className={styles.arrow}>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
