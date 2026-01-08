# Travel Map System Architecture

> Real-time, rumor-driven roguelike travel map built with PixiJS

## Table of Contents

1. [Overview](#overview)
2. [Data Models](#data-models)
3. [State Management](#state-management)
4. [PixiJS Component Structure](#pixijs-component-structure)
5. [Procedural Generation](#procedural-generation)
6. [Travel System](#travel-system)
7. [Rumor System](#rumor-system)
8. [Time Systems](#time-systems)
9. [Event System](#event-system)
10. [Visual Design Specifications](#visual-design-specifications)
11. [Integration with Existing Architecture](#integration-with-existing-architecture)
12. [Implementation Phases](#implementation-phases)

---

## Overview

### Core Features

| Feature | Implementation |
|---------|----------------|
| Map Type | Full-screen travel map |
| Navigation | Node-locked paths |
| Discovery | Rumor-driven (NPCs, letters) |
| Travel | Real-time, committed (no cancellation) |
| Generation | Procedural per run |
| Death | Full reset |
| Style | Clean vector, modern |
| Zoom | Region → Zone → Local |

### Time Systems (Active)

1. **Day/Night Cycle** — Affects encounters, visibility, NPC availability
2. **Event Timeline** — Caravans move, raids trigger, festivals end

---

## Data Models

### Core Types

```typescript
// src/types/map.ts

// ============================================
// DISCOVERY & STATE
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

// ============================================
// MAP HIERARCHY
// ============================================

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

// ============================================
// LOCATION DETAILS
// ============================================

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

export interface Path {
  id: string;
  points: Vector2[];            // Bezier control points
  sourceId: string;
  targetId: string;
  pathType: PathType;
  discoveryState: DiscoveryState;
}
```

### Rumor Types

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
  lootExaggeration: number;         // 1.0 = accurate, 2.0 = double expected
}

// Rumor reliability by source
export const RUMOR_RELIABILITY: Record<RumorSource, [number, number]> = {
  'npc_dialogue': [0.5, 0.8],       // Variable, depends on NPC
  'letter': [0.7, 0.95],            // Generally reliable
  'map_fragment': [0.85, 1.0],      // Very reliable
  'signpost': [0.9, 1.0],           // Accurate but may be old
  'dying_words': [0.3, 0.7],        // Dramatic but unreliable
  'graffiti': [0.2, 0.6],           // Often misleading
};
```

### Travel Types

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
  position: Vector2;              // Where on map it triggered
  
  // Event-specific data
  data: TravelEventData;
  
  // Resolution
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

export interface TravelEventData {
  // Ambush
  enemies?: string[];
  ambushDifficulty?: number;
  
  // Discovery
  revealedLocationId?: string;
  
  // Traveler
  npcType?: string;
  disposition?: 'friendly' | 'neutral' | 'hostile';
  
  // Weather
  weatherType?: WeatherType;
  delayAmount?: number;
  
  // Caravan
  caravanId?: string;
  tradeGoods?: string[];
}

export type TravelEventOutcome = 
  | { type: 'continue' }
  | { type: 'delay'; amount: number }
  | { type: 'combat'; result: 'victory' | 'defeat' | 'flee' }
  | { type: 'trade'; completed: boolean }
  | { type: 'discovery'; locationId: string };
```

### Time & Events

```typescript
// src/types/time.ts

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

---

## State Management

### Map Store

```typescript
// src/stores/mapStore.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
  MapRegion, 
  MapZone, 
  MapLocation, 
  Path,
  TravelState,
  GameTime,
  WorldEvent,
  Rumor,
  DiscoveryState,
  Vector2
} from '@/types';

// ============================================
// STATE INTERFACE
// ============================================

interface MapState {
  // Core map data
  region: MapRegion | null;
  zones: Record<string, MapZone>;
  locations: Record<string, MapLocation>;
  paths: Record<string, Path>;
  
  // Player position
  currentLocationId: string | null;
  
  // Travel
  travel: TravelState | null;
  
  // Time
  gameTime: GameTime;
  timeSpeed: number;              // Multiplier (1 = normal, 0 = paused)
  
  // World events
  activeEvents: WorldEvent[];
  eventHistory: WorldEvent[];
  
  // Rumors
  rumors: Record<string, Rumor>;
  
  // View state
  currentZoom: ZoomLevel;
  viewCenter: Vector2;
  selectedLocationId: string | null;
  hoveredLocationId: string | null;
  
  // UI state
  isMapOpen: boolean;
  showEventLog: boolean;
  showLegend: boolean;
}

type ZoomLevel = 'region' | 'zone' | 'local';

// ============================================
// ACTIONS INTERFACE
// ============================================

interface MapActions {
  // Initialization
  initializeMap: (seed: number) => void;
  resetMap: () => void;
  
  // Discovery
  addRumor: (rumor: Rumor) => void;
  discoverLocation: (locationId: string) => void;
  visitLocation: (locationId: string) => void;
  revealPath: (pathId: string) => void;
  
  // Travel
  startTravel: (destinationId: string) => void;
  updateTravel: (deltaMs: number) => void;
  resolveTravelEvent: (outcome: TravelEventOutcome) => void;
  
  // Time
  advanceTime: (minutes: number) => void;
  setTimeSpeed: (speed: number) => void;
  
  // Events
  spawnEvent: (event: WorldEvent) => void;
  updateEvents: (deltaMs: number) => void;
  interceptEvent: (eventId: string) => void;
  
  // View
  setZoom: (level: ZoomLevel) => void;
  panTo: (position: Vector2) => void;
  selectLocation: (locationId: string | null) => void;
  hoverLocation: (locationId: string | null) => void;
  
  // UI
  openMap: () => void;
  closeMap: () => void;
  toggleEventLog: () => void;
}

// ============================================
// STORE CREATION
// ============================================

const initialState: MapState = {
  region: null,
  zones: {},
  locations: {},
  paths: {},
  currentLocationId: null,
  travel: null,
  gameTime: { day: 1, hour: 8, minute: 0, totalMinutes: 480 },
  timeSpeed: 1,
  activeEvents: [],
  eventHistory: [],
  rumors: {},
  currentZoom: 'zone',
  viewCenter: { x: 0, y: 0 },
  selectedLocationId: null,
  hoveredLocationId: null,
  isMapOpen: false,
  showEventLog: false,
  showLegend: false,
};

export const useMapStore = create<MapState & MapActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ========================================
    // INITIALIZATION
    // ========================================
    
    initializeMap: (seed: number) => {
      const generated = generateRegion(seed);
      set({
        region: generated.region,
        zones: generated.zones,
        locations: generated.locations,
        paths: generated.paths,
        currentLocationId: generated.startingLocationId,
      });
    },

    resetMap: () => {
      set(initialState);
    },

    // ========================================
    // DISCOVERY
    // ========================================

    addRumor: (rumor: Rumor) => {
      const { rumors, locations } = get();
      
      // Update location to 'rumored' state
      const location = locations[rumor.targetLocationId];
      if (location && location.discoveryState === 'unknown') {
        set({
          rumors: { ...rumors, [rumor.id]: rumor },
          locations: {
            ...locations,
            [rumor.targetLocationId]: {
              ...location,
              discoveryState: 'rumored',
              rumor,
            },
          },
        });
      }
    },

    discoverLocation: (locationId: string) => {
      const { locations } = get();
      const location = locations[locationId];
      
      if (location && location.discoveryState !== 'visited') {
        set({
          locations: {
            ...locations,
            [locationId]: {
              ...location,
              discoveryState: 'discovered',
            },
          },
        });
      }
    },

    visitLocation: (locationId: string) => {
      const { locations, paths } = get();
      const location = locations[locationId];
      
      if (location) {
        // Mark location as visited
        const updatedLocations = {
          ...locations,
          [locationId]: {
            ...location,
            discoveryState: 'visited' as DiscoveryState,
          },
        };
        
        // Reveal connected paths
        const updatedPaths = { ...paths };
        location.connectedTo.forEach(conn => {
          if (updatedPaths[conn.pathId]) {
            updatedPaths[conn.pathId] = {
              ...updatedPaths[conn.pathId],
              discoveryState: 'discovered',
            };
          }
        });
        
        set({
          locations: updatedLocations,
          paths: updatedPaths,
          currentLocationId: locationId,
        });
      }
    },

    revealPath: (pathId: string) => {
      const { paths } = get();
      const path = paths[pathId];
      
      if (path) {
        set({
          paths: {
            ...paths,
            [pathId]: { ...path, discoveryState: 'discovered' },
          },
        });
      }
    },

    // ========================================
    // TRAVEL
    // ========================================

    startTravel: (destinationId: string) => {
      const { currentLocationId, locations, paths, gameTime } = get();
      if (!currentLocationId || get().travel?.isActive) return;
      
      const route = findRoute(currentLocationId, destinationId, locations, paths);
      if (!route) return;
      
      const travel: TravelState = {
        isActive: true,
        startedAt: gameTime.totalMinutes,
        route,
        currentSegmentIndex: 0,
        segmentProgress: 0,
        estimatedArrival: gameTime.totalMinutes + route.totalTime,
        totalProgress: 0,
        pendingEvent: null,
        encounterRollsRemaining: Math.ceil(route.totalTime / 30), // Roll every 30 min
      };
      
      set({ travel });
      
      // Emit event for PixiJS
      emitMapEvent('travel:start', { route, travel });
    },

    updateTravel: (deltaMs: number) => {
      const { travel, gameTime, timeSpeed } = get();
      if (!travel?.isActive || travel.pendingEvent) return;
      
      const gameMinutes = (deltaMs / 1000 / 60) * timeSpeed * 10; // 10x game speed
      const newTotalMinutes = gameTime.totalMinutes + gameMinutes;
      
      // Update progress
      const elapsed = newTotalMinutes - travel.startedAt;
      const totalProgress = Math.min(1, elapsed / travel.route.totalTime);
      
      // Calculate current segment
      let accumulatedTime = 0;
      let segmentIndex = 0;
      let segmentProgress = 0;
      
      for (let i = 0; i < travel.route.segments.length; i++) {
        const segmentDuration = travel.route.segments[i].duration;
        if (accumulatedTime + segmentDuration >= elapsed) {
          segmentIndex = i;
          segmentProgress = (elapsed - accumulatedTime) / segmentDuration;
          break;
        }
        accumulatedTime += segmentDuration;
      }
      
      // Check for travel events
      const shouldRollEvent = 
        travel.encounterRollsRemaining > 0 &&
        totalProgress > (1 - travel.encounterRollsRemaining * 0.1);
      
      let pendingEvent = null;
      let encounterRollsRemaining = travel.encounterRollsRemaining;
      
      if (shouldRollEvent) {
        pendingEvent = rollTravelEvent(travel, get());
        encounterRollsRemaining--;
      }
      
      // Check for arrival
      if (totalProgress >= 1) {
        const destination = travel.route.endLocationId;
        get().visitLocation(destination);
        set({ travel: null });
        emitMapEvent('travel:complete', { destinationId: destination });
        return;
      }
      
      // Update time
      get().advanceTime(gameMinutes);
      
      set({
        travel: {
          ...travel,
          currentSegmentIndex: segmentIndex,
          segmentProgress,
          totalProgress,
          pendingEvent,
          encounterRollsRemaining,
        },
      });
      
      // Emit position update for animation
      const currentPos = calculateTravelPosition(travel, segmentIndex, segmentProgress, get());
      emitMapEvent('travel:position', { position: currentPos, progress: totalProgress });
    },

    resolveTravelEvent: (outcome: TravelEventOutcome) => {
      const { travel } = get();
      if (!travel?.pendingEvent) return;
      
      switch (outcome.type) {
        case 'continue':
          set({ travel: { ...travel, pendingEvent: null } });
          break;
          
        case 'delay':
          set({
            travel: {
              ...travel,
              pendingEvent: null,
              estimatedArrival: travel.estimatedArrival + outcome.amount,
              route: {
                ...travel.route,
                totalTime: travel.route.totalTime + outcome.amount,
              },
            },
          });
          break;
          
        case 'combat':
          if (outcome.result === 'defeat') {
            // Handle death - full reset triggered elsewhere
            emitMapEvent('travel:death', { event: travel.pendingEvent });
          }
          set({ travel: { ...travel, pendingEvent: null } });
          break;
          
        case 'discovery':
          get().discoverLocation(outcome.locationId);
          set({ travel: { ...travel, pendingEvent: null } });
          break;
      }
    },

    // ========================================
    // TIME
    // ========================================

    advanceTime: (minutes: number) => {
      const { gameTime } = get();
      const newTotalMinutes = gameTime.totalMinutes + minutes;
      const newDay = Math.floor(newTotalMinutes / 1440) + 1;
      const dayMinutes = newTotalMinutes % 1440;
      const newHour = Math.floor(dayMinutes / 60);
      const newMinute = Math.floor(dayMinutes % 60);
      
      set({
        gameTime: {
          day: newDay,
          hour: newHour,
          minute: newMinute,
          totalMinutes: newTotalMinutes,
        },
      });
      
      // Update world events
      get().updateEvents(minutes * 60 * 1000); // Convert to ms
    },

    setTimeSpeed: (speed: number) => {
      set({ timeSpeed: speed });
    },

    // ========================================
    // WORLD EVENTS
    // ========================================

    spawnEvent: (event: WorldEvent) => {
      const { activeEvents } = get();
      set({ activeEvents: [...activeEvents, event] });
      emitMapEvent('event:spawn', { event });
    },

    updateEvents: (deltaMs: number) => {
      const { activeEvents, eventHistory, gameTime, locations, paths } = get();
      const updatedEvents: WorldEvent[] = [];
      const completedEvents: WorldEvent[] = [];
      
      for (const event of activeEvents) {
        // Check if event has ended
        if (gameTime.totalMinutes >= event.endTime) {
          completedEvents.push({ ...event, state: 'completed' });
          continue;
        }
        
        // Update moving events
        if (event.isMoving && event.route) {
          const progress = (gameTime.totalMinutes - event.startTime) / event.duration;
          const routeIndex = Math.floor(progress * event.route.length);
          
          if (routeIndex !== event.currentLocationIndex) {
            const updatedEvent = {
              ...event,
              currentLocationIndex: routeIndex,
            };
            updatedEvents.push(updatedEvent);
            emitMapEvent('event:move', { event: updatedEvent });
          } else {
            updatedEvents.push(event);
          }
        } else {
          updatedEvents.push(event);
        }
      }
      
      set({
        activeEvents: updatedEvents,
        eventHistory: [...eventHistory, ...completedEvents],
      });
    },

    interceptEvent: (eventId: string) => {
      const { activeEvents, gameTime, currentLocationId } = get();
      const event = activeEvents.find(e => e.id === eventId);
      
      if (!event || !event.isInterceptable) return;
      if (event.wasIntercepted) return;
      
      // Check if in intercept window
      if (event.interceptWindow) {
        const { start, end } = event.interceptWindow;
        if (gameTime.totalMinutes < start || gameTime.totalMinutes > end) return;
      }
      
      // Check if at correct location
      const eventLocationId = event.isMoving 
        ? event.route?.[event.currentLocationIndex ?? 0]
        : event.staticLocationId;
      
      if (eventLocationId !== currentLocationId) return;
      
      set({
        activeEvents: activeEvents.map(e =>
          e.id === eventId ? { ...e, wasIntercepted: true } : e
        ),
      });
      
      emitMapEvent('event:intercept', { event });
    },

    // ========================================
    // VIEW CONTROLS
    // ========================================

    setZoom: (level: ZoomLevel) => {
      set({ currentZoom: level });
      emitMapEvent('view:zoom', { level });
    },

    panTo: (position: Vector2) => {
      set({ viewCenter: position });
      emitMapEvent('view:pan', { position });
    },

    selectLocation: (locationId: string | null) => {
      set({ selectedLocationId: locationId });
    },

    hoverLocation: (locationId: string | null) => {
      set({ hoveredLocationId: locationId });
    },

    // ========================================
    // UI TOGGLES
    // ========================================

    openMap: () => {
      set({ isMapOpen: true });
      emitMapEvent('map:open', {});
    },

    closeMap: () => {
      set({ isMapOpen: false });
      emitMapEvent('map:close', {});
    },

    toggleEventLog: () => {
      set(state => ({ showEventLog: !state.showEventLog }));
    },
  }))
);

// ============================================
// SELECTORS
// ============================================

export const selectCurrentLocation = (state: MapState) => 
  state.currentLocationId ? state.locations[state.currentLocationId] : null;

export const selectDiscoveredLocations = (state: MapState) =>
  Object.values(state.locations).filter(l => 
    l.discoveryState === 'discovered' || l.discoveryState === 'visited'
  );

export const selectRumoredLocations = (state: MapState) =>
  Object.values(state.locations).filter(l => l.discoveryState === 'rumored');

export const selectVisiblePaths = (state: MapState) =>
  Object.values(state.paths).filter(p => p.discoveryState !== 'unknown');

export const selectTimeOfDay = (state: MapState): TimeOfDay => {
  const hour = state.gameTime.hour;
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 19) return 'dusk';
  if (hour >= 19 && hour < 22) return 'evening';
  return 'night';
};

export const selectTravelProgress = (state: MapState) =>
  state.travel ? {
    isActive: state.travel.isActive,
    progress: state.travel.totalProgress,
    eta: state.travel.estimatedArrival - state.gameTime.totalMinutes,
    hasPendingEvent: !!state.travel.pendingEvent,
  } : null;

export const selectActiveCaravans = (state: MapState) =>
  state.activeEvents.filter(e => e.type === 'merchant_caravan');

export const selectActiveThreats = (state: MapState) =>
  state.activeEvents.filter(e => 
    e.type === 'bandit_raid' || e.type === 'beast_migration'
  );

// ============================================
// NON-REACT ACCESSORS
// ============================================

export const getMapState = () => useMapStore.getState();
export const subscribeToMapStore = useMapStore.subscribe;

// ============================================
// HELPER FUNCTIONS (implement separately)
// ============================================

declare function generateRegion(seed: number): {
  region: MapRegion;
  zones: Record<string, MapZone>;
  locations: Record<string, MapLocation>;
  paths: Record<string, Path>;
  startingLocationId: string;
};

declare function findRoute(
  fromId: string,
  toId: string,
  locations: Record<string, MapLocation>,
  paths: Record<string, Path>
): TravelRoute | null;

declare function rollTravelEvent(
  travel: TravelState,
  state: MapState
): TravelEvent | null;

declare function calculateTravelPosition(
  travel: TravelState,
  segmentIndex: number,
  segmentProgress: number,
  state: MapState
): Vector2;

declare function emitMapEvent(type: string, data: unknown): void;
```

---

## PixiJS Component Structure

### Directory Layout

```
src/pixi/
├── MapApplication.ts           # Main PIXI.Application wrapper
├── MapScene.ts                 # Scene orchestrator
│
├── layers/
│   ├── BackgroundLayer.ts      # Terrain, biome colors
│   ├── PathLayer.ts            # Roads, trails, connections
│   ├── LocationLayer.ts        # Location nodes
│   ├── EventLayer.ts           # Caravans, raids, weather
│   ├── PlayerLayer.ts          # Player icon, travel animation
│   ├── FogLayer.ts             # Undiscovered area overlay
│   └── UILayer.ts              # Tooltips, selection highlights
│
├── objects/
│   ├── LocationNode.ts         # Individual location sprite
│   ├── PathLine.ts             # Bezier path renderer
│   ├── PlayerMarker.ts         # Player position indicator
│   ├── EventMarker.ts          # World event indicators
│   ├── RumorSilhouette.ts      # Mysterious undiscovered marker
│   └── CaravanSprite.ts        # Moving caravan
│
├── systems/
│   ├── ZoomController.ts       # Zoom level management
│   ├── PanController.ts        # Camera panning
│   ├── TravelAnimator.ts       # Player movement animation
│   ├── TimeVisualizer.ts       # Day/night lighting
│   └── EventScheduler.ts       # World event spawning
│
├── generators/
│   ├── RegionGenerator.ts      # Procedural region creation
│   ├── ZoneGenerator.ts        # Zone content generation
│   ├── PathGenerator.ts        # Road network creation
│   └── NameGenerator.ts        # Location/NPC names
│
├── renderers/
│   ├── VectorRenderer.ts       # Clean vector graphics
│   ├── IconRenderer.ts         # Location type icons
│   └── EffectRenderer.ts       # Particles, glows
│
└── utils/
    ├── geometry.ts             # Vector math, bezier curves
    ├── colors.ts               # Color palette constants
    └── easing.ts               # Animation easing functions
```

### Core Classes

#### MapApplication.ts

```typescript
// src/pixi/MapApplication.ts

import * as PIXI from 'pixi.js';
import { MapScene } from './MapScene';
import { subscribeToMapStore, getMapState } from '@/stores/mapStore';

export class MapApplication {
  private app: PIXI.Application;
  private scene: MapScene;
  private unsubscribe: (() => void) | null = null;
  
  constructor(container: HTMLElement) {
    this.app = new PIXI.Application();
    this.scene = new MapScene(this.app);
  }
  
  async initialize(): Promise<void> {
    await this.app.init({
      background: '#1a1a2e',
      resizeTo: window,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    
    document.getElementById('map-container')?.appendChild(this.app.canvas);
    
    await this.scene.initialize();
    this.app.stage.addChild(this.scene.container);
    
    // Subscribe to store changes
    this.unsubscribe = subscribeToMapStore(
      (state) => state,
      (state) => this.scene.update(state),
      { fireImmediately: true }
    );
    
    // Start render loop
    this.app.ticker.add(this.tick.bind(this));
  }
  
  private tick(ticker: PIXI.Ticker): void {
    const deltaMs = ticker.deltaMS;
    this.scene.tick(deltaMs);
    
    // Update travel if active
    const { travel } = getMapState();
    if (travel?.isActive && !travel.pendingEvent) {
      getMapState().updateTravel(deltaMs);
    }
  }
  
  destroy(): void {
    this.unsubscribe?.();
    this.scene.destroy();
    this.app.destroy(true);
  }
}
```

#### MapScene.ts

```typescript
// src/pixi/MapScene.ts

import * as PIXI from 'pixi.js';
import { BackgroundLayer } from './layers/BackgroundLayer';
import { PathLayer } from './layers/PathLayer';
import { LocationLayer } from './layers/LocationLayer';
import { EventLayer } from './layers/EventLayer';
import { PlayerLayer } from './layers/PlayerLayer';
import { FogLayer } from './layers/FogLayer';
import { UILayer } from './layers/UILayer';
import { ZoomController } from './systems/ZoomController';
import { PanController } from './systems/PanController';
import { TimeVisualizer } from './systems/TimeVisualizer';
import type { MapState } from '@/stores/mapStore';

export class MapScene {
  public container: PIXI.Container;
  
  // Layers (render order)
  private backgroundLayer: BackgroundLayer;
  private fogLayer: FogLayer;
  private pathLayer: PathLayer;
  private locationLayer: LocationLayer;
  private eventLayer: EventLayer;
  private playerLayer: PlayerLayer;
  private uiLayer: UILayer;
  
  // Systems
  private zoomController: ZoomController;
  private panController: PanController;
  private timeVisualizer: TimeVisualizer;
  
  // Internal state
  private worldContainer: PIXI.Container;
  
  constructor(private app: PIXI.Application) {
    this.container = new PIXI.Container();
    this.worldContainer = new PIXI.Container();
    
    // Initialize layers
    this.backgroundLayer = new BackgroundLayer();
    this.fogLayer = new FogLayer();
    this.pathLayer = new PathLayer();
    this.locationLayer = new LocationLayer();
    this.eventLayer = new EventLayer();
    this.playerLayer = new PlayerLayer();
    this.uiLayer = new UILayer();
    
    // Initialize systems
    this.zoomController = new ZoomController(this.worldContainer);
    this.panController = new PanController(this.worldContainer, app);
    this.timeVisualizer = new TimeVisualizer();
  }
  
  async initialize(): Promise<void> {
    // Add layers to world container (order matters)
    this.worldContainer.addChild(this.backgroundLayer.container);
    this.worldContainer.addChild(this.fogLayer.container);
    this.worldContainer.addChild(this.pathLayer.container);
    this.worldContainer.addChild(this.locationLayer.container);
    this.worldContainer.addChild(this.eventLayer.container);
    this.worldContainer.addChild(this.playerLayer.container);
    
    // UI layer is screen-space, not world-space
    this.container.addChild(this.worldContainer);
    this.container.addChild(this.uiLayer.container);
    
    // Initialize all layers
    await Promise.all([
      this.backgroundLayer.initialize(),
      this.fogLayer.initialize(),
      this.pathLayer.initialize(),
      this.locationLayer.initialize(),
      this.eventLayer.initialize(),
      this.playerLayer.initialize(),
      this.uiLayer.initialize(),
    ]);
    
    // Setup input handlers
    this.setupInteraction();
  }
  
  private setupInteraction(): void {
    // Enable interactivity on location nodes
    this.locationLayer.onLocationClick = (locationId: string) => {
      const state = getMapState();
      if (state.currentLocationId && !state.travel?.isActive) {
        // Check if clickable (discovered + connected)
        const canTravel = this.canTravelTo(locationId, state);
        if (canTravel) {
          state.startTravel(locationId);
        }
      }
      state.selectLocation(locationId);
    };
    
    this.locationLayer.onLocationHover = (locationId: string | null) => {
      getMapState().hoverLocation(locationId);
    };
  }
  
  private canTravelTo(targetId: string, state: MapState): boolean {
    const current = state.locations[state.currentLocationId!];
    if (!current) return false;
    
    const isConnected = current.connectedTo.some(
      c => c.targetLocationId === targetId
    );
    
    const target = state.locations[targetId];
    const isDiscovered = target && 
      (target.discoveryState === 'discovered' || 
       target.discoveryState === 'rumored' ||
       target.discoveryState === 'visited');
    
    return isConnected && isDiscovered;
  }
  
  update(state: MapState): void {
    // Update all layers with new state
    this.backgroundLayer.update(state);
    this.fogLayer.update(state);
    this.pathLayer.update(state);
    this.locationLayer.update(state);
    this.eventLayer.update(state);
    this.playerLayer.update(state);
    this.uiLayer.update(state);
    
    // Update time-based visuals
    this.timeVisualizer.update(state.gameTime);
    this.applyTimeOfDayLighting(state);
  }
  
  tick(deltaMs: number): void {
    // Animate layers
    this.playerLayer.tick(deltaMs);
    this.eventLayer.tick(deltaMs);
    this.uiLayer.tick(deltaMs);
    
    // Update systems
    this.panController.tick(deltaMs);
  }
  
  private applyTimeOfDayLighting(state: MapState): void {
    const lighting = this.timeVisualizer.getLighting();
    
    // Apply color filter to world
    this.worldContainer.tint = lighting.tint;
    
    // Update fog opacity based on time
    this.fogLayer.setNightMode(lighting.isNight);
  }
  
  destroy(): void {
    this.backgroundLayer.destroy();
    this.fogLayer.destroy();
    this.pathLayer.destroy();
    this.locationLayer.destroy();
    this.eventLayer.destroy();
    this.playerLayer.destroy();
    this.uiLayer.destroy();
  }
}
```

#### LocationNode.ts

```typescript
// src/pixi/objects/LocationNode.ts

import * as PIXI from 'pixi.js';
import type { MapLocation, DiscoveryState, LocationType } from '@/types';
import { COLORS, SIZES } from '../utils/colors';

export class LocationNode {
  public container: PIXI.Container;
  public locationId: string;
  
  private background: PIXI.Graphics;
  private icon: PIXI.Graphics;
  private glow: PIXI.Graphics;
  private label: PIXI.Text;
  private silhouette: PIXI.Graphics;
  
  private state: DiscoveryState = 'unknown';
  private isSelected: boolean = false;
  private isHovered: boolean = false;
  private pulsePhase: number = 0;
  
  constructor(location: MapLocation) {
    this.locationId = location.id;
    this.container = new PIXI.Container();
    this.container.position.set(location.position.x, location.position.y);
    
    // Create visual elements
    this.glow = this.createGlow();
    this.background = this.createBackground();
    this.icon = this.createIcon(location.locationType);
    this.silhouette = this.createSilhouette();
    this.label = this.createLabel(location.name);
    
    // Layer order
    this.container.addChild(this.glow);
    this.container.addChild(this.silhouette);
    this.container.addChild(this.background);
    this.container.addChild(this.icon);
    this.container.addChild(this.label);
    
    // Interactivity
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';
    this.container.hitArea = new PIXI.Circle(0, 0, SIZES.nodeRadius * 1.5);
    
    this.updateVisuals(location.discoveryState);
  }
  
  private createGlow(): PIXI.Graphics {
    const glow = new PIXI.Graphics();
    glow.circle(0, 0, SIZES.nodeRadius * 2);
    glow.fill({ color: COLORS.accent, alpha: 0 });
    return glow;
  }
  
  private createBackground(): PIXI.Graphics {
    const bg = new PIXI.Graphics();
    bg.circle(0, 0, SIZES.nodeRadius);
    bg.fill(COLORS.discovered);
    bg.stroke({ color: COLORS.border, width: 2 });
    return bg;
  }
  
  private createIcon(type: LocationType): PIXI.Graphics {
    const icon = new PIXI.Graphics();
    // Draw icon based on location type
    this.drawLocationIcon(icon, type);
    return icon;
  }
  
  private createSilhouette(): PIXI.Graphics {
    const silhouette = new PIXI.Graphics();
    silhouette.circle(0, 0, SIZES.nodeRadius);
    silhouette.fill({ color: COLORS.rumored, alpha: 0.5 });
    
    // Question mark
    silhouette.circle(0, -4, 3);
    silhouette.fill(COLORS.rumoredText);
    silhouette.rect(-2, 2, 4, 8);
    silhouette.fill(COLORS.rumoredText);
    silhouette.circle(0, 14, 2);
    silhouette.fill(COLORS.rumoredText);
    
    silhouette.visible = false;
    return silhouette;
  }
  
  private createLabel(name: string): PIXI.Text {
    const label = new PIXI.Text({
      text: name,
      style: {
        fontFamily: 'Inter, sans-serif',
        fontSize: 12,
        fill: COLORS.text,
        align: 'center',
      },
    });
    label.anchor.set(0.5, 0);
    label.position.y = SIZES.nodeRadius + 8;
    return label;
  }
  
  private drawLocationIcon(graphics: PIXI.Graphics, type: LocationType): void {
    graphics.clear();
    const s = SIZES.iconSize;
    
    switch (type) {
      case 'town':
        // Building shape
        graphics.moveTo(-s, s);
        graphics.lineTo(-s, -s/2);
        graphics.lineTo(0, -s);
        graphics.lineTo(s, -s/2);
        graphics.lineTo(s, s);
        graphics.closePath();
        graphics.fill(COLORS.iconFill);
        break;
        
      case 'village':
        // Small house
        graphics.rect(-s/2, 0, s, s);
        graphics.fill(COLORS.iconFill);
        graphics.moveTo(-s/2, 0);
        graphics.lineTo(0, -s/2);
        graphics.lineTo(s/2, 0);
        graphics.fill(COLORS.iconFill);
        break;
        
      case 'ruins':
        // Broken columns
        graphics.rect(-s, -s, s/2, s*2);
        graphics.fill(COLORS.iconFill);
        graphics.rect(s/2, -s/2, s/2, s*1.5);
        graphics.fill(COLORS.iconFill);
        break;
        
      case 'dungeon':
        // Skull-ish shape
        graphics.circle(0, -s/4, s/2);
        graphics.fill(COLORS.danger);
        graphics.rect(-s/3, s/4, s/6, s/2);
        graphics.fill(COLORS.danger);
        graphics.rect(s/6, s/4, s/6, s/2);
        graphics.fill(COLORS.danger);
        break;
        
      case 'camp':
        // Tent
        graphics.moveTo(-s, s);
        graphics.lineTo(0, -s);
        graphics.lineTo(s, s);
        graphics.closePath();
        graphics.fill(COLORS.iconFill);
        break;
        
      default:
        // Generic diamond
        graphics.moveTo(0, -s);
        graphics.lineTo(s, 0);
        graphics.lineTo(0, s);
        graphics.lineTo(-s, 0);
        graphics.closePath();
        graphics.fill(COLORS.iconFill);
    }
  }
  
  updateVisuals(discoveryState: DiscoveryState): void {
    this.state = discoveryState;
    
    switch (discoveryState) {
      case 'unknown':
        this.container.visible = false;
        break;
        
      case 'rumored':
        this.container.visible = true;
        this.background.visible = false;
        this.icon.visible = false;
        this.silhouette.visible = true;
        this.label.alpha = 0.5;
        this.label.text = '???';
        break;
        
      case 'discovered':
        this.container.visible = true;
        this.background.visible = true;
        this.icon.visible = true;
        this.silhouette.visible = false;
        this.label.alpha = 1;
        break;
        
      case 'visited':
        this.container.visible = true;
        this.background.visible = true;
        this.icon.visible = true;
        this.silhouette.visible = false;
        this.label.alpha = 1;
        // Add visited indicator
        this.background.tint = COLORS.visited;
        break;
    }
  }
  
  setSelected(selected: boolean): void {
    this.isSelected = selected;
    this.glow.alpha = selected ? 0.5 : 0;
  }
  
  setHovered(hovered: boolean): void {
    this.isHovered = hovered;
    this.container.scale.set(hovered ? 1.1 : 1);
  }
  
  tick(deltaMs: number): void {
    // Pulse animation for rumored locations
    if (this.state === 'rumored') {
      this.pulsePhase += deltaMs * 0.002;
      const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8;
      this.silhouette.alpha = pulse * 0.5;
    }
    
    // Glow animation for selected
    if (this.isSelected) {
      this.pulsePhase += deltaMs * 0.003;
      const glowPulse = Math.sin(this.pulsePhase) * 0.2 + 0.5;
      this.glow.alpha = glowPulse;
    }
  }
  
  destroy(): void {
    this.container.destroy({ children: true });
  }
}
```

---

## Procedural Generation

### Region Generator

```typescript
// src/pixi/generators/RegionGenerator.ts

import { 
  MapRegion, 
  MapZone, 
  MapLocation, 
  Path,
  BiomeType,
  LocationType,
  DiscoveryState 
} from '@/types';
import { SeededRandom } from './SeededRandom';
import { ZoneGenerator } from './ZoneGenerator';
import { PathGenerator } from './PathGenerator';
import { NameGenerator } from './NameGenerator';

interface GenerationResult {
  region: MapRegion;
  zones: Record<string, MapZone>;
  locations: Record<string, MapLocation>;
  paths: Record<string, Path>;
  startingLocationId: string;
}

interface GenerationConfig {
  zoneCount: { min: number; max: number };
  locationsPerZone: { min: number; max: number };
  regionSize: { width: number; height: number };
  startingZoneSafety: number;
}

const DEFAULT_CONFIG: GenerationConfig = {
  zoneCount: { min: 5, max: 7 },
  locationsPerZone: { min: 4, max: 8 },
  regionSize: { width: 2000, height: 2000 },
  startingZoneSafety: 0, // Danger level 0 = safe
};

export class RegionGenerator {
  private rng: SeededRandom;
  private zoneGen: ZoneGenerator;
  private pathGen: PathGenerator;
  private nameGen: NameGenerator;
  private config: GenerationConfig;
  
  constructor(seed: number, config: Partial<GenerationConfig> = {}) {
    this.rng = new SeededRandom(seed);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.zoneGen = new ZoneGenerator(this.rng);
    this.pathGen = new PathGenerator(this.rng);
    this.nameGen = new NameGenerator(this.rng);
  }
  
  generate(): GenerationResult {
    const regionId = this.rng.id('region');
    const regionName = this.nameGen.regionName();
    
    // Step 1: Generate zone layout
    const zoneCount = this.rng.intBetween(
      this.config.zoneCount.min,
      this.config.zoneCount.max
    );
    
    const zoneLayout = this.generateZoneLayout(zoneCount);
    
    // Step 2: Create zones with locations
    const zones: Record<string, MapZone> = {};
    const locations: Record<string, MapLocation> = {};
    const paths: Record<string, Path> = {};
    let startingLocationId = '';
    
    zoneLayout.forEach((layout, index) => {
      const isStartingZone = index === 0;
      const zone = this.zoneGen.generate({
        regionId,
        bounds: layout.bounds,
        biome: layout.biome,
        dangerLevel: isStartingZone ? 0 : index + 1,
        locationCount: this.rng.intBetween(
          this.config.locationsPerZone.min,
          this.config.locationsPerZone.max
        ),
        isStarting: isStartingZone,
      });
      
      zones[zone.id] = zone;
      
      // Store locations
      zone.locations.forEach(loc => {
        locations[loc.id] = loc;
        
        // Mark starting location
        if (isStartingZone && loc.locationType === 'village') {
          startingLocationId = loc.id;
          loc.discoveryState = 'visited';
        }
      });
      
      // Generate internal paths within zone
      const zonePaths = this.pathGen.generateZonePaths(zone);
      zonePaths.forEach(p => {
        paths[p.id] = p;
        
        // Update location connections
        const source = locations[p.sourceId];
        const target = locations[p.targetId];
        if (source && target) {
          source.connectedTo.push({
            targetLocationId: target.id,
            pathId: p.id,
            travelTime: this.calculateTravelTime(p),
            dangerModifier: zone.dangerLevel / 5,
            pathType: p.pathType,
            discoveryState: isStartingZone ? 'discovered' : 'unknown',
          });
          target.connectedTo.push({
            targetLocationId: source.id,
            pathId: p.id,
            travelTime: this.calculateTravelTime(p),
            dangerModifier: zone.dangerLevel / 5,
            pathType: p.pathType,
            discoveryState: isStartingZone ? 'discovered' : 'unknown',
          });
        }
      });
    });
    
    // Step 3: Connect zones
    const zoneConnections = this.generateZoneConnections(Object.values(zones));
    zoneConnections.forEach(conn => {
      const crossPaths = this.pathGen.generateCrossZonePath(
        zones[conn.from],
        zones[conn.to],
        locations
      );
      crossPaths.forEach(p => {
        paths[p.id] = p;
      });
    });
    
    // Step 4: Set adjacency
    Object.values(zones).forEach(zone => {
      zone.adjacentZoneIds = zoneConnections
        .filter(c => c.from === zone.id || c.to === zone.id)
        .map(c => c.from === zone.id ? c.to : c.from);
    });
    
    // Step 5: Set discovery states (only starting zone visible)
    Object.values(zones).forEach((zone, index) => {
      if (index === 0) {
        zone.discoveryState = 'visited';
        zone.locations.forEach(loc => {
          if (locations[loc.id].discoveryState !== 'visited') {
            locations[loc.id].discoveryState = 'discovered';
          }
        });
      } else {
        zone.discoveryState = 'unknown';
      }
    });
    
    const region: MapRegion = {
      id: regionId,
      seed: this.rng.seed,
      name: regionName,
      bounds: {
        x: 0,
        y: 0,
        width: this.config.regionSize.width,
        height: this.config.regionSize.height,
      },
      zones: Object.values(zones),
      generatedAt: Date.now(),
    };
    
    return {
      region,
      zones,
      locations,
      paths,
      startingLocationId,
    };
  }
  
  private generateZoneLayout(count: number): ZoneLayoutData[] {
    const layouts: ZoneLayoutData[] = [];
    const { width, height } = this.config.regionSize;
    
    // Use voronoi-like distribution
    const points = this.generateDistributedPoints(count, width, height);
    
    // Assign biomes based on position
    const biomes: BiomeType[] = [
      'plains',    // Starting zone always plains
      'forest',
      'mountain',
      'swamp',
      'ruins',
      'desert',
      'underground',
    ];
    
    points.forEach((point, index) => {
      const zoneWidth = width / Math.ceil(Math.sqrt(count));
      const zoneHeight = height / Math.ceil(Math.sqrt(count));
      
      layouts.push({
        bounds: {
          x: point.x - zoneWidth / 2,
          y: point.y - zoneHeight / 2,
          width: zoneWidth,
          height: zoneHeight,
        },
        biome: biomes[index % biomes.length],
        center: point,
      });
    });
    
    return layouts;
  }
  
  private generateDistributedPoints(
    count: number,
    width: number,
    height: number
  ): Vector2[] {
    const points: Vector2[] = [];
    const padding = 100;
    
    // First point near center-bottom (starting area)
    points.push({
      x: width / 2 + this.rng.floatBetween(-100, 100),
      y: height * 0.7 + this.rng.floatBetween(-50, 50),
    });
    
    // Rest distributed via poisson-like sampling
    for (let i = 1; i < count; i++) {
      let bestPoint = { x: 0, y: 0 };
      let bestDistance = 0;
      
      // Try multiple candidates, pick most distant from existing
      for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = {
          x: this.rng.floatBetween(padding, width - padding),
          y: this.rng.floatBetween(padding, height - padding),
        };
        
        const minDist = Math.min(
          ...points.map(p => 
            Math.hypot(p.x - candidate.x, p.y - candidate.y)
          )
        );
        
        if (minDist > bestDistance) {
          bestDistance = minDist;
          bestPoint = candidate;
        }
      }
      
      points.push(bestPoint);
    }
    
    return points;
  }
  
  private generateZoneConnections(
    zones: MapZone[]
  ): Array<{ from: string; to: string }> {
    const connections: Array<{ from: string; to: string }> = [];
    
    // Minimum spanning tree for guaranteed connectivity
    const connected = new Set<string>([zones[0].id]);
    const remaining = new Set(zones.slice(1).map(z => z.id));
    
    while (remaining.size > 0) {
      let bestEdge: { from: string; to: string; dist: number } | null = null;
      
      for (const connectedId of connected) {
        for (const remainingId of remaining) {
          const fromZone = zones.find(z => z.id === connectedId)!;
          const toZone = zones.find(z => z.id === remainingId)!;
          
          const dist = this.zoneDistance(fromZone, toZone);
          
          if (!bestEdge || dist < bestEdge.dist) {
            bestEdge = { from: connectedId, to: remainingId, dist };
          }
        }
      }
      
      if (bestEdge) {
        connections.push({ from: bestEdge.from, to: bestEdge.to });
        connected.add(bestEdge.to);
        remaining.delete(bestEdge.to);
      }
    }
    
    // Add some extra connections for variety (20% chance per pair)
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 2; j < zones.length; j++) {
        if (this.rng.float() < 0.2) {
          const exists = connections.some(
            c => (c.from === zones[i].id && c.to === zones[j].id) ||
                 (c.from === zones[j].id && c.to === zones[i].id)
          );
          if (!exists) {
            connections.push({ from: zones[i].id, to: zones[j].id });
          }
        }
      }
    }
    
    return connections;
  }
  
  private zoneDistance(a: MapZone, b: MapZone): number {
    const ax = a.bounds.x + a.bounds.width / 2;
    const ay = a.bounds.y + a.bounds.height / 2;
    const bx = b.bounds.x + b.bounds.width / 2;
    const by = b.bounds.y + b.bounds.height / 2;
    return Math.hypot(ax - bx, ay - by);
  }
  
  private calculateTravelTime(path: Path): number {
    // Base time on path length
    let length = 0;
    for (let i = 1; i < path.points.length; i++) {
      length += Math.hypot(
        path.points[i].x - path.points[i-1].x,
        path.points[i].y - path.points[i-1].y
      );
    }
    
    // Modify by path type
    const speedMod: Record<PathType, number> = {
      'road': 1.0,
      'trail': 1.5,
      'wilderness': 2.5,
      'hidden': 2.0,
    };
    
    return Math.ceil((length / 50) * speedMod[path.pathType]); // Minutes
  }
}

interface ZoneLayoutData {
  bounds: Bounds;
  biome: BiomeType;
  center: Vector2;
}
```

### Seeded Random

```typescript
// src/pixi/generators/SeededRandom.ts

export class SeededRandom {
  public seed: number;
  private state: number;
  
  constructor(seed: number) {
    this.seed = seed;
    this.state = seed;
  }
  
  // Mulberry32 PRNG
  private next(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  
  float(): number {
    return this.next();
  }
  
  floatBetween(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  
  int(max: number): number {
    return Math.floor(this.next() * max);
  }
  
  intBetween(min: number, max: number): number {
    return Math.floor(this.floatBetween(min, max + 1));
  }
  
  pick<T>(array: T[]): T {
    return array[this.int(array.length)];
  }
  
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  
  id(prefix: string): string {
    return `${prefix}_${this.int(0xFFFFFF).toString(16).padStart(6, '0')}`;
  }
  
  weighted<T>(items: Array<{ value: T; weight: number }>): T {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let roll = this.float() * total;
    
    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) return item.value;
    }
    
    return items[items.length - 1].value;
  }
}
```

---

## Travel System

### Pathfinding

```typescript
// src/systems/Pathfinding.ts

import type { MapLocation, Path, TravelRoute, RouteSegment } from '@/types';

export function findRoute(
  fromId: string,
  toId: string,
  locations: Record<string, MapLocation>,
  paths: Record<string, Path>
): TravelRoute | null {
  // A* pathfinding on location graph
  const start = locations[fromId];
  const goal = locations[toId];
  
  if (!start || !goal) return null;
  
  // Only traverse discovered/rumored paths
  const isTraversable = (pathId: string): boolean => {
    const path = paths[pathId];
    return path && path.discoveryState !== 'unknown';
  };
  
  // A* implementation
  const openSet = new Set<string>([fromId]);
  const cameFrom = new Map<string, { locationId: string; pathId: string }>();
  
  const gScore = new Map<string, number>();
  gScore.set(fromId, 0);
  
  const fScore = new Map<string, number>();
  fScore.set(fromId, heuristic(start, goal));
  
  while (openSet.size > 0) {
    // Get node with lowest fScore
    let current: string | null = null;
    let lowestF = Infinity;
    
    for (const id of openSet) {
      const f = fScore.get(id) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = id;
      }
    }
    
    if (!current) break;
    
    if (current === toId) {
      // Reconstruct path
      return reconstructRoute(current, cameFrom, locations, paths);
    }
    
    openSet.delete(current);
    const currentLoc = locations[current];
    
    for (const connection of currentLoc.connectedTo) {
      if (!isTraversable(connection.pathId)) continue;
      
      const neighbor = connection.targetLocationId;
      const neighborLoc = locations[neighbor];
      if (!neighborLoc) continue;
      
      // Can only travel to discovered/rumored locations
      if (neighborLoc.discoveryState === 'unknown') continue;
      
      const tentativeG = (gScore.get(current) ?? Infinity) + connection.travelTime;
      
      if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
        cameFrom.set(neighbor, { locationId: current, pathId: connection.pathId });
        gScore.set(neighbor, tentativeG);
        fScore.set(neighbor, tentativeG + heuristic(neighborLoc, goal));
        openSet.add(neighbor);
      }
    }
  }
  
  return null; // No path found
}

function heuristic(a: MapLocation, b: MapLocation): number {
  return Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y) / 50;
}

function reconstructRoute(
  goalId: string,
  cameFrom: Map<string, { locationId: string; pathId: string }>,
  locations: Record<string, MapLocation>,
  paths: Record<string, Path>
): TravelRoute {
  const segments: RouteSegment[] = [];
  let current = goalId;
  
  while (cameFrom.has(current)) {
    const { locationId: prev, pathId } = cameFrom.get(current)!;
    const path = paths[pathId];
    const prevLoc = locations[prev];
    
    const connection = prevLoc.connectedTo.find(c => c.pathId === pathId);
    
    segments.unshift({
      pathId,
      fromLocationId: prev,
      toLocationId: current,
      duration: connection?.travelTime ?? 30,
      dangerLevel: connection?.dangerModifier ?? 1,
    });
    
    current = prev;
  }
  
  const totalTime = segments.reduce((sum, s) => sum + s.duration, 0);
  const totalDanger = segments.reduce((sum, s) => sum + s.dangerLevel, 0) / segments.length;
  
  return {
    segments,
    totalTime,
    totalDanger,
    startLocationId: segments[0]?.fromLocationId ?? goalId,
    endLocationId: goalId,
  };
}
```

### Travel Event Roller

```typescript
// src/systems/TravelEventRoller.ts

import type { TravelState, TravelEvent, MapState } from '@/types';
import { SeededRandom } from '@/pixi/generators/SeededRandom';

const EVENT_WEIGHTS = {
  safe: [
    { type: 'traveler', weight: 40 },
    { type: 'discovery', weight: 20 },
    { type: 'weather', weight: 30 },
    { type: 'shortcut', weight: 10 },
  ],
  moderate: [
    { type: 'ambush', weight: 30 },
    { type: 'traveler', weight: 25 },
    { type: 'discovery', weight: 15 },
    { type: 'weather', weight: 20 },
    { type: 'blocked_path', weight: 10 },
  ],
  dangerous: [
    { type: 'ambush', weight: 50 },
    { type: 'traveler', weight: 10 },
    { type: 'weather', weight: 15 },
    { type: 'blocked_path', weight: 15 },
    { type: 'wounded_npc', weight: 10 },
  ],
};

export function rollTravelEvent(
  travel: TravelState,
  state: MapState
): TravelEvent | null {
  const currentSegment = travel.route.segments[travel.currentSegmentIndex];
  if (!currentSegment) return null;
  
  const rng = new SeededRandom(state.gameTime.totalMinutes);
  
  // Base chance modified by danger level
  const dangerLevel = currentSegment.dangerLevel;
  const baseChance = 0.1 + (dangerLevel * 0.1); // 10% base + 10% per danger level
  
  // Time of day modifier
  const timeOfDay = getTimeOfDay(state.gameTime.hour);
  const timeModifier = timeOfDay === 'night' ? 1.5 : 1.0;
  
  const finalChance = baseChance * timeModifier;
  
  if (rng.float() > finalChance) {
    return null; // No event
  }
  
  // Select event type based on danger
  const weights = dangerLevel < 3 
    ? EVENT_WEIGHTS.safe 
    : dangerLevel < 6 
      ? EVENT_WEIGHTS.moderate 
      : EVENT_WEIGHTS.dangerous;
  
  const eventType = rng.weighted(weights);
  
  // Generate event data
  const eventData = generateEventData(eventType, travel, state, rng);
  
  return {
    id: rng.id('evt'),
    type: eventType,
    triggeredAt: state.gameTime.totalMinutes,
    position: calculateEventPosition(travel, state),
    data: eventData,
    resolved: false,
  };
}

function generateEventData(
  type: string,
  travel: TravelState,
  state: MapState,
  rng: SeededRandom
): TravelEventData {
  switch (type) {
    case 'ambush':
      return {
        enemies: generateEnemies(travel.route.totalDanger, rng),
        ambushDifficulty: Math.ceil(travel.route.totalDanger * rng.floatBetween(0.8, 1.2)),
      };
      
    case 'discovery':
      // Find nearest unknown location
      const nearbyUnknown = findNearbyUnknownLocation(
        calculateEventPosition(travel, state),
        state.locations
      );
      return {
        revealedLocationId: nearbyUnknown?.id,
      };
      
    case 'traveler':
      return {
        npcType: rng.pick(['merchant', 'pilgrim', 'soldier', 'refugee', 'bandit_scout']),
        disposition: rng.weighted([
          { value: 'friendly', weight: 50 },
          { value: 'neutral', weight: 35 },
          { value: 'hostile', weight: 15 },
        ]),
      };
      
    case 'weather':
      return {
        weatherType: rng.pick(['rain', 'storm', 'fog', 'wind']),
        delayAmount: rng.intBetween(10, 45),
      };
      
    case 'caravan_intercept':
      const nearbyCaravan = state.activeEvents.find(
        e => e.type === 'merchant_caravan' && !e.wasIntercepted
      );
      return {
        caravanId: nearbyCaravan?.id,
        tradeGoods: nearbyCaravan ? generateTradeGoods(rng) : [],
      };
      
    default:
      return {};
  }
}

function generateEnemies(dangerLevel: number, rng: SeededRandom): string[] {
  const count = Math.max(1, Math.floor(dangerLevel / 2) + rng.intBetween(-1, 1));
  const enemyTypes = ['bandit', 'wolf', 'skeleton', 'goblin', 'brigand'];
  
  return Array(count).fill(null).map(() => rng.pick(enemyTypes));
}

function findNearbyUnknownLocation(
  position: Vector2,
  locations: Record<string, MapLocation>
): MapLocation | null {
  const unknowns = Object.values(locations).filter(
    l => l.discoveryState === 'unknown'
  );
  
  if (unknowns.length === 0) return null;
  
  // Find closest
  return unknowns.reduce((closest, loc) => {
    const dist = Math.hypot(loc.position.x - position.x, loc.position.y - position.y);
    const closestDist = Math.hypot(
      closest.position.x - position.x, 
      closest.position.y - position.y
    );
    return dist < closestDist ? loc : closest;
  });
}

function calculateEventPosition(travel: TravelState, state: MapState): Vector2 {
  const segment = travel.route.segments[travel.currentSegmentIndex];
  const from = state.locations[segment.fromLocationId];
  const to = state.locations[segment.toLocationId];
  
  const t = travel.segmentProgress;
  return {
    x: from.position.x + (to.position.x - from.position.x) * t,
    y: from.position.y + (to.position.y - from.position.y) * t,
  };
}

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 19) return 'dusk';
  if (hour >= 19 && hour < 22) return 'evening';
  return 'night';
}

