import React from 'react';
import { motion } from 'framer-motion';
import styles from './NPCPortrait.module.css';

interface NPCPortraitProps {
  /** Image source URL */
  src?: string | null;
  /** NPC name for alt text and name tag */
  name: string;
  /** Whether the NPC is currently speaking (adds glow effect) */
  isSpeaking?: boolean;
  /** Show name tag below portrait */
  showNameTag?: boolean;
}

/**
 * NPC portrait display with decorative frame.
 */
export const NPCPortrait: React.FC<NPCPortraitProps> = ({
  src,
  name,
  isSpeaking = true,
  showNameTag = false,
}) => {
  // Get initials for placeholder
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      className={`${styles.container} ${isSpeaking ? styles.speaking : ''}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className={styles.frame}>
        {src ? (
          <img
            src={src}
            alt={`${name} portrait`}
            className={styles.image}
            draggable={false}
          />
        ) : (
          <div className={styles.placeholder}>{initials}</div>
        )}
      </div>

      {/* Decorative corners */}
      <div className={`${styles.frameCorner} ${styles.topLeft}`} />
      <div className={`${styles.frameCorner} ${styles.topRight}`} />
      <div className={`${styles.frameCorner} ${styles.bottomLeft}`} />
      <div className={`${styles.frameCorner} ${styles.bottomRight}`} />

      {/* Optional name tag */}
      {showNameTag && <div className={styles.nameTag}>{name}</div>}
    </motion.div>
  );
};
