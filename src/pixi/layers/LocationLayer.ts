// LocationLayer - Renders all map locations
// Manages LocationNode objects and interaction states

import { Container, FederatedPointerEvent } from 'pixi.js';
import type { MapLocation, Vector2 } from '@/types';
import { LocationNode } from '../objects/LocationNode';

// ============================================
// EVENT TYPES
// ============================================

export interface LocationLayerEvents {
  onLocationClick: (locationId: string) => void;
  onLocationHover: (locationId: string | null) => void;
  onLocationRightClick: (locationId: string) => void;
}

// ============================================
// LOCATION LAYER CLASS
// ============================================

export class LocationLayer extends Container {
  private locationNodes: Map<string, LocationNode> = new Map();
  private events: LocationLayerEvents;

  // State
  private hoveredLocationId: string | null = null;
  private selectedLocationId: string | null = null;
  private currentLocationId: string | null = null;

  constructor(events: LocationLayerEvents) {
    super();
    this.events = events;
    this.sortableChildren = true;
  }

  // ============================================
  // LOCATION MANAGEMENT
  // ============================================

  public initializeLocations(locations: MapLocation[]): void {
    this.clearLocations();

    for (const location of locations) {
      this.addLocation(location);
    }
  }

  public addLocation(location: MapLocation): void {
    const node = new LocationNode(location);

    // Set up event handlers
    node.on('pointerenter', () => this.handleLocationHover(location.id));
    node.on('pointerleave', () => this.handleLocationHover(null));
    node.on('pointertap', (e: FederatedPointerEvent) => {
      if (e.button === 2) {
        this.handleLocationRightClick(location.id);
      } else {
        this.handleLocationClick(location.id);
      }
    });
    node.on('rightclick', () => this.handleLocationRightClick(location.id));

    // Set z-index based on y position for proper layering
    node.zIndex = location.position.y;

    this.locationNodes.set(location.id, node);
    this.addChild(node);
  }

  public removeLocation(locationId: string): void {
    const node = this.locationNodes.get(locationId);
    if (node) {
      this.removeChild(node);
      node.destroy();
      this.locationNodes.delete(locationId);
    }
  }

  public clearLocations(): void {
    for (const node of this.locationNodes.values()) {
      this.removeChild(node);
      node.destroy();
    }
    this.locationNodes.clear();
  }

  // ============================================
  // LOCATION UPDATES
  // ============================================

  public updateLocations(locations: MapLocation[]): void {
    for (const location of locations) {
      const node = this.locationNodes.get(location.id);
      if (node) {
        node.updateLocation(location);
      } else {
        // New location discovered
        this.addLocation(location);
      }
    }
  }

  public updateLocation(location: MapLocation): void {
    const node = this.locationNodes.get(location.id);
    if (node) {
      node.updateLocation(location);
    }
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  public setCurrentLocation(locationId: string | null): void {
    // Clear previous current
    if (this.currentLocationId) {
      const prevNode = this.locationNodes.get(this.currentLocationId);
      if (prevNode) {
        prevNode.setCurrent(false);
      }
    }

    this.currentLocationId = locationId;

    // Set new current
    if (locationId) {
      const node = this.locationNodes.get(locationId);
      if (node) {
        node.setCurrent(true);
      }
    }
  }

  public setSelectedLocation(locationId: string | null): void {
    // Clear previous selection
    if (this.selectedLocationId) {
      const prevNode = this.locationNodes.get(this.selectedLocationId);
      if (prevNode) {
        prevNode.setSelected(false);
      }
    }

    this.selectedLocationId = locationId;

    // Set new selection
    if (locationId) {
      const node = this.locationNodes.get(locationId);
      if (node) {
        node.setSelected(true);
      }
    }
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  private handleLocationHover(locationId: string | null): void {
    // Clear previous hover
    if (this.hoveredLocationId) {
      const prevNode = this.locationNodes.get(this.hoveredLocationId);
      if (prevNode) {
        prevNode.setHovered(false);
      }
    }

    this.hoveredLocationId = locationId;

    // Set new hover
    if (locationId) {
      const node = this.locationNodes.get(locationId);
      if (node) {
        node.setHovered(true);
      }
    }

    this.events.onLocationHover(locationId);
  }

  private handleLocationClick(locationId: string): void {
    const node = this.locationNodes.get(locationId);
    if (node && node.canInteract()) {
      this.events.onLocationClick(locationId);
    }
  }

  private handleLocationRightClick(locationId: string): void {
    this.events.onLocationRightClick(locationId);
  }

  // ============================================
  // QUERIES
  // ============================================

  public getLocationNode(locationId: string): LocationNode | undefined {
    return this.locationNodes.get(locationId);
  }

  public getLocationAtPosition(pos: Vector2, threshold: number = 20): string | null {
    for (const [id, node] of this.locationNodes) {
      const location = node.getLocation();
      const dx = location.position.x - pos.x;
      const dy = location.position.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= threshold) {
        return id;
      }
    }
    return null;
  }

  public getInteractiveLocations(): LocationNode[] {
    return Array.from(this.locationNodes.values()).filter(n => n.canInteract());
  }

  // ============================================
  // UPDATE LOOP
  // ============================================

  public update(deltaTime: number): void {
    for (const node of this.locationNodes.values()) {
      node.update(deltaTime);
    }
  }

  // ============================================
  // CLEANUP
  // ============================================

  public destroy(): void {
    this.clearLocations();
    super.destroy({ children: true });
  }
}
