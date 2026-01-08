// LocationTooltip - Hover tooltip for map locations
// Shows location name, type, discovery state, and available actions

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { MapLocation } from '@/types/map';
import { tooltipVariants } from '@utils/animations';
import styles from './LocationTooltip.module.css';

interface LocationTooltipProps {
  location: MapLocation;
  position: { x: number; y: number };
}

// Location type icons
const LOCATION_ICONS: Record<string, string> = {
  town: '🏘️',
  village: '🏠',
  dungeon: '⚔️',
  shrine: '⛩️',
  camp: '🏕️',
  ruins: '🏛️',
  cave: '🕳️',
  tower: '🗼',
  fortress: '🏰',
  crossroads: '🚏',
};

// Discovery state labels
const DISCOVERY_LABELS: Record<string, { label: string; color: string }> = {
  unknown: { label: 'Unknown', color: 'var(--text-muted)' },
  rumored: { label: 'Rumored', color: '#9E9E9E' },
  discovered: { label: 'Discovered', color: '#2196F3' },
  visited: { label: 'Visited', color: '#4CAF50' },
};

/**
 * Tooltip that appears when hovering over a location on the map.
 * Adjusts position to stay within viewport.
 */
export const LocationTooltip: React.FC<LocationTooltipProps> = ({
  location,
  position,
}) => {
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to keep tooltip on screen
  useEffect(() => {
    const tooltipWidth = 280;
    const tooltipHeight = 200;
    const padding = 16;

    let x = position.x + 20;
    let y = position.y - 10;

    // Adjust horizontal
    if (x + tooltipWidth > window.innerWidth - padding) {
      x = position.x - tooltipWidth - 20;
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

  const icon = LOCATION_ICONS[location.locationType] || '📍';
  const discovery = DISCOVERY_LABELS[location.discoveryState] || DISCOVERY_LABELS.unknown;

  // Get danger level display based on connected paths
  const getDangerDisplay = () => {
    // Get average danger from connected paths
    const avgDanger = location.connectedTo.length > 0
      ? location.connectedTo.reduce((sum, c) => sum + c.dangerModifier, 0) / location.connectedTo.length
      : 1;
    const danger = Math.round(avgDanger * 5); // Normalize to 1-10 scale
    if (danger <= 2) return { label: 'Safe', color: '#4CAF50' };
    if (danger <= 4) return { label: 'Caution', color: '#FFC107' };
    if (danger <= 6) return { label: 'Dangerous', color: '#FF9800' };
    if (danger <= 8) return { label: 'Very Dangerous', color: '#F44336' };
    return { label: 'Deadly', color: '#9C27B0' };
  };

  const danger = getDangerDisplay();

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
        <span className={styles.icon}>{icon}</span>
        <div className={styles.titleSection}>
          <div className={styles.name}>{location.name}</div>
          <div className={styles.type}>{location.locationType}</div>
        </div>
      </div>

      {/* Discovery state */}
      <div className={styles.discoveryBadge} style={{ borderColor: discovery.color }}>
        <span className={styles.discoveryDot} style={{ background: discovery.color }} />
        <span style={{ color: discovery.color }}>{discovery.label}</span>
      </div>

      {/* Description (if discovered) */}
      {location.discoveryState !== 'unknown' && location.actualData?.description && (
        <p className={styles.description}>{location.actualData.description}</p>
      )}

      {/* Rumor info (if rumored) */}
      {location.discoveryState === 'rumored' && location.rumor && (
        <div className={styles.rumor}>
          <span className={styles.rumorLabel}>Rumor:</span>
          <span className={styles.rumorText}>
            "{location.rumor.vagueDescription}"
          </span>
          <span className={styles.rumorSource}>
            — {location.rumor.sourceDetail}
          </span>
        </div>
      )}

      {/* Stats */}
      {location.discoveryState !== 'unknown' && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Danger</span>
            <span className={styles.statValue} style={{ color: danger.color }}>
              {danger.label}
            </span>
          </div>

          {location.connectedTo.length > 0 && (
            <div className={styles.stat}>
              <span className={styles.statLabel}>Connections</span>
              <span className={styles.statValue}>
                {location.connectedTo.length} path{location.connectedTo.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Actions hint */}
      <div className={styles.hint}>
        {location.discoveryState === 'visited' ? (
          <span>Click to travel here</span>
        ) : location.discoveryState === 'discovered' ? (
          <span>Click to explore</span>
        ) : location.discoveryState === 'rumored' ? (
          <span>Location may not be accurate</span>
        ) : (
          <span>Location unknown</span>
        )}
      </div>
    </motion.div>
  );
};

export default LocationTooltip;
