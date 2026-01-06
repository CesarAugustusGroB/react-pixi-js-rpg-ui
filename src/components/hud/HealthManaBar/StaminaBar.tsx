import React, { useEffect } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import {
  usePlayerStore,
  selectStamina,
  selectMaxStamina,
} from '@stores/playerStore';
import styles from './HealthManaBar.module.css';

/**
 * Stamina bar component with smooth animations.
 * Uses fine-grained Zustand selectors to minimize re-renders.
 */
export const StaminaBar: React.FC = () => {
  // Fine-grained selectors
  const stamina = usePlayerStore(selectStamina);
  const maxStamina = usePlayerStore(selectMaxStamina);

  const staminaPercent = (stamina / maxStamina) * 100;

  // Animated width
  const animatedPercent = useMotionValue(staminaPercent);

  useEffect(() => {
    const controls = animate(animatedPercent, staminaPercent, {
      type: 'spring',
      stiffness: 100,
      damping: 20,
    });

    return () => controls.stop();
  }, [staminaPercent, animatedPercent]);

  return (
    <div className={styles.barContainer}>
      <div className={styles.barBackground}>
        {/* Main stamina fill */}
        <motion.div
          className={styles.staminaFill}
          style={{ width: `${staminaPercent}%` }}
        />

        {/* Shine effect */}
        <div className={styles.barShine} />
      </div>

      {/* Text overlay */}
      <div className={styles.barText}>
        <span className={styles.currentValue}>{Math.ceil(stamina)}</span>
        <span className={styles.separator}>/</span>
        <span className={styles.maxValue}>{maxStamina}</span>
      </div>

      {/* Label */}
      <div className={styles.barLabel}>SP</div>
    </div>
  );
};
