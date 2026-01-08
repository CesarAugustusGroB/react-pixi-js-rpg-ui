# State Management

Zustand store pattern for the map system with fine-grained selectors.

## Table of Contents

1. [State Interface](#state-interface)
2. [Actions Interface](#actions-interface)
3. [Store Creation](#store-creation)
4. [Discovery Actions](#discovery-actions)
5. [Travel Actions](#travel-actions)
6. [Time Actions](#time-actions)
7. [World Event Actions](#world-event-actions)
8. [Selectors](#selectors)
9. [Non-React Accessors](#non-react-accessors)

---

## State Interface

```typescript
// src/stores/mapStore.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

type ZoomLevel = 'region' | 'zone' | 'local';

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
```

## Actions Interface

```typescript
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
```

## Store Creation

```typescript
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

    // Actions defined below...
  }))
);
```

## Discovery Actions

```typescript
addRumor: (rumor: Rumor) => {
  const { rumors, locations } = get();

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
```

## Travel Actions

```typescript
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
    encounterRollsRemaining: Math.ceil(route.totalTime / 30),
  };

  set({ travel });
  emitMapEvent('travel:start', { route, travel });
},

updateTravel: (deltaMs: number) => {
  const { travel, gameTime, timeSpeed } = get();
  if (!travel?.isActive || travel.pendingEvent) return;

  const gameMinutes = (deltaMs / 1000 / 60) * timeSpeed * 10;
  const elapsed = gameTime.totalMinutes + gameMinutes - travel.startedAt;
  const totalProgress = Math.min(1, elapsed / travel.route.totalTime);

  // Check for arrival
  if (totalProgress >= 1) {
    get().visitLocation(travel.route.endLocationId);
    set({ travel: null });
    emitMapEvent('travel:complete', { destinationId: travel.route.endLocationId });
    return;
  }

  // Calculate current segment and check for events
  // ... (see full implementation in source)

  get().advanceTime(gameMinutes);
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
        },
      });
      break;
    case 'combat':
      if (outcome.result === 'defeat') {
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
```

## Time Actions

```typescript
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

  get().updateEvents(minutes * 60 * 1000);
},

setTimeSpeed: (speed: number) => {
  set({ timeSpeed: speed });
},
```

## World Event Actions

```typescript
spawnEvent: (event: WorldEvent) => {
  const { activeEvents } = get();
  set({ activeEvents: [...activeEvents, event] });
  emitMapEvent('event:spawn', { event });
},

updateEvents: (deltaMs: number) => {
  const { activeEvents, eventHistory, gameTime } = get();
  const updatedEvents: WorldEvent[] = [];
  const completedEvents: WorldEvent[] = [];

  for (const event of activeEvents) {
    if (gameTime.totalMinutes >= event.endTime) {
      completedEvents.push({ ...event, state: 'completed' });
      continue;
    }

    // Update moving events
    if (event.isMoving && event.route) {
      const progress = (gameTime.totalMinutes - event.startTime) / event.duration;
      const routeIndex = Math.floor(progress * event.route.length);

      if (routeIndex !== event.currentLocationIndex) {
        const updatedEvent = { ...event, currentLocationIndex: routeIndex };
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
```

## Selectors

```typescript
// Basic selectors
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

// Time of day
export const selectTimeOfDay = (state: MapState): TimeOfDay => {
  const hour = state.gameTime.hour;
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 19) return 'dusk';
  if (hour >= 19 && hour < 22) return 'evening';
  return 'night';
};

// Travel progress
export const selectTravelProgress = (state: MapState) =>
  state.travel ? {
    isActive: state.travel.isActive,
    progress: state.travel.totalProgress,
    eta: state.travel.estimatedArrival - state.gameTime.totalMinutes,
    hasPendingEvent: !!state.travel.pendingEvent,
  } : null;

// Event filters
export const selectActiveCaravans = (state: MapState) =>
  state.activeEvents.filter(e => e.type === 'merchant_caravan');

export const selectActiveThreats = (state: MapState) =>
  state.activeEvents.filter(e =>
    e.type === 'bandit_raid' || e.type === 'beast_migration'
  );
```

## Non-React Accessors

```typescript
// For PixiJS integration (outside React)
export const getMapState = () => useMapStore.getState();
export const subscribeToMapStore = useMapStore.subscribe;

// Event emitter for React-PixiJS bridge
declare function emitMapEvent(type: string, data: unknown): void;
```