function generateTradeGoods(rng: SeededRandom): string[] {
  const goods = ['potion', 'weapon', 'armor', 'food', 'map_fragment', 'rare_material'];
  const count = rng.intBetween(2, 5);
  return rng.shuffle(goods).slice(0, count);
}
```

---

## Rumor System

### Rumor Generator

```typescript
// src/systems/RumorGenerator.ts

import type { Rumor, RumorSource, MapLocation, Vector2 } from '@/types';
import { SeededRandom } from '@/pixi/generators/SeededRandom';
import { RUMOR_RELIABILITY } from '@/types/rumor';

interface RumorContext {
  sourceType: RumorSource;
  sourceId: string;
  sourceDetail: string;
  nearLocation?: Vector2;
}

export class RumorGenerator {
  private rng: SeededRandom;
  
  constructor(seed: number) {
    this.rng = new SeededRandom(seed);
  }
  
  generateRumor(
    targetLocation: MapLocation,
    context: RumorContext
  ): Rumor {
    const [minReliability, maxReliability] = RUMOR_RELIABILITY[context.sourceType];
    const reliability = this.rng.floatBetween(minReliability, maxReliability);
    
    // Generate distortions based on reliability
    const distortion = this.generateDistortion(reliability, targetLocation);
    
    // Generate vague descriptions
    const vagueInfo = this.generateVagueInfo(targetLocation, distortion);
    
    return {
      id: this.rng.id('rumor'),
      targetLocationId: targetLocation.id,
      vagueName: vagueInfo.name,
      vagueDescription: vagueInfo.description,
      vagueLocationType: vagueInfo.type,
      source: context.sourceType,
      sourceId: context.sourceId,
      sourceDetail: context.sourceDetail,
      acquiredAt: Date.now(),
      reliability,
      distortion,
    };
  }
  
