// TravelProgressBar - Shows travel progress during journey
// Displays overall progress, current segment, and ETA

import React from 'react';
import { motion } from 'framer-motion';
import styles from './TravelProgressBar.module.css';

interface TravelProgressBarProps {
  progress: number; // 0-1 total progress
  segmentIndex: number;
  totalSegments: number;
  eta: number; // Minutes remaining
}

/**
 * Progress bar displayed during active travel.
 * Shows overall completion and estimated time of arrival.
 */
export const TravelProgressBar: React.FC<TravelProgressBarProps> = ({
  progress,
  segmentIndex,
  totalSegments,
  eta,
}) => {
  // Format ETA
  const formatEta = () => {
    if (eta <= 0) return 'Arriving...';
    if (eta < 60) return `${Math.ceil(eta)} min`;

    const hours = Math.floor(eta / 60);
    const mins = Math.ceil(eta % 60);
    return `${hours}h ${mins}m`;
  };

  const progressPercent = Math.min(100, Math.max(0, progress * 100));

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      <div className={styles.header}>
        <span className={styles.label}>Traveling...</span>
        <span className={styles.eta}>ETA: {formatEta()}</span>
      </div>

      <div className={styles.progressTrack}>
        <motion.div
          className={styles.progressFill}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />

        {/* Segment markers */}
        {Array.from({ length: totalSegments - 1 }).map((_, i) => (
          <div
            key={i}
            className={styles.segmentMarker}
            style={{ left: `${((i + 1) / totalSegments) * 100}%` }}
          />
        ))}
      </div>

      <div className={styles.footer}>
        <span className={styles.segment}>
          Segment {segmentIndex + 1} of {totalSegments}
        </span>
        <span className={styles.percent}>{progressPercent.toFixed(0)}%</span>
      </div>
    </motion.div>
  );
};

export default TravelProgressBar;
