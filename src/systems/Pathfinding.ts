// Pathfinding - A* pathfinding on location graph
// Finds optimal routes between locations using discovered/rumored paths

import type {
  MapLocation,
  Path,
  PathConnection,
  DiscoveryState,
} from '@/types';
import type { TravelRoute, RouteSegment } from '@/types/travel';

// ============================================
// TYPES
// ============================================

interface PathfindingNode {
  locationId: string;
  g: number; // Cost from start
  h: number; // Heuristic (estimated cost to end)
  f: number; // Total cost (g + h)
  parent: PathfindingNode | null;
  connection: PathConnection | null; // The path used to reach this node
}

export interface PathfindingOptions {
  // Allow only visited/discovered paths, or include rumored
  allowRumoredPaths: boolean;

  // Prefer safer routes over faster ones
  preferSafe: boolean;

  // Weight multiplier for danger in cost calculation
  dangerWeight: number;

  // Allowed path types (null = all)
  allowedPathTypes: string[] | null;
}

export interface PathfindingResult {
  success: boolean;
  route: TravelRoute | null;
  error?: string;
}

// ============================================
// DEFAULT OPTIONS
// ============================================

const DEFAULT_OPTIONS: PathfindingOptions = {
  allowRumoredPaths: true,
  preferSafe: false,
  dangerWeight: 0.5,
  allowedPathTypes: null,
};

// ============================================
// PATHFINDING CLASS
// ============================================

export class Pathfinding {
  private locations: Map<string, MapLocation>;

  constructor(
    locations: Record<string, MapLocation>,
    _paths: Record<string, Path>
  ) {
    this.locations = new Map(Object.entries(locations));
    // Paths stored in locations.connectedTo, so we only need locations
  }

  // ============================================
  // MAIN PATHFINDING
  // ============================================

  public findRoute(
    startLocationId: string,
    endLocationId: string,
    options: Partial<PathfindingOptions> = {}
  ): PathfindingResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Validate locations
    const startLocation = this.locations.get(startLocationId);
    const endLocation = this.locations.get(endLocationId);

    if (!startLocation) {
      return { success: false, route: null, error: 'Start location not found' };
    }
    if (!endLocation) {
      return { success: false, route: null, error: 'End location not found' };
    }

    // Same location
    if (startLocationId === endLocationId) {
      return {
        success: true,
        route: {
          segments: [],
          totalTime: 0,
          totalDanger: 0,
          startLocationId,
          endLocationId,
        },
      };
    }

    // Run A* algorithm
    const path = this.astar(startLocationId, endLocationId, opts);

    if (!path) {
      return {
        success: false,
        route: null,
        error: 'No path found between locations',
      };
    }

    // Convert path to route
    const route = this.buildRoute(path, startLocationId, endLocationId);