  private generateDistortion(
    reliability: number,
    location: MapLocation
  ): RumorDistortion {
    // Higher reliability = less distortion
    const inaccuracyChance = 1 - reliability;
    
    return {
      nameAccurate: this.rng.float() > inaccuracyChance * 0.3,
      typeAccurate: this.rng.float() > inaccuracyChance * 0.5,
      positionOffset: {
        x: this.rng.floatBetween(-50, 50) * inaccuracyChance,
        y: this.rng.floatBetween(-50, 50) * inaccuracyChance,
      },
      dangerAccurate: this.rng.float() > inaccuracyChance * 0.4,
      lootExaggeration: 1 + (this.rng.floatBetween(-0.5, 1.0) * inaccuracyChance),
    };
  }
  
  private generateVagueInfo(
    location: MapLocation,
    distortion: RumorDistortion
  ): { name: string; description: string; type: LocationType } {
    // Name generation
    const nameTemplates = {
      accurate: [
        `The ${location.name}`,
        `A place called ${location.name}`,
        location.name,
      ],
      vague: [
        'An old structure',
        'A forgotten place',
        'Somewhere to the north',
        'A hidden location',
        'Ancient grounds',
        'A mysterious site',
      ],
    };
    
    const name = distortion.nameAccurate
      ? this.rng.pick(nameTemplates.accurate)
      : this.rng.pick(nameTemplates.vague);
    
    // Type (may be wrong)
    const type = distortion.typeAccurate
      ? location.locationType
      : this.rng.pick(['ruins', 'camp', 'shrine', 'cave', 'tower']);
    
    // Description generation
    const descriptions = this.generateDescriptions(type, distortion);
    const description = this.rng.pick(descriptions);
    
    return { name, description, type };
  }
  
