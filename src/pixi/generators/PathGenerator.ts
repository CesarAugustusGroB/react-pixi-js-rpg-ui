// PathGenerator - Creates path network between locations
// Uses Minimum Spanning Tree (MST) for base connectivity + extra connections

import type {
  MapLocation,
  Path,
  PathType,
  PathConnection,
  DiscoveryState,
  Vector2,
} from '@/types';
import { SeededRandom } from './SeededRandom';

// ============================================
// GENERATION CONFIG
// ============================================

export interface PathGenerationConfig {
  // Extra paths beyond MST (0.0 = MST only, 1.0 = fully connected)
  extraConnectionRatio: number;

  // Maximum distance for connections (0 = unlimited)
  maxConnectionDistance: number;

  // Probability of path types
  pathTypeWeights: Record<PathType, number>;

  // Control point randomness for bezier curves (0-1)
  curveVariance: number;
}

const DEFAULT_PATH_CONFIG: PathGenerationConfig = {
  extraConnectionRatio: 0.3,
  maxConnectionDistance: 400,
  pathTypeWeights: {
    road: 3,
    trail: 5,
    wilderness: 2,
    hidden: 1,
  },
  curveVariance: 0.3,
};

// ============================================
// EDGE STRUCTURE FOR MST
// ============================================

interface Edge {
  source: string;
  target: string;
  distance: number;
}

// ============================================
// PATH GENERATOR CLASS
// ============================================

export class PathGenerator {
  private rng: SeededRandom;
  private config: PathGenerationConfig;
  private locations: MapLocation[] = [];
  private paths: Path[] = [];

  constructor(rng: SeededRandom, config: Partial<PathGenerationConfig> = {}) {
    this.rng = rng;
    this.config = { ...DEFAULT_PATH_CONFIG, ...config };
  }

  // ============================================
  // MAIN GENERATION
  // ============================================

  public generate(locations: MapLocation[]): Path[] {
    this.locations = locations;
    this.paths = [];

    if (locations.length < 2) {
      return [];
    }

    // Step 1: Build all possible edges
    const allEdges = this.buildAllEdges();

    // Step 2: Create MST for base connectivity
    const mstEdges = this.computeMST(allEdges);

    // Step 3: Add extra connections for variety
    const extraEdges = this.selectExtraEdges(allEdges, mstEdges);

    // Step 4: Convert edges to paths
    const selectedEdges = [...mstEdges, ...extraEdges];
    this.paths = selectedEdges.map((edge, index) =>
      this.createPath(edge, index)
    );

    // Step 5: Update location connections
    this.updateLocationConnections();

    return this.paths;
  }

  // ============================================
  // EDGE BUILDING
  // ============================================

  private buildAllEdges(): Edge[] {
    const edges: Edge[] = [];
    const { maxConnectionDistance } = this.config;

    for (let i = 0; i < this.locations.length; i++) {
      for (let j = i + 1; j < this.locations.length; j++) {
        const locA = this.locations[i];
        const locB = this.locations[j];

        const distance = this.calculateDistance(locA.position, locB.position);

        // Skip if too far
        if (maxConnectionDistance > 0 && distance > maxConnectionDistance) {
          continue;
        }

        edges.push({
          source: locA.id,
          target: locB.id,
          distance,
        });
      }
    }

    return edges;
  }

