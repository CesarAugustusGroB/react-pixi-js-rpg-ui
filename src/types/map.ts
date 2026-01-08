// Map System Type Definitions

// ============================================
// DISCOVERY & STATES
// ============================================

export type DiscoveryState =
  | 'unknown'      // Not on map at all
  | 'rumored'      // Silhouette, vague info
  | 'discovered'   // Fully revealed
  | 'visited';     // Player has been here

export type BiomeType =
  | 'forest'
  | 'mountain'
  | 'plains'
  | 'swamp'
  | 'desert'
  | 'ruins'
  | 'underground';

export type LocationType =
  | 'town'
  | 'village'
  | 'ruins'
  | 'dungeon'
  | 'shrine'
  | 'camp'
  | 'landmark'
  | 'crossing'
  | 'cave'
  | 'tower';

export type ThreatType =
  | 'bandits'
  | 'beasts'
  | 'undead'
  | 'demons'
  | 'elementals'
  | 'none';

// ============================================
// GEOMETRY
// ============================================

export interface Vector2 {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================
// PATH TYPES
// ============================================

export type PathType =
  | 'road'          // Safest, fastest
  | 'trail'         // Medium
  | 'wilderness'    // Slow, dangerous
  | 'hidden';       // Must be discovered

export interface PathConnection {
  targetLocationId: string;
  pathId: string;
  travelTime: number;           // In game minutes
  dangerModifier: number;       // Multiplier for encounter chance
  pathType: PathType;
  discoveryState: DiscoveryState;
}

export interface Path {
  id: string;
  points: Vector2[];            // Bezier control points
  sourceId: string;
  targetId: string;
  pathType: PathType;
  discoveryState: DiscoveryState;
}

// ============================================
// LOCATION DETAILS
// ============================================

export type ServiceType =
  | 'rest'
  | 'trade'
  | 'heal'
  | 'quest'
  | 'craft'
  | 'storage';

export type LocationFlag =
  | 'safe_zone'       // No random encounters
  | 'respawn_point'   // Can set as spawn
  | 'boss_location'   // Contains boss
  | 'secret'          // Hidden entrance
  | 'one_time';       // Disappears after visit

export interface LocationData {
  description: string;
  npcs: string[];               // NPC IDs present
  availableServices: ServiceType[];
  lootTable: string;            // Reference to loot table
  encounterTable: string;       // Reference to encounter table
  specialFlags: LocationFlag[];
}

// ============================================
// MAP HIERARCHY
// ============================================

// Forward declaration for circular reference
import type { Rumor } from './rumor';

export interface MapLocation {
  id: string;
  zoneId: string;
  name: string;
  locationType: LocationType;
  position: Vector2;
  discoveryState: DiscoveryState;

  // Connections
  connectedTo: PathConnection[];

  // Rumor data (when state is 'rumored')
  rumor?: Rumor;

  // Actual data (revealed when 'discovered')
  actualData?: LocationData;

  // Interaction
  isInteractable: boolean;
  hasActiveEvent: boolean;
}

export interface MapZone {
  id: string;
  regionId: string;
  name: string;
  biome: BiomeType;
  bounds: Bounds;
  locations: MapLocation[];
  dangerLevel: number;           // 1-10
  discoveryState: DiscoveryState;
  adjacentZoneIds: string[];
  ambientThreat: ThreatType[];
}

export interface MapRegion {
  id: string;
  seed: number;
  name: string;
  bounds: Bounds;
  zones: MapZone[];
  generatedAt: number;
}