  private generateDescriptions(
    type: LocationType,
    distortion: RumorDistortion
  ): string[] {
    const base: Record<LocationType, string[]> = {
      town: [
        'A settlement with walls and trade.',
        'People gather there, or so I hear.',
        'They say it has an inn.',
      ],
      village: [
        'A small community of folk.',
        'Farmers and simple people.',
        'Quiet place, nothing much.',
      ],
      ruins: [
        'Old stones from before the fall.',
        'Crumbling walls, best avoided.',
        'Something ancient sleeps there.',
      ],
      dungeon: [
        'Dark tunnels, not for the faint.',
        'Treasure and death in equal measure.',
        'Few return from its depths.',
      ],
      shrine: [
        'A holy place, maybe still blessed.',
        'Old gods were worshipped there.',
        'Pilgrims once visited.',
      ],
      camp: [
        'Someone set up there recently.',
        'Might be friendly, might not.',
        'Temporary shelter, at best.',
      ],
      landmark: [
        'Hard to miss if you look.',
        'A notable feature of the land.',
        'Travelers use it to find their way.',
      ],
      crossing: [
        'Where paths meet.',
        'A junction of roads.',
        'Multiple routes converge.',
      ],
      cave: [
        'A hole in the earth.',
        'Dark and damp inside.',
        'Something lives there, probably.',
      ],
      tower: [
        'Reaches toward the sky.',
        'Can be seen from afar.',
        'Who built it? Who knows.',
      ],
    };
    
    // Add exaggeration for unreliable rumors
    if (distortion.lootExaggeration > 1.3) {
      return [
        ...base[type],
        'Supposedly filled with treasure!',
        'They say riches beyond measure...',
        'Worth the risk, definitely.',
      ];
    }
    
    return base[type];
  }
}

