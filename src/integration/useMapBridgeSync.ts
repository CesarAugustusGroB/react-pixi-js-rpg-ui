// Map Bridge Sync Hook
// Syncs map-related Zustand stores with the PixiJS event bridge

import { useEffect } from 'react';
import { mapEvents } from './mapEvents';
import { useMapStore } from '@stores/mapStore';
import { usePlayerStore } from '@stores/playerStore';
import { useInventoryStore } from '@stores/inventoryStore';
import { useDialogueStore } from '@stores/dialogueStore';
import type { TravelEventOutcome } from '@/types/travel';

// ============================================
// MAIN HOOK
// ============================================

/**
 * React hook that syncs map-related Zustand stores with the PixiJS event bridge.
 * Call this once at the app root (or map container) to enable bidirectional communication.
 */
export function useMapBridgeSync() {
  // Map store actions
  const openMap = useMapStore((state) => state.openMap);
  const closeMap = useMapStore((state) => state.closeMap);
  const setTravel = useMapStore((state) => state.setTravel);
  const updateTravelProgress = useMapStore((state) => state.updateTravelProgress);
  const setTravelEvent = useMapStore((state) => state.setTravelEvent);
  const resolveTravelEvent = useMapStore((state) => state.resolveTravelEvent);
  const visitLocation = useMapStore((state) => state.visitLocation);
  const discoverLocation = useMapStore((state) => state.discoverLocation);
  const addRumor = useMapStore((state) => state.addRumor);
  const advanceTime = useMapStore((state) => state.advanceTime);
  const spawnEvent = useMapStore((state) => state.spawnEvent);
  const updateEventLocation = useMapStore((state) => state.updateEventLocation);
  const completeEvent = useMapStore((state) => state.completeEvent);
  const interceptEvent = useMapStore((state) => state.interceptEvent);
  const hoverLocation = useMapStore((state) => state.hoverLocation);
  const selectLocation = useMapStore((state) => state.selectLocation);
  const setZoom = useMapStore((state) => state.setZoom);
  const panTo = useMapStore((state) => state.panTo);

  // Player store actions (for combat/healing from travel events)
  const takeDamage = usePlayerStore((state) => state.takeDamage);
  const heal = usePlayerStore((state) => state.heal);
  const gainExperience = usePlayerStore((state) => state.gainExperience);

  // Inventory store actions (for trading with caravans)
  const addItem = useInventoryStore((state) => state.addItem);

  // Dialogue store actions (for rumor acquisition)
  const startDialogue = useDialogueStore((state) => state.startDialogue);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // ===== Map UI Events =====

    unsubscribers.push(
      mapEvents.on('map:open', () => {
        openMap();
      })
    );

    unsubscribers.push(
      mapEvents.on('map:close', () => {
        closeMap();
      })
    );

    unsubscribers.push(
      mapEvents.on('map:toggle', () => {
        const isOpen = useMapStore.getState().isMapOpen;
        if (isOpen) {
          closeMap();
        } else {
          openMap();
        }
      })
    );

    // ===== Location Events (PixiJS → React) =====

    unsubscribers.push(
      mapEvents.on('map:location:hover', ({ locationId }) => {
        hoverLocation(locationId);
      })
    );

    unsubscribers.push(
      mapEvents.on('map:location:select', ({ locationId }) => {
        selectLocation(locationId);
      })
    );

    unsubscribers.push(
      mapEvents.on('map:location:deselect', () => {
        selectLocation(null);
      })
    );

    unsubscribers.push(
      mapEvents.on('map:location:visited', ({ locationId }) => {
        visitLocation(locationId);
      })
    );

    unsubscribers.push(
      mapEvents.on('map:location:discovered', ({ locationId }) => {
        discoverLocation(locationId);
      })
    );

    // ===== Travel Events (PixiJS → React) =====

    unsubscribers.push(
      mapEvents.on('travel:start', ({ route }) => {
        const gameTime = useMapStore.getState().gameTime;
        setTravel({
          isActive: true,
          startedAt: gameTime.totalMinutes,
          route,
          currentSegmentIndex: 0,
          segmentProgress: 0,
          estimatedArrival: gameTime.totalMinutes + route.totalTime,
          totalProgress: 0,
          pendingEvent: null,
          encounterRollsRemaining: Math.ceil(route.totalTime / 5),
        });
      })
    );

    unsubscribers.push(
      mapEvents.on('travel:progress', ({ progress, segmentIndex, segmentProgress }) => {
        updateTravelProgress(progress, segmentIndex, segmentProgress);
      })
    );

    unsubscribers.push(
      mapEvents.on('travel:event', ({ event }) => {
        setTravelEvent(event);
      })
    );

    unsubscribers.push(
      mapEvents.on('travel:eventResolved', ({ outcome }) => {
        const travelEventOutcome: TravelEventOutcome = { type: outcome as 'continue' };
        resolveTravelEvent(travelEventOutcome);
      })
    );

    unsubscribers.push(
      mapEvents.on('travel:complete', ({ destinationId }) => {
        visitLocation(destinationId);
        setTravel(null);
      })
    );

    unsubscribers.push(
      mapEvents.on('travel:cancel', () => {
        setTravel(null);
      })
    );

    // ===== Rumor Events (PixiJS → React) =====

    unsubscribers.push(
      mapEvents.on('rumor:acquired', ({ rumor }) => {
        addRumor(rumor);

        // Optionally trigger dialogue about the rumor
        if (rumor.vagueDescription) {
          startDialogue([
            {
              id: `rumor_${rumor.id}`,
              speaker: rumor.sourceDetail,
              text: rumor.vagueDescription,
            },
          ]);
        }
      })
    );

    unsubscribers.push(
      mapEvents.on('rumor:confirmed', ({ locationId }) => {
        discoverLocation(locationId);
      })
    );

    // ===== World Event Events (PixiJS → React) =====

    unsubscribers.push(
      mapEvents.on('worldEvent:spawn', ({ event }) => {
        spawnEvent(event);
      })
    );

    unsubscribers.push(
      mapEvents.on('worldEvent:update', ({ eventId, locationIndex }) => {
        updateEventLocation(eventId, locationIndex);
      })
    );

    unsubscribers.push(
      mapEvents.on('worldEvent:complete', ({ eventId }) => {
        completeEvent(eventId);
      })
    );

    unsubscribers.push(
      mapEvents.on('worldEvent:intercept', ({ eventId }) => {
        interceptEvent(eventId);
      })
    );

    // ===== Time Events (PixiJS → React) =====

    unsubscribers.push(
      mapEvents.on('time:advance', ({ minutesElapsed }) => {
        advanceTime(minutesElapsed);
      })
    );

    // ===== View Events (PixiJS → React) =====

    unsubscribers.push(
      mapEvents.on('map:pan', ({ position }) => {
        panTo(position);
      })
    );

    unsubscribers.push(
      mapEvents.on('map:zoom', ({ level }) => {
        setZoom(level);
      })
    );

    // ===== Trade Events (PixiJS → React) =====

    unsubscribers.push(
      mapEvents.on('trade:complete', () => {
        // Could add gold or experience reward
        gainExperience(10);
      })
    );

    // Emit ready event
    mapEvents.emit('map:ready');

    // Cleanup
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [
    openMap,
    closeMap,
    setTravel,
    updateTravelProgress,
    setTravelEvent,
    resolveTravelEvent,
    visitLocation,
    discoverLocation,
    addRumor,
    advanceTime,
    spawnEvent,
    updateEventLocation,
    completeEvent,
    interceptEvent,
    hoverLocation,
    selectLocation,
    setZoom,
    panTo,
    takeDamage,
    heal,
    gainExperience,
    addItem,
    startDialogue,
  ]);
}

