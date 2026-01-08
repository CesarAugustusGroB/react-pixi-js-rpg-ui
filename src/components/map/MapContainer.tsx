// MapContainer - React wrapper for PixiJS map application
// Manages map lifecycle and integrates with React state

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useMapStore,
  selectIsMapOpen,
  selectHoveredLocationId,
  selectTravel,
  selectMapTime,
  selectTimeOfDay,
} from '@stores/mapStore';
import { useMapBridgeSync } from '@integration/useMapBridgeSync';
import { mapEvents, MapEvents } from '@integration/mapEvents';
import { panelVariants, backdropVariants } from '@utils/animations';
import { MapApplication } from '@/pixi/MapApplication';
import { LocationTooltip } from './LocationTooltip';
import { TravelEventModal } from './TravelEventModal';
import { TravelProgressBar } from './TravelProgressBar';
import styles from './MapContainer.module.css';

// ============================================
// TYPES
// ============================================

interface MapContainerProps {
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

/**
 * Main map container that wraps the PixiJS canvas and provides React UI overlays.
 * Handles keyboard shortcuts, tooltips, and modal dialogs.
 */
export const MapContainer: React.FC<MapContainerProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapAppRef = useRef<MapApplication | null>(null);
  const [isPixiReady, setIsPixiReady] = useState(false);

  // Store state
  const isOpen = useMapStore(selectIsMapOpen);
  const hoveredLocationId = useMapStore(selectHoveredLocationId);
  const travel = useMapStore(selectTravel);
  const gameTime = useMapStore(selectMapTime);
  const timeOfDay = useMapStore(selectTimeOfDay);
  const locations = useMapStore((state) => state.locations);
  const closeMap = useMapStore((state) => state.closeMap);
  const selectLocation = useMapStore((state) => state.selectLocation);
  const hoverLocation = useMapStore((state) => state.hoverLocation);

  // Initialize bridge sync
  useMapBridgeSync();

  // Tooltip state
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Initialize PixiJS application when map opens
  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!isOpen || !canvasElement || mapAppRef.current) return;

    const initPixi = async () => {
      const mapApp = new MapApplication({
        onLocationClick: (locationId) => {
          selectLocation(locationId);
          MapEvents.selectLocation(locationId);
        },
        onLocationHover: (locationId) => {
          hoverLocation(locationId);
          if (locationId && canvasElement) {
            const rect = canvasElement.getBoundingClientRect();
            // Position will be updated by the scene's worldToScreen conversion
            MapEvents.hoverLocation(locationId, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          } else {
            MapEvents.hoverLocation(null);
          }
        },
        onLocationRightClick: (locationId) => {
          // Could open context menu for travel options
          console.log('Right clicked location:', locationId);
        },
        onEventClick: (eventId) => {
          MapEvents.clickCaravan(eventId);
        },
        onEventHover: (eventId) => {
          if (eventId) {
            // Would need to get event data from store
            console.log('Hovering event:', eventId);
          } else {
            MapEvents.unhoverCaravan();
          }
        },
        onNPCClick: (npcId) => {
          console.log('Clicked NPC:', npcId);
        },
        onNPCHover: (npcId) => {
          console.log('Hovering NPC:', npcId);
        },
        onNPCRightClick: (npcId) => {
          console.log('Right clicked NPC:', npcId);
        },
        onEmptyClick: () => {
          MapEvents.deselectLocation();
        },
        onReady: () => {
          setIsPixiReady(true);
          mapEvents.emit('map:ready');
        },
        onDestroy: () => {
          setIsPixiReady(false);
        },
      });

      try {
        await mapApp.init(canvasElement);
        mapAppRef.current = mapApp;
      } catch (error) {
        console.error('Failed to initialize PixiJS map:', error);
      }
    };

    initPixi();

    return () => {
      if (mapAppRef.current) {
        mapAppRef.current.destroy();
        mapAppRef.current = null;
      }
    };
  }, [isOpen, selectLocation, hoverLocation]);

  // Get hovered location data
  const hoveredLocation = hoveredLocationId ? locations[hoveredLocationId] : null;

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Escape to close map
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMap();
      }

      // M to toggle map
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        closeMap();
      }
    },
    [isOpen, closeMap]
  );

  // Set up keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Listen for hover events from PixiJS to update tooltip position
  useEffect(() => {
    const unsubscribe = mapEvents.on('map:location:hover', ({ locationId, position }) => {
      if (locationId && position) {
        setTooltipPosition({ x: position.x, y: position.y });
      } else {
        setTooltipPosition(null);
      }
    });

    return unsubscribe;
  }, []);

  // Format time display
  const formatTime = useCallback(() => {
    const hour = gameTime.hour.toString().padStart(2, '0');
    const minute = gameTime.minute.toString().padStart(2, '0');
    return `Day ${gameTime.day} - ${hour}:${minute}`;
  }, [gameTime]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeMap}
          />

          {/* Main container */}
          <motion.div
            ref={containerRef}
            className={`${styles.container} ${className || ''}`}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.title}>World Map</div>
              <div className={styles.timeDisplay}>
                <span className={styles.timeIcon}>
                  {timeOfDay === 'night' || timeOfDay === 'evening' ? '🌙' : '☀️'}
                </span>
                <span className={styles.timeText}>{formatTime()}</span>
                <span className={styles.periodText}>({timeOfDay})</span>
              </div>
              <button className={styles.closeButton} onClick={closeMap}>
                ✕
              </button>
            </div>

            {/* Canvas container - PixiJS renders here */}
            <div ref={canvasRef} className={styles.canvasContainer} id="map-canvas">
              {/* PixiJS application will mount here, placeholder shows while loading */}
              {!isPixiReady && (
                <div className={styles.placeholder}>
                  <span>Map Loading...</span>
                </div>
              )}
            </div>

            {/* Travel progress bar */}
            {travel && travel.isActive && (
              <TravelProgressBar
                progress={travel.totalProgress}
                segmentIndex={travel.currentSegmentIndex}
                totalSegments={travel.route.segments.length}
                eta={travel.estimatedArrival - gameTime.totalMinutes}
              />
            )}

            {/* Footer controls */}
            <div className={styles.footer}>
              <div className={styles.controls}>
                <button
                  className={styles.controlButton}
                  onClick={() => mapEvents.emit('map:zoom', { level: 'region' })}
                >
                  Region
                </button>
                <button
                  className={styles.controlButton}
                  onClick={() => mapEvents.emit('map:zoom', { level: 'zone' })}
                >
                  Zone
                </button>
                <button
                  className={styles.controlButton}
                  onClick={() => mapEvents.emit('map:zoom', { level: 'local' })}
                >
                  Local
                </button>
              </div>
              <div className={styles.legend}>
                <span className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: '#4CAF50' }} />
                  Visited
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: '#2196F3' }} />
                  Discovered
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: '#9E9E9E' }} />
                  Rumored
                </span>
              </div>
              <div className={styles.hint}>
                Press <kbd>M</kbd> or <kbd>Esc</kbd> to close
              </div>
            </div>

            {/* Decorative corners */}
            <div className={styles.cornerTL} />
            <div className={styles.cornerTR} />
            <div className={styles.cornerBL} />
            <div className={styles.cornerBR} />
          </motion.div>

          {/* Location tooltip */}
          {hoveredLocation && tooltipPosition && (
            <LocationTooltip
              location={hoveredLocation}
              position={tooltipPosition}
            />
          )}

          {/* Travel event modal */}
          {travel?.pendingEvent && (
            <TravelEventModal event={travel.pendingEvent} />
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default MapContainer;