// Usage example:
// const rumorGen = new RumorGenerator(Date.now());
// const rumor = rumorGen.generateRumor(unknownLocation, {
//   sourceType: 'npc_dialogue',
//   sourceId: 'npc_merchant_01',
//   sourceDetail: 'The merchant in Millbrook',
// });
```

---

## Time Systems

### Day/Night Cycle

```typescript
// src/pixi/systems/TimeVisualizer.ts

import type { GameTime, TimeOfDay } from '@/types';

interface LightingState {
  tint: number;
  ambientAlpha: number;
  isNight: boolean;
  shadowLength: number;
  shadowAngle: number;
}

const TIME_COLORS: Record<TimeOfDay, number> = {
  dawn: 0xFFE4C4,      // Warm orange-pink
  morning: 0xFFFFF0,   // Bright white-yellow
  afternoon: 0xFFFAF0, // Warm white
  dusk: 0xFFB347,      // Orange
  evening: 0x6B5B95,   // Purple-blue
  night: 0x2C3E50,     // Dark blue
};

const AMBIENT_ALPHA: Record<TimeOfDay, number> = {
  dawn: 0.15,
  morning: 0,
  afternoon: 0.05,
  dusk: 0.2,
  evening: 0.35,
  night: 0.5,
};

export class TimeVisualizer {
  private currentLighting: LightingState;
  private targetLighting: LightingState;
  private transitionProgress: number = 1;
  
