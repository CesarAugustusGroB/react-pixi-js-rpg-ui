// NPC Entity Type Definitions
// Moving NPCs/caravans that traverse the map along paths

import type { Vector2 } from './map';

// ============================================
// NPC TYPES
// ============================================

export type NPCEntityType =
  | 'caravan'     // Trade routes, interactable for trading
  | 'patrol'      // Guard routes, loop continuously
  | 'traveler'    // One-way journeys between locations
  | 'beast';      // Wildlife movement, can be hostile

export type NPCBehavior =
  | 'patrol_loop'   // Returns to start after reaching end
  | 'patrol_bounce' // Goes back and forth
  | 'one_way'       // Despawns at destination
  | 'wander';       // Random movement between connected locations

export type NPCState =
  | 'idle'          // Waiting at a location
  | 'moving'        // Traveling along a path
  | 'paused'        // Temporarily stopped (e.g., at location)
  | 'interacting'   // Player is interacting
  | 'fleeing'       // Running from danger
  | 'despawned';    // Removed from map

// ============================================
// NPC ENTITY
// ============================================

export interface NPCEntity {
  id: string;
  type: NPCEntityType;
  name: string;

  // Visual
  spriteKey: string;           // Key for sprite asset
  tint?: number;               // Optional color tint
  scale?: number;              // Size multiplier

  // Route
  route: string[];             // Location IDs in order
  routePathIds: string[];      // Path IDs connecting route locations
  behavior: NPCBehavior;

  // Movement state
  state: NPCState;
  currentRouteIndex: number;   // Index in route array
  currentPathId: string | null;
  pathProgress: number;        // 0-1 on current path segment
  isReversing: boolean;        // For bounce behavior

  // Speed
  speed: number;               // Progress per game minute (0.01 = 100 min per path)
  baseSpeed: number;           // Original speed (can be modified)

  // Position (calculated from path progress)
  position: Vector2;
  direction: Vector2;          // Normalized facing direction

  // Timing
  pauseDuration: number;       // Minutes to pause at locations
  pauseRemaining: number;      // Minutes left in current pause
  spawnedAt: number;           // Game time when spawned
  despawnAt?: number;          // Game time to auto-despawn

  // Interaction
  isInteractable: boolean;
  interactionRadius: number;   // Distance for player interaction

  // Visual state
  isVisible: boolean;
  alpha: number;               // For fade in/out
}

// ============================================
// NPC SPAWN CONFIG
// ============================================

export interface NPCSpawnConfig {
  type: NPCEntityType;
  name: string;
  spriteKey: string;
  route: string[];
  behavior: NPCBehavior;
  speed: number;
  pauseDuration?: number;
  isInteractable?: boolean;
  interactionRadius?: number;
  tint?: number;
  scale?: number;
  despawnAfter?: number;       // Minutes until despawn
}

// ============================================
// NPC POSITION UPDATE
// ============================================

export interface NPCPositionUpdate {
  id: string;
  position: Vector2;
  direction: Vector2;
  pathProgress: number;
  state: NPCState;
}

// ============================================
// NPC INTERACTION RESULT
// ============================================

export interface NPCInteractionResult {
  success: boolean;
  npcId: string;
  interactionType: 'trade' | 'dialogue' | 'combat' | 'none';
  data?: Record<string, unknown>;
}
