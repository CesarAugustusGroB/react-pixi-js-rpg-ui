import React from 'react';
import styles from './CharacterSheet.module.css';

interface StatBarProps {
  label: string;
  icon: string;
  current: number;
  max: number;
  type: 'health' | 'mana' | 'stamina' | 'experience';
}

/**
 * Individual stat display bar.
 */
export const StatBar: React.FC<StatBarProps> = ({
  label,
  icon,
  current,
  max,
  type,
}) => {
  const percent = max > 0 ? (current / max) * 100 : 0;

  return (
    <div className={styles.statBar}>
      <div className={styles.statHeader}>
        <span className={styles.statLabel}>
          <span className={styles.statIcon}>{icon}</span>
          {label}
        </span>
        <span className={styles.statValue}>
          {current} / {max}
        </span>
      </div>
      <div className={styles.statTrack}>
        <div
          className={`${styles.statFill} ${styles[type]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
