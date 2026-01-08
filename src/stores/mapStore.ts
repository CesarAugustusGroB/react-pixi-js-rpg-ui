import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  MapRegion,
  MapZone,
  MapLocation,
  Path,
  DiscoveryState,
  Vector2,
} from '../types/map';
import type { Rumor } from '../types/rumor';
import type { TravelState, TravelEventOutcome } from '../types/travel';
import type { GameTime, WorldEvent, TimeOfDay } from '../types/time';
import { getTimeOfDay } from '../types/time';

// ============================================
// TYPES
// ============================================

export type ZoomLevel = 'region' | 'zone' | 'local';

export interface MapState {
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

export interface MapActions {
  // Initialization
  initializeMap: (data: {
    region: MapRegion;
    zones: Record<string, MapZone>;
    locations: Record<string, MapLocation>;
    paths: Record<string, Path>;
    startingLocationId: string;
  }) => void;
  resetMap: () => void;

  // Discovery
  addRumor: (rumor: Rumor) => void;
  discoverLocation: (locationId: string) => void;
  visitLocation: (locationId: string) => void;
  revealPath: (pathId: string) => void;

  // Travel
  setTravel: (travel: TravelState | null) => void;
  updateTravelProgress: (progress: number, segmentIndex: number, segmentProgress: number) => void;
  setTravelEvent: (event: TravelState['pendingEvent']) => void;
  resolveTravelEvent: (outcome: TravelEventOutcome) => void;

  // Time
  advanceTime: (minutes: number) => void;
  setTimeSpeed: (speed: number) => void;

  // Events
  spawnEvent: (event: WorldEvent) => void;
  updateEventLocation: (eventId: string, locationIndex: number) => void;
  completeEvent: (eventId: string) => void;
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
  toggleLegend: () => void;
}

// ============================================
// INITIAL STATE
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

// ============================================
// STORE
// ============================================

export const useMapStore = create<MapState & MapActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ========================================
    // INITIALIZATION
    // ========================================

    initializeMap: (data) => {
      set({
        region: data.region,
        zones: data.zones,
        locations: data.locations,
        paths: data.paths,
        currentLocationId: data.startingLocationId,
      });
    },

    resetMap: () => {
      set(initialState);
    },

    // ========================================
    // DISCOVERY
    // ========================================

    addRumor: (rumor) => {
      const { rumors, locations } = get();

      const location = locations[rumor.targetLocationId];
      if (location && location.discoveryState === 'unknown') {
        set({
          rumors: { ...rumors, [rumor.id]: rumor },
          locations: {
            ...locations,
            [rumor.targetLocationId]: {
              ...location,
              discoveryState: 'rumored' as DiscoveryState,
              rumor,
            },
          },
        });
      }
    },

    discoverLocation: (locationId) => {
      const { locations } = get();
      const location = locations[locationId];

      if (location && location.discoveryState !== 'visited') {
        set({
          locations: {
            ...locations,
            [locationId]: {
              ...location,
              discoveryState: 'discovered' as DiscoveryState,
            },
          },
        });
      }
    },