  private calculateDistance(a: Vector2, b: Vector2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ============================================
  // MINIMUM SPANNING TREE (KRUSKAL'S ALGORITHM)
  // ============================================

  private computeMST(edges: Edge[]): Edge[] {
    // Sort edges by distance
    const sortedEdges = [...edges].sort((a, b) => a.distance - b.distance);

    // Union-Find data structure
    const parent: Map<string, string> = new Map();
    const rank: Map<string, number> = new Map();

    const find = (x: string): string => {
      if (!parent.has(x)) {
        parent.set(x, x);
        rank.set(x, 0);
      }
      if (parent.get(x) !== x) {
        parent.set(x, find(parent.get(x)!));
      }
      return parent.get(x)!;
    };

    const union = (x: string, y: string): boolean => {
      const rootX = find(x);
      const rootY = find(y);

      if (rootX === rootY) return false;

      const rankX = rank.get(rootX) || 0;
      const rankY = rank.get(rootY) || 0;

      if (rankX < rankY) {
        parent.set(rootX, rootY);
      } else if (rankX > rankY) {
        parent.set(rootY, rootX);
      } else {
        parent.set(rootY, rootX);
        rank.set(rootX, rankX + 1);
      }

      return true;
    };

    // Build MST
    const mstEdges: Edge[] = [];
    const targetEdges = this.locations.length - 1;

    for (const edge of sortedEdges) {
      if (mstEdges.length >= targetEdges) break;

      if (union(edge.source, edge.target)) {
        mstEdges.push(edge);
      }
    }

    return mstEdges;
  }

  // ============================================
  // EXTRA CONNECTIONS
  // ============================================

  private selectExtraEdges(allEdges: Edge[], mstEdges: Edge[]): Edge[] {
    const { extraConnectionRatio } = this.config;

    // Get edges not in MST
    const mstSet = new Set(
      mstEdges.map((e) => `${e.source}-${e.target}`)
    );

    const availableEdges = allEdges.filter((e) => {
      const key1 = `${e.source}-${e.target}`;
      const key2 = `${e.target}-${e.source}`;
      return !mstSet.has(key1) && !mstSet.has(key2);
    });

    // Sort by distance (prefer shorter)
    availableEdges.sort((a, b) => a.distance - b.distance);

    // Select extra edges
    const extraCount = Math.floor(availableEdges.length * extraConnectionRatio);
    const selectedExtra: Edge[] = [];

    // Weighted selection favoring shorter paths
    for (let i = 0; i < extraCount && availableEdges.length > 0; i++) {
      // Higher chance for shorter paths
      const maxIndex = Math.min(availableEdges.length - 1, 5);
      const index = this.rng.nextInt(0, maxIndex);

      selectedExtra.push(availableEdges[index]);
      availableEdges.splice(index, 1);
    }

    return selectedExtra;
  }

  // ============================================
  // PATH CREATION
  // ============================================

  private createPath(edge: Edge, index: number): Path {
    const sourceLocation = this.locations.find((l) => l.id === edge.source)!;
    const targetLocation = this.locations.find((l) => l.id === edge.target)!;

    // Determine path type
    const pathType = this.determinePathType(sourceLocation, targetLocation);

    // Generate control points for bezier curve
    const points = this.generatePathPoints(
      sourceLocation.position,
      targetLocation.position,
      pathType
    );

    // Determine discovery state based on locations
    const discoveryState = this.determinePathDiscovery(
      sourceLocation,
      targetLocation
    );

    return {
      id: `path_${index}`,
      points,
      sourceId: edge.source,
      targetId: edge.target,
      pathType,
      discoveryState,
    };
  }

  private determinePathType(
    source: MapLocation,
    target: MapLocation
  ): PathType {
    const { pathTypeWeights } = this.config;

    // Towns always have roads
    if (source.locationType === 'town' || target.locationType === 'town') {
      return 'road';
    }

    // Dungeons/caves often have hidden paths
    if (
      source.locationType === 'dungeon' ||
      target.locationType === 'dungeon' ||
      source.locationType === 'cave' ||
      target.locationType === 'cave'
    ) {
      if (this.rng.nextBool(0.4)) {
        return 'hidden';
      }
    }

    // Weighted random selection
    const types = Object.keys(pathTypeWeights) as PathType[];
    const weights = types.map((t) => pathTypeWeights[t]);

    return this.rng.weightedPick(types, weights);
  }

  private generatePathPoints(
    source: Vector2,
    target: Vector2,
    pathType: PathType
  ): Vector2[] {
    const { curveVariance } = this.config;

    // Start and end points
    const points: Vector2[] = [{ ...source }];

    // Calculate midpoint with offset for curve
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;

    // Perpendicular offset for natural curve
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Normalize perpendicular
    const perpX = -dy / length;
    const perpY = dx / length;

    // Variance based on path type
    let variance = curveVariance;
    switch (pathType) {
      case 'road':
        variance *= 0.3; // Roads are straighter
        break;
      case 'trail':
        variance *= 0.7;
        break;
      case 'wilderness':
        variance *= 1.0;
        break;
      case 'hidden':
        variance *= 1.2; // Hidden paths meander more
        break;
    }

    // Add control points
    const offset = this.rng.nextFloat(-1, 1) * length * variance;
    const controlPoint1: Vector2 = {
      x: midX + perpX * offset * 0.5,
      y: midY + perpY * offset * 0.5,
    };

    // For longer paths, add a second control point
    if (length > 200) {
      const offset2 = this.rng.nextFloat(-1, 1) * length * variance * 0.3;
      const t1 = 0.33;
      const t2 = 0.67;

      const cp1: Vector2 = {
        x: source.x + dx * t1 + perpX * offset,
        y: source.y + dy * t1 + perpY * offset,
      };

      const cp2: Vector2 = {
        x: source.x + dx * t2 + perpX * offset2,
        y: source.y + dy * t2 + perpY * offset2,
      };

      points.push(cp1, cp2);
    } else {
      points.push(controlPoint1);
    }

    // End point
    points.push({ ...target });

    return points;
  }

  private determinePathDiscovery(
    source: MapLocation,
    target: MapLocation
  ): DiscoveryState {
    // If both locations are visited, path is discovered
    if (
      source.discoveryState === 'visited' &&
      target.discoveryState === 'visited'
    ) {
      return 'discovered';
    }

    // If either is visited and other is discovered, path is rumored
    if (
      (source.discoveryState === 'visited' &&
        target.discoveryState === 'discovered') ||
      (source.discoveryState === 'discovered' &&
        target.discoveryState === 'visited')
    ) {
      return 'rumored';
    }

    // If one is visited, path might be rumored
    if (
      source.discoveryState === 'visited' ||
      target.discoveryState === 'visited'
    ) {
      return 'rumored';
    }

    return 'unknown';
  }

  // ============================================
  // UPDATE LOCATION CONNECTIONS
  // ============================================

  private updateLocationConnections(): void {
    // Clear existing connections
    for (const location of this.locations) {
      location.connectedTo = [];
    }

    // Add connections from paths
    for (const path of this.paths) {
      const source = this.locations.find((l) => l.id === path.sourceId);
      const target = this.locations.find((l) => l.id === path.targetId);

      if (source && target) {
        const travelTime = this.calculateTravelTime(path);
        const dangerModifier = this.calculateDangerModifier(path.pathType);

        // Add bidirectional connections
        const sourceConnection: PathConnection = {
          pathId: path.id,
          targetLocationId: target.id,
          travelTime,
          dangerModifier,
          pathType: path.pathType,
          discoveryState: path.discoveryState,
        };

        const targetConnection: PathConnection = {
          pathId: path.id,
          targetLocationId: source.id,
          travelTime,
          dangerModifier,
          pathType: path.pathType,
          discoveryState: path.discoveryState,
        };

        source.connectedTo.push(sourceConnection);
        target.connectedTo.push(targetConnection);
      }
    }
  }

  private calculateDangerModifier(pathType: PathType): number {
    switch (pathType) {
      case 'road':
        return 0.5; // Safer
      case 'trail':
        return 1.0; // Normal
      case 'wilderness':
        return 1.5; // More dangerous
      case 'hidden':
        return 0.8; // Hidden but risky
      default:
        return 1.0;
    }
  }

  private calculateTravelTime(path: Path): number {
    // Calculate path length from points
    let length = 0;
    for (let i = 1; i < path.points.length; i++) {
      const dx = path.points[i].x - path.points[i - 1].x;
      const dy = path.points[i].y - path.points[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }

    // Base time: 1 minute per 10 units of distance
    let baseTime = length / 10;

    // Modify by path type
    switch (path.pathType) {
      case 'road':
        baseTime *= 0.7; // Roads are fast
        break;
      case 'trail':
        baseTime *= 1.0;
        break;
      case 'wilderness':
        baseTime *= 1.5; // Wilderness is slow
        break;
      case 'hidden':
        baseTime *= 2.0; // Hidden paths are very slow
        break;
    }

    return Math.round(baseTime);
  }

  // ============================================
  // UTILITIES
  // ============================================

  public getPaths(): Path[] {
    return [...this.paths];
  }

  /**
   * Get path between two locations
   */
  public getPathBetween(
    locationA: string,
    locationB: string
  ): Path | undefined {
    return this.paths.find(
      (p) =>
        (p.sourceId === locationA && p.targetId === locationB) ||
        (p.sourceId === locationB && p.targetId === locationA)
    );
  }

  /**
   * Get all paths connected to a location
   */
  public getPathsForLocation(locationId: string): Path[] {
    return this.paths.filter(
      (p) => p.sourceId === locationId || p.targetId === locationId
    );
  }

  /**
   * Validate that all locations are connected (graph is connected)
   */
  public isFullyConnected(): boolean {
    if (this.locations.length === 0) return true;

    const visited = new Set<string>();
    const queue = [this.locations[0].id];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const location = this.locations.find((l) => l.id === current);
      if (!location) continue;

      for (const conn of location.connectedTo) {
        if (!visited.has(conn.targetLocationId)) {
          queue.push(conn.targetLocationId);
        }
      }
    }

    return visited.size === this.locations.length;
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

export function createPathGenerator(
  rng: SeededRandom,
  config?: Partial<PathGenerationConfig>
): PathGenerator {
  return new PathGenerator(rng, config);
}

/**
 * Generate paths with default settings
 */
export function generatePaths(
  locations: MapLocation[],
  seed: string | number
): Path[] {
  const rng = new SeededRandom(seed);
  const generator = new PathGenerator(rng);
  return generator.generate(locations);
}
