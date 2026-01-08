// Map-specific events for React-PixiJS communication
// Extends the core event system with map/travel specific events

import type { Vector2 } from '@/types/map';
import type { Rumor } from '@/types/rumor';
import type { TravelRoute, TravelEvent } from '@/types/travel';
import type { WorldEvent, GameTime } from '@/types/time';

// ============================================
// MAP EVENT TYPES
// ============================================

export interface MapEventMap {
  // Map UI Events (React → PixiJS)
  'map:open': void;
  'map:close': void;
  'map:toggle': void;
  'map:ready': void;

  // Location Events (bidirectional)
  'map:location:hover': { locationId: string | null; position?: Vector2 };
  'map:location:select': { locationId: string };
  'map:location:deselect': void;
  'map:location:visited': { locationId: string };
  'map:location:discovered': { locationId: string };

  // Travel Events (PixiJS → React)
  'travel:start': { route: TravelRoute };
  'travel:progress': { progress: number; segmentIndex: number; segmentProgress: number };
  'travel:event': { event: TravelEvent };
  'travel:eventResolved': { eventId: string; outcome: string };
  'travel:complete': { destinationId: string };
  'travel:cancel': void;

  // Travel Commands (React → PixiJS)
  'travel:begin': { route: TravelRoute };
  'travel:pause': void;
  'travel:resume': void;
  'travel:abort': void;

  // Rumor Events (bidirectional)
  'rumor:acquired': { rumor: Rumor };
  'rumor:confirmed': { rumorId: string; locationId: string };
  'rumor:debunked': { rumorId: string };

  // World Event Events (PixiJS → React)
  'worldEvent:spawn': { event: WorldEvent };
  'worldEvent:update': { eventId: string; locationIndex: number };
  'worldEvent:complete': { eventId: string };
  'worldEvent:intercept': { eventId: string };
  'worldEvent:interceptable': { event: WorldEvent };

  // World Event Commands (React → PixiJS)
  'worldEvent:doIntercept': { eventId: string };

  // Time Events (PixiJS → React)
  'time:advance': { gameTime: GameTime; minutesElapsed: number };
  'time:dayChange': { newDay: number };
  'time:periodChange': { timeOfDay: string };

  // View Events (bidirectional)
  'map:pan': { position: Vector2 };
  'map:zoom': { level: 'region' | 'zone' | 'local' };
  'map:centerOn': { locationId: string };

  // Caravan Interaction (PixiJS → React)
  'caravan:hover': { eventId: string; event: WorldEvent; position: Vector2 };
  'caravan:unhover': void;
  'caravan:click': { eventId: string };

  // Trade Events (bidirectional)
  'trade:open': { caravanId: string; goods: string[] };
  'trade:close': void;
  'trade:purchase': { itemId: string; quantity: number };
  'trade:sell': { itemId: string; quantity: number };
  'trade:complete': { caravanId: string };
}

// ============================================
// EVENT CALLBACK TYPE
// ============================================

type EventCallback<T> = T extends void ? () => void : (data: T) => void;

// ============================================
// MAP EVENT BUS CLASS
// ============================================

class MapEventBus {
  private listeners: Map<string, Set<EventCallback<unknown>>> = new Map();

