import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  usePlayerStore,
  selectHealth,
  selectMaxHealth,
  selectPreviousHealth,
} from '@stores/playerStore';
import { GhostBar } from './GhostBar';
import { DamageFlash } from './DamageFlash';
import styles from './HealthManaBar.module.css';

/**
 * Health bar with color interpolation and damage visualization.
 * Uses fine-grained Zustand selectors to minimize re-renders.
 */
export const HealthBar: React.FC = () => {
  // Fine-grained selectors - only re-render when these specific values change
  const health = usePlayerStore(selectHealth);
  const maxHealth = usePlayerStore(selectMaxHealth);
  const previousHealth = usePlayerStore(selectPreviousHealth);

  const healthPercent = (health / maxHealth) * 100;
  const previousPercent = (previousHealth / maxHealth) * 100;

  // Track damage events for flash trigger
  const damageCountRef = useRef(0);
  if (health < previousHealth) {
    damageCountRef.current += 1;
  }

  // Animated width using Framer Motion
  const animatedPercent = useMotionValue(healthPercent);

  // Color interpolation based on health percentage
  const barColor = useTransform(
    animatedPercent,
    [0, 25, 50, 100],
    ['#ef5350', '#ff7043', '#ffa726', '#66bb6a']
  );

  // Animate the percent value
  useEffect(() => {
    const controls = animate(animatedPercent, healthPercent, {
      type: 'spring',
      stiffness: 100,
      damping: 20,
    });

    return () => controls.stop();
  }, [healthPercent, animatedPercent]);

  return (
    <div className={styles.barContainer}>
      <div className={styles.barBackground}>
        {/* Ghost bar - shows damage trail */}
        <GhostBar
          previousPercent={previousPercent}
          currentPercent={healthPercent}
        />

        {/* Main health fill with color interpolation */}
        <motion.div
          className={styles.healthFill}
          style={{
            width: `${healthPercent}%`,
            background: useTransform(
              barColor,
              (color) => `linear-gradient(180deg, ${color} 0%, color-mix(in srgb, ${color} 70%, black) 100%)`
            ),
          }}
        />

        {/* Damage flash overlay */}
        <DamageFlash triggerKey={damageCountRef.current} />

        {/* Shine effect */}
        <div className={styles.barShine} />
      </div>

      {/* Text overlay */}
      <div className={styles.barText}>
        <span className={styles.currentValue}>{Math.ceil(health)}</span>
        <span className={styles.separator}>/</span>
        <span className={styles.maxValue}>{maxHealth}</span>
      </div>

      {/* Label */}
      <div className={styles.barLabel}>HP</div>
    </div>
  );
};