  constructor() {
    this.currentLighting = this.calculateLighting({ hour: 12, minute: 0 });
    this.targetLighting = this.currentLighting;
  }
  
  update(time: GameTime): void {
    const newLighting = this.calculateLighting(time);
    
    // Check if time of day changed
    if (newLighting.tint !== this.targetLighting.tint) {
      this.targetLighting = newLighting;
      this.transitionProgress = 0;
    }
    
    // Smooth transition
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + 0.01);
      this.currentLighting = this.lerpLighting(
        this.currentLighting,
        this.targetLighting,
        this.transitionProgress
      );
    }
  }
  
  private calculateLighting(time: { hour: number; minute: number }): LightingState {
    const timeOfDay = this.getTimeOfDay(time.hour);
    
    // Calculate shadow based on sun position
    const sunAngle = ((time.hour - 6) / 12) * Math.PI; // 6am = 0, 6pm = PI
    const shadowLength = Math.abs(Math.cos(sunAngle)) * 50 + 10;
    const shadowAngle = sunAngle + Math.PI / 2;
    
    return {
      tint: TIME_COLORS[timeOfDay],
      ambientAlpha: AMBIENT_ALPHA[timeOfDay],
      isNight: timeOfDay === 'night' || timeOfDay === 'evening',
      shadowLength,
      shadowAngle,
    };
  }
  
  private getTimeOfDay(hour: number): TimeOfDay {
    if (hour >= 5 && hour < 7) return 'dawn';
    if (hour >= 7 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 19) return 'dusk';
    if (hour >= 19 && hour < 22) return 'evening';
    return 'night';
  }
  
  private lerpLighting(from: LightingState, to: LightingState, t: number): LightingState {
    return {
      tint: this.lerpColor(from.tint, to.tint, t),
      ambientAlpha: from.ambientAlpha + (to.ambientAlpha - from.ambientAlpha) * t,
      isNight: t > 0.5 ? to.isNight : from.isNight,
      shadowLength: from.shadowLength + (to.shadowLength - from.shadowLength) * t,
      shadowAngle: from.shadowAngle + (to.shadowAngle - from.shadowAngle) * t,
    };
  }
  
  private lerpColor(from: number, to: number, t: number): number {
    const fromR = (from >> 16) & 0xFF;
    const fromG = (from >> 8) & 0xFF;
    const fromB = from & 0xFF;
    
    const toR = (to >> 16) & 0xFF;
    const toG = (to >> 8) & 0xFF;
    const toB = to & 0xFF;
    
    const r = Math.round(fromR + (toR - fromR) * t);
    const g = Math.round(fromG + (toG - fromG) * t);
    const b = Math.round(fromB + (toB - fromB) * t);
    
    return (r << 16) | (g << 8) | b;
  }
  
  getLighting(): LightingState {
    return this.currentLighting;
  }
}
```

### World Event Scheduler

```typescript
// src/pixi/systems/EventScheduler.ts