    return { success: true, route };
  }

  // ============================================
  // A* ALGORITHM
  // ============================================

  private astar(
    startId: string,
    endId: string,
    options: PathfindingOptions
  ): PathfindingNode[] | null {
    const openSet: Map<string, PathfindingNode> = new Map();
    const closedSet: Set<string> = new Set();

    // Initialize start node
    const startNode: PathfindingNode = {
      locationId: startId,
      g: 0,
      h: this.heuristic(startId, endId),
      f: 0,
      parent: null,
      connection: null,
    };
    startNode.f = startNode.g + startNode.h;
    openSet.set(startId, startNode);

    while (openSet.size > 0) {
      // Get node with lowest f score
      const current = this.getLowestFScore(openSet);

      // Reached destination
      if (current.locationId === endId) {
        return this.reconstructPath(current);
      }

      // Move from open to closed
      openSet.delete(current.locationId);
      closedSet.add(current.locationId);

      // Get current location
      const currentLocation = this.locations.get(current.locationId);
      if (!currentLocation) continue;

      // Check all connections
      for (const connection of currentLocation.connectedTo) {
        // Skip if already evaluated
        if (closedSet.has(connection.targetLocationId)) continue;

        // Check if path is accessible
        if (!this.isConnectionAccessible(connection, options)) continue;

        // Calculate costs
        const moveCost = this.calculateMoveCost(connection, options);
        const tentativeG = current.g + moveCost;

        // Get or create neighbor node
        let neighbor = openSet.get(connection.targetLocationId);
        const isNewNode = !neighbor;

        if (isNewNode) {
          neighbor = {
            locationId: connection.targetLocationId,
            g: Infinity,
            h: this.heuristic(connection.targetLocationId, endId),
            f: Infinity,
            parent: null,
            connection: null,
          };
        }

        // Better path found?
        if (tentativeG < neighbor!.g) {
          neighbor!.parent = current;
          neighbor!.connection = connection;
          neighbor!.g = tentativeG;
          neighbor!.f = neighbor!.g + neighbor!.h;

          if (isNewNode) {
            openSet.set(connection.targetLocationId, neighbor!);
          }
        }
      }
    }

    // No path found
    return null;
  }

  private getLowestFScore(openSet: Map<string, PathfindingNode>): PathfindingNode {
    let lowest: PathfindingNode | null = null;

    for (const node of openSet.values()) {
      if (!lowest || node.f < lowest.f) {
        lowest = node;
      }
    }

    return lowest!;
  }

  private reconstructPath(endNode: PathfindingNode): PathfindingNode[] {
    const path: PathfindingNode[] = [];
    let current: PathfindingNode | null = endNode;

    while (current) {
      path.unshift(current);
      current = current.parent;
    }

    return path;
  }

  // ============================================
  // COST CALCULATIONS
  // ============================================

  private heuristic(fromId: string, toId: string): number {
    const from = this.locations.get(fromId);
    const to = this.locations.get(toId);

    if (!from || !to) return Infinity;

    // Euclidean distance
    const dx = to.position.x - from.position.x;
    const dy = to.position.y - from.position.y;
    return Math.sqrt(dx * dx + dy * dy) / 10; // Scale to match travel time
  }

  private calculateMoveCost(
    connection: PathConnection,
    options: PathfindingOptions
  ): number {
    let cost = connection.travelTime;

    // Add danger cost if preferring safe routes
    if (options.preferSafe) {
      cost += connection.dangerModifier * connection.travelTime * options.dangerWeight;
    }

    // Slight penalty for rumored paths (less certain)
    if (connection.discoveryState === 'rumored') {
      cost *= 1.2;
    }

    return cost;
  }

  private isConnectionAccessible(
    connection: PathConnection,
    options: PathfindingOptions
  ): boolean {
    // Check discovery state
    const validStates: DiscoveryState[] = ['discovered', 'visited'];
    if (options.allowRumoredPaths) {
      validStates.push('rumored');
    }

    if (!validStates.includes(connection.discoveryState)) {
      return false;
    }

    // Check path type filter
    if (options.allowedPathTypes) {
      if (!options.allowedPathTypes.includes(connection.pathType)) {
        return false;
      }
    }

    return true;
  }

  // ============================================
  // ROUTE BUILDING
  // ============================================

  private buildRoute(
    path: PathfindingNode[],
    startId: string,
    endId: string
  ): TravelRoute {
    const segments: RouteSegment[] = [];
    let totalTime = 0;
    let totalDanger = 0;

    // Skip first node (start location has no connection)
    for (let i = 1; i < path.length; i++) {
      const node = path[i];
      const prevNode = path[i - 1];

      if (!node.connection) continue;

      const segment: RouteSegment = {
        pathId: node.connection.pathId,
        fromLocationId: prevNode.locationId,
        toLocationId: node.locationId,
        duration: node.connection.travelTime,
        dangerLevel: node.connection.dangerModifier,
      };

      segments.push(segment);
      totalTime += segment.duration;
      totalDanger += segment.dangerLevel * segment.duration;
    }

    // Normalize total danger
    const avgDanger = segments.length > 0 ? totalDanger / segments.length : 0;

    return {
      segments,
      totalTime,
      totalDanger: avgDanger,
      startLocationId: startId,
      endLocationId: endId,
    };
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Check if a location is reachable from another
   */
  public isReachable(
    fromId: string,
    toId: string,
    options: Partial<PathfindingOptions> = {}
  ): boolean {
    const result = this.findRoute(fromId, toId, options);
    return result.success;
  }

  /**
   * Get all reachable locations from a starting point
   */
  public getReachableLocations(
    fromId: string,
    options: Partial<PathfindingOptions> = {}
  ): string[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const reachable: Set<string> = new Set();
    const queue: string[] = [fromId];
    const visited: Set<string> = new Set();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const location = this.locations.get(current);
      if (!location) continue;

      reachable.add(current);

      for (const connection of location.connectedTo) {
        if (
          !visited.has(connection.targetLocationId) &&
          this.isConnectionAccessible(connection, opts)
        ) {
          queue.push(connection.targetLocationId);
        }
      }
    }

    // Remove starting location
    reachable.delete(fromId);
    return Array.from(reachable);
  }

  /**
   * Get direct neighbors (one hop away)
   */
  public getNeighbors(
    locationId: string,
    options: Partial<PathfindingOptions> = {}
  ): string[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const location = this.locations.get(locationId);

    if (!location) return [];

    return location.connectedTo
      .filter((conn) => this.isConnectionAccessible(conn, opts))
      .map((conn) => conn.targetLocationId);
  }

  /**
   * Update the pathfinder with new data
   */
  public updateData(
    locations: Record<string, MapLocation>,
    _paths: Record<string, Path>
  ): void {
    this.locations = new Map(Object.entries(locations));
    // Paths stored in locations.connectedTo, so we only need locations
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

export function createPathfinder(
  locations: Record<string, MapLocation>,
  paths: Record<string, Path>
): Pathfinding {
  return new Pathfinding(locations, paths);
}

/**
 * Simple route finding without creating a full pathfinder instance
 */
export function findRoute(
  locations: Record<string, MapLocation>,
  paths: Record<string, Path>,
  startId: string,
  endId: string,
  options?: Partial<PathfindingOptions>
): PathfindingResult {
  const pathfinder = new Pathfinding(locations, paths);
  return pathfinder.findRoute(startId, endId, options);
}
