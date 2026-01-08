# Procedural Generation

Seeded procedural generation for roguelike maps.

## Table of Contents

1. [SeededRandom](#seededrandom)
2. [RegionGenerator](#regiongenerator)
3. [Zone Layout](#zone-layout)
4. [Connection Generation](#connection-generation)
5. [Path Generation](#path-generation)

---

## SeededRandom

Mulberry32 PRNG for deterministic generation.

```typescript
// src/pixi/generators/SeededRandom.ts

export class SeededRandom {
  public seed: number;
  private state: number;

  constructor(seed: number) {
    this.seed = seed;
    this.state = seed;
  }

  // Mulberry32 PRNG
  private next(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  float(): number {
    return this.next();
  }

  floatBetween(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(max: number): number {
    return Math.floor(this.next() * max);
  }

  intBetween(min: number, max: number): number {
    return Math.floor(this.floatBetween(min, max + 1));
  }

  pick<T>(array: T[]): T {
    return array[this.int(array.length)];
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  id(prefix: string): string {
    return `${prefix}_${this.int(0xFFFFFF).toString(16).padStart(6, '0')}`;
  }

  weighted<T>(items: Array<{ value: T; weight: number }>): T {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let roll = this.float() * total;

    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) return item.value;
    }

    return items[items.length - 1].value;
  }
}
```

## RegionGenerator

```typescript
// src/pixi/generators/RegionGenerator.ts

interface GeneratorConfig {
  regionSize: { width: number; height: number };
  zoneCount: number;
  locationsPerZone: { min: number; max: number };
  connectionDensity: number;
}

const DEFAULT_CONFIG: GeneratorConfig = {
  regionSize: { width: 2000, height: 1500 },
  zoneCount: 6,
  locationsPerZone: { min: 4, max: 8 },
  connectionDensity: 0.2,
};

export class RegionGenerator {
  private rng: SeededRandom;
  private config: GeneratorConfig;

  constructor(seed: number, config: Partial<GeneratorConfig> = {}) {
    this.rng = new SeededRandom(seed);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  generate(): GeneratedMap {
    const regionId = this.rng.id('reg');
    const regionName = this.generateRegionName();

    // Step 1: Generate zone layout
    const zoneLayouts = this.generateZoneLayout(this.config.zoneCount);

    // Step 2: Create zones with locations
    const zones: Record<string, MapZone> = {};
    const locations: Record<string, MapLocation> = {};
    const paths: Record<string, Path> = {};

    let startingLocationId = '';

    zoneLayouts.forEach((layout, index) => {
      const zone = this.generateZone(regionId, layout, index);
      zones[zone.id] = zone;

      // Generate locations within zone
      const zoneLocations = this.generateLocations(zone.id, layout);
      zoneLocations.forEach(loc => {
        locations[loc.id] = loc;
        if (index === 0 && !startingLocationId) {
          startingLocationId = loc.id;
          loc.discoveryState = 'visited';
        }
      });
      zone.locations = zoneLocations;
    });

    // Step 3: Generate zone connections
    const zoneConnections = this.generateZoneConnections(Object.values(zones));

    // Step 4: Generate paths between locations
    // ... path generation logic

    return {
      region: { id: regionId, seed: this.rng.seed, name: regionName, ... },
      zones,
      locations,
      paths,
      startingLocationId,
    };
  }
}
```

## Zone Layout

Voronoi-like distribution for natural zone placement.

```typescript
private generateZoneLayout(count: number): ZoneLayoutData[] {
  const layouts: ZoneLayoutData[] = [];
  const { width, height } = this.config.regionSize;

  // Use poisson-like distribution
  const points = this.generateDistributedPoints(count, width, height);

  const biomes: BiomeType[] = [
    'plains',    // Starting zone always plains
    'forest',
    'mountain',
    'swamp',
    'ruins',
    'desert',
    'underground',
  ];

  points.forEach((point, index) => {
    const zoneWidth = width / Math.ceil(Math.sqrt(count));
    const zoneHeight = height / Math.ceil(Math.sqrt(count));

    layouts.push({
      bounds: {
        x: point.x - zoneWidth / 2,
        y: point.y - zoneHeight / 2,
        width: zoneWidth,
        height: zoneHeight,
      },
      biome: biomes[index % biomes.length],
      center: point,
    });
  });

  return layouts;
}

private generateDistributedPoints(count: number, width: number, height: number): Vector2[] {
  const points: Vector2[] = [];
  const padding = 100;

  // First point near center-bottom (starting area)
  points.push({
    x: width / 2 + this.rng.floatBetween(-100, 100),
    y: height * 0.7 + this.rng.floatBetween(-50, 50),
  });

  // Rest distributed via poisson-like sampling
  for (let i = 1; i < count; i++) {
    let bestPoint = { x: 0, y: 0 };
    let bestDistance = 0;

    // Try multiple candidates, pick most distant from existing
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = {
        x: this.rng.floatBetween(padding, width - padding),
        y: this.rng.floatBetween(padding, height - padding),
      };

      const minDist = Math.min(
        ...points.map(p => Math.hypot(p.x - candidate.x, p.y - candidate.y))
      );

      if (minDist > bestDistance) {
        bestDistance = minDist;
        bestPoint = candidate;
      }
    }

    points.push(bestPoint);
  }

  return points;
}
```

## Connection Generation

Minimum Spanning Tree (MST) ensures all zones are reachable.

```typescript
private generateZoneConnections(zones: MapZone[]): Array<{ from: string; to: string }> {
  const connections: Array<{ from: string; to: string }> = [];

  // Minimum spanning tree for guaranteed connectivity
  const connected = new Set<string>([zones[0].id]);
  const remaining = new Set(zones.slice(1).map(z => z.id));

  while (remaining.size > 0) {
    let bestEdge: { from: string; to: string; dist: number } | null = null;

    for (const connectedId of connected) {
      for (const remainingId of remaining) {
        const fromZone = zones.find(z => z.id === connectedId)!;
        const toZone = zones.find(z => z.id === remainingId)!;
        const dist = this.zoneDistance(fromZone, toZone);

        if (!bestEdge || dist < bestEdge.dist) {
          bestEdge = { from: connectedId, to: remainingId, dist };
        }
      }
    }

    if (bestEdge) {
      connections.push({ from: bestEdge.from, to: bestEdge.to });
      connected.add(bestEdge.to);
      remaining.delete(bestEdge.to);
    }
  }

  // Add extra connections for variety (20% chance per pair)
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 2; j < zones.length; j++) {
      if (this.rng.float() < 0.2) {
        const exists = connections.some(
          c => (c.from === zones[i].id && c.to === zones[j].id) ||
               (c.from === zones[j].id && c.to === zones[i].id)
        );
        if (!exists) {
          connections.push({ from: zones[i].id, to: zones[j].id });
        }
      }
    }
  }

  return connections;
}

private zoneDistance(a: MapZone, b: MapZone): number {
  const ax = a.bounds.x + a.bounds.width / 2;
  const ay = a.bounds.y + a.bounds.height / 2;
  const bx = b.bounds.x + b.bounds.width / 2;
  const by = b.bounds.y + b.bounds.height / 2;
  return Math.hypot(ax - bx, ay - by);
}
```

## Path Generation

Bezier curves for natural-looking paths.

```typescript
private generatePath(from: MapLocation, to: MapLocation, pathType: PathType): Path {
  const points: Vector2[] = [];

  // Start point
  points.push({ ...from.position });

  // Generate control points for bezier curve
  const midX = (from.position.x + to.position.x) / 2;
  const midY = (from.position.y + to.position.y) / 2;

  // Add some randomness to make paths look natural
  const offset = this.rng.floatBetween(-50, 50);
  points.push({
    x: midX + offset,
    y: midY + offset,
  });

  // End point
  points.push({ ...to.position });

  return {
    id: this.rng.id('path'),
    points,
    sourceId: from.id,
    targetId: to.id,
    pathType,
    discoveryState: 'unknown',
  };
}

private calculateTravelTime(path: Path): number {
  // Base time on path length
  let length = 0;
  for (let i = 1; i < path.points.length; i++) {
    length += Math.hypot(
      path.points[i].x - path.points[i-1].x,
      path.points[i].y - path.points[i-1].y
    );
  }

  // Modify by path type
  const speedMod: Record<PathType, number> = {
    'road': 1.0,
    'trail': 1.5,
    'wilderness': 2.5,
    'hidden': 2.0,
  };

  return Math.ceil((length / 50) * speedMod[path.pathType]); // Minutes
}
```
