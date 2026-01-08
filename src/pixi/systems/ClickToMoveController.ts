// ClickToMoveController - Handles click-to-move navigation
// Click anywhere on map to find nearest location and travel there

import type { MapLocation, Vector2 } from '@/types';
import type { TravelRoute, TravelState } from '@/types/travel';
import { Pathfinding, type PathfindingOptions } from '@/systems/Pathfinding';
import { distance } from '../utils/geometry';

// ============================================
// CONFIGURATION
// ============================================

export interface ClickToMoveConfig {
  /** Maximum distance from click to find a valid location (in world units) */
  maxClickDistance: number;

  /** Duration of path flash preview before travel starts (ms) */
  pathFlashDuration: number;

  /** Only allow traveling to discovered/visited locations */
  requireDiscovered: boolean;

  /** Include rumored paths in pathfinding */
  allowRumoredPaths: boolean;

  /** Prefer safer routes over faster ones */
  preferSafe: boolean;
}

const DEFAULT_CONFIG: ClickToMoveConfig = {
  maxClickDistance: 100,
  pathFlashDuration: 300,
  requireDiscovered: true,
  allowRumoredPaths: true,
  preferSafe: false,
};

// ============================================
// RESULT TYPES
// ============================================

export interface ClickToMoveResult {
  success: boolean;
  destinationId: string | null;
  route: TravelRoute | null;
  error?: string;
}

// ============================================
// CONTROLLER CLASS
// ============================================

export class ClickToMoveController {
  private config: ClickToMoveConfig;
  private pathfinder: Pathfinding | null = null;
  private locations: Map<string, MapLocation> = new Map();

  // Callbacks
  private onFlashRoute: ((pathIds: string[], duration: number) => Promise<void>) | null = null;
  private onStartTravel: ((travel: TravelState) => void) | null = null;
  private onInvalidClick: ((position: Vector2) => void) | null = null;

  constructor(config: Partial<ClickToMoveConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Update the controller with current map data
   */
  public updateData(
    locations: Record<string, MapLocation>,
    paths: Record<string, import('@/types').Path>
  ): void {
    this.locations = new Map(Object.entries(locations));
    this.pathfinder = new Pathfinding(locations, paths);
  }

  /**
   * Set callback for flashing route paths
   */
  public setFlashRouteCallback(
    callback: (pathIds: string[], duration: number) => Promise<void>
  ): void {
    this.onFlashRoute = callback;
  }

  /**
   * Set callback for starting travel
   */
  public setStartTravelCallback(callback: (travel: TravelState) => void): void {
    this.onStartTravel = callback;
  }

  /**
   * Set callback for invalid clicks (no location found)
   */
  public setInvalidClickCallback(callback: (position: Vector2) => void): void {
    this.onInvalidClick = callback;
  }

  // ============================================
  // MAIN CLICK HANDLING
  // ============================================

  /**
   * Handle a click on the map to initiate travel
   * Returns the result of the click action
   */
  public async handleClick(
    clickPosition: Vector2,
    currentLocationId: string
  ): Promise<ClickToMoveResult> {
    // Find nearest valid destination
    const destinationId = this.findNearestReachableLocation(
      clickPosition,
      currentLocationId
    );

    if (!destinationId) {
      this.onInvalidClick?.(clickPosition);
      return {
        success: false,
        destinationId: null,
        route: null,
        error: 'No reachable location found near click position',
      };
    }

    // Already at destination
    if (destinationId === currentLocationId) {
      return {
        success: false,
        destinationId,
        route: null,
        error: 'Already at destination',
      };
    }

    // Find route
    const route = this.findRoute(currentLocationId, destinationId);

    if (!route) {
      this.onInvalidClick?.(clickPosition);
      return {
        success: false,
        destinationId,
        route: null,
        error: 'No path found to destination',
      };
    }

    // Flash the route for visual feedback
    if (this.onFlashRoute && route.segments.length > 0) {
      const pathIds = route.segments.map((s) => s.pathId);
      await this.onFlashRoute(pathIds, this.config.pathFlashDuration);
    }

    // Create travel state and start travel
    const travelState = this.createTravelState(route);
    this.onStartTravel?.(travelState);

    return {
      success: true,
      destinationId,
      route,
    };
  }

  // ============================================
  // LOCATION FINDING
  // ============================================

  /**
   * Find the nearest reachable location from a world position
   */
  public findNearestReachableLocation(
    position: Vector2,
    currentLocationId: string
  ): string | null {
    if (!this.pathfinder) return null;

    let nearestId: string | null = null;
    let nearestDistance = Infinity;

    // Get all reachable locations from current position
    const reachable = this.pathfinder.getReachableLocations(currentLocationId, {
      allowRumoredPaths: this.config.allowRumoredPaths,
    });

    // Also include current location (clicking on it is valid)
    const candidates = [currentLocationId, ...reachable];

    for (const locationId of candidates) {
      const location = this.locations.get(locationId);
      if (!location) continue;

      // Check discovery state requirement
      if (this.config.requireDiscovered) {
        if (
          location.discoveryState !== 'discovered' &&
          location.discoveryState !== 'visited'
        ) {
          continue;
        }
      }

      // Calculate distance from click to location
      const dist = distance(position, location.position);

      // Check if within max click distance and closer than current nearest
      if (dist < this.config.maxClickDistance && dist < nearestDistance) {
        nearestDistance = dist;
        nearestId = locationId;
      }
    }

    return nearestId;
  }

  /**
   * Get the location directly at or very close to a position
   * Used for clicking directly on a location node
   */
  public getLocationAtPosition(
    position: Vector2,
    threshold: number = 20
  ): string | null {
    for (const [id, location] of this.locations) {
      const dist = distance(position, location.position);
      if (dist < threshold) {
        return id;
      }
    }
    return null;
  }

  // ============================================
  // PATHFINDING
  // ============================================

  /**
   * Find a route between two locations
   */
  public findRoute(fromId: string, toId: string): TravelRoute | null {
    if (!this.pathfinder) return null;

    const options: Partial<PathfindingOptions> = {
      allowRumoredPaths: this.config.allowRumoredPaths,
      preferSafe: this.config.preferSafe,
    };

    const result = this.pathfinder.findRoute(fromId, toId, options);

    return result.success ? result.route : null;
  }

  /**
   * Check if a location is reachable from the current position
   */
  public isReachable(fromId: string, toId: string): boolean {
    if (!this.pathfinder) return false;
    return this.pathfinder.isReachable(fromId, toId, {
      allowRumoredPaths: this.config.allowRumoredPaths,
    });
  }

  // ============================================
  // TRAVEL STATE CREATION
  // ============================================

  /**
   * Create a TravelState from a route
   */
  private createTravelState(route: TravelRoute): TravelState {
    const now = Date.now();

    return {
      isActive: true,
      startedAt: now,
      route,
      currentSegmentIndex: 0,
      segmentProgress: 0,
      estimatedArrival: now + route.totalTime * 1000, // Convert to ms
      totalProgress: 0,
      pendingEvent: null,
      encounterRollsRemaining: Math.ceil(route.segments.length * 0.5),
    };
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Update configuration
   */
  public setConfig(config: Partial<ClickToMoveConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): ClickToMoveConfig {
    return { ...this.config };
  }
}

// ============================================
// FACTORY
// ============================================

export function createClickToMoveController(
  config?: Partial<ClickToMoveConfig>
): ClickToMoveController {
  return new ClickToMoveController(config);
}
