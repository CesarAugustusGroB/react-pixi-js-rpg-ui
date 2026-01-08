// Time System Type Definitions

// ============================================
// GAME TIME
// ============================================

export interface GameTime {
  day: number;                    // Day of run (starts at 1)
  hour: number;                   // 0-23
  minute: number;                 // 0-59
  totalMinutes: number;           // Total minutes since run start
}

export type TimeOfDay =
  | 'dawn'        // 5-7
  | 'morning'     // 7-12
  | 'afternoon'   // 12-17
  | 'dusk'        // 17-19
  | 'evening'     // 19-22
  | 'night';      // 22-5

// ============================================
// WORLD EVENTS
// ============================================

export type WorldEventType =
  | 'merchant_caravan'
  | 'bandit_raid'
  | 'festival'
  | 'beast_migration'
  | 'storm'
  | 'plague'
  | 'pilgrimage';

export type WorldEventState =
  | 'pending'
  | 'active'
  | 'completed'
  | 'failed';

export interface EventReward {
  type: 'item' | 'gold' | 'rumor' | 'reputation';
  value: string | number;
  probability: number;
}

export interface EventConsequence {
  type: 'location_destroyed' | 'path_blocked' | 'npc_death' | 'danger_increase';
  targetId: string;
  duration?: number;
}

export interface WorldEvent {
  id: string;
  type: WorldEventType;

  // Timing
  startTime: number;
  duration: number;
  endTime: number;

  // Position/Movement
  isMoving: boolean;
  route?: string[];               // Location IDs for moving events
  currentLocationIndex?: number;
  staticLocationId?: string;      // For non-moving events

  // State
  state: WorldEventState;

  // Interaction
  isInterceptable: boolean;
  wasIntercepted: boolean;
  interceptWindow?: { start: number; end: number };

  // Rewards/Consequences
  rewards?: EventReward[];
  consequences?: EventConsequence[];
}

// ============================================
// TIME UTILITIES
// ============================================

export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 19) return 'dusk';
  if (hour >= 19 && hour < 22) return 'evening';
  return 'night';
}
