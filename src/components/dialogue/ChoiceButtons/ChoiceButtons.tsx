import React, { useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { DialogueChoice } from '@/types';
import { menuItemVariants } from '@utils/animations';
import styles from './ChoiceButtons.module.css';

interface ChoiceButtonsProps {
  /** Array of dialogue choices */
  choices: DialogueChoice[];
  /** Callback when a choice is selected */
  onSelect: (choiceId: string) => void;
  /** Show keyboard number hints */
  showKeyHints?: boolean;
}

/**
 * Animated dialogue choice buttons with keyboard support.
 */
export const ChoiceButtons: React.FC<ChoiceButtonsProps> = ({
  choices,
  onSelect,
  showKeyHints = true,
}) => {
  // Handle keyboard number selection (1-9)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= choices.length) {
        e.preventDefault();
        onSelect(choices[num - 1].id);
      }
    },
    [choices, onSelect]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <motion.div
      className={styles.container}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {choices.map((choice, index) => (
        <motion.button
          key={choice.id}
          type="button"
          className={styles.choice}
          variants={menuItemVariants}
          whileHover={{ scale: 1.02, x: 8 }}
          whileTap={{ scale: 0.98 }}
          onClick={(e) => {
            e.stopPropagation(); // Prevent dialogue advance
            onSelect(choice.id);
          }}
        >
          <span className={styles.choiceNumber}>{index + 1}</span>
          <span className={styles.choiceText}>{choice.text}</span>
          {showKeyHints && (
            <span className={styles.keyHint}>{index + 1}</span>
          )}
          <span className={styles.choiceArrow}>›</span>
        </motion.button>
      ))}
    </motion.div>
  );
};
