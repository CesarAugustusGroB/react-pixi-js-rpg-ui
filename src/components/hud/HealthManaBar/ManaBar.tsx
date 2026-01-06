import React, { useEffect } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import {
  usePlayerStore,
  selectMana,
  selectMaxMana,
} from '@stores/playerStore';
import styles from './HealthManaBar.module.css';

/**
 * Mana bar component with smooth animations.
 * Uses fine-grained Zustand selectors to minimize re-renders.
 */
export const ManaBar: React.FC = () => {
  // Fine-grained selectors
  const mana = usePlayerStore(selectMana);
  const maxMana = usePlayerStore(selectMaxMana);

  const manaPercent = (mana / maxMana) * 100;

  // Animated width
  const animatedPercent = useMotionValue(manaPercent);

  useEffect(() => {
    const controls = animate(animatedPercent, manaPercent, {
      type: 'spring',
      stiffness: 100,
      damping: 20,
    });

    return () => controls.stop();
  }, [manaPercent, animatedPercent]);

  return (
    <div className={styles.barContainer}>
      <div className={styles.barBackground}>
        {/* Main mana fill */}
        <motion.div
          className={styles.manaFill}
          style={{ width: `${manaPercent}%` }}
        />

        {/* Shine effect */}
        <div className={styles.barShine} />
      </div>

      {/* Text overlay */}
      <div className={styles.barText}>
        <span className={styles.currentValue}>{Math.ceil(mana)}</span>
        <span className={styles.separator}>/</span>
        <span className={styles.maxValue}>{maxMana}</span>
      </div>

      {/* Label */}
      <div className={styles.barLabel}>MP</div>
    </div>
  );
};