    visitLocation: (locationId) => {
      const { locations, paths } = get();
      const location = locations[locationId];

      if (location) {
        // Mark location as visited
        const updatedLocations: Record<string, MapLocation> = {
          ...locations,
          [locationId]: {
            ...location,
            discoveryState: 'visited' as DiscoveryState,
          },
        };

        // Reveal connected paths
        const updatedPaths = { ...paths };
        location.connectedTo.forEach((conn) => {
          if (updatedPaths[conn.pathId]) {
            updatedPaths[conn.pathId] = {
              ...updatedPaths[conn.pathId],
              discoveryState: 'discovered' as DiscoveryState,
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

    revealPath: (pathId) => {
      const { paths } = get();
      const path = paths[pathId];

      if (path) {
        set({
          paths: {
            ...paths,
            [pathId]: { ...path, discoveryState: 'discovered' as DiscoveryState },
          },
        });
      }
    },

    // ========================================
    // TRAVEL
    // ========================================

    setTravel: (travel) => {
      set({ travel });
    },

    updateTravelProgress: (progress, segmentIndex, segmentProgress) => {
      const { travel } = get();
      if (!travel) return;

      set({
        travel: {
          ...travel,
          totalProgress: progress,
          currentSegmentIndex: segmentIndex,
          segmentProgress,
        },
      });
    },

    setTravelEvent: (event) => {
      const { travel } = get();
      if (!travel) return;

      set({
        travel: {
          ...travel,
          pendingEvent: event,
        },
      });
    },

    resolveTravelEvent: (outcome) => {
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
            // Death - will be handled by game system
          }
          set({ travel: { ...travel, pendingEvent: null } });
          break;

        case 'discovery':
          get().discoverLocation(outcome.locationId);
          set({ travel: { ...travel, pendingEvent: null } });
          break;

        case 'trade':
          set({ travel: { ...travel, pendingEvent: null } });
          break;
      }
    },

    // ========================================
    // TIME
    // ========================================

    advanceTime: (minutes) => {
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
    },

    setTimeSpeed: (speed) => {
      set({ timeSpeed: speed });
    },

    // ========================================
    // WORLD EVENTS
    // ========================================

    spawnEvent: (event) => {
      const { activeEvents } = get();
      set({ activeEvents: [...activeEvents, event] });
    },

    updateEventLocation: (eventId, locationIndex) => {
      const { activeEvents } = get();
      set({
        activeEvents: activeEvents.map((e) =>
          e.id === eventId ? { ...e, currentLocationIndex: locationIndex } : e
        ),
      });
    },

    completeEvent: (eventId) => {
      const { activeEvents, eventHistory } = get();
      const event = activeEvents.find((e) => e.id === eventId);
      if (!event) return;

      set({
        activeEvents: activeEvents.filter((e) => e.id !== eventId),
        eventHistory: [...eventHistory, { ...event, state: 'completed' as const }],
      });
    },

    interceptEvent: (eventId) => {
      const { activeEvents, gameTime, currentLocationId } = get();
      const event = activeEvents.find((e) => e.id === eventId);

      if (!event || !event.isInterceptable || event.wasIntercepted) return;

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
        activeEvents: activeEvents.map((e) =>
          e.id === eventId ? { ...e, wasIntercepted: true } : e
        ),
      });
    },

    // ========================================
    // VIEW CONTROLS
    // ========================================

    setZoom: (level) => {
      set({ currentZoom: level });
    },

    panTo: (position) => {
      set({ viewCenter: position });
    },

    selectLocation: (locationId) => {
      set({ selectedLocationId: locationId });
    },

    hoverLocation: (locationId) => {
      set({ hoveredLocationId: locationId });
    },

    // ========================================
    // UI TOGGLES
    // ========================================

    openMap: () => {
      set({ isMapOpen: true });
    },

    closeMap: () => {
      set({ isMapOpen: false });
    },

    toggleEventLog: () => {
      set((state) => ({ showEventLog: !state.showEventLog }));
    },

    toggleLegend: () => {
      set((state) => ({ showLegend: !state.showLegend }));
    },
  }))
);

// ============================================
// SELECTORS
// ============================================

export const selectRegion = (state: MapState) => state.region;
export const selectCurrentLocationId = (state: MapState) => state.currentLocationId;

export const selectCurrentLocation = (state: MapState) =>
  state.currentLocationId ? state.locations[state.currentLocationId] : null;

export const selectDiscoveredLocations = (state: MapState) =>
  Object.values(state.locations).filter(
    (l) => l.discoveryState === 'discovered' || l.discoveryState === 'visited'
  );

export const selectRumoredLocations = (state: MapState) =>
  Object.values(state.locations).filter((l) => l.discoveryState === 'rumored');

export const selectVisiblePaths = (state: MapState) =>
  Object.values(state.paths).filter((p) => p.discoveryState !== 'unknown');

export const selectMapTime = (state: MapState) => state.gameTime;

export const selectTimeOfDay = (state: MapState): TimeOfDay =>
  getTimeOfDay(state.gameTime.hour);

export const selectTravel = (state: MapState) => state.travel;

export const selectTravelProgress = (state: MapState) =>
  state.travel
    ? {
        isActive: state.travel.isActive,
        progress: state.travel.totalProgress,
        eta: state.travel.estimatedArrival - state.gameTime.totalMinutes,
        hasPendingEvent: !!state.travel.pendingEvent,
      }
    : null;

export const selectIsMapOpen = (state: MapState) => state.isMapOpen;
export const selectSelectedLocationId = (state: MapState) => state.selectedLocationId;
export const selectHoveredLocationId = (state: MapState) => state.hoveredLocationId;
export const selectCurrentZoom = (state: MapState) => state.currentZoom;

export const selectActiveCaravans = (state: MapState) =>
  state.activeEvents.filter((e) => e.type === 'merchant_caravan');

export const selectActiveThreats = (state: MapState) =>
  state.activeEvents.filter(
    (e) => e.type === 'bandit_raid' || e.type === 'beast_migration'
  );

// ============================================
// NON-REACT ACCESSORS (for PixiJS)
// ============================================

export const getMapState = () => useMapStore.getState();
export const subscribeToMapStore = useMapStore.subscribe;
