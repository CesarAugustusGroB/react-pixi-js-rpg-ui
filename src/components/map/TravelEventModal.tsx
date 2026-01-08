// TravelEventModal - Modal for resolving travel events
// Handles ambushes, discoveries, encounters, etc.

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TravelEvent } from '@/types/travel';
import { useMapStore } from '@stores/mapStore';
import { mapEvents } from '@integration/mapEvents';
import { panelVariants, backdropVariants } from '@utils/animations';
import styles from './TravelEventModal.module.css';

interface TravelEventModalProps {
  event: TravelEvent;
}

// Event type icons
const EVENT_ICONS: Record<string, string> = {
  ambush: '⚔️',
  discovery: '🔍',
  traveler: '👤',
  weather: '🌧️',
  shortcut: '🛤️',
  caravan_intercept: '🛒',
  blocked_path: '🚧',
  wounded_npc: '🩹',
};

// Event type titles
const EVENT_TITLES: Record<string, string> = {
  ambush: 'Ambush!',
  discovery: 'Discovery',
  traveler: 'Traveler Encounter',
  weather: 'Weather Change',
  shortcut: 'Shortcut Found',
  caravan_intercept: 'Caravan Spotted',
  blocked_path: 'Path Blocked',
  wounded_npc: 'Wounded Traveler',
};

// Event type descriptions
const getEventDescription = (event: TravelEvent): string => {
  switch (event.type) {
    case 'ambush':
      const enemies = event.data.enemies?.join(', ') || 'unknown enemies';
      return `You've been ambushed by ${enemies}! Prepare for battle.`;
    case 'discovery':
      return 'You\'ve discovered something interesting nearby. Investigate?';
    case 'traveler':
      const npcType = event.data.npcType || 'stranger';
      const disposition = event.data.disposition || 'neutral';
      return `A ${disposition} ${npcType} approaches you on the road.`;
    case 'weather':
      const weather = event.data.weatherType || 'storm';
      return `A ${weather} is rolling in. This may delay your journey.`;
    case 'shortcut':
      return 'You\'ve found a hidden path that could save travel time.';
    case 'caravan_intercept':
      return 'A merchant caravan is passing by. They might have goods to trade.';
    case 'blocked_path':
      return 'The path ahead is blocked. You\'ll need to find another way.';
    case 'wounded_npc':
      return 'You find a wounded traveler on the road. Will you help?';
    default:
      return 'Something happened during your journey.';
  }
};

// Get available actions for event type
const getEventActions = (event: TravelEvent): { id: string; label: string; variant: 'primary' | 'secondary' | 'danger' }[] => {
  switch (event.type) {
    case 'ambush':
      return [
        { id: 'fight', label: 'Fight!', variant: 'danger' },
        { id: 'flee', label: 'Attempt to Flee', variant: 'secondary' },
      ];
    case 'discovery':
      return [
        { id: 'investigate', label: 'Investigate', variant: 'primary' },
        { id: 'ignore', label: 'Continue Journey', variant: 'secondary' },
      ];
    case 'traveler':
      return [
        { id: 'talk', label: 'Talk to Them', variant: 'primary' },
        { id: 'ignore', label: 'Keep Walking', variant: 'secondary' },
      ];
    case 'weather':
      return [
        { id: 'wait', label: 'Wait it Out', variant: 'primary' },
        { id: 'continue', label: 'Push Through', variant: 'secondary' },
      ];
    case 'shortcut':
      return [
        { id: 'take', label: 'Take Shortcut', variant: 'primary' },
        { id: 'stay', label: 'Stay on Path', variant: 'secondary' },
      ];
    case 'caravan_intercept':
      return [
        { id: 'trade', label: 'Trade', variant: 'primary' },
        { id: 'pass', label: 'Pass By', variant: 'secondary' },
      ];
    case 'blocked_path':
      return [
        { id: 'clear', label: 'Clear the Way', variant: 'primary' },
        { id: 'detour', label: 'Find a Detour', variant: 'secondary' },
      ];
    case 'wounded_npc':
      return [
        { id: 'help', label: 'Help Them', variant: 'primary' },
        { id: 'ignore', label: 'Leave Them', variant: 'secondary' },
      ];
    default:
      return [{ id: 'continue', label: 'Continue', variant: 'primary' }];
  }
};

/**
 * Modal dialog for resolving events that occur during travel.
 * Provides action buttons based on event type.
 */
export const TravelEventModal: React.FC<TravelEventModalProps> = ({ event }) => {
  const resolveTravelEvent = useMapStore((state) => state.resolveTravelEvent);

  const handleAction = useCallback((actionId: string) => {
    // Emit event for PixiJS to handle
    mapEvents.emit('travel:eventResolved', { eventId: event.id, outcome: actionId });

    // Resolve in store based on action
    switch (actionId) {
      case 'fight':
        // Combat will be resolved separately by game system
        resolveTravelEvent({ type: 'combat', result: 'victory' });
        break;
      case 'flee':
        resolveTravelEvent({ type: 'combat', result: 'flee' });
        break;
      case 'investigate':
        if (event.data.revealedLocationId) {
          resolveTravelEvent({ type: 'discovery', locationId: event.data.revealedLocationId });
        } else {
          resolveTravelEvent({ type: 'continue' });
        }
        break;
      case 'trade':
        resolveTravelEvent({ type: 'trade', completed: true });
        break;
      case 'wait':
        resolveTravelEvent({ type: 'delay', amount: event.data.delayAmount || 15 });
        break;
      case 'clear':
      case 'detour':
        resolveTravelEvent({ type: 'delay', amount: event.data.delayAmount || 30 });
        break;
      default:
        resolveTravelEvent({ type: 'continue' });
    }
  }, [event, resolveTravelEvent]);

  const icon = EVENT_ICONS[event.type] || '❓';
  const title = EVENT_TITLES[event.type] || 'Event';
  const description = getEventDescription(event);
  const actions = getEventActions(event);

  return (
    <AnimatePresence>
      <motion.div
        className={styles.backdrop}
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      />

      <motion.div
        className={styles.modal}
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.icon}>{icon}</span>
          <h2 className={styles.title}>{title}</h2>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <p className={styles.description}>{description}</p>

          {/* Event details */}
          {event.data.enemies && (
            <div className={styles.detail}>
              <span className={styles.detailLabel}>Enemies:</span>
              <span className={styles.detailValue}>
                {event.data.enemies.join(', ')}
              </span>
            </div>
          )}

          {event.data.npcType && (
            <div className={styles.detail}>
              <span className={styles.detailLabel}>NPC Type:</span>
              <span className={styles.detailValue}>
                {event.data.npcType}
              </span>
            </div>
          )}

          {event.data.delayAmount && (
            <div className={styles.detail}>
              <span className={styles.detailLabel}>Delay:</span>
              <span className={styles.detailValue}>
                ~{event.data.delayAmount} minutes
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {actions.map((action) => (
            <button
              key={action.id}
              className={`${styles.actionButton} ${styles[action.variant]}`}
              onClick={() => handleAction(action.id)}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Decorative corners */}
        <div className={styles.cornerTL} />
        <div className={styles.cornerTR} />
        <div className={styles.cornerBL} />
        <div className={styles.cornerBR} />
      </motion.div>
    </AnimatePresence>
  );
};

export default TravelEventModal;