  /**
   * Subscribe to a map event.
   * @returns Unsubscribe function
   */
  on<K extends keyof MapEventMap>(
    event: K,
    callback: EventCallback<MapEventMap[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<unknown>);

    // Also listen on window for events from stores
    const windowHandler = (e: Event) => {
      const customEvent = e as CustomEvent;
      (callback as EventCallback<unknown>)(customEvent.detail);
    };

    window.addEventListener(event, windowHandler);

    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback<unknown>);
      window.removeEventListener(event, windowHandler);
    };
  }

  /**
   * Subscribe to an event once.
   */
  once<K extends keyof MapEventMap>(
    event: K,
    callback: EventCallback<MapEventMap[K]>
  ): () => void {
    const wrappedCallback = ((data: unknown) => {
      unsubscribe();
      (callback as (data: unknown) => void)(data);
    }) as EventCallback<MapEventMap[K]>;

    const unsubscribe = this.on(event, wrappedCallback);
    return unsubscribe;
  }

  /**
   * Emit an event.
   */
  emit<K extends keyof MapEventMap>(
    event: K,
    ...args: MapEventMap[K] extends void ? [] : [MapEventMap[K]]
  ): void {
    const data = args[0];

    // Emit via window.CustomEvent
    window.dispatchEvent(new CustomEvent(event, { detail: data }));

    // Notify internal listeners
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        (callback as EventCallback<unknown>)(data);
      });
    }
  }

  /**
   * Remove all listeners for an event.
   */
  off<K extends keyof MapEventMap>(event: K): void {
    this.listeners.delete(event);
  }

  /**
   * Remove all listeners.
   */
  clear(): void {
    this.listeners.clear();
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const mapEvents = new MapEventBus();

// ============================================
// CONVENIENCE EVENT CREATORS
// ============================================

export const MapEvents = {
  // Map UI
  openMap: () => mapEvents.emit('map:open'),
  closeMap: () => mapEvents.emit('map:close'),
  toggleMap: () => mapEvents.emit('map:toggle'),

  // Location
  hoverLocation: (locationId: string | null, position?: Vector2) =>
    mapEvents.emit('map:location:hover', { locationId, position }),
  selectLocation: (locationId: string) =>
    mapEvents.emit('map:location:select', { locationId }),
  deselectLocation: () => mapEvents.emit('map:location:deselect'),
  visitLocation: (locationId: string) =>
    mapEvents.emit('map:location:visited', { locationId }),
  discoverLocation: (locationId: string) =>
    mapEvents.emit('map:location:discovered', { locationId }),

  // Travel
  startTravel: (route: TravelRoute) =>
    mapEvents.emit('travel:start', { route }),
  updateProgress: (progress: number, segmentIndex: number, segmentProgress: number) =>
    mapEvents.emit('travel:progress', { progress, segmentIndex, segmentProgress }),
  triggerTravelEvent: (event: TravelEvent) =>
    mapEvents.emit('travel:event', { event }),
  resolveTravelEvent: (eventId: string, outcome: string) =>
    mapEvents.emit('travel:eventResolved', { eventId, outcome }),
  completeTravel: (destinationId: string) =>
    mapEvents.emit('travel:complete', { destinationId }),
  cancelTravel: () => mapEvents.emit('travel:cancel'),

  // Travel Commands
  beginTravel: (route: TravelRoute) =>
    mapEvents.emit('travel:begin', { route }),
  pauseTravel: () => mapEvents.emit('travel:pause'),
  resumeTravel: () => mapEvents.emit('travel:resume'),
  abortTravel: () => mapEvents.emit('travel:abort'),

  // Rumors
  acquireRumor: (rumor: Rumor) =>
    mapEvents.emit('rumor:acquired', { rumor }),
  confirmRumor: (rumorId: string, locationId: string) =>
    mapEvents.emit('rumor:confirmed', { rumorId, locationId }),
  debunkRumor: (rumorId: string) =>
    mapEvents.emit('rumor:debunked', { rumorId }),

  // World Events
  spawnWorldEvent: (event: WorldEvent) =>
    mapEvents.emit('worldEvent:spawn', { event }),
  updateWorldEvent: (eventId: string, locationIndex: number) =>
    mapEvents.emit('worldEvent:update', { eventId, locationIndex }),
  completeWorldEvent: (eventId: string) =>
    mapEvents.emit('worldEvent:complete', { eventId }),
  interceptWorldEvent: (eventId: string) =>
    mapEvents.emit('worldEvent:intercept', { eventId }),
  notifyInterceptable: (event: WorldEvent) =>
    mapEvents.emit('worldEvent:interceptable', { event }),

  // Time
  advanceTime: (gameTime: GameTime, minutesElapsed: number) =>
    mapEvents.emit('time:advance', { gameTime, minutesElapsed }),
  notifyDayChange: (newDay: number) =>
    mapEvents.emit('time:dayChange', { newDay }),
  notifyPeriodChange: (timeOfDay: string) =>
    mapEvents.emit('time:periodChange', { timeOfDay }),

  // View
  panMap: (position: Vector2) =>
    mapEvents.emit('map:pan', { position }),
  zoomMap: (level: 'region' | 'zone' | 'local') =>
    mapEvents.emit('map:zoom', { level }),
  centerOnLocation: (locationId: string) =>
    mapEvents.emit('map:centerOn', { locationId }),

  // Caravan
  hoverCaravan: (eventId: string, event: WorldEvent, position: Vector2) =>
    mapEvents.emit('caravan:hover', { eventId, event, position }),
  unhoverCaravan: () => mapEvents.emit('caravan:unhover'),
  clickCaravan: (eventId: string) =>
    mapEvents.emit('caravan:click', { eventId }),

  // Trade
  openTrade: (caravanId: string, goods: string[]) =>
    mapEvents.emit('trade:open', { caravanId, goods }),
  closeTrade: () => mapEvents.emit('trade:close'),
  purchase: (itemId: string, quantity: number) =>
    mapEvents.emit('trade:purchase', { itemId, quantity }),
  sell: (itemId: string, quantity: number) =>
    mapEvents.emit('trade:sell', { itemId, quantity }),
  completeTrade: (caravanId: string) =>
    mapEvents.emit('trade:complete', { caravanId }),
} as const;
