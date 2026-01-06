import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Item } from '@/types';
import { tooltipVariants } from '@utils/animations';
import styles from './ItemTooltip.module.css';

interface ItemTooltipProps {
  item: Item;
  quantity: number;
  position: { x: number; y: number };
}

/**
 * Tooltip displaying item details on hover.
 */
export const ItemTooltip: React.FC<ItemTooltipProps> = ({
  item,
  quantity,
  position,
}) => {
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to keep tooltip on screen
  useEffect(() => {
    const tooltipWidth = 280;
    const tooltipHeight = 300;
    const padding = 16;

    let x = position.x + 16;
    let y = position.y;

    // Adjust horizontal
    if (x + tooltipWidth > window.innerWidth - padding) {
      x = position.x - tooltipWidth - 16;
    }

    // Adjust vertical
    if (y + tooltipHeight > window.innerHeight - padding) {
      y = window.innerHeight - tooltipHeight - padding;
    }

    if (y < padding) {
      y = padding;
    }

    setAdjustedPosition({ x, y });
  }, [position]);

  const hasStats = item.stats && Object.keys(item.stats).length > 0;

  return (
    <motion.div
      className={styles.tooltip}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      variants={tooltipVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.iconContainer}>
          {item.icon ? (
            <img src={item.icon} alt={item.name} className={styles.icon} />
          ) : (
            <span>?</span>
          )}
        </div>
        <div className={styles.titleSection}>
          <div className={`${styles.name} ${styles[item.rarity]}`}>
            {item.name}
          </div>
          <div className={styles.category}>{item.category}</div>
        </div>
      </div>

      {/* Description */}
      <p className={styles.description}>{item.description}</p>

      {/* Stats */}
      {hasStats && (
        <div className={styles.stats}>
          {Object.entries(item.stats!).map(([stat, value]) => (
            <div key={stat} className={styles.stat}>
              <span className={styles.statName}>{formatStatName(stat)}</span>
              <span
                className={`${styles.statValue} ${value < 0 ? styles.negative : ''}`}
              >
                {value > 0 ? '+' : ''}{value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Effect */}
      {item.effect && (
        <div className={styles.effect}>{item.effect}</div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        {quantity > 1 && (
          <span className={styles.quantity}>Qty: {quantity}</span>
        )}
        {item.category === 'consumable' && (
          <span className={styles.hint}>Double-click to use</span>
        )}
      </div>
    </motion.div>
  );
};

// Helper to format stat names
const formatStatName = (stat: string): string => {
  return stat
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};