import type { WorldEvent, WorldEventType, MapState, GameTime } from '@/types';
import { SeededRandom } from '@/pixi/generators/SeededRandom';

interface EventTemplate {
  type: WorldEventType;
  frequency: number;         // Average hours between spawns
  minDuration: number;       // Minutes
  maxDuration: number;
  requiresPath: boolean;     // Does it move along paths?
  dangerLevel: number;
  interceptable: boolean;
}

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    type: 'merchant_caravan',
    frequency: 8,
    minDuration: 120,
    maxDuration: 360,
    requiresPath: true,
    dangerLevel: 0,
    interceptable: true,
  },
  {
    type: 'bandit_raid',
    frequency: 12,
    minDuration: 60,
    maxDuration: 180,
    requiresPath: true,
    dangerLevel: 5,
    interceptable: true,
  },
  {
    type: 'festival',
    frequency: 48,
    minDuration: 480,
    maxDuration: 1440,
    requiresPath: false,
    dangerLevel: 0,
    interceptable: false,
  },
  {
    type: 'beast_migration',
    frequency: 24,
    minDuration: 120,
    maxDuration: 360,
    requiresPath: true,
    dangerLevel: 7,
    interceptable: false,
  },
  {
    type: 'storm',
    frequency: 16,
    minDuration: 60,
    maxDuration: 240,
    requiresPath: false,
    dangerLevel: 3,
    interceptable: false,
  },
];

export class EventScheduler {
  private rng: SeededRandom;
  private lastSpawnCheck: number = 0;
  private nextSpawnTimes: Map<WorldEventType, number> = new Map();
  
  constructor(seed: number) {
    this.rng = new SeededRandom(seed);
    
    // Initialize spawn timers
    EVENT_TEMPLATES.forEach(template => {
      const initialDelay = this.rng.floatBetween(0.5, 1.5) * template.frequency * 60;
      this.nextSpawnTimes.set(template.type, initialDelay);
    });
  }
  
  checkSpawns(state: MapState): WorldEvent[] {
    const { gameTime, locations, activeEvents } = state;
    const newEvents: WorldEvent[] = [];
    
    EVENT_TEMPLATES.forEach(template => {
      const nextSpawn = this.nextSpawnTimes.get(template.type) ?? 0;
      
      if (gameTime.totalMinutes >= nextSpawn) {
        // Check max concurrent events of this type
        const activeOfType = activeEvents.filter(e => e.type === template.type);
        const maxConcurrent = template.type === 'merchant_caravan' ? 2 : 1;
        
        if (activeOfType.length < maxConcurrent) {
          const event = this.spawnEvent(template, state);
          if (event) {
            newEvents.push(event);
          }
        }
        
        // Schedule next spawn
        const nextDelay = this.rng.floatBetween(0.75, 1.25) * template.frequency * 60;
        this.nextSpawnTimes.set(template.type, gameTime.totalMinutes + nextDelay);
      }
    });
    
    return newEvents;
  }
  
  private spawnEvent(template: EventTemplate, state: MapState): WorldEvent | null {
    const { gameTime, locations, zones } = state;
    
    const duration = this.rng.intBetween(template.minDuration, template.maxDuration);
    
    if (template.requiresPath) {
      // Generate route between discovered locations
      const route = this.generateEventRoute(state);
      if (!route || route.length < 2) return null;
      
      return {
        id: this.rng.id('evt'),
        type: template.type,
        startTime: gameTime.totalMinutes,
        duration,
        endTime: gameTime.totalMinutes + duration,
        isMoving: true,
        route,
        currentLocationIndex: 0,
        state: 'active',
        isInterceptable: template.interceptable,
        wasIntercepted: false,
        interceptWindow: template.interceptable ? {
          start: gameTime.totalMinutes,
          end: gameTime.totalMinutes + duration * 0.8,
        } : undefined,
      };
    } else {
      // Static event at a location
      const eligibleLocations = Object.values(locations).filter(
        l => l.discoveryState === 'visited' || l.discoveryState === 'discovered'
      );
      
      if (eligibleLocations.length === 0) return null;
      
      const targetLocation = this.rng.pick(eligibleLocations);
      
      return {
        id: this.rng.id('evt'),
        type: template.type,
        startTime: gameTime.totalMinutes,
        duration,
        endTime: gameTime.totalMinutes + duration,
        isMoving: false,
        staticLocationId: targetLocation.id,
        state: 'active',
        isInterceptable: template.interceptable,
        wasIntercepted: false,
      };
    }
  }
  
  private generateEventRoute(state: MapState): string[] | null {
    const discoveredLocations = Object.values(state.locations).filter(
      l => l.discoveryState === 'visited' || l.discoveryState === 'discovered'
    );
    
    if (discoveredLocations.length < 2) return null;
    
    // Pick start and end
    const shuffled = this.rng.shuffle(discoveredLocations);
    const start = shuffled[0];
    const end = shuffled[shuffled.length - 1];
    
    // Simple route through connected locations
    const route: string[] = [start.id];
    let current = start;
    const visited = new Set([start.id]);
    
    while (current.id !== end.id && route.length < 10) {
      const connections = current.connectedTo.filter(
        c => !visited.has(c.targetLocationId) &&
        state.locations[c.targetLocationId]?.discoveryState !== 'unknown'
      );
      
      if (connections.length === 0) break;
      
      // Prefer moving toward end
      const nextId = this.rng.pick(connections).targetLocationId;
      route.push(nextId);
      visited.add(nextId);
      current = state.locations[nextId];
    }
    
    return route.length >= 2 ? route : null;
  }
}
```

---

## Visual Design Specifications

### Color Palette

```typescript
// src/pixi/utils/colors.ts