// ============================================
// STORE ACCESSORS (for PixiJS non-React code)
// ============================================

export const mapStoreAccessors = {
  // Map State
  getMapState: () => useMapStore.getState(),
  getLocations: () => useMapStore.getState().locations,
  getPaths: () => useMapStore.getState().paths,
  getCurrentLocationId: () => useMapStore.getState().currentLocationId,
  getTravel: () => useMapStore.getState().travel,
  getGameTime: () => useMapStore.getState().gameTime,
  getActiveEvents: () => useMapStore.getState().activeEvents,
  getRumors: () => useMapStore.getState().rumors,
  isMapOpen: () => useMapStore.getState().isMapOpen,
  getSelectedLocationId: () => useMapStore.getState().selectedLocationId,
  getHoveredLocationId: () => useMapStore.getState().hoveredLocationId,
  getZoom: () => useMapStore.getState().currentZoom,
  getViewCenter: () => useMapStore.getState().viewCenter,

  // Player State (for travel events)
  getPlayerHealth: () => usePlayerStore.getState().health,
  getPlayerMaxHealth: () => usePlayerStore.getState().maxHealth,
  getPlayerLevel: () => usePlayerStore.getState().level,

  // Inventory State (for trading)
  getInventorySlots: () => useInventoryStore.getState().slots,
} as const;

