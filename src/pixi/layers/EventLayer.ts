// EventLayer - Renders world events on the map
// Manages EventMarker objects for caravans, raids, festivals, etc.

import { Container } from 'pixi.js';
import type { WorldEvent, MapLocation, Vector2 } from '@/types';
import { EventMarker } from '../objects/EventMarker';

// ============================================
// EVENT TYPES
// ============================================

export interface EventLayerEvents {
  onEventClick: (eventId: string) => void;
  onEventHover: (eventId: string | null) => void;
}

// ============================================
// EVENT LAYER CLASS
// ============================================

export class EventLayer extends Container {
  private eventMarkers: Map<string, EventMarker> = new Map();
  private locations: Map<string, MapLocation> = new Map();
  private events: EventLayerEvents;

  // State
  private hoveredEventId: string | null = null;

  constructor(events: EventLayerEvents) {
    super();
    this.events = events;
    this.sortableChildren = true;
  }

  // ============================================
  // EVENT MANAGEMENT
  // ============================================

  public initializeEvents(worldEvents: WorldEvent[], locations: MapLocation[]): void {
    // Store locations for position lookup
    this.locations.clear();
    for (const location of locations) {
      this.locations.set(location.id, location);
    }

    // Clear existing
    this.clearEvents();

    // Add events
    for (const event of worldEvents) {
      if (event.state === 'active' || event.state === 'pending') {
        this.addEvent(event);
      }
    }
  }

  public addEvent(event: WorldEvent): void {
    const position = this.getEventPosition(event);
    if (!position) return;

    const marker = new EventMarker(event, position);

    // Set up event handlers
    marker.on('pointerenter', () => this.handleEventHover(event.id));
    marker.on('pointerleave', () => this.handleEventHover(null));
    marker.on('pointertap', () => this.handleEventClick(event.id));

    // Play spawn animation
    marker.playSpawnEffect();

    // Z-index based on y position
    marker.zIndex = position.y;

    this.eventMarkers.set(event.id, marker);
    this.addChild(marker);
  }

  public removeEvent(eventId: string): void {
    const marker = this.eventMarkers.get(eventId);
    if (marker) {
      this.removeChild(marker);
      marker.destroy();
      this.eventMarkers.delete(eventId);
    }
  }

  public clearEvents(): void {
    for (const marker of this.eventMarkers.values()) {
      this.removeChild(marker);
      marker.destroy();
    }
    this.eventMarkers.clear();
  }

  // ============================================
  // EVENT UPDATES
  // ============================================

  public updateEvents(worldEvents: WorldEvent[]): void {
    const activeEventIds = new Set<string>();

    for (const event of worldEvents) {
      if (event.state === 'active' || event.state === 'pending') {
        activeEventIds.add(event.id);

        const marker = this.eventMarkers.get(event.id);
        if (marker) {
          // Update existing marker
          marker.updateEvent(event);

          // Update position for moving events
          const position = this.getEventPosition(event);
          if (position) {
            marker.updatePosition(position);
            marker.zIndex = position.y;
          }
        } else {
          // New event
          this.addEvent(event);
        }
      }
    }

    // Remove events that are no longer active
    for (const [eventId, marker] of this.eventMarkers) {
      if (!activeEventIds.has(eventId)) {
        marker.playInterceptEffect();
        // Delay removal for animation
        setTimeout(() => this.removeEvent(eventId), 500);
      }
    }
  }

  public updateEvent(event: WorldEvent): void {
    const marker = this.eventMarkers.get(event.id);
    if (marker) {
      marker.updateEvent(event);

      const position = this.getEventPosition(event);
      if (position) {
        marker.updatePosition(position);
      }
    }
  }

  // ============================================
  // POSITION HELPERS
  // ============================================

  private getEventPosition(event: WorldEvent): Vector2 | null {
    if (event.staticLocationId) {
      const location = this.locations.get(event.staticLocationId);
      return location?.position ?? null;
    }

    if (event.isMoving && event.route && event.currentLocationIndex !== undefined) {
      const currentLocationId = event.route[event.currentLocationIndex];
      const location = this.locations.get(currentLocationId);
      return location?.position ?? null;
    }

    return null;
  }

  public updateLocations(locations: MapLocation[]): void {
    for (const location of locations) {
      this.locations.set(location.id, location);
    }
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  private handleEventHover(eventId: string | null): void {
    // Clear previous hover
    if (this.hoveredEventId) {
      const prevMarker = this.eventMarkers.get(this.hoveredEventId);
      if (prevMarker) {
        prevMarker.setHovered(false);
      }
    }

    this.hoveredEventId = eventId;

    // Set new hover
    if (eventId) {
      const marker = this.eventMarkers.get(eventId);
      if (marker) {
        marker.setHovered(true);
      }
    }

    this.events.onEventHover(eventId);
  }

  private handleEventClick(eventId: string): void {
    const marker = this.eventMarkers.get(eventId);
    if (marker && marker.canIntercept()) {
      this.events.onEventClick(eventId);
    }
  }

  // ============================================
  // QUERIES
  // ============================================

  public getEventMarker(eventId: string): EventMarker | undefined {
    return this.eventMarkers.get(eventId);
  }

  public getEventsAtLocation(locationId: string): EventMarker[] {
    const result: EventMarker[] = [];
    for (const marker of this.eventMarkers.values()) {
      const event = marker.getEvent();
      if (event.staticLocationId === locationId) {
        result.push(marker);
      }
      if (event.isMoving && event.route && event.currentLocationIndex !== undefined) {
        if (event.route[event.currentLocationIndex] === locationId) {
          result.push(marker);
        }
      }
    }
    return result;
  }

  public getInterceptableEvents(): EventMarker[] {
    return Array.from(this.eventMarkers.values()).filter(m => m.canIntercept());
  }

  // ============================================
  // UPDATE LOOP
  // ============================================

  public update(deltaTime: number): void {
    for (const marker of this.eventMarkers.values()) {
      marker.update(deltaTime);
    }
  }

  // ============================================
  // CLEANUP
  // ============================================

  public destroy(): void {
    this.clearEvents();
    this.locations.clear();
    super.destroy({ children: true });
  }
}
