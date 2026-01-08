# Data Models

TypeScript type definitions for the map system.

## Table of Contents

1. [Discovery & States](#discovery--states)
2. [Map Hierarchy](#map-hierarchy)
3. [Paths & Connections](#paths--connections)
4. [Location Details](#location-details)
5. [Geometry](#geometry)
6. [Rumors](#rumors)
7. [Travel](#travel)
8. [Time & Events](#time--events)

---

## Discovery & States

```typescript
// src/types/map.ts

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
```

## Map Hierarchy

```typescript
export interface MapRegion {
  id: string;
  seed: number;
  name: string;
  bounds: Bounds;
  zones: MapZone[];
  generatedAt: number;
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
```

## Paths & Connections

```typescript
export interface PathConnection {
  targetLocationId: string;
  pathId: string;
  travelTime: number;           // In game minutes
  dangerModifier: number;       // Multiplier for encounter chance
  pathType: PathType;
  discoveryState: DiscoveryState;
}

export type PathType =
  | 'road'          // Safest, fastest
  | 'trail'         // Medium
  | 'wilderness'    // Slow, dangerous
  | 'hidden';       // Must be discovered

export interface Path {
  id: string;
  points: Vector2[];            // Bezier control points
  sourceId: string;
  targetId: string;
  pathType: PathType;
  discoveryState: DiscoveryState;
}
```

## Location Details

```typescript
export interface LocationData {
  description: string;
  npcs: string[];               // NPC IDs present
  availableServices: ServiceType[];
  lootTable: string;            // Reference to loot table
  encounterTable: string;       // Reference to encounter table
  specialFlags: LocationFlag[];
}

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
```

## Geometry

```typescript
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
```

## Rumors

```typescript
// src/types/rumor.ts

export interface Rumor {
  id: string;
  targetLocationId: string;

  // Display info (what player sees)
  vagueName: string;
  vagueDescription: string;
  vagueLocationType: LocationType;  // May be inaccurate

  // Source tracking
  source: RumorSource;
  sourceId: string;                 // NPC ID or item ID
  sourceDetail: string;             // "Merchant in Millbrook"
  acquiredAt: number;               // Game timestamp

  // Accuracy system
  reliability: number;              // 0.0 - 1.0
  distortion: RumorDistortion;
}

export type RumorSource =
  | 'npc_dialogue'
  | 'letter'
  | 'map_fragment'
  | 'signpost'
  | 'dying_words'
  | 'graffiti';

export interface RumorDistortion {
  nameAccurate: boolean;
  typeAccurate: boolean;
  positionOffset: Vector2;          // How far off the mark
  dangerAccurate: boolean;
  lootExaggeration: number;         // 1.0 = accurate, 2.0 = double
}

// Rumor reliability by source [min, max]
export const RUMOR_RELIABILITY: Record<RumorSource, [number, number]> = {
  'npc_dialogue': [0.5, 0.8],
  'letter': [0.7, 0.95],
  'map_fragment': [0.85, 1.0],
  'signpost': [0.9, 1.0],
  'dying_words': [0.3, 0.7],
  'graffiti': [0.2, 0.6],
};
```

## Travel

```typescript
// src/types/travel.ts

export interface TravelState {
  isActive: boolean;
  startedAt: number;              // Game timestamp

  // Route info
  route: TravelRoute;
  currentSegmentIndex: number;
  segmentProgress: number;        // 0.0 - 1.0

  // Calculated
  estimatedArrival: number;
  totalProgress: number;          // 0.0 - 1.0

  // Events
  pendingEvent: TravelEvent | null;
  encounterRollsRemaining: number;
}

export interface TravelRoute {
  segments: RouteSegment[];
  totalTime: number;
  totalDanger: number;
  startLocationId: string;
  endLocationId: string;
}

export interface RouteSegment {
  pathId: string;
  fromLocationId: string;
  toLocationId: string;
  duration: number;
  dangerLevel: number;
}

export interface TravelEvent {
  id: string;
  type: TravelEventType;
  triggeredAt: number;
  position: Vector2;
  data: TravelEventData;
  resolved: boolean;
  outcome?: TravelEventOutcome;
}

export type TravelEventType =
  | 'ambush'
  | 'discovery'
  | 'traveler'
  | 'weather'
  | 'shortcut'
  | 'caravan_intercept'
  | 'blocked_path'
  | 'wounded_npc';

export type TravelEventOutcome =
  | { type: 'continue' }
  | { type: 'delay'; amount: number }
  | { type: 'combat'; result: 'victory' | 'defeat' | 'flee' }
  | { type: 'trade'; completed: boolean }
  | { type: 'discovery'; locationId: string };
```

## Time & Events

```typescript
// src/types/time.ts

export interface GameTime {
  day: number;                    // Day of run (starts at 1)
  hour: number;                   // 0-23
  minute: number;                 // 0-59
  totalMinutes: number;           // Total since run start
}

export type TimeOfDay =
  | 'dawn'        // 5-7
  | 'morning'     // 7-12
  | 'afternoon'   // 12-17
  | 'dusk'        // 17-19
  | 'evening'     // 19-22
  | 'night';      // 22-5

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
  staticLocationId?: string;

  // State
  state: 'pending' | 'active' | 'completed' | 'failed';

  // Interaction
  isInterceptable: boolean;
  wasIntercepted: boolean;
  interceptWindow?: { start: number; end: number };

  // Rewards/Consequences
  rewards?: EventReward[];
  consequences?: EventConsequence[];
}

export type WorldEventType =
  | 'merchant_caravan'
  | 'bandit_raid'
  | 'festival'
  | 'beast_migration'
  | 'storm'
  | 'plague'
  | 'pilgrimage';

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
```
