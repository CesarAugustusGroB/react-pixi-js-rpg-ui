import React from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore, selectLevel, selectExperience, selectExperienceToNextLevel } from '@stores/playerStore';
import { HealthBar } from './HealthBar';
import { ManaBar } from './ManaBar';
import { StaminaBar } from './StaminaBar';
import { panelVariants } from '@utils/animations';
import styles from './HealthManaBar.module.css';

interface HealthManaBarProps {
  /** Show stamina bar */
  showStamina?: boolean;
  /** Show experience bar */
  showExperience?: boolean;
  /** Show level badge */
  showLevel?: boolean;
}

/**
 * Main HUD container for player resource bars.
 * Positioned top-left by default.
 */
export const HealthManaBar: React.FC<HealthManaBarProps> = ({
  showStamina = false,
  showExperience = true,
  showLevel = true,
}) => {
  const level = usePlayerStore(selectLevel);
  const experience = usePlayerStore(selectExperience);
  const experienceToNextLevel = usePlayerStore(selectExperienceToNextLevel);

  const expPercent = (experience / experienceToNextLevel) * 100;

  return (
    <motion.div
      className={styles.container}
      variants={panelVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Level Badge */}
      {showLevel && (
        <div className={styles.levelBadge}>
          Lv. {level}
        </div>
      )}

      {/* Health Bar */}
      <HealthBar />

      {/* Mana Bar */}
      <ManaBar />

      {/* Stamina Bar (optional) */}
      {showStamina && <StaminaBar />}

      {/* Experience Bar */}
      {showExperience && (
        <div className={styles.expBarContainer}>
          <div className={styles.expBarBackground}>
            <motion.div
              className={styles.expFill}
              style={{ width: `${expPercent}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${expPercent}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
          <div className={styles.expText}>
            {experience} / {experienceToNextLevel} XP
          </div>
        </div>
      )}
    </motion.div>
  );
};