// ============================================
// STORE SUBSCRIPTIONS (for PixiJS)
// ============================================

export const mapStoreSubscriptions = {
  // Full store subscriptions
  onMapChange: (callback: (state: ReturnType<typeof useMapStore.getState>) => void) =>
    useMapStore.subscribe(callback),

  // Fine-grained subscriptions
  onTravelChange: (callback: (travel: ReturnType<typeof useMapStore.getState>['travel']) => void) =>
    useMapStore.subscribe(
      (state) => state.travel,
      callback
    ),

  onGameTimeChange: (callback: (gameTime: ReturnType<typeof useMapStore.getState>['gameTime']) => void) =>
    useMapStore.subscribe(
      (state) => state.gameTime,
      callback
    ),

  onActiveEventsChange: (callback: (events: ReturnType<typeof useMapStore.getState>['activeEvents']) => void) =>
    useMapStore.subscribe(
      (state) => state.activeEvents,
      callback
    ),

  onMapOpenChange: (callback: (isOpen: boolean) => void) =>
    useMapStore.subscribe(
      (state) => state.isMapOpen,
      callback
    ),

  onSelectedLocationChange: (callback: (locationId: string | null) => void) =>
    useMapStore.subscribe(
      (state) => state.selectedLocationId,
      callback
    ),

  onHoveredLocationChange: (callback: (locationId: string | null) => void) =>
    useMapStore.subscribe(
      (state) => state.hoveredLocationId,
      callback
    ),

  onCurrentLocationChange: (callback: (locationId: string | null) => void) =>
    useMapStore.subscribe(
      (state) => state.currentLocationId,
      callback
    ),

  onZoomChange: (callback: (zoom: ReturnType<typeof useMapStore.getState>['currentZoom']) => void) =>
    useMapStore.subscribe(
      (state) => state.currentZoom,
      callback
    ),
} as const;

// ============================================
// STORE ACTIONS (for PixiJS direct calls)
// ============================================

export const mapStoreActions = {
  // Map UI
  openMap: () => useMapStore.getState().openMap(),
  closeMap: () => useMapStore.getState().closeMap(),

  // Location
  hoverLocation: (id: string | null) => useMapStore.getState().hoverLocation(id),
  selectLocation: (id: string | null) => useMapStore.getState().selectLocation(id),
  visitLocation: (id: string) => useMapStore.getState().visitLocation(id),
  discoverLocation: (id: string) => useMapStore.getState().discoverLocation(id),

  // Travel
  setTravel: (travel: ReturnType<typeof useMapStore.getState>['travel']) =>
    useMapStore.getState().setTravel(travel),
  updateTravelProgress: (progress: number, segmentIndex: number, segmentProgress: number) =>
    useMapStore.getState().updateTravelProgress(progress, segmentIndex, segmentProgress),

  // Time
  advanceTime: (minutes: number) => useMapStore.getState().advanceTime(minutes),
  setTimeSpeed: (speed: number) => useMapStore.getState().setTimeSpeed(speed),

  // Events
  spawnEvent: (event: ReturnType<typeof useMapStore.getState>['activeEvents'][0]) =>
    useMapStore.getState().spawnEvent(event),
  interceptEvent: (eventId: string) => useMapStore.getState().interceptEvent(eventId),
  completeEvent: (eventId: string) => useMapStore.getState().completeEvent(eventId),

  // View
  setZoom: (level: 'region' | 'zone' | 'local') => useMapStore.getState().setZoom(level),
  panTo: (position: { x: number; y: number }) => useMapStore.getState().panTo(position),
} as const;