export const COLORS = {
  // Backgrounds
  background: 0x1a1a2e,
  backgroundLight: 0x232342,
  
  // Discovery states
  discovered: 0xeaeaea,
  visited: 0x4ecdc4,
  rumored: 0x6a6a8a,
  rumoredText: 0x9a9aba,
  
  // Paths
  road: 0x8a8aaa,
  trail: 0x6a6a7a,
  wilderness: 0x4a4a5a,
  pathHidden: 0x3a3a4a,
  
  // States
  selected: 0x4ecdc4,
  hover: 0x7eddd4,
  danger: 0xff6b6b,
  warning: 0xffd93d,
  safe: 0x51cf66,
  
  // Events
  caravan: 0xffd93d,
  raid: 0xff6b6b,
  festival: 0xcc99ff,
  storm: 0x74b9ff,
  
  // UI
  text: 0xeaeaea,
  textMuted: 0x9a9aba,
  border: 0x4a4a6a,
  accent: 0x4ecdc4,
  
  // Icons
  iconFill: 0x2a2a4e,
  iconStroke: 0xeaeaea,
};

export const SIZES = {
  // Nodes
  nodeRadius: 20,
  nodeRadiusSmall: 14,
  nodeRadiusLarge: 28,
  iconSize: 8,
  
  // Paths
  pathWidth: 4,
  pathWidthThin: 2,
  pathWidthThick: 6,
  
  // Player
  playerSize: 12,
  
  // Events
  eventMarkerSize: 16,
  
  // UI
  tooltipPadding: 12,
  labelOffset: 8,
};

export const FONTS = {
  label: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: '400',
  },
};
```

### Animation Easing

```typescript
// src/pixi/utils/easing.ts

export const easing = {
  // Standard easings
  linear: (t: number) => t,
  
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 
    ? 4 * t * t * t 
    : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  // Elastic (for UI feedback)
  easeOutElastic: (t: number) => {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  },
  
  // Back (overshoot)
  easeOutBack: (t: number) => {
    const s = 1.70158;
    return (t = t - 1) * t * ((s + 1) * t + s) + 1;
  },
  
  // Bounce
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },
};

// Spring physics for natural motion
export class Spring {
  position: number = 0;
  velocity: number = 0;
  target: number = 0;
  
  stiffness: number;
  damping: number;
  
  constructor(stiffness = 100, damping = 10) {
    this.stiffness = stiffness;
    this.damping = damping;
  }
  
  setTarget(target: number): void {
    this.target = target;
  }
  
  update(deltaSeconds: number): number {
    const force = (this.target - this.position) * this.stiffness;
    const dampingForce = this.velocity * this.damping;
    
    this.velocity += (force - dampingForce) * deltaSeconds;
    this.position += this.velocity * deltaSeconds;
    
    return this.position;
  }
  
  isSettled(threshold = 0.01): boolean {
    return Math.abs(this.position - this.target) < threshold &&
           Math.abs(this.velocity) < threshold;
  }
}
```

---

## Integration with Existing Architecture

### Event Bus Integration

```typescript
// src/integration/mapEvents.ts

import { emitGameEvent, onGameEvent } from './gameEvents';

// Map-specific event types
export type MapEventType =
  | 'map:open'
  | 'map:close'
  | 'travel:start'
  | 'travel:position'
  | 'travel:event'
  | 'travel:complete'
  | 'travel:death'
  | 'rumor:acquired'
  | 'location:discovered'
  | 'location:visited'
  | 'event:spawn'
  | 'event:move'
  | 'event:intercept'
  | 'event:complete'
  | 'view:zoom'
  | 'view:pan';

export function emitMapEvent<T>(type: MapEventType, data: T): void {
  emitGameEvent(type, data);
}

export function onMapEvent<T>(
  type: MapEventType,
  handler: (data: T) => void
): () => void {
  return onGameEvent(type, handler);
}

// React hooks for map events
export function useMapEvent<T>(
  type: MapEventType,
  handler: (data: T) => void
): void {
  useEffect(() => {
    return onMapEvent(type, handler);
  }, [type, handler]);
}
```

### Bridge Sync Hook

```typescript
// src/integration/useMapBridgeSync.ts

import { useEffect, useRef } from 'react';
import { useMapStore, getMapState } from '@/stores/mapStore';
import { emitMapEvent, onMapEvent } from './mapEvents';

export function useMapBridgeSync(): void {
  const initialized = useRef(false);
  
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    // Sync store changes to PixiJS
    const unsubscribeTravel = useMapStore.subscribe(
      state => state.travel,
      travel => {
        if (travel?.pendingEvent) {
          emitMapEvent('travel:event', { event: travel.pendingEvent });
        }
      }
    );
    
    const unsubscribeLocation = useMapStore.subscribe(
      state => state.currentLocationId,
      locationId => {
        if (locationId) {
          emitMapEvent('location:visited', { locationId });
        }
      }
    );
    
    // Handle PixiJS → React events
    const unsubscribeDeath = onMapEvent('travel:death', () => {
      // Trigger game over flow
      getMapState().resetMap();
    });
    
    return () => {
      unsubscribeTravel();
      unsubscribeLocation();
      unsubscribeDeath();
    };
  }, []);
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

- [ ] Set up PixiJS Application wrapper
- [ ] Implement core types in `src/types/map.ts`
- [ ] Create `mapStore` with basic state
- [ ] Implement `SeededRandom` and basic generation
- [ ] Create `LocationNode` and `PathLine` objects
- [ ] Basic map rendering (static locations)

### Phase 2: Procedural Generation (Week 2)

- [ ] Implement `RegionGenerator`
- [ ] Implement `ZoneGenerator`
- [ ] Implement `PathGenerator`
- [ ] Implement `NameGenerator`
- [ ] Test generation with multiple seeds
- [ ] Add zoom level containers

### Phase 3: Travel System (Week 3)

- [ ] Implement A* pathfinding
- [ ] Create `TravelAnimator`
- [ ] Add player marker movement
- [ ] Implement travel event roller
- [ ] Create event resolution UI (React)
- [ ] Test committed travel flow

### Phase 4: Discovery & Rumors (Week 4)

- [ ] Implement `RumorGenerator`
- [ ] Create `RumorSilhouette` visual
- [ ] Add discovery state transitions
- [ ] Connect to dialogue system for NPC rumors
- [ ] Implement letter/item rumor sources
- [ ] Test rumor reliability system

### Phase 5: Time Systems (Week 5)

- [ ] Implement `TimeVisualizer` (day/night)
- [ ] Add lighting tints and transitions
- [ ] Implement `EventScheduler`
- [ ] Create caravan movement logic
- [ ] Add raid event behavior
- [ ] Create event markers and animations

### Phase 6: Polish & Integration (Week 6)

- [ ] Add zoom transitions
- [ ] Implement pan controls
- [ ] Create tooltip UI
- [ ] Add sound effect hooks
- [ ] Performance optimization
- [ ] Full integration testing

---

## File Checklist

```
src/
├── types/
│   ├── map.ts              ← Core map types
│   ├── rumor.ts            ← Rumor types
│   ├── travel.ts           ← Travel types
│   └── time.ts             ← Time/event types
│
├── stores/
│   └── mapStore.ts         ← Zustand store
│
├── pixi/
│   ├── MapApplication.ts
│   ├── MapScene.ts
│   ├── layers/
│   │   ├── BackgroundLayer.ts
│   │   ├── FogLayer.ts
│   │   ├── PathLayer.ts
│   │   ├── LocationLayer.ts
│   │   ├── EventLayer.ts
│   │   ├── PlayerLayer.ts
│   │   └── UILayer.ts
│   ├── objects/
│   │   ├── LocationNode.ts
│   │   ├── PathLine.ts
│   │   ├── PlayerMarker.ts
│   │   ├── EventMarker.ts
│   │   ├── RumorSilhouette.ts
│   │   └── CaravanSprite.ts
│   ├── systems/
│   │   ├── ZoomController.ts
│   │   ├── PanController.ts
│   │   ├── TravelAnimator.ts
│   │   ├── TimeVisualizer.ts
│   │   └── EventScheduler.ts
│   ├── generators/
│   │   ├── RegionGenerator.ts
│   │   ├── ZoneGenerator.ts
│   │   ├── PathGenerator.ts
│   │   ├── NameGenerator.ts
│   │   └── SeededRandom.ts
│   └── utils/
│       ├── colors.ts
│       ├── geometry.ts
│       └── easing.ts
│
├── systems/
│   ├── Pathfinding.ts
│   ├── TravelEventRoller.ts
│   └── RumorGenerator.ts
│
└── integration/
    ├── mapEvents.ts
    └── useMapBridgeSync.ts
```

---

## Quick Reference

| Concept | Location | Key Export |
|---------|----------|------------|
| Map state | `stores/mapStore.ts` | `useMapStore` |
| Location types | `types/map.ts` | `MapLocation` |
| Travel state | `types/travel.ts` | `TravelState` |
| Generation | `pixi/generators/` | `RegionGenerator` |
| Pathfinding | `systems/Pathfinding.ts` | `findRoute()` |
| Day/night | `pixi/systems/TimeVisualizer.ts` | `TimeVisualizer` |
| World events | `pixi/systems/EventScheduler.ts` | `EventScheduler` |
| Rumors | `systems/RumorGenerator.ts` | `RumorGenerator` |
| Colors | `pixi/utils/colors.ts` | `COLORS` |

---

*Generated for DOM-based RPG UI System*
*Architecture Version: 1.0*
