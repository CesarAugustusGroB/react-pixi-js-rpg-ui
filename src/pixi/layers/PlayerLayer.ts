// PlayerLayer - Renders the player marker and handles travel animation
// Manages player position, travel state, and visual effects

import { Container } from 'pixi.js';
import type { Vector2, TravelState, MapLocation, Path } from '@/types';
import { PlayerMarker } from '../objects/PlayerMarker';
import { getPointOnPath } from '../utils/geometry';

// ============================================
// PLAYER LAYER CLASS
// ============================================

export class PlayerLayer extends Container {
  private playerMarker: PlayerMarker;
  private locations: Map<string, MapLocation> = new Map();
  private paths: Map<string, Path> = new Map();

  // Travel state
  private currentLocationId: string | null = null;
  private isTraveling: boolean = false;
  private travelState: TravelState | null = null;

  constructor() {
    super();

    // Create player marker
    this.playerMarker = new PlayerMarker();
    this.addChild(this.playerMarker);
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  public initialize(
    locations: MapLocation[],
    paths: Path[],
    currentLocationId: string
  ): void {
    // Store references
    this.locations.clear();
    for (const location of locations) {
      this.locations.set(location.id, location);
    }

    this.paths.clear();
    for (const path of paths) {
      this.paths.set(path.id, path);
    }

    // Set initial position
    this.setCurrentLocation(currentLocationId, true);
  }

  // ============================================
  // POSITION MANAGEMENT
  // ============================================

  public setCurrentLocation(locationId: string, immediate: boolean = false): void {
    const location = this.locations.get(locationId);
    if (!location) return;

    this.currentLocationId = locationId;
    this.playerMarker.setPosition(location.position, immediate);

    if (!immediate) {
      this.playerMarker.playArrivalEffect();
    }
  }

  public setPosition(position: Vector2, immediate: boolean = false): void {
    this.playerMarker.setPosition(position, immediate);
  }

  // ============================================
  // TRAVEL MANAGEMENT
  // ============================================

  public startTravel(travelState: TravelState): void {
    this.isTraveling = true;
    this.travelState = travelState;

    this.playerMarker.setTraveling(true);
    this.playerMarker.playDepartureEffect();

    // Set initial travel target
    this.updateTravelTarget();
  }

  public updateTravel(travelState: TravelState): void {
    this.travelState = travelState;
    this.updateTravelPosition();
  }

  public endTravel(arrivalLocationId: string): void {
    this.isTraveling = false;
    this.travelState = null;

    this.playerMarker.setTraveling(false);
    this.setCurrentLocation(arrivalLocationId);
  }

  private updateTravelPosition(): void {
    if (!this.travelState) return;

    const { route, currentSegmentIndex, segmentProgress } = this.travelState;
    const segment = route.segments[currentSegmentIndex];
    if (!segment) return;

    // Get path and locations
    const path = this.paths.get(segment.pathId);
    const fromLocation = this.locations.get(segment.fromLocationId);
    const toLocation = this.locations.get(segment.toLocationId);

    if (!path || !fromLocation || !toLocation) return;

    // Calculate position along path using path's points array
    const position = getPointOnPath(
      path.points,
      fromLocation.position,
      toLocation.position,
      segmentProgress
    );
    this.playerMarker.setPosition(position);
  }

  private updateTravelTarget(): void {
    if (!this.travelState) return;

    const { route, currentSegmentIndex } = this.travelState;
    const segment = route.segments[currentSegmentIndex];
    if (!segment) return;

    const toLocation = this.locations.get(segment.toLocationId);
    if (toLocation) {
      this.playerMarker.setTravelTarget(toLocation.position);
    }
  }

  // ============================================
  // LOCATION UPDATES
  // ============================================

  public updateLocations(locations: MapLocation[]): void {
    for (const location of locations) {
      this.locations.set(location.id, location);
    }
  }

  public updatePaths(paths: Path[]): void {
    for (const path of paths) {
      this.paths.set(path.id, path);
    }
  }

  // ============================================
  // QUERIES
  // ============================================

  public getCurrentLocationId(): string | null {
    return this.currentLocationId;
  }

  public getCurrentPosition(): Vector2 {
    return this.playerMarker.getCurrentPosition();
  }

  public getIsTraveling(): boolean {
    return this.isTraveling;
  }

  public getTravelState(): TravelState | null {
    return this.travelState;
  }

  // ============================================
  // UPDATE LOOP
  // ============================================

  public update(deltaTime: number): void {
    this.playerMarker.update(deltaTime);

    // Continuously update travel position during travel
    if (this.isTraveling) {
      this.updateTravelPosition();
    }
  }

  // ============================================
  // CLEANUP
  // ============================================

  public destroy(): void {
    this.locations.clear();
    this.paths.clear();
    super.destroy({ children: true });
  }
}
